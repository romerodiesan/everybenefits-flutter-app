import { error } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';
import { isLocale } from '$lib/centers';
import { ui } from '$lib/ui';
import { env } from '$env/dynamic/public';

export const prerender = true;

const DEFAULT_PULSE_URL = 'https://pulse.everybenefits.us';

export const load: LayoutLoad = ({ params }) => {
	if (!isLocale(params.lang)) {
		error(404, 'Locale not found');
	}

	const pulseUrl = env.PUBLIC_PULSE_WEB_URL?.trim() || DEFAULT_PULSE_URL;

	return {
		lang: params.lang,
		t: ui[params.lang],
		pulseUrl
	};
};
