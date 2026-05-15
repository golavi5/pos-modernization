# Implementation Plan: Dark Mode & i18n (Spanish Default)

## Overview
Add dark mode and internationalization (i18n) support to the POS Modernization frontend application, with Spanish as the default language.

## Current State Analysis

### Tech Stack
- Next.js 14 with App Router
- TypeScript
- Tailwind CSS with shadcn/ui components
- Radix UI primitives
- Zustand for state management
- React Query for data fetching

### Existing Setup
✅ Tailwind configured with `darkMode: ['class']`
✅ Dark theme CSS variables already defined in `globals.css`
✅ Providers pattern established (`QueryProvider`, `ToolbarProvider`)
✅ `suppressHydrationWarning` already in root layout
❌ No theme provider or toggle mechanism
❌ All text hardcoded in English throughout components

## Implementation Strategy

### 1. Dark Mode Implementation

**Library**: `next-themes` v0.2.1+
- Perfect integration with Tailwind's class strategy
- SSR support with no flash of unstyled content
- LocalStorage persistence
- Industry standard for Next.js apps

**User Preference**: Dropdown menu with Light/Dark/System options

**Steps**:
1. Install dependency: `next-themes`
2. Create `components/providers/ThemeProvider.tsx`
3. Create `components/theme/ThemeToggle.tsx` (Dropdown with Sun/Moon/Monitor icons)
4. Integrate ThemeProvider in `app/layout.tsx`
5. Add ThemeToggle to `components/layout/Header.tsx`

### 2. Internationalization (i18n) Implementation

**Library**: `next-intl` v3.0.0+
- Built specifically for Next.js App Router
- Type-safe translations with TypeScript
- Server and client component support
- Locale detection via routing or cookies

**User Preference**:
- Dropdown with flag icons (🇪🇸 Español / 🇺🇸 English)
- Complete all translations immediately (full bilingual support)

**Steps**:
1. Install dependency: `next-intl`
2. Create translation file structure:
   - `messages/es.json` (Spanish - default)
   - `messages/en.json` (English)
3. Create `i18n.ts` configuration file
4. Update `app/layout.tsx` to wrap with NextIntlClientProvider
5. Create `components/language/LanguageSwitcher.tsx` (with flag icons)
6. Extract ALL hardcoded strings to translation files
7. Update ALL components to use `useTranslations()` hook

### 3. Translation File Structure

Organized by domain/feature for maintainability:

```json
{
  "common": {
    "welcome": "Bienvenido",
    "save": "Guardar",
    "cancel": "Cancelar",
    "delete": "Eliminar",
    "edit": "Editar",
    "search": "Buscar",
    "filter": "Filtrar"
  },
  "auth": {
    "login": "Iniciar sesión",
    "logout": "Cerrar sesión",
    "email": "Correo electrónico",
    "password": "Contraseña"
  },
  "sidebar": {
    "dashboard": "Panel",
    "products": "Productos",
    "sales": "Ventas",
    "customers": "Clientes",
    "reports": "Reportes",
    "settings": "Configuración"
  },
  "dashboard": {
    "title": "Panel de Control",
    "welcomeBack": "Bienvenido de nuevo",
    "salesSummary": "Resumen de rendimiento de ventas",
    "totalSales": "Ventas Totales Hoy",
    "totalProducts": "Total de Productos",
    "lowStockAlerts": "Alertas de Stock Bajo",
    "pendingOrders": "Pedidos Pendientes"
  }
  // ... more sections
}
```

## Files to Create

### New Files
1. **`components/providers/ThemeProvider.tsx`**
   - Wrapper for next-themes ThemeProvider
   - Configure default theme, storage key

2. **`components/theme/ThemeToggle.tsx`**
   - Dropdown menu component with three options
   - Icons: Sun (Light), Moon (Dark), Monitor (System)
   - Use lucide-react icons
   - Similar styling to existing dropdown menus

3. **`messages/es.json`**
   - Complete Spanish translations
   - Default language

4. **`messages/en.json`**
   - Complete English translations
   - Secondary language

5. **`i18n.ts`**
   - next-intl configuration
   - Locale detection logic
   - Default locale: 'es'

6. **`components/language/LanguageSwitcher.tsx`**
   - Dropdown to switch between ES/EN
   - Flag icons: 🇪🇸 Español / 🇺🇸 English
   - Persist selection in localStorage/cookie
   - Similar styling to theme toggle dropdown

## Files to Modify

