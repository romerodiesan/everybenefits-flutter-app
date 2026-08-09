export type AppLocale = "en" | "es";

export type LegalSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export type LegalIllustration =
  | "signal"
  | "shield"
  | "orbit"
  | "dial"
  | "lock"
  | "scroll"
  | "balance"
  | "spark"
  | "handshake"
  | "scale";

export type LegalCenterKind = "privacy" | "terms" | "data" | "cookies";

export type LegalTopic = {
  id: string;
  title: string;
  blurb: string;
  illustration: LegalIllustration;
  sections: LegalSection[];
};

export type LegalCenter = {
  kind: LegalCenterKind;
  title: string;
  summary: string;
  topics: LegalTopic[];
};

export type LegalDocDraft = {
  kind: LegalCenterKind;
  title: string;
  summary: string;
  sections: LegalSection[];
};

export type TopicDef = {
  id: string;
  title: string;
  blurb: string;
  illustration: LegalIllustration;
  sectionIds: string[];
};

export function buildTopics(
  sections: LegalSection[],
  defs: TopicDef[],
): LegalTopic[] {
  const byId = new Map(sections.map((s) => [s.id, s]));
  return defs.map((def) => ({
    id: def.id,
    title: def.title,
    blurb: def.blurb,
    illustration: def.illustration,
    sections: def.sectionIds.map((id) => {
      const section = byId.get(id);
      if (!section) {
        throw new Error(`Missing legal section "${id}"`);
      }
      return section;
    }),
  }));
}

export function toCenter(doc: LegalDocDraft, defs: TopicDef[]): LegalCenter {
  return {
    kind: doc.kind,
    title: doc.title,
    summary: doc.summary,
    topics: buildTopics(doc.sections, defs),
  };
}

export const LEGAL_NAV: {
  kind: LegalCenterKind;
  href: `/${LegalCenterKind}`;
  labelKey:
    | "legalCenterPrivacy"
    | "legalCenterTerms"
    | "legalCenterData"
    | "legalCenterCookies";
}[] = [
  { kind: "privacy", href: "/privacy", labelKey: "legalCenterPrivacy" },
  { kind: "data", href: "/data", labelKey: "legalCenterData" },
  { kind: "cookies", href: "/cookies", labelKey: "legalCenterCookies" },
  { kind: "terms", href: "/terms", labelKey: "legalCenterTerms" },
];

export function hubTitleKey(
  kind: LegalCenterKind,
): (typeof LEGAL_NAV)[number]["labelKey"] {
  return LEGAL_NAV.find((item) => item.kind === kind)!.labelKey;
}

export function otherLegalLinks(kind: LegalCenterKind) {
  return LEGAL_NAV.filter((item) => item.kind !== kind);
}

