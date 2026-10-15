import { expect, test } from '@playwright/test';

// Without a seeded database these only cover what happens before any query: the new sections,
// their actions and the option endpoints all require a session.

test('club and team pages send anonymous visitors to the login page', async ({ page }) => {
	await page.goto('/clubs?q=porto&page=2');
	await expect(page).toHaveURL('/login?redirectTo=%2Fclubs%3Fq%3Dporto%26page%3D2');

	await page.goto('/teams/new?club=3');
	await expect(page).toHaveURL('/login?redirectTo=%2Fteams%2Fnew%3Fclub%3D3');
});

test('form actions are not reachable without a session', async ({ request, baseURL }) => {
	const post = (accept: string) =>
		request.post('/clubs/new', {
			headers: { origin: baseURL!, accept },
			form: { name: 'Clube Fantasma', priority: '1' },
			maxRedirects: 0
		});

	// A plain browser form post.
	const html = await post('text/html');
	expect(html.status()).toBe(303);
	expect(html.headers().location).toBe('/login?redirectTo=%2Fclubs%2Fnew');

	// An enhanced (`use:enhance`) submission gets the same redirect as an action result.
	const enhanced = await post('application/json');
	expect(await enhanced.json()).toMatchObject({
		type: 'redirect',
		location: '/login?redirectTo=%2Fclubs%2Fnew'
	});
});

test('option endpoints answer 401 JSON to anonymous requests', async ({ request }) => {
	for (const entity of ['clubs', 'users']) {
		const response = await request.get(`/api/options/${entity}?q=a`);
		expect(response.status()).toBe(401);
		expect(await response.json()).toEqual({ message: 'Unauthorized' });
	}
});
