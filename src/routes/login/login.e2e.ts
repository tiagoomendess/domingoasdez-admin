import { expect, test } from '@playwright/test';

test('anonymous visitors are sent to the login page and back afterwards', async ({ page }) => {
	await page.goto('/games?page=2');
	await expect(page).toHaveURL('/login?redirectTo=%2Fgames%3Fpage%3D2');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Entrar na administração');
	await expect(page.getByLabel('Email')).toBeVisible();
	await expect(page.getByLabel('Palavra-passe')).toBeVisible();
	await expect(page.locator('input[name="redirectTo"]')).toHaveValue('/games?page=2');
});

test('pages are served with security headers and are never indexed', async ({ request }) => {
	const response = await request.get('/login');
	const headers = response.headers();
	expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
	expect(headers['x-frame-options']).toBe('DENY');
	expect(headers['x-content-type-options']).toBe('nosniff');
	expect(headers['x-robots-tag']).toBe('noindex, nofollow');
});

test('cross-site form posts are rejected', async ({ request }) => {
	const response = await request.post('/login', {
		headers: { origin: 'https://evil.example' },
		form: { email: 'someone@example.com', password: 'x' }
	});
	expect(response.status()).toBe(403);
});

test('the theme toggle switches between light and dark', async ({ page }) => {
	await page.emulateMedia({ colorScheme: 'light' });
	await page.goto('/login');
	const html = page.locator('html');
	await expect(html).not.toHaveClass(/dark/);

	await page.getByRole('button', { name: 'Alternar tema claro/escuro' }).click();
	await expect(html).toHaveClass(/dark/);

	await page.reload();
	await expect(html).toHaveClass(/dark/);
});
