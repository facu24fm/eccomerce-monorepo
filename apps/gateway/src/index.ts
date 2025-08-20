import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const server = Fastify({
  logger: true,
});

// Endpoint de prueba para la salud del servidor
server.get('/health', async (request, reply) => {
  return { status: 'ok' };
});

// Endpoint de prueba para crear un usuario en la base de datos
server.post('/users', async (request, reply) => {
  const { email, password } = request.body as any; 
  const user = await prisma.user.create({
    data: {
      email,
      password,
    },
  });
  return user;
});

const start = async () => {
  try {
    await server.listen({ port: 3001 });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();