const privacyEnDraft: LegalDocDraft = {
  kind: "privacy",
  title: "Privacy Policy",
  summary:
    "This Privacy Policy describes how Every Benefits collects, uses, discloses, and protects personal information in connection with Pulse — our community, learning, messaging, and AI platform for US insurance professionals — and explains the privacy choices available to you in-product and by request.",
  sections: [
    {
      id: "who-we-are",
      title: "1. Who we are",
      paragraphs: [
        "Every Benefits (“Every Benefits,” “we,” “us,” or “our”) operates Pulse and related web and mobile applications (collectively, the “Services”). Pulse is designed for licensed insurance professionals and related learners within the Every Benefits organizational ecosystem.",
        "For privacy questions, requests, or complaints, contact us at support@everybenefits.com. Please include “Privacy Request” in the subject line and enough detail for us to locate your account (for example, the email used to register).",
      ],
    },
    {
      id: "scope",
      title: "2. Scope and applicability",
      paragraphs: [
        "This Policy applies to personal information processed when you visit pulse.everybenefits.us, use the Pulse mobile apps, create or manage an account, participate in forums or chats, use Academy or practice tools, interact with Pulse AI, or communicate with us about the Services.",
        "It does not apply to third-party websites, carriers, agencies, or tools that we do not control, even if linked from the Services. Those parties have their own privacy practices.",
      ],
    },
    {
      id: "categories",
      title: "3. Categories of personal information",
      paragraphs: [
        "Depending on how you use the Services, we may process the following categories of personal information (as commonly described under US state privacy laws such as the California Consumer Privacy Act, as amended by the CPRA):",
      ],
      bullets: [
        "Identifiers: name, email address, account ID, device identifiers, IP address, and similar identifiers.",
        "Professional information: National Producer Number (NPN), agency or organization affiliation, role (for example agent, instructor, manager), licensing-related profile fields you provide, and US address information required for certain agent-class profiles.",
        "Commercial / account records: account creation date, entitlement metadata if applicable, and support tickets.",
        "Internet or network activity: login events, pages or screens viewed, feature usage, referring URLs, and diagnostic logs.",
        "Geolocation data: approximate location derived from IP address; we do not require precise GPS for core Pulse features.",
        "Sensory / media: profile photos or other media you upload.",
        "Inferences: limited product inferences used to personalize learning progress or surface relevant community context (not used for advertising profiles).",
        "User-generated content: forum posts, replies, reactions, chat messages, AI prompts and conversation history, and feedback you submit.",
      ],
    },
    {
      id: "sources",
      title: "4. Sources of information",
      paragraphs: ["We collect personal information from:"],
      bullets: [
        "You, when you register, complete your profile, post content, send messages, use Pulse AI, enroll in Academy content, or contact support.",
        "Your device and browser, through cookies, local storage, SDKs, and automatic logs needed for security and functionality.",
        "Authentication providers you choose (for example Google sign-in via Firebase Authentication).",
        "Your organization administrators, when they invite you, assign roles, or manage agency membership within Every Benefits.",
        "Service providers that help us operate infrastructure, security, optional analytics, crash reporting, and AI model processing.",
      ],
    },
    {
      id: "collection",
      title: "5. Information we collect in detail",
      paragraphs: [
        "Account and profile. Name, email, authentication credentials or provider identifiers, preferred language, theme/appearance preferences, agency selection, role, NPN, US mailing address fields required for agent-class roles, and optional profile photo.",
        "Community and messaging. Forum threads, tags, replies, accepted answers, reactions, direct messages, group chats, support conversations, and related metadata (timestamps, participants, read state).",
        "Learning and tools. Course and path enrollments, lesson progress, completions, quiz or practice activity, and use of practice tools (for example quoting practice helpers). Practice tools are educational and are not carrier-issued quotes.",
        "Pulse AI. Prompts, model responses, citations or grounding references shown in-product, conversation identifiers, rate-limit metadata, and feedback (for example helpful / not helpful).",
        "Technical and security. Device/browser type, OS version, app or site version, IP address, approximate location from IP, performance and error logs, fraud/abuse signals, and Firebase App Check attestations where enabled.",
        "Mobile crash diagnostics. Stack traces and device metadata via Firebase Crashlytics in release builds to investigate crashes. These reports are not marketing analytics.",
        "Optional product analytics. Aggregated, non-content usage events via Firebase Analytics only if you opt in under Profile → Privacy (web) or Settings → Privacy (mobile). Default is off.",
      ],
    },
    {
      id: "use",
      title: "6. How we use information",
      paragraphs: [
        "We use personal information to operate, secure, personalize, and improve the Services, including to:",
      ],
      bullets: [
        "Create and authenticate accounts, enforce role-based access, and maintain session security (including multi-factor authentication where enabled).",
        "Operate forums, chats, notifications, Academy, practice tools, and Pulse AI.",
        "Retrieve approved community, Academy, and curated official US insurance sources to ground AI answers and apply safety / scope policies.",
        "Send transactional notices about account security, service changes, and product features you use.",
        "Detect abuse, spam, policy violations, and security threats; enforce our Terms of Use.",
        "Diagnose reliability issues and crashes on mobile.",
        "When you opt in, analyze aggregated product usage to improve quality and reliability.",
        "Comply with law, respond to lawful requests, and establish, exercise, or defend legal claims.",
      ],
    },
    {
      id: "ai",
      title: "7. AI-specific processing",
      paragraphs: [
        "Pulse AI is an educational assistant scoped to US insurance professional contexts. When you use it, prompts and related retrieval context may be processed by Every Benefits systems and by model or gateway providers solely to generate responses, enforce rate limits, and apply safety filters.",
        "We design Pulse AI to ground answers in approved community knowledge, Academy materials, and curated official sources where available. Outputs are informational only and are not legal, compliance, tax, or personalized insurance advice. You remain responsible for verifying information before acting.",
        "We may retain AI conversation and feedback data to provide history in your account, improve retrieval quality, investigate abuse, and maintain service integrity, subject to the retention practices below. We do not use your Pulse AI conversations to train third-party foundation models for unrelated advertising.",
        "Do not submit confidential client data, protected health information (PHI), Social Security numbers, payment card data, or other sensitive third-party personal data into Pulse AI or public forums.",
      ],
    },
    {
      id: "cookies",
      title: "8. Cookies and similar technologies",
      paragraphs: [
        "We use cookies, local storage, and similar technologies that are necessary for authentication, session continuity, locale preference, security, and core site functionality.",
        "We do not use third-party advertising cookies to build cross-site advertising profiles on Pulse. Optional product analytics (when enabled by you) may use analytics identifiers consistent with Firebase Analytics practices.",
        "You can control cookies through your browser settings. Disabling necessary cookies may prevent sign-in or break essential features. Locale and theme preferences may be stored locally on your device.",
      ],
    },
    {
      id: "controls",
      title: "9. In-product privacy controls",
      paragraphs: [
        "Pulse provides privacy controls so you can manage how other members find and contact you, and whether optional analytics runs on your devices. Controls are available under Profile / Account → Privacy on web and Settings → Privacy on mobile:",
      ],
      bullets: [
        "Appear in directory — control whether you appear in member directory listings.",
        "Allow direct messages — control whether other members can start a private chat with you.",
        "Searchable by email / NPN — control whether others can find you by searching those identifiers.",
        "Show email / NPN in search results — control which details are revealed when you are found.",
        "Product analytics — opt in or out of optional Firebase Analytics (off by default).",
      ],
    },
    {
      id: "controls-limits",
      title: "9.1 Limits of privacy controls",
      paragraphs: [
        "Turning off directory visibility does not delete your account or remove content you already published in forums or group chats. Organization administrators may still see membership information needed to operate your agency workspace. Security, authentication, and crash diagnostics required to run the Services are not disabled by analytics opt-out.",
        "If you disable direct messages, existing conversations may remain visible to participants, but new DM invitations from other members can be blocked according to product rules.",
      ],
    },
    {
      id: "sharing",
      title: "10. How we share information",
      paragraphs: [
        "We do not sell personal information for money. We also do not “share” personal information for cross-context behavioral advertising as those terms are defined under the CPRA. We disclose information only as needed to operate the Services:",
      ],
      bullets: [
        "Service providers / processors: hosting, authentication, databases, storage, email delivery, crash reporting, and AI model/gateway providers that process data on our instructions.",
        "Other users: content you post or send in forums, chats, or other shared spaces is visible according to product permissions and your privacy settings.",
        "Affiliates and corporate transactions: in connection with a merger, acquisition, financing, or sale of assets, subject to appropriate confidentiality safeguards.",
        "Legal and safety: when required by law, subpoena, or court order, or to protect the rights, property, or safety of Every Benefits, our users, or the public.",
      ],
    },
    {
      id: "retention",
      title: "11. Retention",
      paragraphs: [
        "We retain personal information for as long as your account remains active and as reasonably necessary to provide the Services, resolve disputes, enforce agreements, maintain security, and meet legal, accounting, or regulatory requirements.",
        "Typical operational periods (subject to legal holds and backup cycles): account profile data for the life of the account; community content while published and for a reasonable period after deletion requests to preserve thread integrity; AI conversation history while needed for in-product history and abuse investigation; security logs for a limited period consistent with security operations; crash reports for diagnostics and then deletion or aggregation.",
        "When information is no longer needed, we delete or de-identify it in accordance with our operational practices. Residual copies may persist in encrypted backups for a limited time until overwritten.",
      ],
    },
    {
      id: "rights",
      title: "12. Your choices and privacy rights",
      paragraphs: [
        "Depending on where you live, you may have rights to request access, correction, deletion, portability, or restriction of certain personal information, and to appeal our decision on a request. You may also update many profile and privacy settings directly in the product.",
        "To exercise rights, email support@everybenefits.com with “Privacy Request” in the subject line. We will verify your identity (for example by confirming control of the account email) before fulfilling requests. We will respond within the timelines required by applicable law.",
        "We will not discriminate against you for exercising privacy rights. Some information may be retained where we have a lawful basis (for example security logs, fraud prevention, or content needed to preserve community integrity).",
      ],
      bullets: [
        "Access / know — request categories and specific pieces of personal information we hold about you.",
        "Correct — request correction of inaccurate personal information.",
        "Delete — request deletion of personal information, subject to permitted exceptions.",
        "Portability — request a portable copy of certain information you provided.",
        "Opt out of sale/share — we do not sell or share for cross-context behavioral advertising; you may still email us to confirm.",
        "Limit use of sensitive personal information — where applicable, request limits on use of sensitive fields beyond what is necessary to provide the Services.",
        "Appeal — if we deny a request, you may ask us to reconsider by replying to our decision email.",
      ],
    },
    {
      id: "california",
      title: "13. Notice for California residents",
      paragraphs: [
        "If you are a California resident, the CCPA/CPRA provide additional rights described above. In the preceding 12 months, we may have collected the categories listed in Section 3 for the business purposes described in Section 6.",
        "We do not sell personal information or share it for cross-context behavioral advertising. We do not use or disclose sensitive personal information for purposes other than those permitted to provide the Services (for example account security and professional profile fields you provide).",
        "Authorized agents may submit requests on your behalf with proof of authorization and identity verification of the consumer.",
      ],
    },
    {
      id: "other-states",
      title: "14. Other US state privacy laws",
      paragraphs: [
        "Residents of certain other US states (including, where applicable, Virginia, Colorado, Connecticut, Utah, and similar comprehensive privacy regimes) may have comparable rights to access, delete, correct, obtain a copy of, or opt out of certain processing of personal data. We will honor applicable requests consistent with those laws when you contact us as described above.",
        "Pulse does not engage in sale of personal data or cross-context behavioral advertising, and does not profile users for eligibility decisions outside the product’s role-based access controls.",
      ],
    },
    {
      id: "dnt",
      title: "15. Do Not Track and Global Privacy Control",
      paragraphs: [
        "Some browsers offer “Do Not Track” (DNT) signals. Because there is no consistent industry standard for DNT, our Services do not respond to DNT signals at this time.",
        "If we deploy support for Global Privacy Control (GPC) or similar legally recognized opt-out preference signals for sale/share, we will treat those signals as an opt-out of sale/share to the extent required by law. Because we do not sell or share for cross-context advertising today, GPC does not change core Pulse processing, but you may still use in-product analytics opt-out.",
      ],
    },
    {
      id: "security",
      title: "16. Security",
      paragraphs: [
        "We use administrative, technical, and organizational measures designed to protect personal information, including encrypted transport (HTTPS/TLS), authentication and access controls, least-privilege practices for operations staff, and monitoring for abuse.",
        "No method of transmission or storage is completely secure. You are responsible for safeguarding your credentials and for using multi-factor authentication when offered. Notify us promptly at support@everybenefits.com if you suspect unauthorized access to your account.",
      ],
    },
    {
      id: "children",
      title: "17. Children’s privacy",
      paragraphs: [
        "The Services are intended for adults in professional insurance contexts and are not directed to children under 16. We do not knowingly collect personal information from children under 16. If you believe a child has provided personal information, contact us and we will take appropriate steps to delete it.",
      ],
    },
    {
      id: "international",
      title: "18. International transfers",
      paragraphs: [
        "Every Benefits is based in the United States. If you access the Services from outside the United States, you understand that your information may be processed in the United States and other countries where our providers operate, which may have different data-protection laws than your country of residence.",
        "Where required, we rely on appropriate transfer mechanisms and contractual protections with processors. By using the Services, you acknowledge these transfers as described in this Policy.",
      ],
    },
    {
      id: "professional",
      title: "19. Professional and insurance-specific notice",
      paragraphs: [
        "Pulse is a professional community and learning product. You should not upload client lists, application packages, claim files, medical records, or other confidential consumer information. Doing so may violate law, carrier rules, and our Terms of Use.",
        "NPN and licensing fields are used to support professional identity within the community and organizational workflows. Providing false professional credentials may result in account suspension.",
      ],
    },
    {
      id: "changes",
      title: "20. Changes to this Policy",
      paragraphs: [
        "We may update this Privacy Policy from time to time. We will post the updated version on this page and revise the “Last updated” date. Material changes may also be communicated through the Services or by email when appropriate. Continued use of the Services after an update means you accept the revised Policy, except where applicable law requires additional consent.",
      ],
    },
    {
      id: "contact",
      title: "21. Contact and governing law",
      paragraphs: [
        "Privacy contact: support@everybenefits.com.",
        "This Privacy Policy is governed by the laws of the State of Florida, United States, without regard to conflict-of-law principles, except where mandatory local consumer privacy laws apply and cannot be waived.",
      ],
    },
  ],
};

