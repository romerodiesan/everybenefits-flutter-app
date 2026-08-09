<script lang="ts">
	import Hub from '$lib/components/Hub.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.t.centers[data.center.kind]} · Pulse</title>
	<meta name="description" content={data.center.summary} />
</svelte:head>

<Hub lang={data.lang} center={data.center} t={data.t} />
