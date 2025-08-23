import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const server = Fastify({ logger: true });

// Ruta para crear un producto
server.post('/products', async (request, reply) => {
  const { name, description, price } = request.body as any;
  const product = await prisma.product.create({
    data: { name, description, price },
  });
  return product;
});

// Ruta para listar todos los productos
server.get('/products', async (request, reply) => {
  const products = await prisma.product.findMany();
  return products;
});

const start = async () => {
  try {
    await server.listen({ port: 3004 });
    server.log.info(`Catalog service listening on port 3004`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();