const privacyEsDraft: LegalDocDraft = {
  kind: "privacy",
  title: "Política de privacidad",
  summary:
    "Esta Política de privacidad describe cómo Every Benefits recopila, usa, divulga y protege la información personal en relación con Pulse — nuestra plataforma de comunidad, aprendizaje, mensajería e IA para profesionales de seguros en EE. UU. — y explica las opciones de privacidad disponibles en el producto y mediante solicitud.",
  sections: [
    {
      id: "who-we-are",
      title: "1. Quiénes somos",
      paragraphs: [
        "Every Benefits (“Every Benefits”, “nosotros” o “nuestro”) opera Pulse y las aplicaciones web y móviles relacionadas (en conjunto, los “Servicios”). Pulse está diseñado para profesionales de seguros con licencia y aprendices relacionados dentro del ecosistema organizacional de Every Benefits.",
        "Para preguntas, solicitudes o reclamaciones de privacidad, escríbenos a support@everybenefits.com. Incluye “Solicitud de privacidad” en el asunto y datos suficientes para localizar tu cuenta (por ejemplo, el correo usado al registrarte).",
      ],
    },
    {
      id: "scope",
      title: "2. Alcance y aplicabilidad",
      paragraphs: [
        "Esta Política aplica a la información personal tratada cuando visitas pulse.everybenefits.us, usas las apps móviles de Pulse, creas o administras una cuenta, participas en foros o chats, usas la Academia o herramientas de práctica, interactúas con Pulse AI o te comunicas con nosotros sobre los Servicios.",
        "No aplica a sitios, carriers, agencias o herramientas de terceros que no controlamos, aunque estén enlazados desde los Servicios. Esas partes tienen sus propias prácticas de privacidad.",
      ],
    },
    {
      id: "categories",
      title: "3. Categorías de información personal",
      paragraphs: [
        "Según cómo uses los Servicios, podemos tratar las siguientes categorías de información personal (según se describen comúnmente en leyes estatales de EE. UU. como la CCPA, enmendada por la CPRA):",
      ],
      bullets: [
        "Identificadores: nombre, correo electrónico, ID de cuenta, identificadores de dispositivo, dirección IP e identificadores similares.",
        "Información profesional: National Producer Number (NPN), afiliación a agencia u organización, rol (por ejemplo agente, instructor, manager), campos de perfil relacionados con licencias que proporciones, y dirección postal en EE. UU. requerida para ciertos perfiles de clase agente.",
        "Registros comerciales / de cuenta: fecha de creación de cuenta, metadatos de derechos si aplica, y tickets de soporte.",
        "Actividad de internet o red: eventos de inicio de sesión, páginas o pantallas vistas, uso de funciones, URLs de referencia y registros de diagnóstico.",
        "Datos de geolocalización: ubicación aproximada derivada de la IP; no exigimos GPS preciso para las funciones principales de Pulse.",
        "Medios: fotos de perfil u otros medios que subas.",
        "Inferencias: inferencias limitadas del producto para personalizar progreso de aprendizaje o mostrar contexto comunitario relevante (no se usan para perfiles publicitarios).",
        "Contenido generado por el usuario: publicaciones en foros, respuestas, reacciones, mensajes de chat, prompts e historial de IA, y comentarios que envíes.",
      ],
    },
    {
      id: "sources",
      title: "4. Fuentes de la información",
      paragraphs: ["Recopilamos información personal de:"],
      bullets: [
        "Tú, cuando te registras, completas tu perfil, publicas contenido, envías mensajes, usas Pulse AI, te inscribes en contenido de la Academia o contactas soporte.",
        "Tu dispositivo y navegador, mediante cookies, almacenamiento local, SDKs y registros automáticos necesarios para seguridad y funcionalidad.",
        "Proveedores de autenticación que elijas (por ejemplo inicio de sesión con Google mediante Firebase Authentication).",
        "Administradores de tu organización, cuando te invitan, asignan roles o gestionan la membresía de agencia dentro de Every Benefits.",
        "Proveedores de servicios que nos ayudan a operar infraestructura, seguridad, analítica opcional, reportes de fallos y procesamiento de modelos de IA.",
      ],
    },
    {
      id: "collection",
      title: "5. Información que recopilamos en detalle",
      paragraphs: [
        "Cuenta y perfil. Nombre, correo, credenciales o identificadores de autenticación, idioma preferido, preferencias de tema/apariencia, selección de agencia, rol, NPN, campos de dirección postal en EE. UU. requeridos para roles de clase agente, y foto de perfil opcional.",
        "Comunidad y mensajería. Hilos de foro, etiquetas, respuestas, respuestas aceptadas, reacciones, mensajes directos, chats de grupo, conversaciones de soporte y metadatos relacionados.",
        "Aprendizaje y herramientas. Inscripciones a cursos y rutas, progreso de lecciones, finalizaciones, actividad de práctica, y uso de herramientas de práctica (por ejemplo ayudas de cotización). Las herramientas de práctica son educativas y no son cotizaciones emitidas por carriers.",
        "Pulse AI. Prompts, respuestas del modelo, citas o referencias de anclaje mostradas en el producto, identificadores de conversación, metadatos de límites de uso y comentarios (útil / no útil).",
        "Datos técnicos y de seguridad. Tipo de dispositivo/navegador, versión de SO, versión de app o sitio, IP, ubicación aproximada, registros de rendimiento y errores, señales de fraude/abuso y atestaciones de Firebase App Check cuando estén habilitadas.",
        "Diagnósticos de fallos (móvil). Trazas y metadatos del dispositivo vía Firebase Crashlytics en builds de producción. Estos reportes no son analítica de marketing.",
        "Analítica de producto opcional. Eventos de uso agregados y sin contenido vía Firebase Analytics solo si la activas en Perfil → Privacidad (web) o Ajustes → Privacidad (móvil). Por defecto está desactivada.",
      ],
    },
    {
      id: "use",
      title: "6. Cómo usamos la información",
      paragraphs: [
        "Usamos la información personal para operar, asegurar, personalizar y mejorar los Servicios, incluyendo para:",
      ],
      bullets: [
        "Crear y autenticar cuentas, aplicar acceso por roles y mantener la seguridad de sesión (incluida autenticación multifactor cuando esté habilitada).",
        "Operar foros, chats, notificaciones, Academia, herramientas de práctica y Pulse AI.",
        "Recuperar conocimiento comunitario aprobado, materiales de Academia y fuentes oficiales curadas de seguros en EE. UU. para anclar respuestas de IA y aplicar políticas de seguridad / alcance.",
        "Enviar avisos transaccionales sobre seguridad de la cuenta, cambios del servicio y funciones que uses.",
        "Detectar abusos, spam, violaciones de políticas y amenazas de seguridad; hacer cumplir los Términos de uso.",
        "Diagnosticar problemas de confiabilidad y fallos en móvil.",
        "Cuando lo actives, analizar el uso agregado del producto para mejorar calidad y confiabilidad.",
        "Cumplir la ley, responder a solicitudes lícitas y establecer, ejercer o defender reclamaciones legales.",
      ],
    },
    {
      id: "ai",
      title: "7. Tratamiento específico de la IA",
      paragraphs: [
        "Pulse AI es un asistente educativo con alcance en contextos profesionales de seguros en EE. UU. Cuando lo usas, los prompts y el contexto de recuperación relacionado pueden procesarse en sistemas de Every Benefits y por proveedores de modelos o gateway únicamente para generar respuestas, aplicar límites de uso y filtros de seguridad.",
        "Diseñamos Pulse AI para anclar respuestas en conocimiento comunitario aprobado, materiales de Academia y fuentes oficiales curadas cuando estén disponibles. Las salidas son solo informativas y no constituyen asesoría legal, de cumplimiento, fiscal ni recomendaciones personalizadas de seguros. Tú sigues siendo responsable de verificar la información antes de actuar.",
        "Podemos conservar datos de conversación y comentarios de la IA para ofrecer historial en tu cuenta, mejorar la recuperación, investigar abusos y mantener la integridad del servicio, conforme a las prácticas de retención siguientes. No usamos tus conversaciones de Pulse AI para entrenar modelos fundacionales de terceros con fines publicitarios no relacionados.",
        "No envíes datos confidenciales de clientes, información de salud protegida (PHI), números de Seguro Social, datos de tarjetas de pago u otros datos personales sensibles de terceros a Pulse AI o a foros públicos.",
      ],
    },
    {
      id: "cookies",
      title: "8. Cookies y tecnologías similares",
      paragraphs: [
        "Usamos cookies, almacenamiento local y tecnologías similares necesarias para autenticación, continuidad de sesión, preferencia de idioma, seguridad y funcionalidad básica del sitio.",
        "No usamos cookies publicitarias de terceros para construir perfiles publicitarios entre sitios en Pulse. La analítica de producto opcional (cuando la activas) puede usar identificadores de analítica coherentes con las prácticas de Firebase Analytics.",
        "Puedes controlar las cookies en la configuración de tu navegador. Desactivar cookies necesarias puede impedir el inicio de sesión o romper funciones esenciales. Las preferencias de idioma y tema pueden almacenarse localmente en tu dispositivo.",
      ],
    },
    {
      id: "controls",
      title: "9. Controles de privacidad en el producto",
      paragraphs: [
        "Pulse ofrece controles de privacidad para gestionar cómo otros miembros te encuentran y contactan, y si la analítica opcional se ejecuta en tus dispositivos. Los controles están en Perfil / Cuenta → Privacidad (web) y Ajustes → Privacidad (móvil):",
      ],
      bullets: [
        "Aparecer en el directorio — controla si apareces en listados del directorio de miembros.",
        "Permitir mensajes directos — controla si otros miembros pueden iniciar un chat privado contigo.",
        "Encontrable por correo / NPN — controla si pueden encontrarte buscando esos identificadores.",
        "Mostrar correo / NPN en resultados de búsqueda — controla qué detalles se revelan cuando te encuentran.",
        "Analítica de producto — activa o desactiva Firebase Analytics opcional (desactivada por defecto).",
      ],
    },
    {
      id: "controls-limits",
      title: "9.1 Límites de los controles de privacidad",
      paragraphs: [
        "Desactivar la visibilidad en el directorio no elimina tu cuenta ni el contenido que ya publicaste en foros o chats de grupo. Los administradores de la organización pueden seguir viendo información de membresía necesaria para operar el espacio de tu agencia. La seguridad, autenticación y diagnósticos de fallos necesarios para operar los Servicios no se desactivan al optar por no usar analítica.",
        "Si desactivas los mensajes directos, las conversaciones existentes pueden seguir visibles para los participantes, pero las nuevas invitaciones de DM de otros miembros pueden bloquearse según las reglas del producto.",
      ],
    },
    {
      id: "sharing",
      title: "10. Cómo compartimos la información",
      paragraphs: [
        "No vendemos información personal a cambio de dinero. Tampoco “compartimos” información personal para publicidad conductual entre contextos según se define en la CPRA. Divulgamos información solo según sea necesario para operar los Servicios:",
      ],
      bullets: [
        "Proveedores de servicios / encargados: alojamiento, autenticación, bases de datos, almacenamiento, correo, reportes de fallos y proveedores de modelos/gateway de IA que procesan datos bajo nuestras instrucciones.",
        "Otros usuarios: el contenido que publicas o envías en foros, chats u otros espacios compartidos es visible según los permisos del producto y tus ajustes de privacidad.",
        "Afiliados y operaciones societarias: en relación con una fusión, adquisición, financiamiento o venta de activos, con salvaguardas de confidencialidad adecuadas.",
        "Legal y seguridad: cuando lo exija la ley, una citación o una orden judicial, o para proteger los derechos, la propiedad o la seguridad de Every Benefits, nuestros usuarios o el público.",
      ],
    },
    {
      id: "retention",
      title: "11. Conservación",
      paragraphs: [
        "Conservamos la información personal mientras tu cuenta permanezca activa y según sea razonablemente necesario para prestar los Servicios, resolver disputas, hacer cumplir acuerdos, mantener la seguridad y cumplir requisitos legales, contables o regulatorios.",
        "Periodos operativos típicos (sujetos a retenciones legales y ciclos de respaldo): datos de perfil durante la vida de la cuenta; contenido comunitario mientras esté publicado y por un periodo razonable tras solicitudes de eliminación para preservar la integridad de los hilos; historial de conversaciones de IA mientras sea necesario para el historial en el producto e investigación de abusos; registros de seguridad por un periodo limitado; reportes de fallos para diagnósticos y luego eliminación o agregación.",
        "Cuando la información ya no sea necesaria, la eliminamos o desidentificamos conforme a nuestras prácticas operativas. Pueden permanecer copias residuales en respaldos cifrados durante un tiempo limitado hasta que se sobrescriban.",
      ],
    },
    {
      id: "rights",
      title: "12. Tus opciones y derechos de privacidad",
      paragraphs: [
        "Según dónde vivas, puedes tener derechos a solicitar acceso, corrección, eliminación, portabilidad o limitación de cierta información personal, y a apelar nuestra decisión sobre una solicitud. También puedes actualizar muchos ajustes de perfil y privacidad directamente en el producto.",
        "Para ejercer derechos, escribe a support@everybenefits.com con “Solicitud de privacidad” en el asunto. Verificaremos tu identidad (por ejemplo confirmando el control del correo de la cuenta) antes de atender solicitudes. Responderemos dentro de los plazos exigidos por la ley aplicable.",
        "No te discriminaremos por ejercer derechos de privacidad. Parte de la información puede conservarse cuando exista una base legal (por ejemplo registros de seguridad, prevención de fraude o contenido necesario para preservar la integridad de la comunidad).",
      ],
      bullets: [
        "Acceso / conocer — solicitar categorías y piezas específicas de información personal que tenemos sobre ti.",
        "Corregir — solicitar la corrección de información personal inexacta.",
        "Eliminar — solicitar la eliminación de información personal, sujeta a excepciones permitidas.",
        "Portabilidad — solicitar una copia portable de cierta información que proporcionaste.",
        "Optar por no venta/compartición — no vendemos ni compartimos para publicidad conductual entre contextos; aún así puedes escribirnos para confirmarlo.",
        "Limitar el uso de información personal sensible — cuando aplique, solicitar límites al uso de campos sensibles más allá de lo necesario para prestar los Servicios.",
        "Apelar — si denegamos una solicitud, puedes pedirnos reconsideración respondiendo a nuestro correo de decisión.",
      ],
    },
    {
      id: "california",
      title: "13. Aviso para residentes de California",
      paragraphs: [
        "Si eres residente de California, la CCPA/CPRA otorga derechos adicionales descritos arriba. En los 12 meses anteriores, podemos haber recopilado las categorías listadas en la Sección 3 para los fines comerciales descritos en la Sección 6.",
        "No vendemos información personal ni la compartimos para publicidad conductual entre contextos. No usamos ni divulgamos información personal sensible para fines distintos de los permitidos para prestar los Servicios (por ejemplo seguridad de la cuenta y campos profesionales de perfil que proporcionas).",
        "Los agentes autorizados pueden presentar solicitudes en tu nombre con prueba de autorización y verificación de identidad del consumidor.",
      ],
    },
    {
      id: "other-states",
      title: "14. Otras leyes estatales de privacidad de EE. UU.",
      paragraphs: [
        "Los residentes de ciertos otros estados de EE. UU. (incluyendo, cuando aplique, Virginia, Colorado, Connecticut, Utah y regímenes similares) pueden tener derechos comparables de acceso, eliminación, corrección, obtención de una copia u oposición a cierto tratamiento. Atenderemos las solicitudes aplicables de forma coherente con esas leyes cuando nos contactes como se describe arriba.",
        "Pulse no vende datos personales ni realiza publicidad conductual entre contextos, y no perfila usuarios para decisiones de elegibilidad fuera de los controles de acceso por roles del producto.",
      ],
    },
    {
      id: "dnt",
      title: "15. Do Not Track y Global Privacy Control",
      paragraphs: [
        "Algunos navegadores ofrecen señales “Do Not Track” (DNT). Como no hay un estándar industrial consistente para DNT, nuestros Servicios no responden a señales DNT en este momento.",
        "Si implementamos soporte para Global Privacy Control (GPC) o señales de preferencia de exclusión legalmente reconocidas para venta/compartición, trataremos esas señales como una exclusión de venta/compartición en la medida exigida por la ley. Como hoy no vendemos ni compartimos para publicidad entre contextos, GPC no cambia el procesamiento principal de Pulse, pero puedes seguir usando la exclusión de analítica en el producto.",
      ],
    },
    {
      id: "security",
      title: "16. Seguridad",
      paragraphs: [
        "Usamos medidas administrativas, técnicas y organizativas diseñadas para proteger la información personal, incluido transporte cifrado (HTTPS/TLS), autenticación y controles de acceso, privilegio mínimo para personal de operaciones y monitoreo de abusos.",
        "Ningún método de transmisión o almacenamiento es completamente seguro. Eres responsable de proteger tus credenciales y de usar autenticación multifactor cuando se ofrezca. Notifícanos de inmediato en support@everybenefits.com si sospechas acceso no autorizado a tu cuenta.",
      ],
    },
    {
      id: "children",
      title: "17. Privacidad de menores",
      paragraphs: [
        "Los Servicios están pensados para adultos en contextos profesionales de seguros y no están dirigidos a menores de 16 años. No recopilamos a sabiendas información personal de menores de 16. Si crees que un menor nos ha proporcionado información personal, contáctanos y tomaremos las medidas adecuadas para eliminarla.",
      ],
    },
    {
      id: "international",
      title: "18. Transferencias internacionales",
      paragraphs: [
        "Every Benefits está basado en Estados Unidos. Si accedes a los Servicios desde fuera de Estados Unidos, entiendes que tu información puede procesarse en Estados Unidos y en otros países donde operen nuestros proveedores, que pueden tener leyes de protección de datos distintas a las de tu país de residencia.",
        "Cuando se requiera, nos apoyamos en mecanismos de transferencia apropiados y protecciones contractuales con encargados. Al usar los Servicios, reconoces estas transferencias según se describe en esta Política.",
      ],
    },
    {
      id: "professional",
      title: "19. Aviso profesional y específico de seguros",
      paragraphs: [
        "Pulse es un producto de comunidad y aprendizaje profesional. No debes subir listas de clientes, paquetes de solicitud, expedientes de siniestros, registros médicos u otra información confidencial de consumidores. Hacerlo puede violar la ley, normas de carriers y nuestros Términos de uso.",
        "Los campos de NPN y licencias se usan para apoyar la identidad profesional dentro de la comunidad y los flujos organizacionales. Proporcionar credenciales profesionales falsas puede resultar en suspensión de la cuenta.",
      ],
    },
    {
      id: "changes",
      title: "20. Cambios a esta Política",
      paragraphs: [
        "Podemos actualizar esta Política de privacidad periódicamente. Publicaremos la versión actualizada en esta página y revisaremos la fecha de “Última actualización”. Los cambios materiales también pueden comunicarse a través de los Servicios o por correo electrónico cuando corresponda. El uso continuado de los Servicios después de una actualización significa que aceptas la Política revisada, salvo cuando la ley aplicable exija consentimiento adicional.",
      ],
    },
    {
      id: "contact",
      title: "21. Contacto y ley aplicable",
      paragraphs: [
        "Contacto de privacidad: support@everybenefits.com.",
        "Esta Política de privacidad se rige por las leyes del Estado de Florida, Estados Unidos, sin perjuicio de los principios de conflicto de leyes, salvo cuando resulten aplicables leyes locales imperativas de privacidad del consumidor que no puedan renunciarse.",
      ],
    },
  ],
};

