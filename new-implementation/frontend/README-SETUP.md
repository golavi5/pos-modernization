# POS Frontend Setup Guide

## Project Structure

```
src/
├── index.tsx                  # Entry point
├── main.tsx                   # React DOM render
├── App.tsx                    # Root component with routing
├── vite-env.d.ts             # Vite environment types
│
├── components/
│   ├── common/
│   │   ├── Header.tsx        # Top navigation with user profile
│   │   ├── Sidebar.tsx       # Navigation menu (collapsible)
│   │   ├── Footer.tsx        # Bottom footer
│   │   └── Navbar.tsx        # Standalone navbar
│   │
│   ├── layouts/
│   │   ├── MainLayout.tsx    # Dashboard layout
│   │   ├── AuthLayout.tsx    # Auth pages layout
│   │   └── AdminLayout.tsx   # Admin pages layout
│   │
│   └── ui/                    # Radix UI components (optional)
│
├── pages/
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   └── ForgotPasswordPage.tsx
│   │
│   ├── dashboard/
│   │   └── DashboardPage.tsx
│   │
│   ├── NotFoundPage.tsx       # 404
│   └── UnauthorizedPage.tsx   # 403
│
├── routes/
│   ├── index.tsx             # Route definitions
│   ├── ProtectedRoute.tsx    # Auth guard component
│   └── RoleBasedRoute.tsx    # RBAC guard component
│
├── hooks/
│   ├── useAuth.ts            # Auth state and actions
│   └── useApi.ts             # API request hook
│
├── services/
│   ├── api.ts                # HTTP client with fetch
│   ├── auth.service.ts       # Authentication service
│   └── storage.ts            # localStorage wrapper
│
├── store/
│   ├── authStore.ts          # Zustand auth store
│   └── uiStore.ts            # Zustand UI store
│
├── types/
│   ├── auth.types.ts         # Auth-related types
│   ├── api.types.ts          # API-related types
│   └── common.types.ts       # Common UI types
│
├── utils/
│   ├── constants.ts          # Constants and config
│   ├── helpers.ts            # Utility functions
│   └── validators.ts         # Zod schemas
│
├── styles/
│   └── index.css             # Tailwind imports
│
└── App.css                    # Global styles
```

## Technology Stack

- **React 18** - UI library
- **TypeScript 5** - Type safety
- **Vite 4** - Build tool & dev server
- **React Router v6** - Client-side routing
- **Zustand** - State management
- **TailwindCSS 3** - Utility-first CSS
- **Radix UI** - Headless UI components
- **React Hook Form** - Form management
- **Zod** - Schema validation
- **Lucide React** - Icon library

## Getting Started

### Installation

```bash
cd frontend
npm install
```

### Environment Setup

1. Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

2. Update environment variables as needed:
```env
VITE_API_BASE_URL=http://localhost:3001/api
VITE_APP_NAME=POS System
VITE_APP_VERSION=1.0.0
```

### Development

Start the development server:
```bash
npm run dev
```

Server will run at `http://localhost:3000`

### Building

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

### Linting

Check for linting errors:
```bash
npm run lint
```

## Authentication Flow

1. **Login**: User enters credentials → `LoginPage`
2. **API Call**: `authService.login()` sends request to backend
3. **Token Storage**: Access & refresh tokens stored in `localStorage`
4. **Store Update**: `authStore` updated with user data
5. **Protected Routes**: `ProtectedRoute` checks authentication
6. **Token Refresh**: Automatic refresh before expiry
7. **Logout**: Clears tokens and redirects to login

## Route Structure

### Public Routes
- `/login` - Login form
- `/register` - Registration form
- `/forgot-password` - Password reset request
- `/404` - Not found page

### Protected Routes
- `/dashboard` - Main dashboard
- `/dashboard/sales` - Sales page (Manager+)
- `/dashboard/products` - Products page (Manager+)
- `/dashboard/customers` - Customers page (Cashier+)
- `/dashboard/inventory` - Inventory (Manager+)
- `/dashboard/reports` - Reports (Manager+)

### Admin Routes
- `/admin` - Admin dashboard
- `/admin/settings` - System settings
- `/admin/users` - User management
- `/admin/audit-log` - Audit log

### Error Routes
- `/unauthorized` - 403 Forbidden
- `/404` or `*` - Not found

## State Management (Zustand)

### Auth Store (`useAuthStore`)
```typescript
const { user, isAuthenticated, loading, error } = useAuthStore();
await useAuthStore().login(email, password);
await useAuthStore().logout();
```

### UI Store (`useUIStore`)
```typescript
const { sidebarCollapsed, theme, mobileMenuOpen } = useUIStore();
useUIStore().setSidebarCollapsed(!sidebarCollapsed);
useUIStore().setTheme('dark');
```

## API Service

