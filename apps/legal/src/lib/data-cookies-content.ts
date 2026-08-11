import type { AppLocale } from './content';
import type { LegalCenter, LegalTopic } from './content';
import {
	toCenter,
	type LegalDocDraft,
	type TopicDef
} from './content';

const dataEnDraft: LegalDocDraft = {
  kind: "data",
  title: "Data Use",
  summary:
    "This Data Use notice explains how Pulse processes personal and technical data day to day — what we collect for product features, how analytics fit in, and the choices you have to limit or request changes.",
  sections: [
    {
      id: "overview",
      title: "1. Overview",
      paragraphs: [
        "Every Benefits operates Pulse for US insurance professionals. Data use on Pulse is limited to operating community, messaging, Academy, practice tools, security, and optional product analytics.",
        "This notice complements our Privacy Policy. If there is a conflict, the Privacy Policy controls for personal information rights and disclosures.",
      ],
    },
    {
      id: "categories",
      title: "2. Data we process",
      paragraphs: ["Depending on your use of Pulse, we may process:"],
      bullets: [
        "Account data: name, email, authentication identifiers, language, appearance preferences.",
        "Professional profile: NPN, agency affiliation, role, and US address fields required for certain agent-class profiles.",
        "Community and chat content you submit, including metadata such as timestamps and participants.",
        "Learning activity: enrollments, progress, completions, and practice-tool interactions.",
        "Technical logs: device/browser, IP, approximate location from IP, performance and security signals.",
        "Optional analytics events when you opt in; crash diagnostics on mobile release builds.",
      ],
    },
    {
      id: "purposes",
      title: "3. Why we use data",
      paragraphs: ["We process data to:"],
      bullets: [
        "Authenticate you, enforce roles, and keep sessions secure (including MFA where enabled).",
        "Deliver forums, chats, notifications, Academy, and practice tools.",
        "Detect abuse, spam, fraud, and security threats.",
        "Diagnose crashes and reliability issues.",
        "Improve product quality when you opt into analytics.",
        "Meet legal obligations and respond to lawful requests.",
      ],
    },
    {
      id: "analytics",
      title: "4. Analytics and diagnostics",
      paragraphs: [
        "Product analytics (Firebase Analytics) is off by default. You can enable or disable it in Profile / Account → Privacy (web) or Settings → Privacy (mobile).",
        "Mobile crash diagnostics (Firebase Crashlytics) in release builds help us fix crashes. They are separate from marketing analytics and are not used to build advertising profiles.",
        "Analytics events are designed to be aggregated and non-content where practical (for example feature usage, not message bodies).",
      ],
    },
    {
      id: "choices",
      title: "5. Your data choices",
      paragraphs: [
        "In-product controls let you manage directory visibility, direct messages, searchability by email/NPN, what appears in search results, and analytics opt-in.",
        "You may also request access, correction, deletion, or portability of personal information by emailing support@everybenefits.com with “Privacy Request” in the subject line.",
        "Organization administrators may still see membership data needed to operate your agency workspace even if you hide yourself from the member directory.",
      ],
    },
    {
      id: "retention",
      title: "6. Retention and deletion",
      paragraphs: [
        "We keep account and profile data while your account is active and as needed for security, disputes, and legal requirements.",
        "Community content may remain for thread integrity after some deletion requests. Security logs and crash reports are retained for limited diagnostic periods.",
        "When data is no longer needed, we delete or de-identify it. Residual copies may linger in encrypted backups until overwritten.",
      ],
    },
    {
      id: "contact",
      title: "7. Contact",
      paragraphs: [
        "Questions about data use: support@everybenefits.com.",
        "See also our Privacy Policy, Cookies notice, and Terms of Use.",
      ],
    },
  ],
};