const termsEnDraft: LegalDocDraft = {
  kind: "terms",
  title: "Terms of Use",
  summary:
    "These Terms of Use govern your access to and use of Pulse and related Every Benefits services. By creating an account or using the Services, you agree to these Terms and our Privacy Policy.",
  sections: [
    {
      id: "agreement",
      title: "1. Agreement to these Terms",
      paragraphs: [
        "These Terms of Use (“Terms”) form a binding agreement between you and Every Benefits regarding Pulse and related web and mobile services (the “Services”). By creating an account, accessing, or using the Services, you accept these Terms and our Privacy Policy.",
        "If you do not agree, do not use the Services. Questions: support@everybenefits.com.",
      ],
    },
    {
      id: "definitions",
      title: "2. Definitions",
      paragraphs: [
        "“Content” means text, images, audio, video, files, messages, prompts, feedback, and other materials submitted to or generated through the Services.",
        "“User Content” means Content you submit. “Every Benefits Content” means Content we or our licensors provide, including Academy materials, branding, software, and documentation.",
        "“Pulse AI” means the educational AI assistant features available in Pulse.",
      ],
    },
    {
      id: "eligibility",
      title: "3. Eligibility and professional use",
      paragraphs: [
        "The Services are intended for adults using them in connection with the US insurance profession or related professional learning. You represent that you are at least 18 years old (or the age of majority in your jurisdiction) and that information you provide is accurate.",
        "If you provide an NPN, agency affiliation, or other professional credentials, you represent that they are truthful and that you are authorized to use them. Misrepresentation of professional status is grounds for suspension or termination.",
        "If you use the Services on behalf of an agency or employer, you represent that you have authority to bind that organization to these Terms where applicable.",
      ],
    },
    {
      id: "accounts",
      title: "4. Accounts, security, and authentication",
      paragraphs: [
        "You must provide accurate registration information and keep it updated. You are responsible for activity under your account and for safeguarding credentials, devices, and recovery methods.",
        "You must enable and use multi-factor authentication when offered for your account or organization. Notify us immediately of suspected unauthorized access at support@everybenefits.com.",
        "We may suspend or terminate accounts that violate these Terms, pose a security risk, were created with false information, or remain inactive.",
      ],
    },
    {
      id: "services",
      title: "5. The Services",
      paragraphs: [
        "Pulse provides community forums, messaging, notifications, Academy learning content, optional practice tools, and Pulse AI assistance for insurance professionals. Features may vary by role, organization, locale, or feature flag.",
        "We may modify, suspend, or discontinue parts of the Services with or without notice when reasonably necessary for operations, security, legal compliance, or product evolution. We do not guarantee that any particular feature will remain available indefinitely.",
      ],
    },
    {
      id: "license",
      title: "6. License to use the Services",
      paragraphs: [
        "Subject to these Terms, Every Benefits grants you a limited, revocable, non-exclusive, non-transferable license to access and use the Services for your lawful professional and learning purposes.",
        "You may not copy, rent, lease, sell, sublicense, reverse engineer (except to the limited extent permitted by law), or use the Services to build a competing product using non-public aspects of our systems.",
      ],
    },
    {
      id: "acceptable-use",
      title: "7. Acceptable use",
      paragraphs: [
        "You agree not to misuse the Services. Prohibited conduct includes, without limitation:",
      ],
      bullets: [
        "Posting unlawful, harassing, hateful, defamatory, fraudulent, obscene, or infringing content.",
        "Sharing confidential client data, protected health information (PHI), Social Security numbers, payment card data, or other sensitive personal data of third parties without a lawful basis and appropriate safeguards.",
        "Attempting to bypass security, scrape at scale, disrupt, overload, or reverse engineer the Services except as permitted by law.",
        "Impersonating others, misrepresenting affiliation, spamming, or manipulating ranking, voting, or engagement systems.",
        "Using Pulse AI or other features to generate deceptive marketing, evade licensing or carrier rules, or provide regulated advice you are not authorized to give.",
        "Uploading malware, probing vulnerabilities without authorization, or interfering with other users’ enjoyment of the Services.",
        "Using bots or automated means to create accounts, harvest data, or post content without our prior written consent.",
      ],
    },
    {
      id: "community",
      title: "8. Community standards",
      paragraphs: [
        "Forums and chats are professional spaces. Be respectful, stay on topic, and prefer evidence-based answers. Mark uncertainty clearly. Do not treat community answers as official carrier or regulatory guidance.",
        "We may moderate, remove, or restrict content or accounts that violate these standards or harm the community, with or without prior notice when reasonably necessary.",
      ],
    },
    {
      id: "user-content",
      title: "9. User Content",
      paragraphs: [
        "You retain ownership of User Content you submit. By submitting User Content, you grant Every Benefits a worldwide, non-exclusive, royalty-free, sublicensable license to host, store, reproduce, display, distribute, adapt (for formatting/indexing), and otherwise use that Content as needed to operate, secure, and improve the Services and to make shared Content available according to product permissions.",
        "You represent that you have all rights necessary to submit the Content and that it does not violate law or third-party rights. You are solely responsible for User Content you submit.",
        "We may remove or restrict Content that violates these Terms or that we reasonably believe is harmful, unlawful, or inconsistent with product integrity.",
      ],
    },
    {
      id: "feedback",
      title: "10. Feedback",
      paragraphs: [
        "If you provide ideas, suggestions, or feedback about the Services, you grant Every Benefits a perpetual, irrevocable, royalty-free license to use that feedback without restriction or compensation to you.",
      ],
    },
    {
      id: "pulse-ai",
      title: "11. Pulse AI disclaimer",
      paragraphs: [
        "Pulse AI provides educational information for insurance professionals. It is not a licensed advisor, attorney, broker-dealer, tax professional, or compliance officer. Outputs are not legal advice, compliance advice, tax advice, or personalized insurance recommendations.",
        "AI responses may be incomplete, outdated, or incorrect. You remain responsible for verifying information against official sources, carrier rules, state regulations, and your professional obligations before acting.",
        "Every Benefits does not guarantee accuracy, completeness, or fitness of AI outputs for any particular purpose. Do not rely on Pulse AI as the sole basis for client recommendations, filings, or regulatory determinations.",
      ],
    },
    {
      id: "academy",
      title: "12. Academy and learning materials",
      paragraphs: [
        "Academy courses and paths are provided for professional learning. Completion indicators or certificates within Pulse (if any) do not by themselves constitute state CE credit, carrier appointment, or a license to sell insurance unless expressly stated in writing by an authorized provider.",
        "You may not copy, redistribute, or publicly republish Academy materials except as expressly allowed by the product’s sharing features or written permission from Every Benefits.",
      ],
    },
    {
      id: "tools",
      title: "13. Practice tools",
      paragraphs: [
        "Certain tools (for example practice quoting helpers) are for education and skill practice only. They do not generate binding carrier quotes, applications, or offers of insurance coverage.",
        "You must not present practice outputs to clients as official quotes or as advice from Every Benefits or any carrier.",
      ],
    },
    {
      id: "ip",
      title: "14. Intellectual property",
      paragraphs: [
        "The Services, including software, branding, Every Benefits Content, and documentation, are owned by Every Benefits or its licensors and protected by intellectual property laws. Except for the limited license in Section 6, no rights are transferred to you.",
        "“Pulse,” “Every Benefits,” and related marks are trademarks of Every Benefits or its affiliates. You may not use them without prior written permission, except for factual references that comply with applicable law.",
      ],
    },
    {
      id: "dmca",
      title: "15. Copyright complaints",
      paragraphs: [
        "If you believe Content on the Services infringes your copyright, send a notice to support@everybenefits.com with: (a) identification of the copyrighted work; (b) identification of the allegedly infringing material and its location; (c) your contact information; (d) a statement of good-faith belief that use is not authorized; (e) a statement under penalty of perjury that the information is accurate and that you are authorized to act; and (f) your physical or electronic signature.",
        "We may remove or disable access to allegedly infringing material and, in appropriate circumstances, terminate repeat infringers.",
      ],
    },
    {
      id: "third-parties",
      title: "16. Third-party services",
      paragraphs: [
        "The Services may rely on third-party infrastructure and providers (including authentication, hosting, analytics SDKs you opt into, crash reporting, and AI model providers). Your use of those components is subject to these Terms and, where applicable, the providers’ terms.",
        "We are not responsible for third-party services we do not control, including carrier portals, agency systems, or external websites linked from the Services.",
      ],
    },
    {
      id: "beta",
      title: "17. Beta and experimental features",
      paragraphs: [
        "We may offer beta, preview, or experimental features. They are provided as-is, may be unstable, and may be changed or withdrawn at any time. Feedback you provide about beta features is subject to Section 10.",
      ],
    },
    {
      id: "fees",
      title: "18. Fees",
      paragraphs: [
        "Access to Pulse may be provided without a direct consumer fee under your organization’s arrangement with Every Benefits. If paid plans or add-ons are introduced, additional pricing terms will be presented before purchase and will form part of these Terms for those features.",
      ],
    },
    {
      id: "confidentiality",
      title: "19. Confidentiality and client data",
      paragraphs: [
        "You must not use the Services to store or transmit confidential client files, applications containing sensitive consumer data, claim documentation, or medical records. You agree to comply with applicable privacy, insurance, and data-protection laws in your use of the Services.",
        "Breach of this section is a material breach of these Terms and may result in immediate suspension.",
      ],
    },
    {
      id: "disclaimers",
      title: "20. Disclaimers",
      paragraphs: [
        "THE SERVICES ARE PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE MAXIMUM EXTENT PERMITTED BY LAW, EVERY BENEFITS DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICES WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE OF HARMFUL COMPONENTS, OR THAT CONTENT (INCLUDING USER CONTENT AND AI OUTPUTS) WILL BE ACCURATE OR RELIABLE.",
      ],
    },
    {
      id: "liability",
      title: "21. Limitation of liability",
      paragraphs: [
        "TO THE MAXIMUM EXTENT PERMITTED BY LAW, EVERY BENEFITS AND ITS AFFILIATES, OFFICERS, EMPLOYEES, AND AGENTS WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR LOST PROFITS, REVENUE, DATA, BUSINESS, OR GOODWILL, ARISING FROM OR RELATED TO YOUR USE OF THE SERVICES, WHETHER BASED IN CONTRACT, TORT, OR ANY OTHER THEORY, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.",
        "OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF OR RELATING TO THE SERVICES WILL NOT EXCEED THE GREATER OF (A) THE AMOUNTS YOU PAID TO EVERY BENEFITS FOR THE SERVICES IN THE TWELVE MONTHS BEFORE THE CLAIM OR (B) ONE HUNDRED US DOLLARS (US $100).",
        "Some jurisdictions do not allow certain limitations; in those cases, our liability is limited to the maximum extent permitted by law.",
      ],
    },
    {
      id: "indemnity",
      title: "22. Indemnification",
      paragraphs: [
        "You agree to defend, indemnify, and hold harmless Every Benefits and its affiliates, officers, employees, and agents from and against claims, damages, losses, and expenses (including reasonable attorneys’ fees) arising out of your User Content, your misuse of the Services, your violation of these Terms or applicable law, or your infringement of third-party rights.",
      ],
    },
    {
      id: "termination",
      title: "23. Suspension and termination",
      paragraphs: [
        "You may stop using the Services at any time. You may request account closure by contacting support@everybenefits.com, subject to verification and retention exceptions described in the Privacy Policy.",
        "We may suspend or terminate access immediately if you violate these Terms, create risk or legal exposure for us or others, or if we discontinue the Services. Provisions that by their nature should survive (including ownership, licenses to User Content already granted to the extent needed for residual operations, disclaimers, limitations of liability, and indemnity) will survive termination.",
      ],
    },
    {
      id: "disputes",
      title: "24. Governing law, venue, and disputes",
      paragraphs: [
        "These Terms are governed by the laws of the State of Florida, United States, without regard to conflict-of-law principles.",
        "Except where prohibited by law, exclusive venue for disputes arising out of these Terms or the Services will be the state or federal courts located in Florida, and you consent to personal jurisdiction there.",
        "Before filing a claim, you agree to attempt to resolve the dispute informally by contacting support@everybenefits.com and allowing 30 days for a response.",
      ],
    },
    {
      id: "export",
      title: "25. Export and sanctions",
      paragraphs: [
        "You may not use the Services if you are located in a jurisdiction subject to comprehensive US sanctions or if you are on a US government restricted-party list. You agree to comply with applicable export control and sanctions laws.",
      ],
    },
    {
      id: "misc",
      title: "26. Miscellaneous",
      paragraphs: [
        "These Terms, together with the Privacy Policy and any supplemental terms presented for specific features, are the entire agreement between you and Every Benefits regarding the Services and supersede prior agreements on the same subject.",
        "If any provision is found unenforceable, the remaining provisions will remain in effect. Our failure to enforce a provision is not a waiver. You may not assign these Terms without our consent; we may assign them in connection with a corporate transaction. There are no third-party beneficiaries except as expressly stated.",
        "Headings are for convenience only. “Including” means “including without limitation.”",
      ],
    },
    {
      id: "changes",
      title: "27. Changes",
      paragraphs: [
        "We may update these Terms from time to time. We will post the updated Terms on this page and update the “Last updated” date. If you continue using the Services after changes take effect, you accept the revised Terms, except where applicable law requires additional notice or consent.",
      ],
    },
    {
      id: "contact",
      title: "28. Contact",
      paragraphs: [
        "Every Benefits — Pulse support: support@everybenefits.com.",
      ],
    },
  ],
};

