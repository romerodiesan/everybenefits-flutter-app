import { error } from '@sveltejs/kit';
import type { EntryGenerator, PageLoad } from './$types';
import {
	getAdjacentTopic,
	getCenter,
	getTopic,
	getTopicIds,
	isCenterKind,
	LOCALES
} from '$lib/centers';

export const prerender = true;

export const load: PageLoad = async ({ params, parent }) => {
	if (!isCenterKind(params.center)) {
		error(404, 'Not found');
	}

	const layout = await parent();
	const topic = getTopic(params.center, layout.lang, params.topic);
	if (!topic) {
		error(404, 'Topic not found');
	}

	const center = getCenter(params.center, layout.lang);
	const { prev, next } = getAdjacentTopic(center, params.topic);

	return { center, topic, prev, next };
};

export const entries: EntryGenerator = () => {
	const kinds = ['privacy', 'data', 'cookies', 'terms'] as const;
	return LOCALES.flatMap((lang) =>
		kinds.flatMap((center) =>
			getTopicIds(center).map((topic) => ({ lang, center, topic }))
		)
	);
};
