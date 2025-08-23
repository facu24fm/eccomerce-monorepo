import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './services/auth.service';

/**
 * Middleware de autenticación para proteger rutas y verificar tokens JWT
 * 
 * @class AuthMiddleware
 * @description Proporciona middleware para verificar tokens JWT, autorizar roles
 * y manejar autenticación opcional en rutas públicas.
 */
export class AuthMiddleware {
  /** Servicio de autenticación para verificación de tokens */
  private authService: AuthService;

  /**
   * Constructor del middleware de autenticación
   * Inicializa el servicio de autenticación
   */
  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Middleware para verificar tokens JWT en requests autenticados
   * 
   * @param {FastifyRequest} request - Request de Fastify
   * @param {FastifyReply} reply - Response de Fastify
   * @returns {Promise<void>} Continúa al siguiente handler o retorna error 401
   * 
   * @throws {401} Token de acceso requerido, formato inválido, o token expirado
   * 
   * @description
   * - Extrae el token del header Authorization (formato: "Bearer TOKEN")
   * - Verifica la validez del token JWT
   * - Agrega información del usuario al request (userId, role)
   * - Permite continuar con el request si el token es válido
   */
  async verifyToken(request: FastifyRequest, reply: FastifyReply) {
    try {
      const authHeader = request.headers.authorization;

      if (!authHeader) {
        return reply.code(401).send({
          success: false,
          message: 'Token de acceso requerido'
        });
      }

      // Extraer token del header "Bearer TOKEN"
      const token = authHeader.split(' ')[1];
      
      if (!token) {
        return reply.code(401).send({
          success: false,
          message: 'Formato de token inválido'
        });
      }

      // Verificar token
      const decoded = this.authService.verifyAccessToken(token);

      // Agregar información del usuario al request
      (request as any).user = {
        userId: decoded.userId,
        role: decoded.role
      };

      // Continuar con la siguiente función
      return;
    } catch (error) {
      return reply.code(401).send({
        success: false,
        message: 'Token inválido o expirado'
      });
    }
  }

  /**
   * Middleware para verificar que el usuario tiene rol de administrador
   * 
   * @param {FastifyRequest} request - Request de Fastify (debe tener request.user)
   * @param {FastifyReply} reply - Response de Fastify
   * @returns {Promise<void>} Continúa al siguiente handler o retorna error 403
   * 
   * @throws {403} Acceso denegado si no es administrador
   * 
   * @description
   * - Debe ejecutarse DESPUÉS del middleware verifyToken
   * - Verifica que request.user.role === 'ADMIN'
   * - Bloquea acceso a usuarios regulares
   */
  async verifyAdmin(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;

    if (!user || user.role !== 'ADMIN') {
      return reply.code(403).send({
        success: false,
        message: 'Acceso denegado. Se requieren permisos de administrador'
      });
    }

    return;
  }

  /**
   * Middleware de autenticación opcional para rutas públicas
   * 
   * @param {FastifyRequest} request - Request de Fastify
   * @param {FastifyReply} reply - Response de Fastify
   * @returns {Promise<void>} Siempre continúa al siguiente handler
   * 
   * @description
   * - NO falla si no hay token de autenticación
   * - Si hay token válido, agrega request.user
   * - Si no hay token o es inválido, continúa sin request.user
   * - Útil para rutas que pueden funcionar con o sin autenticación
   */
  async optionalAuth(request: FastifyRequest, _: FastifyReply) {
    try {
      const authHeader = request.headers.authorization;
      
      if (authHeader) {
        const token = authHeader.split(' ')[1];
        
        if (token) {
          const decoded = this.authService.verifyAccessToken(token);
          (request as any).user = {
            userId: decoded.userId,
            role: decoded.role
          };
        }
      }
      
      return;
    } catch (error) {
      // No hacer nada, continuar sin autenticación
      return;
    }
  }
}
