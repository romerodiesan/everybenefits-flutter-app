<script lang="ts">
	import TopicView from '$lib/components/TopicView.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.topic.title} · {data.t.centers[data.center.kind]} · Pulse</title>
	<meta name="description" content={data.topic.blurb} />
</svelte:head>

<TopicView
	lang={data.lang}
	center={data.center}
	topic={data.topic}
	prev={data.prev}
	next={data.next}
	t={data.t}
/>
