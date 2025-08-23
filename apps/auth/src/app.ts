import Fastify from 'fastify';
import { AuthController } from './auth.controller';
import { AuthMiddleware } from './auth.middleware';
import { config } from './config';

// Crear instancia de Fastify
const server = Fastify({ 
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true
      }
    }
  }
});

// Instancias de controladores y middleware
const authController = new AuthController();
const authMiddleware = new AuthMiddleware();

// CORS para desarrollo
server.register(require('@fastify/cors'), {
  origin: ['http://localhost:3000', 'http://localhost:3001'], // Frontend URLs
  credentials: true
});

// Health check
server.get('/health', async () => {
  return { 
    status: 'ok', 
    service: 'auth-service',
    timestamp: new Date().toISOString()
  };
});

// Rutas públicas (sin autenticación)
server.post('/register', authController.register.bind(authController));
server.post('/login', authController.login.bind(authController));
server.post('/refresh', authController.refreshToken.bind(authController));
server.post('/logout', authController.logout.bind(authController));

// Rutas protegidas (requieren autenticación)
server.register(async function (fastify) {
  // Aplicar middleware de autenticación a todas las rutas de este grupo
  fastify.addHook('preHandler', authMiddleware.verifyToken.bind(authMiddleware));
  
  // Ruta para obtener perfil
  fastify.get('/profile', authController.getProfile.bind(authController));
});

// Rutas de admin (requieren autenticación + rol admin)
server.register(async function (fastify) {
  // Aplicar middleware de autenticación y verificación de admin
  fastify.addHook('preHandler', authMiddleware.verifyToken.bind(authMiddleware));
  fastify.addHook('preHandler', authMiddleware.verifyAdmin.bind(authMiddleware));
  
  // Aquí irían rutas de administración
  fastify.get('/admin/users', async () => {
    return { message: 'Lista de usuarios - Solo admins' };
  });
});

// Manejo global de errores
server.setErrorHandler((error, _, reply) => {
  server.log.error(error);
  
  reply.code(500).send({
    success: false,
    message: 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { error: error.message })
  });
});

// Función para iniciar el servidor
export const startServer = async () => {
  try {
    await server.listen({ 
      port: config.port, 
      host: '0.0.0.0' // Para Docker
    });
    
    server.log.info(`🔐 Auth service listening on port ${config.port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

export { server };
