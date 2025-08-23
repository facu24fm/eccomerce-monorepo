import { startServer } from './app';

// Validar variables de entorno críticas
const requiredEnvVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DATABASE_URL'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('variables de entorno críticas:', missingEnvVars.join(', '));
  console.error('por favor setear estas variables de entorno antes de iniciar el servidor.');
  process.exit(1);
}

// Iniciar servidor
startServer().catch((error) => {
  console.error('falla al iniciar auth service:', error);
  process.exit(1);
});
