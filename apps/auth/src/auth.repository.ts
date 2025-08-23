import { PrismaClient } from '@prisma/client';
import { User } from './types/index';

export class AuthRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  // Crear usuario
  async createUser(email: string, hashedPassword: string): Promise<User> {
    return await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'USER',
      },
    });
  }

  // Buscar usuario por email
  async findUserByEmail(email: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: { email },
    });
  }

  // Buscar usuario por ID
  async findUserById(id: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: { id },
    });
  }

  // Verificar si email existe
  async emailExists(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    return !!user;
  }

  // Crear refresh token
  async createRefreshToken(token: string, userId: string): Promise<void> {
    await this.prisma.refreshToken.create({
      data: { token, userId },
    });
  }

  // Buscar refresh token
  async findRefreshToken(token: string): Promise<{ userId: string } | null> {
    const refreshToken = await this.prisma.refreshToken.findFirst({
      where: { token },
      select: { userId: true },
    });
    return refreshToken;
  }

  // Eliminar refresh token
  async deleteRefreshToken(token: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { token },
    });
  }

  // Eliminar todos los refresh tokens de un usuario
  async deleteAllRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  // Cerrar conexión
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
