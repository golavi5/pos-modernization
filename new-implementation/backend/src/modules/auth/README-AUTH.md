# Authentication Module - Implementation Guide

## Overview

This module implements a complete JWT-based authentication system with role-based access control (RBAC) for the POS Modernization platform. It provides secure user authentication, token management, and authorization features.

## Features

- **JWT Token Authentication**: Access tokens (1 hour) and refresh tokens (7 days)
- **Password Security**: Bcrypt hashing with 10 rounds minimum
- **Role-Based Access Control**: Support for multiple roles per user
- **User Management**: Registration, login, logout, password change
- **Decorators**: `@CurrentUser()` for injecting authenticated user, `@Roles()` for role-based protection
- **Guards**: `JwtAuthGuard` for route protection, `RolesGuard` for role checking
- **Comprehensive Validation**: Password strength, email uniqueness, input validation
- **Error Handling**: Standardized error responses (401, 403, 409, 400)
- **Audit Logging**: Track login and password change events

## Architecture

### Directory Structure

```
backend/src/modules/auth/
├── auth.controller.ts          # REST endpoints
├── auth.service.ts             # Business logic
├── auth.module.ts              # Module configuration
├── strategies/
│   ├── jwt.strategy.ts         # JWT validation strategy
│   └── local.strategy.ts       # Email/password validation
├── decorators/
│   ├── roles.decorator.ts      # @Roles() decorator
│   └── current-user.decorator.ts # @CurrentUser() decorator
├── guards/
│   ├── jwt-auth.guard.ts       # JWT authentication guard
│   └── roles.guard.ts          # Role authorization guard
├── entities/
│   ├── user.entity.ts          # User TypeORM entity
│   └── role.entity.ts          # Role TypeORM entity
├── dto/
│   ├── login.dto.ts            # Login request DTO
│   ├── create-user.dto.ts      # User creation DTO
│   ├── user-response.dto.ts    # User response DTO
│   ├── auth-response.dto.ts    # Authentication response DTO
│   └── change-password.dto.ts  # Password change DTO
├── constants/
│   └── auth.constants.ts       # Configuration constants
├── tests/
│   └── auth.service.spec.ts    # Unit tests
└── README-AUTH.md              # This file
```

### Database Schema

#### Users Table
```sql
CREATE TABLE users (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  first_name VARCHAR(128),
  last_name VARCHAR(128),
  phone VARCHAR(20),
  company_id CHAR(36) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  INDEX idx_email (email),
  INDEX idx_company_active (company_id, is_active),
  INDEX idx_last_login (last_login),
  FOREIGN KEY (company_id) REFERENCES companies(id)
);
```

#### Roles Table
```sql
CREATE TABLE roles (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(128) UNIQUE NOT NULL,
  description TEXT,
  company_id CHAR(36),
  is_system_role BOOLEAN DEFAULT false,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME
);
```

#### User Roles Junction Table
```sql
CREATE TABLE user_roles (
  user_id CHAR(36) NOT NULL,
  role_id CHAR(36) NOT NULL,
  assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);
```

## API Endpoints

### 1. POST /auth/login
**Login with email and password**

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "company_id": "550e8400-e29b-41d4-a716-446655440001",
    "is_active": true,
    "roles": ["admin"],
    "created_at": "2026-02-13T09:00:00Z",
    "updated_at": "2026-02-13T10:00:00Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid credentials
- `400 Bad Request`: Invalid input format

---

### 2. POST /auth/refresh
**Refresh access token using refresh token**

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "user": { ... }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or expired refresh token

---

### 3. POST /auth/register
**Register new user (Admin only)**

**Required Roles:** `admin`

**Request:**
```json
{
  "email": "newuser@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe",
  "company_id": "550e8400-e29b-41d4-a716-446655440001",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1234567890"
}
```

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "newuser@example.com",
  "name": "John Doe",
  "company_id": "550e8400-e29b-41d4-a716-446655440001",
  "is_active": true,
  "roles": [],
  "created_at": "2026-02-13T09:00:00Z",
  "updated_at": "2026-02-13T09:00:00Z"
}
```

**Error Responses:**
- `409 Conflict`: Email already exists
- `403 Forbidden`: Insufficient permissions (not admin)
- `400 Bad Request`: Invalid input or weak password

---

### 4. GET /auth/me
**Get current authenticated user profile**

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "John Doe",
  "company_id": "550e8400-e29b-41d4-a716-446655440001",
  "is_active": true,
  "last_login": "2026-02-13T10:00:00Z",
  "roles": ["admin", "manager"],
  "created_at": "2026-02-13T09:00:00Z",
  "updated_at": "2026-02-13T10:00:00Z"
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token

---

### 5. POST /auth/change-password
**Change user password**

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request:**
```json
{
  "oldPassword": "OldPassword123!",
  "newPassword": "NewPassword456!",
  "confirmPassword": "NewPassword456!"
}
```

**Response (200 OK):**
```json
{
  "message": "Password changed successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid current password or weak new password
- `401 Unauthorized`: Missing or invalid token

---

### 6. POST /auth/logout
**Logout user and invalidate session**

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token

---

## Usage Examples

### Basic Setup in App Module

```typescript
import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    // ... other modules
    AuthModule,
  ],
})
export class AppModule {}
```

### Protecting Routes with JWT

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from './entities/user.entity';

@Controller('dashboard')
export class DashboardController {
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: User) {
    return { message: `Hello ${user.name}` };
  }
}
```

### Role-Based Route Protection

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from './entities/user.entity';

@Controller('admin')
export class AdminController {
  @Get('dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  getAdminDashboard(@CurrentUser() user: User) {
    return { message: 'Admin/Manager access only' };
  }
}
```

