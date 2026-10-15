<script lang="ts">
	import { Card, Heading } from 'flowbite-svelte';
	import { resolve } from '$app/paths';
	import type { ResolvedPathname } from '$app/types';
	import SearchSelect from '#lib/components/SearchSelect.svelte';
	import EntityForm from '#lib/components/form/EntityForm.svelte';
	import FormField from '#lib/components/form/FormField.svelte';
	import ImageField from '#lib/components/form/ImageField.svelte';
	import TextField from '#lib/components/form/TextField.svelte';
	import ToggleField from '#lib/components/form/ToggleField.svelte';
	import type { Option } from '#lib/options.ts';
	import { m } from '#lib/paraglide/messages.js';

	export type ClubValues = {
		name: string;
		foundingDate: string | null;
		website: string | null;
		contactEmail: string | null;
		priority: number;
		visible: boolean;
		notificationsEnabled: boolean;
		birthdayPostEnabled: boolean;
	};

	let {
		club,
		emblem,
		adminUser,
		form,
		action,
		readonly = false,
		cancelHref,
		submitLabel
	}: {
		club: ClubValues;
		/** Display URL of the current emblem. */
		emblem: string | null;
		adminUser: Option | null;
		form: unknown;
		action?: string;
		readonly?: boolean;
		cancelHref: ResolvedPathname;
		submitLabel?: string;
	} = $props();
</script>

<EntityForm {form} {action} {readonly} {cancelHref} {submitLabel} multipart>
	<div class="grid gap-6 xl:grid-cols-3">
		<Card size="xl" class="p-6 xl:col-span-2">
			<Heading tag="h2" class="mb-5 text-lg font-medium">{m.clubs_section_details()}</Heading>
			<div class="grid gap-5 md:grid-cols-2">
				<TextField
					name="name"
					label={m.common_name()}
					value={club.name}
					required
					maxlength={155}
					autocomplete="off"
					class="md:col-span-2"
				/>
				<TextField
					name="founding_date"
					type="date"
					label={m.clubs_founding_date()}
					value={club.foundingDate}
				/>
				<TextField
					name="priority"
					type="number"
					label={m.clubs_priority()}
					hint={m.clubs_priority_hint()}
					value={club.priority}
					required
					min={0}
					max={100}
					step={1}
				/>
				<TextField
					name="website"
					type="url"
					label={m.clubs_website()}
					value={club.website}
					maxlength={155}
					placeholder="https://"
					class="md:col-span-2"
				/>
				<TextField
					name="contact_email"
					type="email"
					label={m.common_contact_email()}
					value={club.contactEmail}
					maxlength={155}
					autocomplete="off"
				/>
				<FormField
					name="admin_user_id"
					label={m.clubs_admin_user()}
					hint={m.clubs_admin_user_hint()}
				>
					{#snippet children(field)}
						<SearchSelect
							id={field.id}
							name="admin_user_id"
							endpoint={resolve('/api/options/users')}
							value={adminUser}
							label={m.clubs_admin_user()}
							placeholder={m.select_search_users()}
							invalid={field.invalid}
							describedBy={field.describedBy}
							disabled={readonly}
						/>
					{/snippet}
				</FormField>
			</div>
		</Card>

		<div class="space-y-6">
			<Card size="xl" class="p-6">
				<Heading tag="h2" class="mb-5 text-lg font-medium">{m.clubs_emblem()}</Heading>
				<ImageField
					name="emblem"
					label={m.clubs_emblem_file()}
					current={emblem}
					accept="image/png,image/svg+xml"
					hint={m.clubs_emblem_hint()}
					square
				/>
			</Card>

			<Card size="xl" class="space-y-4 p-6">
				<Heading tag="h2" class="mb-1 text-lg font-medium">{m.clubs_section_options()}</Heading>
				<ToggleField name="visible" label={m.common_visible()} checked={club.visible} />
				<ToggleField
					name="notifications_enabled"
					label={m.clubs_notifications_enabled()}
					checked={club.notificationsEnabled}
				/>
				<ToggleField
					name="birthday_post_enabled"
					label={m.clubs_birthday_post_enabled()}
					hint={m.clubs_birthday_post_hint()}
					checked={club.birthdayPostEnabled}
				/>
			</Card>
		</div>
	</div>
</EntityForm>