const dataEsDraft: LegalDocDraft = {
  kind: "data",
  title: "Uso de datos",
  summary:
    "Este aviso de Uso de datos explica cómo Pulse trata datos personales y técnicos en el día a día — qué recopilamos para las funciones del producto, cómo encaja la analítica, y las opciones que tienes para limitar o solicitar cambios.",
  sections: [
    {
      id: "overview",
      title: "1. Resumen",
      paragraphs: [
        "Every Benefits opera Pulse para profesionales de seguros en EE. UU. El uso de datos en Pulse se limita a operar comunidad, mensajería, Academia, herramientas de práctica, seguridad y analítica de producto opcional.",
        "Este aviso complementa nuestra Política de privacidad. Si hay conflicto, prevalece la Política de privacidad respecto de derechos y divulgaciones de información personal.",
      ],
    },
    {
      id: "categories",
      title: "2. Datos que tratamos",
      paragraphs: ["Según tu uso de Pulse, podemos tratar:"],
      bullets: [
        "Datos de cuenta: nombre, correo, identificadores de autenticación, idioma, preferencias de apariencia.",
        "Perfil profesional: NPN, afiliación de agencia, rol y dirección en EE. UU. requerida para ciertos perfiles de clase agente.",
        "Contenido de comunidad y chat que envías, incluidos metadatos como marcas de tiempo y participantes.",
        "Actividad de aprendizaje: inscripciones, progreso, finalizaciones e interacciones con herramientas de práctica.",
        "Registros técnicos: dispositivo/navegador, IP, ubicación aproximada, señales de rendimiento y seguridad.",
        "Eventos de analítica opcionales cuando optas por activarlos; diagnósticos de fallos en builds móviles de producción.",
      ],
    },
    {
      id: "purposes",
      title: "3. Para qué usamos los datos",
      paragraphs: ["Tratamos datos para:"],
      bullets: [
        "Autenticarte, aplicar roles y mantener sesiones seguras (incluida MFA cuando esté habilitada).",
        "Ofrecer foros, chats, notificaciones, Academia y herramientas de práctica.",
        "Detectar abusos, spam, fraude y amenazas de seguridad.",
        "Diagnosticar fallos y problemas de confiabilidad.",
        "Mejorar la calidad del producto cuando activas la analítica.",
        "Cumplir obligaciones legales y responder a solicitudes lícitas.",
      ],
    },
    {
      id: "analytics",
      title: "4. Analítica y diagnósticos",
      paragraphs: [
        "La analítica de producto (Firebase Analytics) está desactivada por defecto. Puedes activarla o desactivarla en Perfil / Cuenta → Privacidad (web) o Ajustes → Privacidad (móvil).",
        "Los diagnósticos de fallos móviles (Firebase Crashlytics) en builds de producción nos ayudan a corregir caídas. Son independientes de la analítica de marketing y no se usan para perfiles publicitarios.",
        "Los eventos de analítica están diseñados para ser agregados y sin contenido cuando es práctico (por ejemplo uso de funciones, no cuerpos de mensajes).",
      ],
    },
    {
      id: "choices",
      title: "5. Tus opciones de datos",
      paragraphs: [
        "Los controles en el producto te permiten gestionar visibilidad en el directorio, mensajes directos, búsqueda por correo/NPN, qué aparece en resultados y la analítica opcional.",
        "También puedes solicitar acceso, corrección, eliminación o portabilidad de información personal escribiendo a support@everybenefits.com con “Solicitud de privacidad” en el asunto.",
        "Los administradores de la organización pueden seguir viendo datos de membresía necesarios para operar el espacio de tu agencia aunque te ocultes del directorio de miembros.",
      ],
    },
    {
      id: "retention",
      title: "6. Retención y eliminación",
      paragraphs: [
        "Conservamos datos de cuenta y perfil mientras la cuenta esté activa y según sea necesario por seguridad, disputas y requisitos legales.",
        "El contenido comunitario puede permanecer por integridad de hilos tras algunas solicitudes de eliminación. Los registros de seguridad y reportes de fallos se retienen por periodos diagnósticos limitados.",
        "Cuando los datos ya no sean necesarios, los eliminamos o desidentificamos. Pueden quedar copias residuales en respaldos cifrados hasta que se sobrescriban.",
      ],
    },
    {
      id: "contact",
      title: "7. Contacto",
      paragraphs: [
        "Preguntas sobre uso de datos: support@everybenefits.com.",
        "Consulta también nuestra Política de privacidad, el aviso de Cookies y los Términos de uso.",
      ],
    },
  ],
};