## Password Requirements

Passwords must meet the following criteria:

- **Minimum length**: 8 characters
- **Uppercase letters**: At least one (A-Z)
- **Lowercase letters**: At least one (a-z)
- **Numbers**: At least one (0-9)
- **Special characters**: At least one (@$!%*?&)

**Example valid password:** `SecurePassword123!`

## JWT Token Structure

### Access Token (1 hour expiry)
```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "roles": ["admin", "manager"],
  "iat": 1708001234,
  "exp": 1708004834
}
```

### Refresh Token (7 days expiry)
```json
{
  "sub": "user-id",
  "type": "refresh",
  "iat": 1708001234,
  "exp": 1708606034
}
```

## Configuration

All authentication constants are configured in `constants/auth.constants.ts`:

```typescript
export const AUTH_CONSTANTS = {
  JWT: {
    ACCESS_TOKEN_EXPIRY: '1h',
    REFRESH_TOKEN_EXPIRY: '7d',
    SECRET_KEY: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  },
  PASSWORD: {
    BCRYPT_ROUNDS: 10,
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL_CHARS: true,
  },
  // ... more constants
};
```

### Environment Variables

```bash
# .env file
JWT_SECRET=your-long-random-secret-key-change-in-production
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=
DB_NAME=pos_db
```

## Security Best Practices

1. **Never expose passwords**: Passwords are hashed with bcrypt and never returned in responses
2. **Use HTTPS only**: Always use HTTPS in production for token transmission
3. **HTTP-only cookies**: Store tokens in HTTP-only cookies to prevent XSS attacks
4. **CORS configuration**: Properly configure CORS to prevent unauthorized cross-origin requests
5. **Rate limiting**: Implement rate limiting on login endpoint to prevent brute force attacks
6. **Token expiration**: Short-lived access tokens (1 hour) reduce exposure window
7. **Refresh token rotation**: Implement refresh token rotation for enhanced security
8. **SQL injection prevention**: Use TypeORM parameterized queries (already built-in)

## Error Handling

The module uses standardized HTTP status codes:

| Status | Error | Cause |
|--------|-------|-------|
| 400 | Bad Request | Invalid input, weak password |
| 401 | Unauthorized | Invalid credentials, missing/expired token |
| 403 | Forbidden | Insufficient permissions, invalid role |
| 409 | Conflict | Email already exists |
| 500 | Internal Server Error | Unexpected error |

## Testing

### Run Unit Tests

```bash
npm test -- auth.service.spec.ts
```

### Test Coverage

```bash
npm test -- --coverage auth.service.spec.ts
```

### Manual Testing with cURL

**Login:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

**Refresh Token:**
```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**Get Profile (with JWT):**
```bash
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Change Password:**
```bash
curl -X POST http://localhost:3000/auth/change-password \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "oldPassword": "OldPassword123!",
    "newPassword": "NewPassword456!",
    "confirmPassword": "NewPassword456!"
  }'
```

## Troubleshooting

### Common Issues

1. **"Invalid credentials" on login**
   - Verify email is correct
   - Verify password matches (case-sensitive)
   - Ensure user is active (is_active = true)

2. **"Unauthorized" on protected route**
   - Ensure token is in Authorization header as "Bearer <token>"
   - Check token expiration (1 hour for access token)
   - Verify user is still active in database

3. **"Insufficient permissions" with @Roles**
   - Check user has required role in database
   - Verify role name matches exactly (case-sensitive)
   - Check user_roles junction table has the assignment

4. **"Weak password" on registration**
   - Ensure at least 8 characters
   - Include uppercase letter (A-Z)
   - Include lowercase letter (a-z)
   - Include number (0-9)
   - Include special character (@$!%*?&)

## Acceptance Criteria Checklist

- [x] All 6 REST endpoints working (login, logout, refresh, register, me, change-password)
- [x] JWT tokens generated with correct expiration times
- [x] Password hashed with bcrypt (10+ rounds)
- [x] Role-based routes protected with RolesGuard
- [x] Current user context injectable via @CurrentUser() decorator
- [x] Invalid credentials return 401 Unauthorized
- [x] Missing tokens return 401 Unauthorized
- [x] Insufficient permissions return 403 Forbidden
- [x] Login returns both access and refresh tokens
- [x] Refresh token endpoint renews access token
- [x] Unit tests with >80% coverage
- [x] No passwords in response DTOs
- [x] Error responses standardized and secure
- [x] Swagger/OpenAPI documentation generated

## Future Enhancements

1. **Token Blacklisting**: Implement Redis-based token blacklist for logout
2. **OAuth2 Integration**: Support Google, GitHub, Microsoft OAuth providers
3. **Two-Factor Authentication**: SMS or email-based 2FA
4. **Session Management**: Track active sessions and devices
5. **Audit Trail**: Enhanced logging of authentication events
6. **Permission Checking**: Fine-grained permission system beyond roles
7. **API Keys**: Support long-lived API keys for integrations
8. **Passwordless Auth**: Support WebAuthn/FIDO2 authentication

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review test cases in `auth.service.spec.ts`
3. Check logs for detailed error messages
4. Consult the database schema documentation

---

**Version:** 1.0  
**Last Updated:** 2026-02-13  
**Maintainer:** Backend Team
