<script lang="ts">
	import type { LegalIllustration } from '$lib/content';

	let {
		name,
		size = 'portal'
	}: {
		name: LegalIllustration;
		size?: 'portal' | 'hero';
	} = $props();

	const dim = $derived(size === 'hero' ? 'h-40 w-40 md:h-52 md:w-52' : 'h-20 w-20');
</script>

<div aria-hidden="true" class="legal-illustration relative {dim}">
	<svg viewBox="0 0 120 120" class="h-full w-full">
		<defs>
			<radialGradient id="lg-{name}" cx="50%" cy="45%" r="55%">
				<stop offset="0%" stop-color="#1f6b4a" stop-opacity="0.22" />
				<stop offset="100%" stop-color="#1f6b4a" stop-opacity="0" />
			</radialGradient>
		</defs>
		<circle cx="60" cy="60" r="54" fill="url(#lg-{name})" />

		{#if name === 'signal'}
			<g stroke="#1f6b4a" fill="none" stroke-width="2.2" stroke-linecap="round">
				<circle class="animate-breathe" cx="60" cy="60" r="18" style="animation-delay: 0s" />
				<circle class="animate-breathe" cx="60" cy="60" r="30" style="animation-delay: 0.3s" />
				<circle class="animate-breathe" cx="60" cy="60" r="42" style="animation-delay: 0.6s" />
				<circle cx="60" cy="60" r="5" fill="#1f6b4a" stroke="none" />
			</g>
		{:else if name === 'shield'}
			<path
				d="M60 22 L92 36 V62 C92 82 76 96 60 102 C44 96 28 82 28 62 V36 Z"
				fill="color-mix(in srgb, #1f6b4a 12%, transparent)"
				stroke="#1f6b4a"
				stroke-width="2.4"
			/>
			<path
				d="M48 60 L56 68 L74 48"
				fill="none"
				stroke="#b8e06a"
				stroke-width="3"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		{:else if name === 'orbit'}
			<circle
				cx="60"
				cy="60"
				r="34"
				fill="none"
				stroke="#1f6b4a"
				stroke-width="1.5"
				stroke-opacity="0.35"
				stroke-dasharray="4 6"
			/>
			<circle cx="60" cy="60" r="10" fill="#1f6b4a" />
			<g class="animate-orbit">
				<circle cx="94" cy="60" r="6" fill="#b8e06a" />
				<circle cx="36" cy="82" r="4.5" fill="#1f6b4a" fill-opacity="0.7" />
			</g>
		{:else if name === 'dial'}
			<circle cx="60" cy="60" r="36" fill="none" stroke="#1f6b4a" stroke-width="2.5" />
			<circle cx="60" cy="60" r="28" fill="color-mix(in srgb, #1f6b4a 8%, transparent)" />
			<line
				x1="60"
				y1="60"
				x2="60"
				y2="32"
				stroke="#b8e06a"
				stroke-width="3"
				stroke-linecap="round"
				transform="rotate(-25 60 60)"
			/>
			<circle cx="60" cy="60" r="5" fill="#1f6b4a" />
		{:else if name === 'lock'}
			<path
				d="M44 54 V42 C44 32 51 26 60 26 C69 26 76 32 76 42 V54"
				fill="none"
				stroke="#1f6b4a"
				stroke-width="3"
				stroke-linecap="round"
			/>
			<rect
				x="36"
				y="54"
				width="48"
				height="38"
				rx="8"
				fill="color-mix(in srgb, #1f6b4a 14%, transparent)"
				stroke="#1f6b4a"
				stroke-width="2.4"
			/>
			<circle cx="60" cy="70" r="5" fill="#b8e06a" />
		{:else if name === 'spark'}
			<path
				d="M60 22 L66 50 L94 56 L66 62 L60 90 L54 62 L26 56 L54 50 Z"
				fill="color-mix(in srgb, #b8e06a 35%, transparent)"
				stroke="#1f6b4a"
				stroke-width="2"
				stroke-linejoin="round"
				class="animate-breathe"
			/>
		{:else if name === 'scroll'}
			<rect
				x="34"
				y="28"
				width="52"
				height="64"
				rx="6"
				fill="color-mix(in srgb, #1f6b4a 10%, transparent)"
				stroke="#1f6b4a"
				stroke-width="2.2"
			/>
			{#each [42, 52, 62, 72] as y}
				<line
					x1="44"
					y1={y}
					x2={y === 72 ? 68 : 76}
					y2={y}
					stroke="#1f6b4a"
					stroke-width="2"
					stroke-opacity="0.45"
					stroke-linecap="round"
				/>
			{/each}
		{:else if name === 'handshake'}
			<g stroke="#1f6b4a" stroke-width="2.4" fill="none" stroke-linecap="round">
				<path d="M28 70 C40 52, 48 48, 60 56 C72 48, 80 52, 92 70" />
				<path d="M44 64 L60 74 L76 64" stroke="#b8e06a" stroke-width="3" />
			</g>
		{:else}
			<!-- scale / balance -->
			<g stroke="#1f6b4a" stroke-width="2.4" fill="none" stroke-linecap="round">
				<line x1="60" y1="26" x2="60" y2="88" />
				<line x1="42" y1="88" x2="78" y2="88" />
				<line x1="28" y1="36" x2="92" y2="36" />
				<path d="M28 36 L20 58 H36 Z" fill="color-mix(in srgb, #1f6b4a 15%, transparent)" />
				<path d="M92 36 L84 58 H100 Z" fill="color-mix(in srgb, #b8e06a 25%, transparent)" />
			</g>
		{/if}
	</svg>
</div>