const cookiesEnDraft: LegalDocDraft = {
  kind: "cookies",
  title: "Cookies",
  summary:
    "This Cookies notice describes the cookies and similar technologies Pulse uses — which are necessary to sign in and keep the product working, which are optional, and how you can control them in your browser and in-product settings.",
  sections: [
    {
      id: "what",
      title: "1. What are cookies?",
      paragraphs: [
        "Cookies are small text files stored on your device. Pulse also uses related technologies such as local storage and SDK identifiers that serve similar purposes (together, “cookies” in this notice).",
        "We use cookies to authenticate sessions, remember locale and appearance preferences, protect security, and — only if you opt in — measure product usage.",
      ],
    },
    {
      id: "necessary",
      title: "2. Necessary cookies",
      paragraphs: [
        "These cookies are required for Pulse to function. Without them, sign-in, security checks, and core navigation may fail.",
      ],
      bullets: [
        "Authentication and session continuity (including Firebase Auth session state).",
        "CSRF / security tokens and App Check attestations where enabled.",
        "Locale preference (en/es) and theme/appearance stored locally.",
        "Load balancing and basic infrastructure cookies from our hosting providers.",
      ],
    },
    {
      id: "analytics",
      title: "3. Analytics cookies (optional)",
      paragraphs: [
        "Optional product analytics uses Firebase Analytics identifiers only when you opt in under Profile / Account → Privacy (web) or Settings → Privacy (mobile). Default is off.",
        "These help us understand feature usage in aggregate. They are not used to build cross-site advertising profiles on Pulse, and we do not use third-party advertising cookies for that purpose.",
      ],
    },
    {
      id: "diagnostics",
      title: "4. Diagnostics on mobile",
      paragraphs: [
        "On mobile release builds, Firebase Crashlytics may store device and crash metadata to investigate failures. This is operational stability data, not marketing analytics, and is separate from the optional analytics toggle.",
      ],
    },
    {
      id: "control",
      title: "5. How to control cookies",
      paragraphs: [
        "Browser controls: most browsers let you block or delete cookies. Blocking necessary cookies can break sign-in and essential features.",
        "In-product: turn optional analytics on or off anytime in Privacy settings. Directory, DM, and search visibility controls are separate privacy preferences (not cookies), described in the Privacy Center.",
        "Global Privacy Control / Do Not Track: see the Privacy Policy. Pulse does not sell or share personal information for cross-context behavioral advertising.",
      ],
    },
    {
      id: "third-parties",
      title: "6. Third-party technologies",
      paragraphs: [
        "Pulse relies on infrastructure providers (for example Google Firebase / Google Cloud) that may set cookies or local identifiers needed to deliver authentication, hosting, analytics (if opted in), and crash reporting.",
        "Those providers process data under our instructions and their own service terms. We do not embed third-party social advertising pixels on Pulse marketing surfaces for cross-site ads.",
      ],
    },
    {
      id: "retention",
      title: "7. Duration",
      paragraphs: [
        "Session cookies expire when you close the browser or after an idle timeout. Persistent cookies and local storage entries last until they expire, you clear them, or we rotate them for security.",
        "Analytics identifiers (when enabled) follow the retention practices of Firebase Analytics and our operational settings.",
      ],
    },
    {
      id: "updates",
      title: "8. Updates and contact",
      paragraphs: [
        "We may update this Cookies notice when our technologies change. The “Last updated” date on this center will change accordingly.",
        "Questions: support@everybenefits.com. See also Privacy, Data Use, and Terms.",
      ],
    },
  ],
};

