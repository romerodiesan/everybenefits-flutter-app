<script lang="ts">
	import Illustration from '$lib/components/Illustration.svelte';
	import type { AppLocale, LegalCenter } from '$lib/centers';
	import { otherLegalLinks } from '$lib/content';
	import type { UiMessages } from '$lib/ui';

	let {
		lang,
		center,
		t
	}: {
		lang: AppLocale;
		center: LegalCenter;
		t: UiMessages;
	} = $props();

	const others = $derived(otherLegalLinks(center.kind));
</script>

<div class="relative mt-6 overflow-hidden rounded-[1.75rem] border border-glass-border bg-sheet/40">
	<div class="legal-hub-hero relative overflow-hidden px-6 pb-10 pt-12 md:px-10 md:pb-14 md:pt-16">
		<div class="pulse-field-wash pointer-events-none absolute inset-0 opacity-80"></div>
		<div class="relative z-10 max-w-2xl">
			<p class="text-xs font-semibold uppercase tracking-[0.28em] text-brand">
				Pulse · Every Benefits
			</p>
			<h1
				class="mt-3 font-display text-[clamp(2.5rem,7vw,4.5rem)] font-extrabold leading-[0.95] tracking-[-0.03em] text-ink"
			>
				{t.centers[center.kind]}
			</h1>
			<p class="mt-4 max-w-xl text-sm leading-relaxed text-muted md:text-base">
				{center.summary}
			</p>
			<p class="mt-3 text-sm text-muted">
				{t.updated} · {t.alsoSee}
				{#each others as item, i (item.kind)}
					{#if i > 0}<span> · </span>{/if}
					<a href="/{lang}{item.href}" class="font-semibold text-brand hover:underline">
						{t.centers[item.kind]}
					</a>
				{/each}
			</p>
		</div>
	</div>

	<div class="border-t border-glass-border px-6 py-8 md:px-10 md:py-10">
		<p class="text-xs font-semibold uppercase tracking-[0.24em] text-muted">{t.explore}</p>
		<ul class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each center.topics as topic (topic.id)}
				<li>
					<a
						href="/{lang}/{center.kind}/{topic.id}"
						class="legal-portal group block h-full rounded-2xl border border-transparent px-4 py-5 transition hover:border-brand/25 hover:bg-brand/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
					>
						<Illustration name={topic.illustration} />
						<h2
							class="mt-4 font-display text-xl font-extrabold tracking-tight text-ink group-hover:text-brand"
						>
							{topic.title}
						</h2>
						<p class="mt-1.5 text-sm leading-relaxed text-muted">{topic.blurb}</p>
						<span
							class="mt-4 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.16em] text-brand"
						>
							{t.open}
							<span aria-hidden="true">→</span>
						</span>
					</a>
				</li>
			{/each}
		</ul>
	</div>
</div>
