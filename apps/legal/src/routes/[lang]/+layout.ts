import { error } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';
import { isLocale } from '$lib/centers';
import { ui } from '$lib/ui';
import { PUBLIC_PULSE_WEB_URL } from '$env/static/public';

export const prerender = true;

export const load: LayoutLoad = ({ params }) => {
	if (!isLocale(params.lang)) {
		error(404, 'Locale not found');
	}

	return {
		lang: params.lang,
		t: ui[params.lang],
		pulseUrl: PUBLIC_PULSE_WEB_URL || 'https://pulse.everybenefits.us'
	};
};
