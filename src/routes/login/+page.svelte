<script lang="ts">
	import { Alert, Button, Card, Checkbox, Input, Label } from 'flowbite-svelte';
	import { enhance } from '$app/forms';
	import ThemeToggle from '#lib/components/shell/ThemeToggle.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let submitting = $state(false);

	const errorMessage = $derived(
		form?.reason === 'throttled'
			? m.login_throttled()
			: form?.reason === 'required'
				? m.login_required_fields()
				: form?.reason === 'invalid'
					? m.login_invalid()
					: null
	);
</script>

<svelte:head>
	<title>{m.login_title()} · {m.app_name()}</title>
</svelte:head>

<div class="fixed end-4 top-4">
	<ThemeToggle
		class="text-gray-500 hover:bg-gray-200 focus:ring-gray-300 dark:text-gray-400 dark:hover:bg-gray-700"
	/>
</div>

<main class="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
	<p class="mb-6 text-3xl font-extralight text-primary-700 dark:text-white">
		{m.app_name()}
		<span class="text-gray-400">· {m.app_section()}</span>
	</p>

	<Card size="sm" class="w-full p-6 sm:p-8">
		<h1 class="mb-6 text-xl font-semibold text-gray-900 dark:text-white">{m.login_title()}</h1>

		{#if errorMessage}
			<Alert color="red" class="mb-4" role="alert">{errorMessage}</Alert>
		{/if}

		<form
			method="POST"
			class="space-y-5"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					await update();
					submitting = false;
				};
			}}
		>
			<input type="hidden" name="redirectTo" value={data.redirectTo} />

			<div>
				<Label for="email" class="mb-2">{m.login_email()}</Label>
				<Input
					id="email"
					name="email"
					type="email"
					autocomplete="username"
					required
					value={form?.email ?? ''}
				/>
			</div>

			<div>
				<Label for="password" class="mb-2">{m.login_password()}</Label>
				<Input
					id="password"
					name="password"
					type="password"
					autocomplete="current-password"
					required
				/>
			</div>

			<Checkbox name="remember">{m.login_remember()}</Checkbox>

			<Button type="submit" class="w-full" loading={submitting}>{m.login_submit()}</Button>
		</form>
	</Card>
</main>