const cookiesEsDraft: LegalDocDraft = {
  kind: "cookies",
  title: "Cookies",
  summary:
    "Este aviso de Cookies describe las cookies y tecnologías similares que usa Pulse — cuáles son necesarias para entrar y que el producto funcione, cuáles son opcionales, y cómo puedes controlarlas en el navegador y en los ajustes del producto.",
  sections: [
    {
      id: "what",
      title: "1. ¿Qué son las cookies?",
      paragraphs: [
        "Las cookies son pequeños archivos de texto almacenados en tu dispositivo. Pulse también usa tecnologías relacionadas como almacenamiento local e identificadores de SDK con fines similares (en conjunto, “cookies” en este aviso).",
        "Usamos cookies para autenticar sesiones, recordar idioma y apariencia, proteger la seguridad y — solo si lo activas — medir el uso del producto.",
      ],
    },
    {
      id: "necessary",
      title: "2. Cookies necesarias",
      paragraphs: [
        "Estas cookies son necesarias para que Pulse funcione. Sin ellas, el inicio de sesión, las comprobaciones de seguridad y la navegación básica pueden fallar.",
      ],
      bullets: [
        "Autenticación y continuidad de sesión (incluido el estado de sesión de Firebase Auth).",
        "Tokens CSRF / de seguridad y atestaciones de App Check cuando estén habilitadas.",
        "Preferencia de idioma (en/es) y tema/apariencia almacenados localmente.",
        "Cookies de balanceo de carga e infraestructura básica de nuestros proveedores de hosting.",
      ],
    },
    {
      id: "analytics",
      title: "3. Cookies de analítica (opcionales)",
      paragraphs: [
        "La analítica de producto opcional usa identificadores de Firebase Analytics solo cuando la activas en Perfil / Cuenta → Privacidad (web) o Ajustes → Privacidad (móvil). Por defecto está desactivada.",
        "Nos ayudan a entender el uso de funciones de forma agregada. No se usan para construir perfiles publicitarios entre sitios en Pulse, y no usamos cookies publicitarias de terceros para ese fin.",
      ],
    },
    {
      id: "diagnostics",
      title: "4. Diagnósticos en móvil",
      paragraphs: [
        "En builds móviles de producción, Firebase Crashlytics puede almacenar metadatos del dispositivo y de fallos para investigar caídas. Son datos de estabilidad operativa, no analítica de marketing, y son independientes del interruptor de analítica opcional.",
      ],
    },
    {
      id: "control",
      title: "5. Cómo controlar las cookies",
      paragraphs: [
        "Controles del navegador: la mayoría permite bloquear o eliminar cookies. Bloquear cookies necesarias puede romper el inicio de sesión y funciones esenciales.",
        "En el producto: activa o desactiva la analítica opcional en cualquier momento en Privacidad. Los controles de directorio, DM y búsqueda son preferencias de privacidad separadas (no cookies), descritas en el Centro de privacidad.",
        "Global Privacy Control / Do Not Track: consulta la Política de privacidad. Pulse no vende ni comparte información personal para publicidad conductual entre contextos.",
      ],
    },
    {
      id: "third-parties",
      title: "6. Tecnologías de terceros",
      paragraphs: [
        "Pulse depende de proveedores de infraestructura (por ejemplo Google Firebase / Google Cloud) que pueden establecer cookies o identificadores locales necesarios para autenticación, hosting, analítica (si la activas), y reportes de fallos.",
        "Esos proveedores tratan datos bajo nuestras instrucciones y sus propios términos de servicio. No incrustamos píxeles publicitarios sociales de terceros en superficies de marketing de Pulse para anuncios entre sitios.",
      ],
    },
    {
      id: "retention",
      title: "7. Duración",
      paragraphs: [
        "Las cookies de sesión expiran al cerrar el navegador o tras un tiempo de inactividad. Las cookies persistentes y el almacenamiento local duran hasta que expiren, las borres o las rotemos por seguridad.",
        "Los identificadores de analítica (cuando están activos) siguen las prácticas de retención de Firebase Analytics y nuestra configuración operativa.",
      ],
    },
    {
      id: "updates",
      title: "8. Actualizaciones y contacto",
      paragraphs: [
        "Podemos actualizar este aviso de Cookies cuando cambien nuestras tecnologías. La fecha de “Última actualización” de este centro cambiará en consecuencia.",
        "Preguntas: support@everybenefits.com. Consulta también Privacidad, Uso de datos y Términos.",
      ],
    },
  ],
};

const dataTopicsEn: TopicDef[] = [
  {
    id: "overview",
    title: "Overview",
    blurb: "How this notice fits with Privacy, and what Pulse uses data for.",
    illustration: "signal",
    sectionIds: ["overview", "categories"],
  },
  {
    id: "purposes",
    title: "Purposes",
    blurb: "Why we process account, community, learning, and security data.",
    illustration: "orbit",
    sectionIds: ["purposes"],
  },
  {
    id: "analytics",
    title: "Analytics",
    blurb: "Optional analytics and crash diagnostics.",
    illustration: "spark",
    sectionIds: ["analytics"],
  },
  {
    id: "choices-retention",
    title: "Choices & retention",
    blurb: "In-product controls, requests, and how long we keep data.",
    illustration: "dial",
    sectionIds: ["choices", "retention", "contact"],
  },
];

