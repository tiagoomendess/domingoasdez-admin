import { defineConfig, devices } from '@playwright/test';

// End-to-end tests run against the production build. They need no database: anything behind
// the login is covered by unit/component tests until a seeded test database exists.
export default defineConfig({
	testMatch: '**/*.e2e.{ts,js}',
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? 'github' : 'list',
	use: {
		baseURL: 'http://localhost:4173',
		// The admin's language follows Accept-Language; assertions use the Portuguese copy.
		locale: 'pt-PT',
		trace: 'retain-on-failure'
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173,
		reuseExistingServer: !process.env.CI
	}
});
