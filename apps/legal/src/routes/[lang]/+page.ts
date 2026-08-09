import type { EntryGenerator } from './$types';
import { LOCALES } from '$lib/centers';

export const prerender = true;

export const entries: EntryGenerator = () => LOCALES.map((lang) => ({ lang }));
