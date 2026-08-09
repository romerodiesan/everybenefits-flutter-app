<script lang="ts">
	import type { AppLocale, LegalCenterKind } from '$lib/centers';
	import { LEGAL_NAV } from '$lib/centers';
	import type { UiMessages } from '$lib/ui';

	let {
		lang,
		active,
		t,
		pulseUrl,
		pathname
	}: {
		lang: AppLocale;
		active?: LegalCenterKind | 'home';
		t: UiMessages;
		pulseUrl: string;
		pathname: string;
	} = $props();

	function switchLocale(code: string) {
		return pathname.replace(/^\/(en|es)/, `/${code}`);
	}
</script>

<div class="flex flex-wrap items-center justify-between gap-3">
	<a href={pulseUrl} class="text-sm font-semibold text-brand hover:underline">
		← {t.backHome}
	</a>
	<nav
		class="flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-glass-border bg-sheet/80 p-0.5 text-xs font-semibold"
	>
		<a
			href="/{lang}"
			class="shrink-0 rounded-full px-3 py-1.5 transition {active === 'home'
				? 'bg-brand text-on-brand'
				: 'text-muted hover:text-ink'}"
		>
			{t.homeTitle}
		</a>
		{#each LEGAL_NAV as item (item.kind)}
			<a
				href="/{lang}{item.href}"
				class="shrink-0 rounded-full px-3 py-1.5 transition {active === item.kind
					? 'bg-brand text-on-brand'
					: 'text-muted hover:text-ink'}"
			>
				{t.centers[item.kind]}
			</a>
		{/each}
	</nav>
	<div class="flex items-center gap-1 rounded-full border border-glass-border bg-sheet/70 p-0.5">
		{#each ['es', 'en'] as code (code)}
			<a
				href={switchLocale(code)}
				class="rounded-full px-2.5 py-1 text-xs font-semibold uppercase transition {lang === code
					? 'bg-brand text-on-brand'
					: 'text-muted hover:text-ink'}"
			>
				{code}
			</a>
		{/each}
	</div>
</div>
