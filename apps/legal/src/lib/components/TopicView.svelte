<script lang="ts">
	import Illustration from '$lib/components/Illustration.svelte';
	import type { AppLocale, LegalCenter, LegalTopic } from '$lib/centers';
	import { otherLegalLinks } from '$lib/content';
	import type { UiMessages } from '$lib/ui';

	let {
		lang,
		center,
		topic,
		prev,
		next,
		t
	}: {
		lang: AppLocale;
		center: LegalCenter;
		topic: LegalTopic;
		prev?: LegalTopic;
		next?: LegalTopic;
		t: UiMessages;
	} = $props();

	const others = $derived(otherLegalLinks(center.kind));
	const showToc = $derived(topic.sections.length >= 3);
</script>

<article class="mt-6">
	<div
		class="legal-topic-hero relative overflow-hidden rounded-[1.75rem] border border-glass-border px-6 py-10 md:px-10 md:py-14"
	>
		<div class="pulse-field-wash pointer-events-none absolute inset-0 opacity-70"></div>
		<div
			class="relative z-10 flex flex-col gap-8 md:flex-row md:items-center md:justify-between"
		>
			<div class="max-w-xl">
				<a
					href="/{lang}/{center.kind}"
					class="text-xs font-semibold uppercase tracking-[0.2em] text-brand hover:underline"
				>
					← {t.backCenter}
				</a>
				<h1
					class="mt-4 font-display text-[clamp(2rem,5vw,3.5rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink"
				>
					{topic.title}
				</h1>
				<p class="mt-3 text-sm leading-relaxed text-muted md:text-base">{topic.blurb}</p>
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
			<div class="mx-auto shrink-0 md:mx-0">
				<Illustration name={topic.illustration} size="hero" />
			</div>
		</div>
	</div>

	<div class="mt-8 grid gap-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
		{#if showToc}
			<aside class="lg:pt-2">
				<div class="sticky top-8">
					<p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">{t.contents}</p>
					<ol class="mt-3 space-y-1.5 border-l border-glass-border pl-3">
						{#each topic.sections as section (section.id)}
							<li>
								<a
									href="#{section.id}"
									class="block text-[12px] leading-snug text-muted transition hover:text-brand"
								>
									{section.title}
								</a>
							</li>
						{/each}
					</ol>
				</div>
			</aside>
		{:else}
			<div class="hidden lg:block"></div>
		{/if}

		<div class="legal-prose min-w-0 pb-8">
			{#each topic.sections as section (section.id)}
				<section id={section.id} class="scroll-mt-8">
					<h2>{section.title}</h2>
					{#each section.paragraphs as paragraph, i (i)}
						<p>{paragraph}</p>
					{/each}
					{#if section.bullets?.length}
						<ul>
							{#each section.bullets as item, i (i)}
								<li>{item}</li>
							{/each}
						</ul>
					{/if}
				</section>
			{/each}

			<div class="mt-12 rounded-xl border border-glass-border bg-sheet/70 p-5">
				<p class="font-display text-sm font-extrabold text-ink">{t.contactTitle}</p>
				<p class="mt-1 text-sm text-muted">{t.contactHint}</p>
				<p class="mt-3">
					<a class="font-bold text-brand underline" href="mailto:{t.contactEmail}"
						>{t.contactEmail}</a
					>
				</p>
			</div>

			<nav
				class="mt-10 flex flex-col gap-3 border-t border-glass-border pt-6 sm:flex-row sm:justify-between"
			>
				{#if prev}
					<a
						href="/{lang}/{center.kind}/{prev.id}"
						class="group rounded-xl border border-glass-border bg-sheet/50 px-4 py-3 transition hover:border-brand/30"
					>
						<span class="text-[10px] font-bold uppercase tracking-[0.18em] text-muted"
							>{t.prev}</span
						>
						<span
							class="mt-1 block font-display text-base font-extrabold text-ink group-hover:text-brand"
						>
							← {prev.title}
						</span>
					</a>
				{:else}
					<span></span>
				{/if}
				{#if next}
					<a
						href="/{lang}/{center.kind}/{next.id}"
						class="group rounded-xl border border-glass-border bg-sheet/50 px-4 py-3 text-right transition hover:border-brand/30 sm:ml-auto"
					>
						<span class="text-[10px] font-bold uppercase tracking-[0.18em] text-muted"
							>{t.next}</span
						>
						<span
							class="mt-1 block font-display text-base font-extrabold text-ink group-hover:text-brand"
						>
							{next.title} →
						</span>
					</a>
				{/if}
			</nav>
		</div>
	</div>
</article>
