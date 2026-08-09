<script lang="ts">
	import ShellNav from '$lib/components/ShellNav.svelte';
	import type { LayoutProps } from './$types';
	import { page } from '$app/state';
	import type { LegalCenterKind } from '$lib/centers';
	import { isCenterKind } from '$lib/centers';

	let { data, children }: LayoutProps = $props();

	const active = $derived.by((): LegalCenterKind | 'home' | undefined => {
		const parts = page.url.pathname.split('/').filter(Boolean);
		if (parts.length === 1) return 'home';
		const kind = parts[1];
		if (isCenterKind(kind)) return kind;
		return undefined;
	});

	$effect(() => {
		document.documentElement.lang = data.lang;
	});
</script>

<div class="min-h-[100svh] bg-mesh">
	<div class="mx-auto max-w-6xl px-6 py-8 md:py-12">
		<ShellNav
			lang={data.lang}
			active={active}
			t={data.t}
			pulseUrl={data.pulseUrl}
			pathname={page.url.pathname}
		/>
		{@render children()}
	</div>
</div>