const termsEsDraft: LegalDocDraft = {
  kind: "terms",
  title: "Términos de uso",
  summary:
    "Estos Términos de uso rigen tu acceso y uso de Pulse y los servicios relacionados de Every Benefits. Al crear una cuenta o usar los Servicios, aceptas estos Términos y nuestra Política de privacidad.",
  sections: [
    {
      id: "agreement",
      title: "1. Aceptación de estos Términos",
      paragraphs: [
        "Estos Términos de uso (“Términos”) constituyen un acuerdo vinculante entre tú y Every Benefits respecto de Pulse y los servicios web y móviles relacionados (los “Servicios”). Al crear una cuenta, acceder o usar los Servicios, aceptas estos Términos y nuestra Política de privacidad.",
        "Si no estás de acuerdo, no uses los Servicios. Consultas: support@everybenefits.com.",
      ],
    },
    {
      id: "definitions",
      title: "2. Definiciones",
      paragraphs: [
        "“Contenido” significa texto, imágenes, audio, video, archivos, mensajes, prompts, comentarios y otros materiales enviados a o generados a través de los Servicios.",
        "“Contenido del usuario” significa el Contenido que envías. “Contenido de Every Benefits” significa el Contenido que nosotros o nuestros licenciantes proporcionamos, incluidos materiales de Academia, marca, software y documentación.",
        "“Pulse AI” significa las funciones del asistente educativo de IA disponibles en Pulse.",
      ],
    },
    {
      id: "eligibility",
      title: "3. Elegibilidad y uso profesional",
      paragraphs: [
        "Los Servicios están pensados para adultos que los usan en relación con la profesión de seguros en EE. UU. o el aprendizaje profesional relacionado. Declaras que tienes al menos 18 años (o la mayoría de edad en tu jurisdicción) y que la información que proporcionas es exacta.",
        "Si proporcionas un NPN, afiliación de agencia u otras credenciales profesionales, declaras que son veraces y que estás autorizado a usarlas. La tergiversación del estatus profesional es causa de suspensión o terminación.",
        "Si usas los Servicios en nombre de una agencia o empleador, declaras que tienes autoridad para vincular a esa organización a estos Términos cuando corresponda.",
      ],
    },
    {
      id: "accounts",
      title: "4. Cuentas, seguridad y autenticación",
      paragraphs: [
        "Debes proporcionar información de registro precisa y mantenerla actualizada. Eres responsable de la actividad bajo tu cuenta y de proteger credenciales, dispositivos y métodos de recuperación.",
        "Debes activar y usar autenticación multifactor cuando se ofrezca para tu cuenta u organización. Notifícanos de inmediato cualquier sospecha de acceso no autorizado en support@everybenefits.com.",
        "Podemos suspender o cancelar cuentas que violen estos Términos, representen un riesgo de seguridad, se hayan creado con información falsa o permanezcan inactivas.",
      ],
    },
    {
      id: "services",
      title: "5. Los Servicios",
      paragraphs: [
        "Pulse ofrece foros comunitarios, mensajería, notificaciones, contenido de aprendizaje de Academia, herramientas de práctica opcionales y asistencia de Pulse AI para profesionales de seguros. Las funciones pueden variar según rol, organización, idioma o feature flags.",
        "Podemos modificar, suspender o discontinuar partes de los Servicios con o sin aviso cuando sea razonablemente necesario por operaciones, seguridad, cumplimiento legal o evolución del producto. No garantizamos que una función particular permanezca disponible indefinidamente.",
      ],
    },
    {
      id: "license",
      title: "6. Licencia de uso de los Servicios",
      paragraphs: [
        "Sujeto a estos Términos, Every Benefits te otorga una licencia limitada, revocable, no exclusiva e intransferible para acceder y usar los Servicios con fines profesionales y de aprendizaje lícitos.",
        "No puedes copiar, alquilar, vender, sublicenciar, realizar ingeniería inversa (salvo en la medida limitada permitida por la ley) ni usar los Servicios para construir un producto competidor aprovechando aspectos no públicos de nuestros sistemas.",
      ],
    },
    {
      id: "acceptable-use",
      title: "7. Uso aceptable",
      paragraphs: [
        "Aceptas no hacer un mal uso de los Servicios. La conducta prohibida incluye, sin limitación:",
      ],
      bullets: [
        "Publicar contenido ilegal, acosador, de odio, difamatorio, fraudulento, obsceno o que infrinja derechos.",
        "Compartir datos confidenciales de clientes, información de salud protegida (PHI), números de Seguro Social, datos de tarjetas de pago u otros datos personales sensibles de terceros sin base legal y salvaguardas adecuadas.",
        "Intentar eludir la seguridad, hacer scraping a escala, interrumpir, sobrecargar o realizar ingeniería inversa de los Servicios salvo lo permitido por la ley.",
        "Suplantar a otros, tergiversar afiliación, enviar spam o manipular sistemas de ranking, votación o participación.",
        "Usar Pulse AI u otras funciones para generar marketing engañoso, evadir normas de licencia o de carriers, o brindar asesoría regulada que no estés autorizado a dar.",
        "Subir malware, sondear vulnerabilidades sin autorización o interferir con el uso de los Servicios por parte de otros.",
        "Usar bots o medios automatizados para crear cuentas, recolectar datos o publicar contenido sin nuestro consentimiento previo por escrito.",
      ],
    },
    {
      id: "community",
      title: "8. Normas de la comunidad",
      paragraphs: [
        "Los foros y chats son espacios profesionales. Sé respetuoso, mantente en el tema y prioriza respuestas basadas en evidencia. Señala claramente la incertidumbre. No trates las respuestas de la comunidad como orientación oficial de carriers o reguladores.",
        "Podemos moderar, eliminar o restringir contenido o cuentas que violen estas normas o perjudiquen a la comunidad, con o sin aviso previo cuando sea razonablemente necesario.",
      ],
    },
    {
      id: "user-content",
      title: "9. Contenido del usuario",
      paragraphs: [
        "Conservas la propiedad del Contenido del usuario que envías. Al enviarlo, otorgas a Every Benefits una licencia mundial, no exclusiva, libre de regalías y sublicenciable para alojar, almacenar, reproducir, mostrar, distribuir, adaptar (para formato/indexación) y usar de otro modo ese Contenido según sea necesario para operar, asegurar y mejorar los Servicios y para poner el Contenido compartido a disposición según los permisos del producto.",
        "Declaras que tienes todos los derechos necesarios para enviar el Contenido y que no viola la ley ni derechos de terceros. Eres el único responsable del Contenido del usuario que envías.",
        "Podemos eliminar o restringir Contenido que viole estos Términos o que razonablemente consideremos dañino, ilegal o inconsistente con la integridad del producto.",
      ],
    },
    {
      id: "feedback",
      title: "10. Comentarios",
      paragraphs: [
        "Si proporcionas ideas, sugerencias o comentarios sobre los Servicios, otorgas a Every Benefits una licencia perpetua, irrevocable y libre de regalías para usar esos comentarios sin restricción ni compensación para ti.",
      ],
    },
    {
      id: "pulse-ai",
      title: "11. Descargo de Pulse AI",
      paragraphs: [
        "Pulse AI proporciona información educativa para profesionales de seguros. No es un asesor con licencia, abogado, broker-dealer, profesional fiscal ni responsable de cumplimiento. Las salidas no constituyen asesoría legal, de cumplimiento, fiscal ni recomendaciones personalizadas de seguros.",
        "Las respuestas de IA pueden ser incompletas, desactualizadas o incorrectas. Tú sigues siendo responsable de verificar la información frente a fuentes oficiales, normas de carriers, regulaciones estatales y tus obligaciones profesionales antes de actuar.",
        "Every Benefits no garantiza la exactitud, integridad o idoneidad de las salidas de la IA para ningún propósito particular. No te bases en Pulse AI como único fundamento para recomendaciones a clientes, presentaciones o determinaciones regulatorias.",
      ],
    },
    {
      id: "academy",
      title: "12. Academia y materiales de aprendizaje",
      paragraphs: [
        "Los cursos y rutas de Academia se proporcionan para aprendizaje profesional. Los indicadores de finalización o certificados dentro de Pulse (si los hay) no constituyen por sí solos créditos CE estatales, nombramiento de carrier ni licencia para vender seguros, salvo que un proveedor autorizado lo declare expresamente por escrito.",
        "No puedes copiar, redistribuir ni republicar públicamente materiales de Academia excepto según lo permitan expresamente las funciones de compartición del producto o el permiso escrito de Every Benefits.",
      ],
    },
    {
      id: "tools",
      title: "13. Herramientas de práctica",
      paragraphs: [
        "Ciertas herramientas (por ejemplo ayudas de cotización de práctica) son solo para educación y práctica de habilidades. No generan cotizaciones vinculantes de carriers, solicitudes ni ofertas de cobertura de seguros.",
        "No debes presentar salidas de práctica a clientes como cotizaciones oficiales ni como asesoría de Every Benefits o de cualquier carrier.",
      ],
    },
    {
      id: "ip",
      title: "14. Propiedad intelectual",
      paragraphs: [
        "Los Servicios, incluido el software, la marca, el Contenido de Every Benefits y la documentación, son propiedad de Every Benefits o de sus licenciantes y están protegidos por las leyes de propiedad intelectual. Salvo la licencia limitada de la Sección 6, no se te transfieren otros derechos.",
        "“Pulse”, “Every Benefits” y marcas relacionadas son marcas de Every Benefits o sus afiliados. No puedes usarlas sin permiso previo por escrito, salvo referencias factuales permitidas por la ley aplicable.",
      ],
    },
    {
      id: "dmca",
      title: "15. Reclamaciones de derechos de autor",
      paragraphs: [
        "Si crees que Contenido en los Servicios infringe tus derechos de autor, envía un aviso a support@everybenefits.com con: (a) identificación de la obra; (b) identificación del material presuntamente infractor y su ubicación; (c) tu información de contacto; (d) una declaración de creencia de buena fe de que el uso no está autorizado; (e) una declaración bajo pena de perjurio de que la información es exacta y que estás autorizado a actuar; y (f) tu firma física o electrónica.",
        "Podemos eliminar o deshabilitar el acceso al material presuntamente infractor y, en circunstancias apropiadas, terminar a infractores reincidentes.",
      ],
    },
    {
      id: "third-parties",
      title: "16. Servicios de terceros",
      paragraphs: [
        "Los Servicios pueden depender de infraestructura y proveedores de terceros (incluida autenticación, alojamiento, SDKs de analítica a los que optes, reportes de fallos y proveedores de modelos de IA). Tu uso de esos componentes está sujeto a estos Términos y, cuando corresponda, a los términos de los proveedores.",
        "No somos responsables de servicios de terceros que no controlamos, incluidos portales de carriers, sistemas de agencia o sitios externos enlazados desde los Servicios.",
      ],
    },
    {
      id: "beta",
      title: "17. Funciones beta y experimentales",
      paragraphs: [
        "Podemos ofrecer funciones beta, de vista previa o experimentales. Se proporcionan “tal cual”, pueden ser inestables y pueden cambiarse o retirarse en cualquier momento. Los comentarios que proporciones sobre funciones beta están sujetos a la Sección 10.",
      ],
    },
    {
      id: "fees",
      title: "18. Tarifas",
      paragraphs: [
        "El acceso a Pulse puede proporcionarse sin una tarifa directa al consumidor bajo el acuerdo de tu organización con Every Benefits. Si se introducen planes de pago o complementos, se presentarán términos de precios adicionales antes de la compra y formarán parte de estos Términos para esas funciones.",
      ],
    },
    {
      id: "confidentiality",
      title: "19. Confidencialidad y datos de clientes",
      paragraphs: [
        "No debes usar los Servicios para almacenar o transmitir archivos confidenciales de clientes, solicitudes con datos sensibles de consumidores, documentación de siniestros o registros médicos. Aceptas cumplir las leyes aplicables de privacidad, seguros y protección de datos en tu uso de los Servicios.",
        "El incumplimiento de esta sección es un incumplimiento material de estos Términos y puede resultar en suspensión inmediata.",
      ],
    },
    {
      id: "disclaimers",
      title: "20. Descargos de garantía",
      paragraphs: [
        "LOS SERVICIOS SE PROPORCIONAN “TAL CUAL” Y “SEGÚN DISPONIBILIDAD”. EN LA MÁXIMA MEDIDA PERMITIDA POR LA LEY, EVERY BENEFITS RENUNCIA A TODAS LAS GARANTÍAS, EXPRESAS O IMPLÍCITAS, INCLUIDAS COMERCIABILIDAD, IDONEIDAD PARA UN PROPÓSITO PARTICULAR, TITULARIDAD Y NO INFRACCIÓN. NO GARANTIZAMOS QUE LOS SERVICIOS SEAN ININTERRUMPIDOS, LIBRES DE ERRORES, SEGUROS O LIBRES DE COMPONENTES DAÑINOS, NI QUE EL CONTENIDO (INCLUIDO EL CONTENIDO DEL USUARIO Y LAS SALIDAS DE IA) SEA EXACTO O CONFIABLE.",
      ],
    },
    {
      id: "liability",
      title: "21. Limitación de responsabilidad",
      paragraphs: [
        "EN LA MÁXIMA MEDIDA PERMITIDA POR LA LEY, EVERY BENEFITS Y SUS AFILIADOS, DIRECTIVOS, EMPLEADOS Y AGENTES NO SERÁN RESPONSABLES POR DAÑOS INDIRECTOS, INCIDENTALES, ESPECIALES, CONSECUENTES, EJEMPLARES O PUNITIVOS, NI POR LUCRO CESANTE, PÉRDIDA DE INGRESOS, DATOS, NEGOCIO O CLIENTES, DERIVADOS DE O RELACIONADOS CON TU USO DE LOS SERVICIOS, YA SEA POR CONTRATO, AGRAVIO U OTRA TEORÍA, INCLUSO SI SE ADVERTIDO DE LA POSIBILIDAD DE TALES DAÑOS.",
        "NUESTRA RESPONSABILIDAD TOTAL POR CUALQUIER RECLAMO DERIVADO DE O RELACIONADO CON LOS SERVICIOS NO EXCEDERÁ EL MAYOR DE (A) LOS MONTOS QUE PAGASTE A EVERY BENEFITS POR LOS SERVICIOS EN LOS DOCE MESES ANTERIORES AL RECLAMO O (B) CIEN DÓLARES ESTADOUNIDENSES (US $100).",
        "Algunas jurisdicciones no permiten ciertas limitaciones; en esos casos, nuestra responsabilidad se limita a la máxima medida permitida por la ley.",
      ],
    },
    {
      id: "indemnity",
      title: "22. Indemnización",
      paragraphs: [
        "Aceptas defender, indemnizar y mantener indemne a Every Benefits y a sus afiliados, directivos, empleados y agentes frente a reclamos, daños, pérdidas y gastos (incluidos honorarios razonables de abogados) derivados de tu Contenido del usuario, tu mal uso de los Servicios, tu violación de estos Términos o de la ley aplicable, o tu infracción de derechos de terceros.",
      ],
    },
    {
      id: "termination",
      title: "23. Suspensión y terminación",
      paragraphs: [
        "Puedes dejar de usar los Servicios en cualquier momento. Puedes solicitar el cierre de la cuenta contactando support@everybenefits.com, sujeto a verificación y excepciones de retención descritas en la Política de privacidad.",
        "Podemos suspender o terminar el acceso de inmediato si violas estos Términos, creas riesgo o exposición legal para nosotros u otros, o si discontinuamos los Servicios. Las disposiciones que por su naturaleza deban sobrevivir (incluida propiedad, licencias al Contenido del usuario ya otorgadas en la medida necesaria para operaciones residuales, descargos, limitaciones de responsabilidad e indemnización) sobrevivirán a la terminación.",
      ],
    },
    {
      id: "disputes",
      title: "24. Ley aplicable, foro y disputas",
      paragraphs: [
        "Estos Términos se rigen por las leyes del Estado de Florida, Estados Unidos, sin perjuicio de los principios de conflicto de leyes.",
        "Salvo cuando lo prohíba la ley, el foro exclusivo para disputas derivadas de estos Términos o de los Servicios serán los tribunales estatales o federales ubicados en Florida, y consientes la jurisdicción personal allí.",
        "Antes de presentar un reclamo, aceptas intentar resolver la disputa de forma informal contactando support@everybenefits.com y permitiendo 30 días para una respuesta.",
      ],
    },
    {
      id: "export",
      title: "25. Exportación y sanciones",
      paragraphs: [
        "No puedes usar los Servicios si te encuentras en una jurisdicción sujeta a sanciones integrales de EE. UU. o si estás en una lista de partes restringidas del gobierno de EE. UU. Aceptas cumplir las leyes aplicables de control de exportaciones y sanciones.",
      ],
    },
    {
      id: "misc",
      title: "26. Disposiciones generales",
      paragraphs: [
        "Estos Términos, junto con la Política de privacidad y cualquier término suplementario presentado para funciones específicas, constituyen el acuerdo completo entre tú y Every Benefits respecto de los Servicios y sustituyen acuerdos previos sobre el mismo tema.",
        "Si alguna disposición se considera inaplicable, las restantes permanecerán en vigor. Nuestra falta de hacer cumplir una disposición no constituye una renuncia. No puedes ceder estos Términos sin nuestro consentimiento; nosotros podemos cederlos en relación con una operación societaria. No hay beneficiarios terceros salvo lo expresamente indicado.",
        "Los encabezados son solo por conveniencia. “Incluyendo” significa “incluyendo sin limitación”.",
      ],
    },
    {
      id: "changes",
      title: "27. Cambios",
      paragraphs: [
        "Podemos actualizar estos Términos periódicamente. Publicaremos los Términos actualizados en esta página y actualizaremos la fecha de “Última actualización”. Si continúas usando los Servicios después de que los cambios surtan efecto, aceptas los Términos revisados, salvo cuando la ley aplicable exija aviso o consentimiento adicional.",
      ],
    },
    {
      id: "contact",
      title: "28. Contacto",
      paragraphs: [
        "Every Benefits — soporte de Pulse: support@everybenefits.com.",
      ],
    },
  ],
};

