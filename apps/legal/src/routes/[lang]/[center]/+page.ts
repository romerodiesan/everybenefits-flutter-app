import { error } from '@sveltejs/kit';
import type { EntryGenerator, PageLoad } from './$types';
import { getCenter, isCenterKind, LOCALES } from '$lib/centers';

export const prerender = true;

export const load: PageLoad = async ({ params, parent }) => {
	if (!isCenterKind(params.center)) {
		error(404, 'Not found');
	}

	const layout = await parent();
	return {
		center: getCenter(params.center, layout.lang)
	};
};

export const entries: EntryGenerator = () => {
	const kinds = ['privacy', 'data', 'cookies', 'terms'] as const;
	return LOCALES.flatMap((lang) => kinds.map((center) => ({ lang, center })));
};
