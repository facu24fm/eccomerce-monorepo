import Fastify from 'fastify';
import fastifyAxios from 'fastify-axios';

const server = Fastify({
  logger: true,
});

// Registra el plugin de axios para hacer peticiones HTTP
server.register(fastifyAxios, {
  clients: {
    authService: {
      baseURL: 'http://localhost:3002', 
    },
  },
});

// Endpoint de salud
server.get('/health', async (request, reply) => {
  return { status: 'ok' };
});

// Delegar la petición de registro al servicio auth
server.post('/api/auth/register', async (request, reply) => {
  try {
    const response = await server.axios.authService.post('/register', request.body);
    reply.code(response.status).send(response.data);
  } catch (error: any) {
    reply.code(error.response?.status || 500).send(error.response?.data || { message: 'Internal Server Error' });
  }
});

// Delegar la petición de login al servicio auth
server.post('/api/auth/login', async (request, reply) => {
  try {
    const response = await server.axios.authService.post('/login', request.body);
    reply.code(response.status).send(response.data);
  } catch (error: any) {
    reply.code(error.response?.status || 500).send(error.response?.data || { message: 'Internal Server Error' });
    console.log(error);
  }
});

const start = async () => {
  try {
    await server.listen({ port: 3003 });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();