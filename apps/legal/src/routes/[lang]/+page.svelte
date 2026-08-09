<script lang="ts">
	import Illustration from '$lib/components/Illustration.svelte';
	import type { PageProps } from './$types';
	import { LEGAL_NAV } from '$lib/centers';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.t.homeTitle} · Pulse</title>
	<meta name="description" content={data.t.homeSummary} />
</svelte:head>

<div class="relative mt-6 overflow-hidden rounded-[1.75rem] border border-glass-border bg-sheet/40">
	<div class="legal-hub-hero relative overflow-hidden px-6 pb-10 pt-12 md:px-10 md:pb-14 md:pt-16">
		<div class="pulse-field-wash pointer-events-none absolute inset-0 opacity-90"></div>
		<div class="relative z-10 max-w-2xl">
			<p class="text-xs font-semibold uppercase tracking-[0.28em] text-brand">
				Pulse · Every Benefits
			</p>
			<h1
				class="mt-3 font-display text-[clamp(2.5rem,7vw,4.5rem)] font-extrabold leading-[0.95] tracking-[-0.03em] text-ink"
			>
				{data.t.homeTitle}
			</h1>
			<p class="mt-4 max-w-xl text-sm leading-relaxed text-muted md:text-base">
				{data.t.homeSummary}
			</p>
			<p class="mt-3 text-sm text-muted">{data.t.updated}</p>
		</div>
	</div>

	<div class="border-t border-glass-border px-6 py-8 md:px-10 md:py-10">
		<p class="text-xs font-semibold uppercase tracking-[0.24em] text-muted">{data.t.explore}</p>
		<ul class="mt-6 grid gap-4 sm:grid-cols-2">
			{#each LEGAL_NAV as item (item.kind)}
				<li>
					<a
						href="/{data.lang}{item.href}"
						class="legal-portal group flex h-full gap-4 rounded-2xl border border-transparent px-4 py-5 transition hover:border-brand/25 hover:bg-brand/5"
					>
						<Illustration
							name={item.kind === 'privacy'
								? 'shield'
								: item.kind === 'data'
									? 'orbit'
									: item.kind === 'cookies'
										? 'dial'
										: 'scroll'}
						/>
						<div>
							<h2
								class="font-display text-xl font-extrabold tracking-tight text-ink group-hover:text-brand"
							>
								{data.t.centers[item.kind]}
							</h2>
							<span
								class="mt-3 inline-flex text-xs font-bold uppercase tracking-[0.16em] text-brand"
							>
								{data.t.open} →
							</span>
						</div>
					</a>
				</li>
			{/each}
		</ul>
	</div>
</div>
