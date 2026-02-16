# E2E Testing Documentation

## Overview

This project uses **Playwright** for End-to-End (E2E) testing. Tests validate the complete user flows across the entire POS system.

## Test Coverage

### ✅ Authentication (5 tests)
- Login with valid credentials
- Login with invalid credentials
- Logout
- Protected route redirect
- Session persistence

### ✅ Sales Flow (7 tests)
- Complete sale flow (search → add → pay)
- Add multiple products
- Remove product from cart
- Customer selection
- Stock validation
- Tax calculation
- Payment method selection

### ✅ Products CRUD (10 tests)
- Create product
- Search products
- Edit product
- Delete product
- Filter by category
- Filter by status
- Pagination
- Field validation
- Statistics display
- Sorting

### ✅ Customers CRUD (7 tests)
- Create customer
- Edit customer
- Manage loyalty points
- Search customers
- Statistics display
- Filter by loyalty points
- Validate subtract points

### ✅ Inventory Management (10 tests)
- View stock levels
- Adjust stock IN
- Adjust stock OUT
- View movements
- Filter by warehouse
- Filter by low stock
- Statistics display
- Validate OUT limits
- Tab switching
- DAMAGE and RETURN adjustments

**Total:** 39 E2E tests covering critical user flows

---

## Installation

### 1. Install Playwright

```bash
cd frontend
npm install
npx playwright install
```

### 2. Install Playwright Browsers

```bash
npx playwright install chromium firefox webkit
```

---

## Running Tests

### Run all tests (headless)
```bash
npm run test:e2e
```

### Run tests with UI mode (recommended)
```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Run tests in debug mode
```bash
npm run test:e2e:debug
```

### Run specific test file
```bash
npx playwright test tests/e2e/sales.spec.ts
```

### Run tests matching pattern
```bash
npx playwright test --grep "should complete a full sale"
```

---

## Test Reports

### View last test report
```bash
npm run test:e2e:report
```

### Generate HTML report
```bash
npx playwright show-report
```

Reports are automatically generated in `playwright-report/`

---

## Writing Tests

### Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth.helper';

test.describe('Feature Name', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    await authHelper.login();
  });

  test('should do something', async ({ page }) => {
    // Navigate
    await page.goto('/dashboard/feature');
    
    // Interact
    await page.click('button:has-text("Action")');
    
    // Assert
    await expect(page.locator('text=Success')).toBeVisible();
  });
});
```

### Best Practices

1. **Use data-testid attributes**
   ```tsx
   <button data-testid="submit-button">Submit</button>
   ```
   ```typescript
   await page.click('[data-testid="submit-button"]');
   ```

2. **Use Page Object Model for complex pages**
   ```typescript
   class ProductsPage {
     constructor(private page: Page) {}
     
     async createProduct(data: ProductData) {
       await this.page.click('text=New Product');
       await this.fillForm(data);
       await this.submit();
     }
   }
   ```

3. **Wait for navigation/loading**
   ```typescript
   await page.waitForURL('/dashboard');
   await page.waitForSelector('[data-testid="products-table"]');
   await page.waitForLoadState('networkidle');
   ```

4. **Use helpers for common actions**
   ```typescript
   // Already created:
   - AuthHelper: login, logout, register
   ```

---

## CI/CD Integration

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

### GitHub Actions Workflow

Located at `.github/workflows/e2e-tests.yml`

**Steps:**
1. Setup MySQL test database
2. Install dependencies
3. Run migrations
4. Start backend
5. Run E2E tests
6. Upload test reports

### View Test Results

After tests run:
1. Go to GitHub Actions tab
2. Click on latest workflow run
3. Download test artifacts:
   - `playwright-report` - HTML report
   - `test-results` - Raw results + screenshots

---

## Test Environment

### Environment Variables

Create `.env.test` in frontend directory:

```env
BASE_URL=http://localhost:3000
API_URL=http://localhost:3001
TEST_USER_EMAIL=admin@test.com
TEST_USER_PASSWORD=password123
```

### Test Data

Tests use seeded data from backend:
- Test admin user: `admin@test.com` / `password123`
- Test products with various stock levels
- Test customers with loyalty points
- Test warehouses and locations

---

## Debugging Tests

### 1. Debug Mode

```bash
npm run test:e2e:debug
```

Opens Playwright Inspector:
- Step through tests
- Pause execution
- Inspect selectors
- View console logs

### 2. Screenshots on Failure

Automatically captured in `test-results/`

### 3. Video Recording

Videos saved for failed tests in `test-results/`

### 4. Trace Viewer

```bash
npx playwright show-trace test-results/trace.zip
```

Shows:
- Screenshots at each step
- Network requests
- Console logs
- DOM snapshots

---

## Common Issues

### 1. Tests timing out

**Solution:** Increase timeout
```typescript
test('slow test', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
  // ...
});
```

### 2. Element not found

**Solution:** Wait for element
```typescript
await page.waitForSelector('[data-testid="element"]', {
  state: 'visible',
  timeout: 10000
});
```

### 3. Tests failing in CI but passing locally

**Solutions:**
- Check environment variables
- Verify database seeding
- Check network timeouts
- Run with `--headed` to see what's happening

### 4. Flaky tests

**Solutions:**
- Use `waitForSelector` instead of `waitForTimeout`
- Wait for network idle: `page.waitForLoadState('networkidle')`
- Use retry mechanism: `retries: 2` in config

---

## Test Maintenance

### When to Update Tests

- ✅ Adding new features
- ✅ Changing UI flows
- ✅ Modifying API endpoints
- ✅ Updating validation rules

### Test Checklist

Before merging:
- [ ] All tests pass locally
- [ ] New features have tests
- [ ] Tests are readable
- [ ] No hardcoded waits
- [ ] Proper assertions
- [ ] Tests are independent

---

## Performance Tips

1. **Run tests in parallel**
   - Already configured in `playwright.config.ts`
   - Workers: 1 in CI, undefined locally

2. **Use test.describe.configure for slow suites**
   ```typescript
   test.describe.configure({ mode: 'parallel' });
   ```

3. **Skip expensive operations**
   ```typescript
   test.skip(process.env.SKIP_SLOW_TESTS === 'true', 'Skipping slow test');
   ```

---

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [CI/CD Integration](https://playwright.dev/docs/ci)

---

## Next Steps

### Recommended Additions

1. **Visual Regression Testing**
   - Use `await page.screenshot()` comparisons
   - Detect unintended UI changes

2. **API Tests**
   - Test backend endpoints directly
   - Validate responses without UI

3. **Performance Tests**
   - Measure page load times
   - Monitor API response times

4. **Accessibility Tests**
   - Use `@axe-core/playwright`
   - Validate WCAG compliance

---

## Contact

For questions or issues with tests:
- Check test output and reports first
- Review this documentation
- Open an issue on GitHub
- Tag @testing team

---

**Last Updated:** 2026-02-16  
**Test Framework:** Playwright v1.40.0  
**Coverage:** 39 E2E tests across 5 modules
