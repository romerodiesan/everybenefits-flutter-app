import type { AppLocale, LegalCenter, LegalCenterKind, LegalTopic } from './content';
import {
	getPrivacyCenter,
	getPrivacyTopic,
	getPrivacyTopicIds,
	getTermsCenter,
	getTermsTopic,
	getTermsTopicIds,
	getAdjacentTopic,
	LEGAL_NAV
} from './content';
import {
	getCookiesCenter,
	getCookiesTopic,
	getCookiesTopicIds,
	getDataCenter,
	getDataTopic,
	getDataTopicIds
} from './data-cookies-content';

export const LOCALES: AppLocale[] = ['en', 'es'];

export function isLocale(value: string): value is AppLocale {
	return value === 'en' || value === 'es';
}

export function getCenter(kind: LegalCenterKind, locale: AppLocale): LegalCenter {
	switch (kind) {
		case 'privacy':
			return getPrivacyCenter(locale);
		case 'terms':
			return getTermsCenter(locale);
		case 'data':
			return getDataCenter(locale);
		case 'cookies':
			return getCookiesCenter(locale);
	}
}

export function getTopic(
	kind: LegalCenterKind,
	locale: AppLocale,
	topicId: string
): LegalTopic | undefined {
	switch (kind) {
		case 'privacy':
			return getPrivacyTopic(locale, topicId);
		case 'terms':
			return getTermsTopic(locale, topicId);
		case 'data':
			return getDataTopic(locale, topicId);
		case 'cookies':
			return getCookiesTopic(locale, topicId);
	}
}

export function getTopicIds(kind: LegalCenterKind): string[] {
	switch (kind) {
		case 'privacy':
			return getPrivacyTopicIds();
		case 'terms':
			return getTermsTopicIds();
		case 'data':
			return getDataTopicIds();
		case 'cookies':
			return getCookiesTopicIds();
	}
}

export function isCenterKind(value: string): value is LegalCenterKind {
	return LEGAL_NAV.some((item) => item.kind === value);
}

export { getAdjacentTopic, LEGAL_NAV };
export type { AppLocale, LegalCenter, LegalCenterKind, LegalTopic };