const dataTopicsEs: TopicDef[] = [
  {
    id: "overview",
    title: "Resumen",
    blurb: "Cómo encaja este aviso con Privacidad y para qué usa datos Pulse.",
    illustration: "signal",
    sectionIds: ["overview", "categories"],
  },
  {
    id: "purposes",
    title: "Finalidades",
    blurb: "Por qué tratamos datos de cuenta, comunidad, aprendizaje y seguridad.",
    illustration: "orbit",
    sectionIds: ["purposes"],
  },
  {
    id: "analytics",
    title: "Analítica",
    blurb: "Analítica opcional y diagnósticos de fallos.",
    illustration: "spark",
    sectionIds: ["analytics"],
  },
  {
    id: "choices-retention",
    title: "Opciones y retención",
    blurb: "Controles en el producto, solicitudes y cuánto tiempo conservamos datos.",
    illustration: "dial",
    sectionIds: ["choices", "retention", "contact"],
  },
];

const cookiesTopicsEn: TopicDef[] = [
  {
    id: "basics",
    title: "Cookie basics",
    blurb: "What cookies are and why Pulse uses them.",
    illustration: "scroll",
    sectionIds: ["what"],
  },
  {
    id: "necessary",
    title: "Necessary cookies",
    blurb: "Auth, security, locale, and infrastructure cookies you need to sign in.",
    illustration: "lock",
    sectionIds: ["necessary"],
  },
  {
    id: "optional",
    title: "Optional & diagnostics",
    blurb: "Analytics opt-in and mobile crash diagnostics.",
    illustration: "spark",
    sectionIds: ["analytics", "diagnostics"],
  },
  {
    id: "controls",
    title: "Controls & third parties",
    blurb: "Browser settings, in-product toggles, providers, and duration.",
    illustration: "dial",
    sectionIds: ["control", "third-parties", "retention", "updates"],
  },
];

const cookiesTopicsEs: TopicDef[] = [
  {
    id: "basics",
    title: "Conceptos básicos",
    blurb: "Qué son las cookies y por qué Pulse las usa.",
    illustration: "scroll",
    sectionIds: ["what"],
  },
  {
    id: "necessary",
    title: "Cookies necesarias",
    blurb: "Auth, seguridad, idioma e infraestructura para poder entrar.",
    illustration: "lock",
    sectionIds: ["necessary"],
  },
  {
    id: "optional",
    title: "Opcionales y diagnósticos",
    blurb: "Analítica opcional y diagnósticos de fallos en móvil.",
    illustration: "spark",
    sectionIds: ["analytics", "diagnostics"],
  },
  {
    id: "controls",
    title: "Controles y terceros",
    blurb: "Navegador, interruptores del producto, proveedores y duración.",
    illustration: "dial",
    sectionIds: ["control", "third-parties", "retention", "updates"],
  },
];

export function getDataCenter(locale: AppLocale): LegalCenter {
  return toCenter(
    locale === "es" ? dataEsDraft : dataEnDraft,
    locale === "es" ? dataTopicsEs : dataTopicsEn,
  );
}

export function getCookiesCenter(locale: AppLocale): LegalCenter {
  return toCenter(
    locale === "es" ? cookiesEsDraft : cookiesEnDraft,
    locale === "es" ? cookiesTopicsEs : cookiesTopicsEn,
  );
}

export function getDataTopic(
  locale: AppLocale,
  topicId: string,
): LegalTopic | undefined {
  return getDataCenter(locale).topics.find((t) => t.id === topicId);
}

export function getCookiesTopic(
  locale: AppLocale,
  topicId: string,
): LegalTopic | undefined {
  return getCookiesCenter(locale).topics.find((t) => t.id === topicId);
}

export function getDataTopicIds(): string[] {
  return dataTopicsEn.map((t) => t.id);
}

export function getCookiesTopicIds(): string[] {
  return cookiesTopicsEn.map((t) => t.id);
}
