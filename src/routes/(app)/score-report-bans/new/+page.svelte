<script lang="ts">
	import { Card, Heading } from 'flowbite-svelte';
	import { resolve } from '$app/paths';
	import SearchSelect from '#lib/components/SearchSelect.svelte';
	import EntityForm from '#lib/components/form/EntityForm.svelte';
	import FormField from '#lib/components/form/FormField.svelte';
	import SelectField from '#lib/components/form/SelectField.svelte';
	import TextField from '#lib/components/form/TextField.svelte';
	import ToggleField from '#lib/components/form/ToggleField.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	/** Legacy slider default: 3 days. */
	const dayOptions = [1, 3, 7, 14, 30, 60, 90, 120].map((days) => ({
		value: String(days),
		label: m.score_bans_days({ count: days })
	}));
</script>

<PageHeader
	title={m.score_bans_new()}
	back={resolve('/(app)/score-report-bans')}
	backLabel={m.nav_score_report_bans()}
/>

<EntityForm {form} cancelHref={resolve('/(app)/score-report-bans')} submitLabel={m.form_create()}>
	<div class="grid max-w-5xl items-start gap-6 lg:grid-cols-2">
		<Card size="xl" class="space-y-5 p-6">
			<div>
				<Heading tag="h2" class="text-lg font-medium">{m.score_bans_who()}</Heading>
				<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{m.score_bans_who_hint()}</p>
			</div>
			<TextField
				name="uuid"
				label={m.score_bans_device()}
				hint={m.score_bans_device_hint()}
				value={data.prefill.uuid}
				maxlength={40}
				autocomplete="off"
			/>
			<FormField name="user_id" label={m.score_bans_user()}>
				{#snippet children(field)}
					<SearchSelect
						id={field.id}
						name="user_id"
						endpoint={resolve('/api/options/users')}
						value={data.bannedUser}
						label={m.score_bans_user()}
						invalid={field.invalid}
						describedBy={field.describedBy}
					/>
				{/snippet}
			</FormField>
			<TextField
				name="ip_address"
				label={m.score_bans_ip()}
				value={data.prefill.ipAddress}
				maxlength={45}
				autocomplete="off"
			/>
			<TextField
				name="user_agent"
				label={m.score_bans_user_agent()}
				hint={m.score_bans_user_agent_hint()}
				value={data.prefill.userAgent}
				maxlength={255}
				autocomplete="off"
			/>
		</Card>

		<Card size="xl" class="space-y-5 p-6">
			<Heading tag="h2" class="text-lg font-medium">{m.score_bans_how()}</Heading>
			<TextField name="reason" label={m.score_bans_reason()} required maxlength={255} />
			<SelectField
				name="ban_days"
				label={m.score_bans_duration()}
				value="3"
				options={dayOptions}
				required
			/>
			<ToggleField
				name="shadow_ban"
				label={m.score_bans_shadow()}
				hint={m.score_bans_shadow_hint()}
			/>
			<ToggleField name="ip_ban" label={m.score_bans_ip_ban()} hint={m.score_bans_ip_ban_hint()} />
		</Card>
	</div>
</EntityForm>
