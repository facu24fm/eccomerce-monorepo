# Auth Service Setup

## Architecture

Professional layered architecture with separation of concerns:

```
Controller → Service → Repository → Database
    ↑           ↑
Middleware   Schemas
```

- **Controller**: HTTP handling, validation, responses
- **Service**: Business logic, JWT, password hashing
- **Repository**: Data access with Prisma
- **Middleware**: Authentication and authorization
- **Schemas**: Input validation with Zod

## Database Setup

```bash
# PostgreSQL with Docker
sudo docker run --name postgres-auth \
  -e POSTGRES_USER=ecommerce \
  -e POSTGRES_PASSWORD=password123 \
  -e POSTGRES_DB=ecommerce_db \
  -p 5433:5432 \
  -d postgres:15

# Run migrations
DATABASE_URL="postgresql://ecommerce:password123@localhost:5433/ecommerce_db" \
pnpm prisma migrate dev --name init
```

## Environment Variables

Edit `.env`:
```
DATABASE_URL=postgresql://ecommerce:password123@localhost:5433/ecommerce_db
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
PORT=3003
```

## Start Server

```bash
DATABASE_URL="postgresql://ecommerce:password123@localhost:5433/ecommerce_db" \
JWT_SECRET="test-secret-key" \
JWT_REFRESH_SECRET="test-refresh-secret" \
PORT=3003 \
pnpm dev
```

## API Endpoints

- `GET /health` - Health check
- `POST /register` - User registration
- `POST /login` - User authentication
- `POST /refresh` - Token refresh
- `POST /logout` - User logout
- `GET /profile` - Get user profile (protected)

## Testing

Import `postman-collection.json` into Postman with environment:
- `baseUrl`: `http://localhost:3003`
- `accessToken`: (empty)
- `refreshToken`: (empty)

Test flow: Health Check → Register → Login → Profile → Refresh → Logout
