export type UiMessages = {
	brand: string;
	homeTitle: string;
	homeSummary: string;
	updated: string;
	explore: string;
	open: string;
	contents: string;
	alsoSee: string;
	backHome: string;
	backCenter: string;
	next: string;
	prev: string;
	contactTitle: string;
	contactHint: string;
	contactEmail: string;
	pulseUrlLabel: string;
	centers: {
		privacy: string;
		data: string;
		cookies: string;
		terms: string;
	};
};

export const ui: Record<'en' | 'es', UiMessages> = {
	en: {
		brand: 'Pulse',
		homeTitle: 'Legal Center',
		homeSummary:
			'Privacy, data use, cookies, and terms for Pulse — community and learning for insurance professionals.',
		updated: 'Last updated: August 8, 2026',
		explore: 'Explore topics',
		open: 'Open',
		contents: 'Contents',
		alsoSee: 'Also see',
		backHome: 'Back to Pulse',
		backCenter: 'Back to center',
		next: 'Next',
		prev: 'Previous',
		contactTitle: 'Privacy & legal contact',
		contactHint:
			'For privacy requests, include “Privacy Request” in the subject line and the email on your account.',
		contactEmail: 'support@everybenefits.com',
		pulseUrlLabel: 'Open Pulse',
		centers: {
			privacy: 'Privacy Center',
			data: 'Data Use',
			cookies: 'Cookies',
			terms: 'Terms Center'
		}
	},
	es: {
		brand: 'Pulse',
		homeTitle: 'Centro legal',
		homeSummary:
			'Privacidad, uso de datos, cookies y términos de Pulse — comunidad y aprendizaje para profesionales de seguros.',
		updated: 'Última actualización: 8 de agosto de 2026',
		explore: 'Explorar temas',
		open: 'Abrir',
		contents: 'Contenido',
		alsoSee: 'También consulta',
		backHome: 'Volver a Pulse',
		backCenter: 'Volver al centro',
		next: 'Siguiente',
		prev: 'Anterior',
		contactTitle: 'Contacto de privacidad y legal',
		contactHint:
			'Para solicitudes de privacidad, incluye “Solicitud de privacidad” en el asunto y el correo de tu cuenta.',
		contactEmail: 'support@everybenefits.com',
		pulseUrlLabel: 'Abrir Pulse',
		centers: {
			privacy: 'Centro de privacidad',
			data: 'Uso de datos',
			cookies: 'Cookies',
			terms: 'Centro de términos'
		}
	}
};
