import { z } from 'zod';

// Schema para registro
export const registerSchema = z.object({
  email: z
    .string()
    .email('Email inválido')
    .min(1, 'Email es requerido'),
  password: z
    .string()
    .min(8, 'Password debe tener al menos 8 caracteres')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password debe contener al menos una minúscula, una mayúscula y un número'
    ),
});

// Schema para login
export const loginSchema = z.object({
  email: z
    .string()
    .email('Email inválido')
    .min(1, 'Email es requerido'),
  password: z
    .string()
    .min(1, 'Password es requerido'),
});

// Schema para refresh token
export const refreshTokenSchema = z.object({
  refreshToken: z
    .string()
    .min(1, 'Refresh token es requerido'),
});

// Tipos inferidos de los schemas
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