const privacyTopicsEn: TopicDef[] = [
  {
    id: "your-info",
    title: "Your information",
    blurb: "Who we are, what we collect, and where it comes from.",
    illustration: "signal",
    sectionIds: ["who-we-are", "scope", "categories", "sources", "collection"],
  },
  {
    id: "how-we-use",
    title: "How we use it",
    blurb: "The purposes behind operating Pulse for licensed agents.",
    illustration: "orbit",
    sectionIds: ["use"],
  },
  {
    id: "ai-cookies",
    title: "Pulse AI & cookies",
    blurb: "How AI conversations and necessary cookies work.",
    illustration: "spark",
    sectionIds: ["ai", "cookies"],
  },
  {
    id: "controls",
    title: "Your privacy controls",
    blurb: "Directory, DMs, search visibility, and analytics opt-in.",
    illustration: "dial",
    sectionIds: ["controls", "controls-limits"],
  },
  {
    id: "sharing-retention",
    title: "Sharing & retention",
    blurb: "Who sees what, and how long we keep it.",
    illustration: "handshake",
    sectionIds: ["sharing", "retention"],
  },
  {
    id: "your-rights",
    title: "Your rights",
    blurb: "Access, delete, correct, California and state privacy rights.",
    illustration: "scale",
    sectionIds: ["rights", "california", "other-states", "dnt"],
  },
  {
    id: "security-more",
    title: "Security & more",
    blurb: "Safeguards, children, transfers, professional notice, contact.",
    illustration: "shield",
    sectionIds: ["security", "children", "international", "professional", "changes", "contact"],
  },
];

