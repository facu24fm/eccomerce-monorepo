import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthRepository } from '../auth.repository';
import { 
  AuthTokens, 
  JWTPayload, 
  UserResponse,
  UnauthorizedError,
  ValidationError 
} from '../types/index';
import { config } from '../config';

/**
 * Servicio de autenticación que maneja toda la lógica de negocio relacionada
 * con usuarios, tokens JWT y autenticación.
 * 
 * @class AuthService
 * @description Proporciona métodos para registro, login, refresh de tokens,
 * logout y gestión de perfiles de usuario.
 * 
 * @example
 * ```typescript
 * const authService = new AuthService();
 * const result = await authService.register('user@example.com', 'password123');
 * ```
 */
export class AuthService {
  /** Repositorio para acceso a datos de autenticación */
  private authRepository: AuthRepository;

  /**
   * Constructor del servicio de autenticación
   * Inicializa el repositorio de datos
   */
  constructor() {
    this.authRepository = new AuthRepository();
  }

  /**
   * Registra un nuevo usuario en el sistema
   * 
   * @param {string} email - Email del usuario (debe ser único)
   * @param {string} password - Contraseña en texto plano (será hasheada)
   * @returns {Promise<{user: UserResponse, tokens: AuthTokens}>} Usuario creado y tokens JWT
   * 
   * @throws {ConflictError} Si el email ya está registrado
   * @throws {AuthError} Si hay errores en el proceso de registro
   */
  async register(email: string, password: string): Promise<{ user: UserResponse; tokens: AuthTokens }> {
    // Verificar si el email ya existe
    const emailExists = await this.authRepository.emailExists(email);
    if (emailExists) {
      throw new ValidationError('El email ya está registrado');
    }

    // Hashear password
    const hashedPassword = await bcrypt.hash(password, config.bcrypt.saltRounds);

    // Crear usuario
    const user = await this.authRepository.createUser(email, hashedPassword);

    // Generar tokens
    const tokens = this.generateTokens(user.id, user.role);

    // Guardar refresh token
    await this.authRepository.createRefreshToken(tokens.refreshToken, user.id);

    return {
      user: this.formatUserResponse(user),
      tokens,
    };
  }

  /**
   * Autentica un usuario existente
   * 
   * @param {string} email - Email del usuario
   * @param {string} password - Contraseña en texto plano
   * @returns {Promise<{user: UserResponse, tokens: AuthTokens}>} Usuario autenticado y tokens JWT
   * 
   * @throws {UnauthorizedError} Si las credenciales son inválidas
   * @throws {AuthError} Si hay errores en el proceso de login
   */
  async login(email: string, password: string): Promise<{ user: UserResponse; tokens: AuthTokens }> {
    // Buscar usuario
    const user = await this.authRepository.findUserByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Credenciales inválidas');
    }

