# Frontend Architecture

## Overview

This document describes the architectural decisions and patterns used in the POS Frontend application.

## Design Principles

1. **Separation of Concerns** - Each layer has a specific responsibility
2. **Type Safety** - TypeScript strict mode enforced
3. **State Centralization** - Zustand for predictable state management
4. **Component Reusability** - Composable, single-responsibility components
5. **API Abstraction** - Service layer pattern for API calls
6. **Route Protection** - Guard components for authentication & authorization

## Architectural Layers

### 1. Presentation Layer (Components)

**Responsibility**: Render UI and handle user interactions

- **Layout Components** (`components/layouts/`)
  - `MainLayout`: Dashboard layout with header, sidebar, footer
  - `AuthLayout`: Authentication pages layout
  - `AdminLayout`: Admin-specific layout
  
- **Common Components** (`components/common/`)
  - `Header`: Top navigation bar
  - `Sidebar`: Navigation menu with role-based items
  - `Footer`: Bottom footer
  - `Navbar`: Standalone navigation

- **Page Components** (`pages/`)
  - Page-level components for each route
  - Composed from smaller UI components

**Key Principles**:
- Components should be pure (same input = same output)
- Props should be explicitly typed
- Avoid business logic in components
- Use hooks for state and side effects

### 2. Routing Layer (`routes/`)

**Responsibility**: Define route structure and protect routes

- **Route Definitions** (`routes/index.tsx`)
  - Central route configuration
  - Lazy loading for code splitting
  - Error boundary setup

- **Route Guards**
  - `ProtectedRoute`: Authentication check
  - `RoleBasedRoute`: Authorization check

**Flow**:
```
URL Change
    ↓
Router matches route
    ↓
ProtectedRoute checks auth
    ↓
RoleBasedRoute checks roles
    ↓
Component renders
```

### 3. State Management Layer (`store/`)

**Responsibility**: Centralized state management

- **Auth Store** (`store/authStore.ts`)
  - User data and authentication state
  - Login/logout actions
  - Role and permission checks
  - Token management

- **UI Store** (`store/uiStore.ts`)
  - Sidebar collapse state
  - Theme preference
  - Dialog/modal states
  - Toast messages
  - Breadcrumbs

**Zustand Pattern**:
```typescript
export const useStore = create((set, get) => ({
  // State
  value: initialValue,
  
  // Actions
  setValue: (val) => set({ value: val }),
  
  // Selectors
  getState: () => get().value
}));
```

### 4. Service Layer (`services/`)

**Responsibility**: API communication and storage

- **HTTP Client** (`services/api.ts`)
  - Fetch-based HTTP requests
  - Request/response interceptors
  - Token attachment to requests
  - Error handling and retry logic

- **Auth Service** (`services/auth.service.ts`)
  - Login/Register/Logout
  - Token refresh logic
  - Token expiry scheduling
  - JWT decoding

- **Storage Service** (`services/storage.ts`)
  - localStorage wrapper
  - Typed get/set methods
  - Token persistence
  - User data caching

**Service Layer Pattern**:
- Abstracts external dependencies
- Provides clean API for components
- Handles error translation
- Manages side effects

### 5. Type System (`types/`)

**Responsibility**: TypeScript type definitions

- **Auth Types** (`types/auth.types.ts`)
  ```typescript
  - User interface
  - Role and Permission enums
  - Login/Register request/response types
  ```

- **API Types** (`types/api.types.ts`)
  ```typescript
  - ApiResponse wrapper
  - ApiError definition
  - Pagination types
  ```

- **Common Types** (`types/common.types.ts`)
  ```typescript
  - Navigation items
  - Dialog props
  - Form field props
  ```

### 6. Utility Layer (`utils/`)

**Responsibility**: Reusable helper functions

- **Constants** (`utils/constants.ts`)
  - API URLs and timeouts
  - Storage keys
  - Error messages
  - Route definitions
  - Pagination defaults

- **Helpers** (`utils/helpers.ts`)
  - Debounce/throttle
  - Date/currency formatting
  - String utilities
  - Device detection
  - Validation helpers

- **Validators** (`utils/validators.ts`)
  - Zod schemas
  - Form validation
  - Schema composition

## Data Flow

### Authentication Flow