### Core Setup Files
1. **`package.json`**
   - Add: `next-themes: ^0.2.1`
   - Add: `next-intl: ^3.0.0`

2. **`app/layout.tsx`**
   - Wrap with ThemeProvider (after suppressHydrationWarning)
   - Wrap with NextIntlClientProvider
   - Set lang attribute dynamically based on locale
   - Provider order: html > body > ThemeProvider > NextIntlClientProvider > QueryProvider > ToolbarProvider

### Layout Components
3. **`components/layout/Header.tsx`**
   - Add ThemeToggle button
   - Add LanguageSwitcher dropdown
   - Translate all hardcoded strings using `useTranslations('common')`

4. **`components/layout/Sidebar.tsx`**
   - Translate menu item labels using `useTranslations('sidebar')`
   - Translate "POS System" title

### Page Components
5. **`app/(panel)/dashboard/page.tsx`**
   - Translate all stat titles, descriptions
   - Translate welcome message
   - Use `useTranslations('dashboard')`

6. **`app/login/page.tsx`**
   - Translate form labels, buttons, validation messages
   - Use `useTranslations('auth')`

7. **`app/register/page.tsx`**
   - Translate form fields
   - Use `useTranslations('auth')`

### Other Components (as needed)
8. All components with hardcoded English text:
   - Products pages/components
   - Sales pages/components
   - Customers pages/components
   - Reports pages/components
   - Settings pages/components
   - Forms and modals throughout the app

## Implementation Order

### Phase 1: Dependencies & Setup
1. Install `next-themes` and `next-intl`
2. Create ThemeProvider and configuration
3. Create i18n configuration
4. Update layout.tsx with both providers

### Phase 2: UI Components
1. Create ThemeToggle dropdown component (Sun/Moon/Monitor icons)
2. Create LanguageSwitcher dropdown component (with flag icons)
3. Update Header.tsx to include both toggles

### Phase 3: Complete Translation Migration
1. Create comprehensive translation files (es.json and en.json)
2. Extract ALL hardcoded strings systematically:
   - Common strings (buttons, labels, actions)
   - Sidebar and header
   - Auth pages (login/register)
   - Dashboard
   - Products module (all pages and components)
   - Sales module (all pages and components)
   - Customers module (all pages and components)
   - Inventory module (all pages and components)
   - Reports module (all pages and components)
   - Settings module (all pages and components)
   - Notifications module
   - User management module
3. Update all components to use `useTranslations()` hook
4. Handle form validation messages
5. Format dates and numbers according to locale

### Phase 4: Testing & Refinement
1. Test theme switching across all pages
2. Test language switching across all pages
3. Verify persistence works correctly
4. Check for missing translations
5. Verify visual consistency in both themes
6. Test on different browsers

## Testing Checklist

### Dark Mode
- [ ] Toggle switches between light/dark/system
- [ ] No flash of unstyled content on page load
- [ ] Theme persists across page refreshes
- [ ] All components properly use theme variables
- [ ] Cards, modals, dropdowns respect theme

### i18n
- [ ] Spanish is default language
- [ ] Language switcher changes all text
- [ ] Language persists across page refreshes
- [ ] No missing translation warnings
- [ ] Forms validation messages translated
- [ ] Date/number formatting respects locale
- [ ] All pages and components translated

## Technical Considerations

### Dark Mode
- Already configured Tailwind with proper dark mode classes
- CSS variables in globals.css support both themes
- Components use semantic color tokens (background, foreground, etc.)

### i18n
- Need to handle pluralization rules for Spanish
- Date formatting with Intl.DateTimeFormat
- Number/currency formatting with Intl.NumberFormat
- Consider RTL support in future (not needed for ES/EN)

### Performance
- Translation files will be code-split by Next.js
- Theme switching is instant (CSS only)
- No impact on bundle size (both features are lightweight)

## Potential Challenges

1. **Large number of hardcoded strings**: Will require systematic extraction
2. **Form validation messages**: May need to update zod schemas with translated messages
3. **Server vs Client components**: Ensure translations work in both contexts
4. **Dynamic content**: Backend may need to support multiple languages for data

## Success Criteria

1. ✅ Users can toggle between light and dark themes seamlessly
2. ✅ Theme preference persists across sessions
3. ✅ Users can switch between Spanish and English
4. ✅ Spanish is the default language on first visit
5. ✅ All UI text is translated (no hardcoded English remaining)
6. ✅ No console warnings or errors related to themes or translations
7. ✅ Application maintains visual polish in both themes and languages
