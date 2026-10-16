<script lang="ts">
	import { Button, Helper, Input, Label } from 'flowbite-svelte';
	import { CloseOutline, SearchOutline } from 'flowbite-svelte-icons';
	import type { Map as LeafletMap, Marker } from 'leaflet';
	import 'leaflet/dist/leaflet.css';
	import { untrack } from 'svelte';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { fieldState, getFormContext } from './context';

	type Place = { label: string; lat: number; lng: number };

	let {
		latitude,
		longitude,
		readonly = false
	}: {
		/** Stored point (POINT(lat lng)); both null when the playground has no location. */
		latitude: number | null;
		longitude: number | null;
		readonly?: boolean;
	} = $props();

	/** Barcelos: where most AFPB playgrounds are. */
	const DEFAULT_CENTER: [number, number] = [41.531, -8.619];
	const round = (value: number) => Math.round(value * 1e7) / 1e7;

	// After a rejected submission, show what was sent.
	const context = getFormContext();
	const initial = untrack(() => {
		const sentLat = fieldState(context, 'latitude').submitted;
		const sentLng = fieldState(context, 'longitude').submitted;
		if (sentLat !== undefined) {
			return {
				lat: sentLat ? Number(sentLat) : undefined,
				lng: sentLng ? Number(sentLng) : undefined
			};
		}
		return { lat: latitude ?? undefined, lng: longitude ?? undefined };
	});
	let lat = $state<number | undefined>(initial.lat);
	let lng = $state<number | undefined>(initial.lng);
	const errors = $derived([
		...fieldState(context, 'latitude').errors,
		...fieldState(context, 'longitude').errors
	]);

	let query = $state('');
	let places = $state<Place[]>([]);
	let searching = $state(false);
	let searchError = $state(false);

	let map: LeafletMap | undefined;
	let marker: Marker | undefined;
	let leaflet: typeof import('leaflet') | undefined;

	function placeMarker(point: [number, number]) {
		if (!map || !leaflet) return;
		if (marker) marker.setLatLng(point);
		else {
			marker = leaflet
				.marker(point, { draggable: !readonly, icon: pin(leaflet) })
				.addTo(map)
				.on('dragend', () => {
					const position = marker!.getLatLng();
					setPoint(position.lat, position.lng, false);
				});
		}
	}

	function setPoint(newLat: number, newLng: number, move = true) {
		lat = round(newLat);
		lng = round(newLng);
		placeMarker([lat, lng]);
		if (move) map?.setView([lat, lng], Math.max(map.getZoom(), 16));
	}

	function clearPoint() {
		lat = undefined;
		lng = undefined;
		marker?.remove();
		marker = undefined;
	}

	/** A CSS pin: Leaflet's default icon images don't survive bundling. */
	const pin = (L: typeof import('leaflet')) =>
		L.divIcon({
			className: '',
			html: '<span class="block size-5 -translate-y-2 rounded-full border-4 border-white bg-primary-600 shadow-lg ring-2 ring-primary-600"></span>',
			iconSize: [20, 20],
			iconAnchor: [10, 10]
		});

	/** Mounts the map (Leaflet only runs in the browser). */
	function mountMap(element: HTMLElement) {
		let cancelled = false;
		import('leaflet').then((L) => {
			if (cancelled) return;
			leaflet = L;
			const point: [number, number] | null =
				lat !== undefined && lng !== undefined ? [lat, lng] : null;
			map = L.map(element, { scrollWheelZoom: false }).setView(
				point ?? DEFAULT_CENTER,
				point ? 16 : 11
			);
			L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
				maxZoom: 19,
				attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
			}).addTo(map);
			if (point) placeMarker(point);
			if (!readonly)
				map.on('click', (event) => setPoint(event.latlng.lat, event.latlng.lng, false));
		});
		return () => {
			cancelled = true;
			map?.remove();
			map = undefined;
			marker = undefined;
		};
	}

	async function search() {
		if (query.trim().length < 3) return;
		searching = true;
		searchError = false;
		try {
			const response = await fetch(
				`${resolve('/api/geocode')}?q=${encodeURIComponent(query.trim())}`
			);
			const body = (await response.json()) as { places: Place[]; error?: boolean };
			places = body.places;
			searchError = !response.ok;
		} catch {
			searchError = true;
		} finally {
			searching = false;
		}
	}

	/** Typed coordinates move the marker once both are valid. */
	function typed() {
		if (lat !== undefined && lng !== undefined && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
			placeMarker([lat, lng]);
			map?.setView([lat, lng], Math.max(map.getZoom(), 15));
		}
	}
</script>

<div class="space-y-3">
	{#if !readonly}
		<div>
			<Label for="location-search" class="mb-2">{m.playgrounds_search_address()}</Label>
			<div class="flex gap-2">
				<Input
					id="location-search"
					bind:value={query}
					placeholder={m.playgrounds_search_address_placeholder()}
					autocomplete="off"
					onkeydown={(event: KeyboardEvent) => {
						// Search instead of submitting the playground form.
						if (event.key === 'Enter') {
							event.preventDefault();
							search();
						}
					}}
				/>
				<Button
					type="button"
					color="alternative"
					class="gap-2"
					loading={searching}
					onclick={search}
				>
					{#if !searching}<SearchOutline class="size-4" aria-hidden="true" />{/if}
					{m.playgrounds_search()}
				</Button>
			</div>
			{#if searchError}
				<Helper color="red" class="mt-1">{m.playgrounds_search_failed()}</Helper>
			{:else if places.length}
				<ul
					class="mt-2 divide-y divide-gray-100 rounded-lg border border-gray-200 text-sm dark:divide-gray-700 dark:border-gray-700"
				>
					{#each places as place (place.label + place.lat)}
						<li>
							<button
								type="button"
								class="w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
								onclick={() => {
									setPoint(place.lat, place.lng);
									places = [];
								}}>{place.label}</button
							>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}

	<div
		{@attach mountMap}
		class="isolate h-80 w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
		role="application"
		aria-label={m.playgrounds_map()}
	></div>
	{#if !readonly}
		<Helper>{m.playgrounds_map_hint()}</Helper>
	{/if}

	<div class="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
		<div>
			<Label for="latitude" class="mb-1 text-xs">{m.playgrounds_latitude()}</Label>
			<Input
				id="latitude"
				name="latitude"
				type="number"
				step="any"
				min={-90}
				max={90}
				bind:value={lat}
				oninput={typed}
				{readonly}
				color={errors.length ? 'red' : 'default'}
			/>
		</div>
		<div>
			<Label for="longitude" class="mb-1 text-xs">{m.playgrounds_longitude()}</Label>
			<Input
				id="longitude"
				name="longitude"
				type="number"
				step="any"
				min={-180}
				max={180}
				bind:value={lng}
				oninput={typed}
				{readonly}
				color={errors.length ? 'red' : 'default'}
			/>
		</div>
		{#if !readonly}
			<Button
				type="button"
				color="alternative"
				class="h-10 gap-1.5"
				disabled={lat === undefined && lng === undefined}
				onclick={clearPoint}
			>
				<CloseOutline class="size-4" aria-hidden="true" />
				{m.playgrounds_clear_location()}
			</Button>
		{/if}
	</div>
	{#each errors as message (message)}
		<Helper color="red">{message}</Helper>
	{/each}
</div>
