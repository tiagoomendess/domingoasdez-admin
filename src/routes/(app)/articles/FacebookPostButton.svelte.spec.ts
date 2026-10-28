import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FacebookPostButton from './FacebookPostButton.svelte';

describe('FacebookPostButton.svelte', () => {
	it('opens the dialog with the preview, the message and its counter', async () => {
		render(FacebookPostButton, {
			article: { id: 12, title: 'Final da Taça', visible: false },
			compact: true
		});

		await page.getByRole('button', { name: 'Publicar no Facebook' }).click();
		const dialog = page.getByRole('dialog');
		await expect.element(dialog.getByText('Final da Taça')).toBeInTheDocument();
		await expect
			.element(dialog.getByRole('img'))
			.toHaveAttribute('src', '/articles/12/social-image');
		// Hidden articles get a warning: the link doesn't open on the site yet.
		await expect.element(dialog.getByText(/Este artigo está oculto/)).toBeInTheDocument();

		const message = dialog.getByLabelText('Mensagem (opcional)');
		await expect.element(message).toHaveAttribute('maxlength', '280');
		await expect.element(dialog.getByText('0/280')).toBeInTheDocument();
		await message.fill('Já saiu!');
		await expect.element(dialog.getByText('8/280')).toBeInTheDocument();
		await expect
			.element(dialog.getByRole('button', { name: 'Publicar', exact: true }))
			.toHaveAttribute('type', 'submit');

		await dialog.getByRole('button', { name: 'Cancelar' }).click();
		await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
	});

	it('shows when the picture cannot be generated, and no warning for visible articles', async () => {
		render(FacebookPostButton, { article: { id: 999999, title: 'Sem imagem', visible: true } });

		await page.getByRole('button', { name: 'Publicar no Facebook' }).click();
		// The test server has no image endpoint: the preview fails.
		await expect.element(page.getByText('Não foi possível gerar a imagem.')).toBeInTheDocument();
		await expect.element(page.getByText(/Este artigo está oculto/)).not.toBeInTheDocument();
	});
});