```
LoginPage
    ↓
useForm (React Hook Form)
    ↓
handleSubmit
    ↓
useAuth().login()
    ↓
authService.login()
    ↓
api.post('/auth/login')
    ↓
Response ↔ authStore.setUser()
    ↓
token → storage
    ↓
Redirect to /dashboard
```

### Protected Route Flow

```
Navigate to /dashboard
    ↓
Router matches route
    ↓
ProtectedRoute component
    ↓
useAuthStore().isAuthenticated?
    ├─ YES → Render MainLayout
    └─ NO → Redirect to /login
```

### API Request Flow

```
Component calls api.get()
    ↓
httpClient.get() builds request
    ↓
attachToken() adds Authorization header
    ↓
fetch() sends request
    ↓
Response interceptor
    ├─ 401 → refreshToken()
    ├─ 403 → redirect to /unauthorized
    └─ 5xx → show error toast
    ↓
Return data to component
```

## State Mutation Patterns

### In Components

```typescript
const { user, setUser } = useAuth();

const handleUpdate = async (userData) => {
  await api.put('/users/me', userData);
  setUser(userData); // Update local state
};
```

### In Stores

```typescript
export const useAuthStore = create((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null, isAuthenticated: false })
}));
```

## Performance Optimizations

### 1. Code Splitting
- Route components lazy loaded
- Vendor code splitting in build
- Tree shaking enabled

### 2. Caching
- User data cached in localStorage
- Tokens reused from storage
- API responses not cached (intentional)

### 3. Memoization
- useCallback for stable function references
- useMemo for expensive computations
- Component memoization via React.lazy

### 4. Bundle Size
- Tailwind CSS: No unused styles
- Lucide: Tree-shakeable icons
- No moment.js (using date-fns)

## Security Considerations

### Token Management
- Tokens stored in localStorage (not httpOnly for SPA)
- Automatic refresh 5 minutes before expiry
- Clear tokens on 401 response
- No sensitive data in JWT payload

### Input Validation
- Client-side with Zod schemas
- Server-side validation by backend
- XSS prevention via React auto-escaping
- CSRF token in headers (if needed)

### API Communication
- HTTPS enforced in production
- CORS properly configured
- Sensitive data not logged
- Error messages don't leak internals

## Error Handling Strategy

### Component Level
```typescript
try {
  await action();
} catch (error) {
  showErrorToast(error.message);
  setError(error);
}
```

### Service Level
```typescript
export class AuthService {
  async login(email, password) {
    try {
      const response = await api.post('/auth/login', { email, password });
      return response.data;
    } catch (error) {
      throw new ApiError(error.message, error.statusCode);
    }
  }
}
```

### Global Error Handling
- 401: Auto-logout and redirect
- 403: Show unauthorized page
- 5xx: Show error toast
- Network errors: Retry with exponential backoff

## Testing Strategy

### Unit Tests
- Utility functions
- Validators
- Service methods

### Integration Tests
- API interactions
- State store updates
- Route guard logic

### E2E Tests
- User flows
- Authentication
- Role-based access

## Deployment Architecture

```
Frontend (React)
    ↓
Static Files (HTML, CSS, JS)
    ↓
CDN/Hosting Provider
    ↓
Browser Cache
    ↓
User Device
```

### Environment-Specific Config
- Development: `http://localhost:3001/api`
- Staging: `https://staging-api.example.com/api`
- Production: `https://api.example.com/api`

## Future Improvements

1. **Internationalization (i18n)**
   - Multiple language support
   - Locale-specific formatting

2. **Advanced Caching**
   - React Query for server state
   - Stale-while-revalidate
   - Offline support

3. **Performance Monitoring**
   - Web Vitals tracking
   - Error tracking (Sentry)
   - Performance budgets

4. **Accessibility**
   - WCAG 2.1 AA compliance
   - Keyboard navigation
   - Screen reader support

5. **Testing Coverage**
   - Unit tests: 80%+ coverage
   - Integration tests for flows
   - Visual regression testing

## References

- [React Architecture Best Practices](https://react.dev)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Design Patterns](https://refactoring.guru/design-patterns)
- [Clean Code Principles](https://en.wikipedia.org/wiki/Clean_code)

---

**Version**: 1.0.0
**Last Updated**: February 2026
