import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './services/auth.service';
import { 
  registerSchema,
  loginSchema,
  refreshTokenSchema
} from './auth.schemas';
import { AuthError } from './types/index';

/**
 * Controlador de autenticación que maneja las peticiones HTTP
 * y coordina con el servicio de autenticación.
 * 
 * @class AuthController
 * @description Maneja endpoints REST para registro, login, refresh tokens,
 * logout y gestión de perfiles. Incluye validación de entrada y manejo de errores.
 * 

 */
export class AuthController {
  /** Servicio de autenticación para lógica de negocio */
  private authService: AuthService;

  /**
   * Constructor del controlador de autenticación
   * Inicializa el servicio de autenticación
   */
  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Endpoint para registrar un nuevo usuario
   * 
   * @param {FastifyRequest} request - Request de Fastify con body {email, password}
   * @param {FastifyReply} reply - Response de Fastify
   * @returns {Promise<FastifyReply>} Respuesta con usuario creado y tokens
   * 
   * @throws {400} Error de validación de datos de entrada
   * @throws {409} Email ya registrado
   * @throws {500} Error interno del servidor
   */
  async register(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Validar datos de entrada
      const validatedData = registerSchema.parse(request.body);
      const { email, password } = validatedData;

      // Llamar al service
      const result = await this.authService.register(email, password);

      return reply.code(201).send({
        success: true,
        message: 'Usuario registrado exitosamente',
        data: result
      });
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  /**
   * Endpoint para autenticar un usuario existente
   * 
   * @param {FastifyRequest} request - Request de Fastify con body {email, password}
   * @param {FastifyReply} reply - Response de Fastify
   * @returns {Promise<FastifyReply>} Respuesta con usuario autenticado y tokens
   * 
   * @throws {400} Error de validación de datos de entrada
   * @throws {401} Credenciales inválidas
   * @throws {500} Error interno del servidor
   */
  async login(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Validar datos de entrada
      const validatedData = loginSchema.parse(request.body);
      const { email, password } = validatedData;

      // Llamar al service
      const result = await this.authService.login(email, password);

      return reply.code(200).send({
        success: true,
        message: 'Login exitoso',
        data: result
      });
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  /**
   * Endpoint para refrescar tokens JWT
   * 
   * @param {FastifyRequest} request - Request de Fastify con body {refreshToken}
   * @param {FastifyReply} reply - Response de Fastify
   * @returns {Promise<FastifyReply>} Respuesta con nuevos tokens
   * 
   * @throws {400} Error de validación de datos de entrada
   * @throws {401} Refresh token inválido o expirado
   * @throws {404} Refresh token no encontrado en BD
   * @throws {500} Error interno del servidor
   */
  async refreshToken(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Validar datos de entrada
      const validatedData = refreshTokenSchema.parse(request.body);
      const { refreshToken } = validatedData;

      // Llamar al service
      const result = await this.authService.refreshToken(refreshToken);

      return reply.code(200).send({
        success: true,
        message: 'Token refrescado exitosamente',
        data: result
      });
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  /**
   * Endpoint para cerrar sesión del usuario
   * 
   * @param {FastifyRequest} request - Request de Fastify con body {refreshToken}
   * @param {FastifyReply} reply - Response de Fastify
   * @returns {Promise<FastifyReply>} Confirmación de logout exitoso
   * 
   * @throws {400} Error de validación de datos de entrada
   * @throws {404} Refresh token no encontrado
   * @throws {500} Error interno del servidor
   */
  async logout(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Validar datos de entrada
      const validatedData = refreshTokenSchema.parse(request.body);
      const { refreshToken } = validatedData;

      // Llamar al service
      await this.authService.logout(refreshToken);

      return reply.code(200).send({
        success: true,
        message: 'Logout exitoso'
      });
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  /**
   * Endpoint para obtener el perfil del usuario autenticado
   * 
   * @param {FastifyRequest} request - Request de Fastify (requiere Authorization header)
   * @param {FastifyReply} reply - Response de Fastify
   * @returns {Promise<FastifyReply>} Respuesta con datos del perfil
   * 
   * @throws {401} Token de acceso requerido o inválido
   * @throws {404} Usuario no encontrado
   * @throws {500} Error interno del servidor
   */
  async getProfile(request: FastifyRequest, reply: FastifyReply) {
    try {
      // El userId viene del middleware de autenticación
      const userId = (request as any).user?.userId;
      
      if (!userId) {
        return reply.code(401).send({
          success: false,
          message: 'Token de acceso requerido'
        });
      }

      // Llamar al service
      const user = await this.authService.getProfile(userId);

      return reply.code(200).send({
        success: true,
        message: 'Perfil obtenido exitosamente',
        data: { user }
      });
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  /**
   * Maneja errores de forma centralizada y consistente
   * 
   * @private
   * @param {any} error - Error capturado
   * @param {FastifyReply} reply - Response de Fastify para enviar error
   * @returns {FastifyReply} Respuesta de error formateada
   * 
   * @description
   * Maneja diferentes tipos de errores:
   * - ZodError: Errores de validación (400)
   * - AuthError: Errores personalizados de autenticación (401/403/404/409)
   * - Error genérico: Error interno del servidor (500)
   */
  private handleError(error: any, reply: FastifyReply) {
    console.error('Auth Controller Error:', error);

    // Error de validación de Zod
    if (error.name === 'ZodError') {
      return reply.code(400).send({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: error.errors.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }

    // Errores personalizados de Auth
    if (error instanceof AuthError) {
      return reply.code(error.statusCode).send({
        success: false,
        message: error.message,
        code: error.code
      });
    }

    // Error genérico
    return reply.code(500).send({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}