const privacyTopicsEs: TopicDef[] = [
  {
    id: "your-info",
    title: "Tu información",
    blurb: "Quiénes somos, qué recopilamos y de dónde viene.",
    illustration: "signal",
    sectionIds: ["who-we-are", "scope", "categories", "sources", "collection"],
  },
  {
    id: "how-we-use",
    title: "Cómo la usamos",
    blurb: "Los fines detrás de operar Pulse para agentes con licencia.",
    illustration: "orbit",
    sectionIds: ["use"],
  },
  {
    id: "ai-cookies",
    title: "Pulse AI y cookies",
    blurb: "Cómo funcionan las conversaciones de IA y las cookies necesarias.",
    illustration: "spark",
    sectionIds: ["ai", "cookies"],
  },
  {
    id: "controls",
    title: "Tus controles de privacidad",
    blurb: "Directorio, DMs, visibilidad en búsqueda y analítica opcional.",
    illustration: "dial",
    sectionIds: ["controls", "controls-limits"],
  },
  {
    id: "sharing-retention",
    title: "Compartir y retención",
    blurb: "Quién ve qué, y cuánto tiempo lo conservamos.",
    illustration: "handshake",
    sectionIds: ["sharing", "retention"],
  },
  {
    id: "your-rights",
    title: "Tus derechos",
    blurb: "Acceso, eliminación, corrección y derechos estatales de EE. UU.",
    illustration: "scale",
    sectionIds: ["rights", "california", "other-states", "dnt"],
  },
  {
    id: "security-more",
    title: "Seguridad y más",
    blurb: "Salvaguardas, menores, transferencias, aviso profesional y contacto.",
    illustration: "shield",
    sectionIds: ["security", "children", "international", "professional", "changes", "contact"],
  },
];