    // Verificar password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedError('Credenciales inválidas');
    }

    // Generar tokens
    const tokens = this.generateTokens(user.id, user.role);

    // Guardar refresh token
    await this.authRepository.createRefreshToken(tokens.refreshToken, user.id);

    return {
      user: this.formatUserResponse(user),
      tokens,
    };
  }

  /**
   * Genera nuevos tokens JWT usando un refresh token válido
   * 
   * @param {string} refreshToken - Token de refresco válido
   * @returns {Promise<AuthTokens>} Nuevos tokens JWT (access y refresh)
   * 
   * @throws {UnauthorizedError} Si el refresh token es inválido o expirado
   * @throws {NotFoundError} Si el refresh token no existe en la base de datos
   * @throws {AuthError} Si hay errores en el proceso de refresh
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verificar refresh token
      const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret) as { userId: string };

      // Verificar que el token existe en la DB
      const storedToken = await this.authRepository.findRefreshToken(refreshToken);
      if (!storedToken || storedToken.userId !== decoded.userId) {
        throw new UnauthorizedError('Refresh token inválido');
      }

      // Buscar usuario
      const user = await this.authRepository.findUserById(decoded.userId);
      if (!user) {
        throw new UnauthorizedError('Usuario no encontrado');
      }

      // Generar nuevo access token
      const accessToken = this.generateAccessToken(user.id, user.role);

      return {
        accessToken,
        refreshToken, // Mantener el mismo refresh token
      };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Refresh token inválido');
      }
      throw error;
    }
  }

  /**
   * Cierra la sesión del usuario eliminando el refresh token
   * 
   * @param {string} refreshToken - Token de refresco a invalidar
   * @returns {Promise<void>} Operación completada
   * 
   * @throws {NotFoundError} Si el refresh token no existe
   * @throws {AuthError} Si hay errores en el proceso de logout
   */
  async logout(refreshToken: string): Promise<void> {
    await this.authRepository.deleteRefreshToken(refreshToken);
  }

  /**
   * Obtiene el perfil completo de un usuario por su ID
   * 
   * @param {string} userId - ID único del usuario
   * @returns {Promise<UserResponse>} Datos del perfil del usuario
   * 
   * @throws {NotFoundError} Si el usuario no existe
   * @throws {AuthError} Si hay errores al obtener el perfil
   */
  async getProfile(userId: string): Promise<UserResponse> {
    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      throw new UnauthorizedError('Usuario no encontrado');
    }

    return this.formatUserResponse(user);
  }

  /**
   * Verifica y decodifica un access token JWT
   * 
   * @param {string} token - Access token JWT a verificar
   * @returns {{userId: string, role: string}} Payload decodificado del token
   * 
   * @throws {Error} Si el token es inválido, expirado o malformado
   * 
   * @example
   * ```typescript
   * const decoded = authService.verifyAccessToken(accessToken);
   * console.log(decoded.userId); // ID del usuario
   * console.log(decoded.role); // Rol del usuario
   * ```
   */
  verifyAccessToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, config.jwtSecret) as JWTPayload;
    } catch (error) {
      throw new UnauthorizedError('Token inválido');
    }
  }

  /**
   * Genera un par de tokens JWT (access y refresh)
   * 
   * @private
   * @param {string} userId - ID del usuario para incluir en el payload
   * @param {string} role - Rol del usuario para incluir en el payload
   * @returns {AuthTokens} Par de tokens JWT generados
   * 
   * @description
   * - Access Token: Expira en 1 hora, usado para autenticación de requests
   * - Refresh Token: Expira en 7 días, usado para generar nuevos access tokens
   */
  private generateTokens(userId: string, role: 'USER' | 'ADMIN'): AuthTokens {
    const accessToken = this.generateAccessToken(userId, role);
    const refreshToken = this.generateRefreshToken(userId);

    return { accessToken, refreshToken };
  }

  /**
   * Genera un access token JWT
   * 
   * @private
   * @param {string} userId - ID del usuario para incluir en el payload
   * @param {string} role - Rol del usuario para incluir en el payload
   * @returns {string} Access token JWT generado
   * 
   * @description Expira en 1 hora, usado para autenticación de requests
   */
  private generateAccessToken(userId: string, role: 'USER' | 'ADMIN'): string {
    const payload: JWTPayload = { userId, role };
    return jwt.sign(payload, config.jwtSecret, { expiresIn: '1h' });
  }

  /**
   * Genera un refresh token JWT
   * 
   * @private
   * @param {string} userId - ID del usuario para incluir en el payload
   * @returns {string} Refresh token JWT generado
   * 
   * @description Expira en 7 días, usado para generar nuevos access tokens
   */
  private generateRefreshToken(userId: string): string {
    return jwt.sign({ userId }, config.jwtRefreshSecret, { expiresIn: '7d' });
  }

  /**
   * Formatea la respuesta del usuario removiendo datos sensibles
   * 
   * @private
   * @param {User} user - Usuario completo de la base de datos
   * @returns {UserResponse} Usuario formateado sin información sensible
   * 
   * @description Remueve el password y otros campos sensibles antes de enviar al cliente
   */
  private formatUserResponse(user: any): UserResponse {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  }
}
