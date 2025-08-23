export const config = {
  port: Number(process.env.PORT) || 3002,
  jwtSecret: process.env.JWT_SECRET!, // ¡Ya no hardcodeado!
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET!,
  database: {
    url: process.env.DATABASE_URL!
  },
  bcrypt: {
    saltRounds: 12
  }
}