const termsTopicsEn: TopicDef[] = [
  {
    id: "using-pulse",
    title: "Using Pulse",
    blurb: "The agreement, definitions, services, license, and fees.",
    illustration: "signal",
    sectionIds: ["agreement", "definitions", "services", "license", "fees"],
  },
  {
    id: "accounts",
    title: "Accounts & eligibility",
    blurb: "Professional use, credentials, security, and MFA.",
    illustration: "lock",
    sectionIds: ["eligibility", "accounts"],
  },
  {
    id: "rules",
    title: "Rules of the field",
    blurb: "Acceptable use, community standards, and client confidentiality.",
    illustration: "scroll",
    sectionIds: ["acceptable-use", "community", "confidentiality"],
  },
  {
    id: "content-ip",
    title: "Content & IP",
    blurb: "Your content, feedback, trademarks, and copyright notices.",
    illustration: "orbit",
    sectionIds: ["user-content", "feedback", "ip", "dmca", "third-parties"],
  },
  {
    id: "ai-academy-tools",
    title: "AI, Academy & tools",
    blurb: "Educational AI, learning materials, practice tools, and betas.",
    illustration: "spark",
    sectionIds: ["pulse-ai", "academy", "tools", "beta"],
  },
  {
    id: "liability",
    title: "Liability & termination",
    blurb: "Disclaimers, limits, indemnity, and account suspension.",
    illustration: "shield",
    sectionIds: ["disclaimers", "liability", "indemnity", "termination"],
  },
  {
    id: "disputes-more",
    title: "Disputes & general",
    blurb: "Governing law, sanctions, miscellaneous terms, and contact.",
    illustration: "scale",
    sectionIds: ["disputes", "export", "misc", "changes", "contact"],
  },
];

const termsTopicsEs: TopicDef[] = [
  {
    id: "using-pulse",
    title: "Usar Pulse",
    blurb: "El acuerdo, definiciones, servicios, licencia y tarifas.",
    illustration: "signal",
    sectionIds: ["agreement", "definitions", "services", "license", "fees"],
  },
  {
    id: "accounts",
    title: "Cuentas y elegibilidad",
    blurb: "Uso profesional, credenciales, seguridad y MFA.",
    illustration: "lock",
    sectionIds: ["eligibility", "accounts"],
  },
  {
    id: "rules",
    title: "Reglas del campo",
    blurb: "Uso aceptable, normas de comunidad y confidencialidad.",
    illustration: "scroll",
    sectionIds: ["acceptable-use", "community", "confidentiality"],
  },
  {
    id: "content-ip",
    title: "Contenido y PI",
    blurb: "Tu contenido, comentarios, marcas y avisos de copyright.",
    illustration: "orbit",
    sectionIds: ["user-content", "feedback", "ip", "dmca", "third-parties"],
  },
  {
    id: "ai-academy-tools",
    title: "IA, Academia y herramientas",
    blurb: "IA educativa, materiales de aprendizaje, práctica y betas.",
    illustration: "spark",
    sectionIds: ["pulse-ai", "academy", "tools", "beta"],
  },
  {
    id: "liability",
    title: "Responsabilidad y terminación",
    blurb: "Descargos, límites, indemnización y suspensión de cuenta.",
    illustration: "shield",
    sectionIds: ["disclaimers", "liability", "indemnity", "termination"],
  },
  {
    id: "disputes-more",
    title: "Disputas y general",
    blurb: "Ley aplicable, sanciones, términos generales y contacto.",
    illustration: "scale",
    sectionIds: ["disputes", "export", "misc", "changes", "contact"],
  },
];

export function getPrivacyCenter(locale: AppLocale): LegalCenter {
  return toCenter(
    locale === "es" ? privacyEsDraft : privacyEnDraft,
    locale === "es" ? privacyTopicsEs : privacyTopicsEn,
  );
}

export function getTermsCenter(locale: AppLocale): LegalCenter {
  return toCenter(
    locale === "es" ? termsEsDraft : termsEnDraft,
    locale === "es" ? termsTopicsEs : termsTopicsEn,
  );
}

export function getPrivacyTopic(
  locale: AppLocale,
  topicId: string,
): LegalTopic | undefined {
  return getPrivacyCenter(locale).topics.find((t) => t.id === topicId);
}

export function getTermsTopic(
  locale: AppLocale,
  topicId: string,
): LegalTopic | undefined {
  return getTermsCenter(locale).topics.find((t) => t.id === topicId);
}

export function getPrivacyTopicIds(): string[] {
  return privacyTopicsEn.map((t) => t.id);
}

export function getTermsTopicIds(): string[] {
  return termsTopicsEn.map((t) => t.id);
}

export function getAdjacentTopic(
  center: LegalCenter,
  topicId: string,
): { prev?: LegalTopic; next?: LegalTopic; index: number } {
  const index = center.topics.findIndex((t) => t.id === topicId);
  if (index < 0) return { index: -1 };
  return {
    index,
    prev: index > 0 ? center.topics[index - 1] : undefined,
    next: index < center.topics.length - 1 ? center.topics[index + 1] : undefined,
  };
}

