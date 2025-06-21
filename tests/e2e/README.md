# E2E Tests with Playwright

This directory contains end-to-end tests for the authentication flow using Playwright.

## Setup

Playwright and all necessary dependencies have been installed. The browsers (Chromium, Firefox, and WebKit) are also installed.

## Running Tests

### Basic test execution:

```bash
npm run test:e2e
```

### Run tests with UI mode (recommended for debugging):

```bash
npm run test:e2e:ui
```

### Run tests in debug mode:

```bash
npm run test:e2e:debug
```

### Run specific test file:

```bash
npx playwright test auth.spec.ts
```

### Run tests in headed mode (see browser):

```bash
npx playwright test --headed
```

## Test Structure

The `auth.spec.ts` file contains:

1. **Main authentication test** - Tests the complete login flow:

   - Navigates to login page
   - Enters email and password
   - Submits the form
   - Verifies successful login
   - Takes screenshots at each step

2. **Invalid credentials test** - Tests error handling:

   - Attempts login with invalid credentials
   - Verifies error message is displayed

3. **Helper test** - Captures login page elements:
   - Logs all form elements for debugging
   - Helps identify correct selectors

## Screenshots

Screenshots are automatically saved to `tests/e2e/screenshots/` directory:

- `01-login-page.png` - Initial login page
- `02-email-entered.png` - After entering email
- `03-password-entered.png` - After entering password
- `04-after-submit.png` - After form submission
- `05-login-result.png` - Final state after login
- `error-invalid-credentials.png` - Error state with invalid credentials

## Configuration

The test configuration is in `playwright.config.ts`:

- Base URL: http://localhost:5173
- Browsers: Chromium, Firefox, WebKit
- Auto-starts dev server before tests
- Takes screenshots on failure
- Generates HTML report

## Customization

You may need to adjust the selectors in `auth.spec.ts` based on your actual login form structure. The test currently looks for common patterns like:

- Email input: `input[type="email"]`, `input[name="email"]`, `input#email`
- Password input: `input[type="password"]`, `input[name="password"]`, `input#password`
- Submit button: `button[type="submit"]`, buttons with text "Login", "Sign in", or "ログイン"

Run the helper test first to see what elements are actually on your login page:

```bash
npx playwright test auth.spec.ts -g "capture login page elements"
```

## Troubleshooting

If tests fail:

1. Make sure your dev server is running at http://localhost:5173
2. Check the HTML report: `npx playwright show-report`
3. Use UI mode to debug: `npm run test:e2e:ui`
4. Check screenshots in `tests/e2e/screenshots/`
5. Run the helper test to identify correct selectors