### Making Requests
```typescript
import { api } from '@/services/api';

// GET
const response = await api.get<User>('/users/me');

// POST
const response = await api.post<LoginResponse>('/auth/login', {
  email: 'user@example.com',
  password: 'password123'
});

// PUT
const response = await api.put<User>('/users/1', userData);

// DELETE
const response = await api.delete<void>('/users/1');
```

### API Response Format
```typescript
interface ApiResponse<T> {
  data: T;
  message: string;
  statusCode: number;
  success: boolean;
}
```

### Error Handling
- 401 Responses: Triggers token refresh or logout
- Network errors: User-friendly error messages
- Validation errors: Field-level errors from backend

## Form Validation (React Hook Form + Zod)

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@/utils/validators';

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(loginSchema)
});
```

## Component Patterns

### Layout with Protected Route
```typescript
<ProtectedRoute>
  <MainLayout />
</ProtectedRoute>
```

### Layout with Role-Based Access
```typescript
<ProtectedRoute>
  <RoleBasedRoute requiredRoles={['admin']}>
    <AdminLayout />
  </RoleBasedRoute>
</ProtectedRoute>
```

### Using useAuth Hook
```typescript
const { user, isAuthenticated, login, logout } = useAuth();

const handleLogin = async () => {
  try {
    await login(email, password);
    navigate('/dashboard');
  } catch (error) {
    console.error('Login failed:', error);
  }
};
```

### Using useApi Hook
```typescript
const { data, loading, error, get, post } = useApi<User>();

const fetchUser = async () => {
  const userData = await get('/users/me', {
    onSuccess: (data) => console.log('User loaded:', data),
    onError: (error) => console.error('Failed to load user:', error)
  });
};
```

## Responsive Design

### Breakpoints (Tailwind)
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

### Mobile Menu
- Hamburger toggle on `md` breakpoint
- Sidebar becomes drawer on mobile
- Touch-friendly buttons and spacing

## Performance

### Code Splitting
- Route components lazy loaded with `React.lazy()`
- Vendor code splitting in build config
- Tree shaking enabled for unused imports

### Token Management
- Automatic token refresh 5 minutes before expiry
- Tokens stored in localStorage
- Clear auth on 401 response

## Debugging

### Development Tools
- React DevTools browser extension
- Zustand DevTools for state inspection
- Console logging for API calls

### Common Issues

**Token not persisting on refresh**
- Check localStorage in DevTools
- Verify `authStore.initializeAuth()` is called in `App.tsx`

**Routes not loading**
- Check route definitions in `routes/index.tsx`
- Verify `BrowserRouter` is in main.tsx

**API calls failing**
- Check `VITE_API_BASE_URL` in `.env.local`
- Verify backend is running and accessible
- Check CORS configuration

## Best Practices

1. **Always use Zustand hooks** - Avoid Redux complexity
2. **Type everything** - Use TypeScript strictly
3. **Validate forms** - Use Zod schemas for validation
4. **Handle loading states** - Show spinners for async operations
5. **Centralize API calls** - Use service layer pattern
6. **Path aliases** - Use `@/` imports for cleaner code
7. **Component composition** - Break into smaller components
8. **Semantic HTML** - Use proper HTML elements for accessibility
9. **Error boundaries** - Catch component errors gracefully
10. **Environment variables** - Never hardcode API URLs

## Deployment

### Build for Production
```bash
npm run build
```

### Environment Configuration
Update `.env.local` for production:
```env
VITE_API_BASE_URL=https://api.example.com/api
VITE_APP_NAME=POS System
VITE_APP_VERSION=1.0.0
```

### Deployment Options
- **Vercel** - Recommended for Next.js-like experience
- **Netlify** - Simple drag-and-drop deployment
- **AWS S3 + CloudFront** - Production-grade CDN
- **Docker** - Containerized deployment

## Troubleshooting

### Port 3000 Already in Use
```bash
# On macOS/Linux
lsof -i :3000
kill -9 <PID>

# On Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Module Not Found
- Ensure path aliases are configured in both `vite.config.ts` and `tsconfig.json`
- Restart dev server after config changes

### TypeScript Errors
- Run `npm run build` to see all errors
- Check tsconfig.json for strict mode settings

## Resources

- [React Documentation](https://react.dev)
- [React Router v6](https://reactrouter.com)
- [Zustand](https://github.com/pmndrs/zustand)
- [TailwindCSS](https://tailwindcss.com)
- [Radix UI](https://www.radix-ui.com)
- [React Hook Form](https://react-hook-form.com)
- [Zod](https://zod.dev)
- [Vite](https://vitejs.dev)

## Support

For issues or questions:
1. Check existing documentation
2. Search GitHub issues
3. Contact development team
4. Create new issue with reproduction steps

---

**Last Updated**: February 2026
**Version**: 1.0.0
