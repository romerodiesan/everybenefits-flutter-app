import type { AppLocale } from "@/i18n/routing";

export type LegalSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export type LegalDoc = {
  title: string;
  sections: LegalSection[];
};

const privacyEn: LegalDoc = {
  title: "Privacy Policy",
  sections: [
    {
      title: "1. Who we are",
      paragraphs: [
        "Every Benefits (“Every Benefits,” “we,” “us,” or “our”) operates EVERY Pulse, a community and learning platform for insurance professionals available on the web and mobile applications (the “Services”).",
        "This Privacy Policy explains how we collect, use, share, and protect personal information when you use the Services. For privacy questions or requests, contact us at support@everybenefits.com.",
      ],
    },
    {
      title: "2. Information we collect",
      paragraphs: [
        "We collect information you provide directly, information generated through your use of the Services, and limited technical data needed to operate the platform securely.",
      ],
      bullets: [
        "Account and profile: name, email address, authentication credentials or provider identifiers (for example Google sign-in via Firebase Authentication), agency or role details you choose to add, and profile photo if you upload one.",
        "Community content: forum posts, replies, tags, reactions, chat messages, and other content you submit.",
        "Learning activity: course enrollment, lesson progress, completions, and related academy activity.",
        "Pulse AI interactions: prompts, responses, conversation history, feedback (for example helpful/not helpful), and related metadata used to improve grounding and quality.",
        "Technical and usage data: device/browser type, IP address, approximate location derived from IP, app or site version, log events, performance diagnostics, and security signals (including Firebase App Check where enabled).",
        "Crash diagnostics (mobile): stack traces and device metadata sent via Firebase Crashlytics in release builds to investigate and fix crashes. These reports are not used for marketing analytics.",
        "Product analytics (optional): aggregated, non-content usage events via Firebase Analytics only if you opt in in Settings / Privacy. Default is off.",
        "Cookies and similar technologies: session and preference identifiers needed for authentication, locale, and basic site functionality.",
      ],
    },
    {
      title: "3. How we use information",
      paragraphs: [
        "We use personal information to provide, secure, and improve the Services, including to:",
      ],
      bullets: [
        "Create and manage accounts, authenticate users, and personalize your experience.",
        "Operate forums, chats, academy, and Pulse AI features.",
        "Retrieve relevant community and curriculum context for AI answers and enforce product safety policies.",
        "Communicate about account, security, and service updates.",
        "Monitor abuse, enforce our Terms of Use, and protect users and Every Benefits.",
        "Diagnose crashes and reliability issues on mobile.",
        "When you opt in, analyze aggregated usage to improve product quality and reliability.",
        "Comply with legal obligations and respond to lawful requests.",
      ],
    },
    {
      title: "4. AI-specific processing",
      paragraphs: [
        "Pulse AI is an educational assistant for US insurance professionals. When you use Pulse AI, your messages and related context may be processed by our systems and model providers to generate responses, retrieve knowledge, and apply rate limits and safety filters.",
        "We design Pulse AI to ground answers in approved community knowledge, academy content, and curated official sources where available. AI outputs are informational and are not legal, compliance, or personalized insurance advice.",
        "We may retain AI conversation and feedback data to provide history in your account, improve retrieval quality, investigate abuse, and maintain service integrity, subject to our retention practices.",
      ],
    },
    {
      title: "5. How we share information",
      paragraphs: [
        "We do not sell your personal information. We share information only as needed to operate the Services:",
      ],
      bullets: [
        "Service providers and infrastructure partners that host or process data on our behalf (for example Firebase/Google Cloud for authentication, databases, storage, and related services; AI model/gateway providers that process prompts to return responses).",
        "Other users, when you post or send content in forums, chats, or other shared spaces (content you publish may be visible according to product permissions).",
        "Legal and safety disclosures when required by law, to protect rights and safety, or in connection with a merger, acquisition, or asset transfer with appropriate safeguards.",
      ],
    },
    {
      title: "6. Retention",
      paragraphs: [
        "We retain personal information for as long as your account remains active and as needed to provide the Services, resolve disputes, enforce agreements, and meet legal, accounting, or security requirements. When information is no longer needed, we delete or de-identify it in accordance with our operational practices.",
      ],
    },
    {
      title: "7. Your choices and rights",
      paragraphs: [
        "Depending on applicable law, you may request access to, correction of, or deletion of certain personal information, or ask us to restrict or object to certain processing. You may also update profile details in-product where available.",
        "Product analytics is off by default. You can enable or disable it anytime in Settings (mobile) or Profile → Privacy (web). Crash diagnostics on mobile release builds remain enabled so we can keep the app stable; they are separate from product analytics.",
        "To make a privacy request, email support@everybenefits.com. We may need to verify your identity before fulfilling a request. Some information may be retained where we have a lawful basis to do so (for example security logs or content needed to preserve forum integrity).",
      ],
    },
    {
      title: "8. Security",
      paragraphs: [
        "We use administrative, technical, and organizational measures designed to protect personal information, including encrypted transport, access controls, and authentication safeguards. No method of transmission or storage is completely secure, and we cannot guarantee absolute security.",
      ],
    },
    {
      title: "9. Children’s privacy",
      paragraphs: [
        "The Services are intended for adults in professional insurance contexts and are not directed to children under 16. We do not knowingly collect personal information from children under 16. If you believe a child has provided personal information, contact us and we will take appropriate steps to delete it.",
      ],
    },
    {
      title: "10. International transfers",
      paragraphs: [
        "Every Benefits is based in the United States. If you access the Services from outside the United States, you understand that your information may be processed in the United States and other countries where our providers operate, which may have different data-protection laws than your country of residence.",
      ],
    },
    {
      title: "11. Changes to this policy",
      paragraphs: [
        "We may update this Privacy Policy from time to time. We will post the updated version on this page and revise the “Last updated” date. Material changes may also be communicated through the Services or by email when appropriate. Continued use of the Services after an update means you accept the revised policy.",
      ],
    },
    {
      title: "12. Contact and governing law",
      paragraphs: [
        "For privacy questions or requests: support@everybenefits.com.",
        "This Privacy Policy is governed by the laws of the State of Florida, United States, without regard to conflict-of-law principles, except where mandatory local consumer privacy laws apply.",
      ],
    },
  ],
};

const privacyEs: LegalDoc = {
  title: "Política de privacidad",
  sections: [
    {
      title: "1. Quiénes somos",
      paragraphs: [
        "Every Benefits (“Every Benefits”, “nosotros” o “nuestro”) opera EVERY Pulse, una plataforma de comunidad y aprendizaje para profesionales de seguros disponible en la web y en aplicaciones móviles (los “Servicios”).",
        "Esta Política de privacidad explica cómo recopilamos, usamos, compartimos y protegemos la información personal cuando usas los Servicios. Para consultas o solicitudes de privacidad, escríbenos a support@everybenefits.com.",
      ],
    },
    {
      title: "2. Información que recopilamos",
      paragraphs: [
        "Recopilamos información que nos proporcionas directamente, información generada por tu uso de los Servicios y datos técnicos limitados necesarios para operar la plataforma de forma segura.",
      ],
      bullets: [
        "Cuenta y perfil: nombre, correo electrónico, credenciales o identificadores de autenticación (por ejemplo inicio de sesión con Google mediante Firebase Authentication), datos de agencia o rol que elijas añadir y foto de perfil si la subes.",
        "Contenido comunitario: publicaciones en foros, respuestas, etiquetas, reacciones, mensajes de chat y otro contenido que envíes.",
        "Actividad de aprendizaje: inscripción a cursos, progreso de lecciones, finalizaciones y actividad relacionada de la academia.",
        "Interacciones con Pulse AI: prompts, respuestas, historial de conversación, comentarios (por ejemplo útil/no útil) y metadatos relacionados para mejorar el anclaje y la calidad.",
        "Datos técnicos y de uso: tipo de dispositivo/navegador, dirección IP, ubicación aproximada derivada de la IP, versión de la app o del sitio, eventos de registro, diagnósticos de rendimiento y señales de seguridad (incluido Firebase App Check cuando esté habilitado).",
        "Diagnósticos de fallos (móvil): trazas y metadatos del dispositivo enviados mediante Firebase Crashlytics en builds de producción para investigar y corregir caídas. Estos reportes no se usan para analítica de marketing.",
        "Analítica de producto (opcional): eventos de uso agregados y sin contenido mediante Firebase Analytics solo si la activas en Ajustes / Privacidad. Por defecto está desactivada.",
        "Cookies y tecnologías similares: identificadores de sesión y preferencias necesarios para autenticación, idioma y funcionalidad básica del sitio.",
      ],
    },
    {
      title: "3. Cómo usamos la información",
      paragraphs: [
        "Usamos la información personal para prestar, asegurar y mejorar los Servicios, incluyendo para:",
      ],
      bullets: [
        "Crear y administrar cuentas, autenticar usuarios y personalizar tu experiencia.",
        "Operar foros, chats, academia y funciones de Pulse AI.",
        "Recuperar contexto relevante de la comunidad y el currículo para respuestas de IA y aplicar políticas de seguridad del producto.",
        "Comunicarnos sobre la cuenta, seguridad y actualizaciones del servicio.",
        "Detectar abusos, hacer cumplir los Términos de uso y proteger a los usuarios y a Every Benefits.",
        "Diagnosticar fallos y problemas de confiabilidad en móvil.",
        "Cuando lo actives, analizar el uso de forma agregada para mejorar la calidad y confiabilidad del producto.",
        "Cumplir obligaciones legales y responder a solicitudes lícitas.",
      ],
    },
    {
      title: "4. Tratamiento específico de la IA",
      paragraphs: [
        "Pulse AI es un asistente educativo para profesionales de seguros en EE. UU. Cuando usas Pulse AI, tus mensajes y el contexto relacionado pueden procesarse en nuestros sistemas y por proveedores de modelos para generar respuestas, recuperar conocimiento y aplicar límites de uso y filtros de seguridad.",
        "Diseñamos Pulse AI para anclar respuestas en conocimiento comunitario aprobado, contenido de la academia y fuentes oficiales curadas cuando estén disponibles. Las salidas de la IA son informativas y no constituyen asesoría legal, de cumplimiento ni asesoría personalizada de seguros.",
        "Podemos conservar datos de conversación y comentarios de la IA para ofrecer historial en tu cuenta, mejorar la recuperación, investigar abusos y mantener la integridad del servicio, conforme a nuestras prácticas de retención.",
      ],
    },
    {
      title: "5. Cómo compartimos la información",
      paragraphs: [
        "No vendemos tu información personal. Compartimos información solo según sea necesario para operar los Servicios:",
      ],
      bullets: [
        "Proveedores de servicios y socios de infraestructura que alojan o procesan datos en nuestro nombre (por ejemplo Firebase/Google Cloud para autenticación, bases de datos, almacenamiento y servicios relacionados; proveedores de modelos/gateway de IA que procesan prompts para devolver respuestas).",
        "Otros usuarios, cuando publicas o envías contenido en foros, chats u otros espacios compartidos (el contenido que publicas puede ser visible según los permisos del producto).",
        "Divulgaciones legales y de seguridad cuando lo exija la ley, para proteger derechos y seguridad, o en relación con una fusión, adquisición o transferencia de activos con salvaguardas adecuadas.",
      ],
    },
    {
      title: "6. Conservación",
      paragraphs: [
        "Conservamos la información personal mientras tu cuenta permanezca activa y según sea necesario para prestar los Servicios, resolver disputas, hacer cumplir acuerdos y cumplir requisitos legales, contables o de seguridad. Cuando la información ya no sea necesaria, la eliminamos o desidentificamos conforme a nuestras prácticas operativas.",
      ],
    },
    {
      title: "7. Tus opciones y derechos",
      paragraphs: [
        "Según la ley aplicable, puedes solicitar acceso, corrección o eliminación de cierta información personal, o pedirnos que limitemos u objetemos cierto tratamiento. También puedes actualizar datos de perfil en el producto cuando esté disponible.",
        "La analítica de producto está desactivada por defecto. Puedes activarla o desactivarla en cualquier momento en Ajustes (móvil) o Perfil → Privacidad (web). Los diagnósticos de fallos en builds de producción móvil siguen activos para mantener la app estable; son independientes de la analítica de producto.",
        "Para una solicitud de privacidad, escribe a support@everybenefits.com. Es posible que debamos verificar tu identidad antes de atender la solicitud. Parte de la información puede conservarse cuando exista una base legal para ello (por ejemplo registros de seguridad o contenido necesario para preservar la integridad del foro).",
      ],
    },
    {
      title: "8. Seguridad",
      paragraphs: [
        "Usamos medidas administrativas, técnicas y organizativas diseñadas para proteger la información personal, incluido transporte cifrado, controles de acceso y salvaguardas de autenticación. Ningún método de transmisión o almacenamiento es completamente seguro y no podemos garantizar seguridad absoluta.",
      ],
    },
    {
      title: "9. Privacidad de menores",
      paragraphs: [
        "Los Servicios están pensados para adultos en contextos profesionales de seguros y no están dirigidos a menores de 16 años. No recopilamos a sabiendas información personal de menores de 16. Si crees que un menor nos ha proporcionado información personal, contáctanos y tomaremos las medidas adecuadas para eliminarla.",
      ],
    },
    {
      title: "10. Transferencias internacionales",
      paragraphs: [
        "Every Benefits está basado en Estados Unidos. Si accedes a los Servicios desde fuera de Estados Unidos, entiendes que tu información puede procesarse en Estados Unidos y en otros países donde operen nuestros proveedores, que pueden tener leyes de protección de datos distintas a las de tu país de residencia.",
      ],
    },
    {
      title: "11. Cambios a esta política",
      paragraphs: [
        "Podemos actualizar esta Política de privacidad periódicamente. Publicaremos la versión actualizada en esta página y revisaremos la fecha de “Última actualización”. Los cambios materiales también pueden comunicarse a través de los Servicios o por correo electrónico cuando corresponda. El uso continuado de los Servicios después de una actualización significa que aceptas la política revisada.",
      ],
    },
    {
      title: "12. Contacto y ley aplicable",
      paragraphs: [
        "Para preguntas o solicitudes de privacidad: support@everybenefits.com.",
        "Esta Política de privacidad se rige por las leyes del Estado de Florida, Estados Unidos, sin perjuicio de los principios de conflicto de leyes, salvo cuando resulten aplicables leyes locales imperativas de privacidad del consumidor.",
      ],
    },
  ],
};

const termsEn: LegalDoc = {
  title: "Terms of Use",
  sections: [
    {
      title: "1. Agreement to these Terms",
      paragraphs: [
        "These Terms of Use (“Terms”) govern your access to and use of EVERY Pulse and related web and mobile services operated by Every Benefits (the “Services”). By creating an account or using the Services, you agree to these Terms and our Privacy Policy.",
        "If you do not agree, do not use the Services. Questions: support@everybenefits.com.",
      ],
    },
    {
      title: "2. Eligibility and accounts",
      paragraphs: [
        "The Services are intended for adults using them in connection with the US insurance profession or related professional learning. You must provide accurate registration information and keep your credentials secure. You are responsible for activity under your account.",
        "We may suspend or terminate accounts that violate these Terms, pose a security risk, or are inactive.",
      ],
    },
    {
      title: "3. The Services",
      paragraphs: [
        "EVERY Pulse provides community forums, messaging, academy learning content, and Pulse AI assistance for insurance professionals. Features may change, and we may modify, suspend, or discontinue parts of the Services with or without notice when reasonably necessary for operations, security, or legal compliance.",
      ],
    },
    {
      title: "4. Acceptable use",
      paragraphs: [
        "You agree not to misuse the Services. Prohibited conduct includes, without limitation:",
      ],
      bullets: [
        "Posting unlawful, harassing, defamatory, fraudulent, or infringing content.",
        "Sharing confidential client data, protected health information, or other sensitive personal data of third parties without a lawful basis and appropriate safeguards.",
        "Attempting to bypass security, scrape, disrupt, or reverse engineer the Services except as permitted by law.",
        "Impersonating others, spamming, or manipulating voting, ranking, or engagement systems.",
        "Using Pulse AI or other features to generate deceptive marketing, evade licensing rules, or provide regulated advice you are not authorized to give.",
      ],
    },
    {
      title: "5. User content",
      paragraphs: [
        "You retain ownership of content you submit. By submitting content, you grant Every Benefits a worldwide, non-exclusive, royalty-free license to host, store, reproduce, display, and distribute that content as needed to operate and improve the Services and to make shared content available according to product permissions.",
        "You represent that you have the rights to submit the content and that it does not violate law or third-party rights. We may remove content that violates these Terms or that we reasonably believe is harmful or unlawful.",
      ],
    },
    {
      title: "6. Pulse AI disclaimer",
      paragraphs: [
        "Pulse AI provides educational information for insurance professionals. It is not a licensed advisor, attorney, or compliance officer, and its outputs are not legal advice, compliance advice, tax advice, or personalized insurance recommendations.",
        "You remain responsible for verifying information against official sources, carrier rules, state regulations, and your own professional obligations before acting. Every Benefits does not guarantee accuracy, completeness, or fitness of AI outputs for any particular purpose.",
      ],
    },
    {
      title: "7. Intellectual property",
      paragraphs: [
        "The Services, including software, branding, academy materials (except user content), and documentation, are owned by Every Benefits or its licensors and are protected by intellectual property laws. Except for the limited rights expressly granted to use the Services, no rights are transferred to you.",
      ],
    },
    {
      title: "8. Third-party services",
      paragraphs: [
        "The Services may rely on third-party infrastructure and providers (including authentication, hosting, and AI model providers). Your use of those components is subject to these Terms and, where applicable, the providers’ terms. We are not responsible for third-party services we do not control.",
      ],
    },
    {
      title: "9. Disclaimers",
      paragraphs: [
        "THE SERVICES ARE PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE MAXIMUM EXTENT PERMITTED BY LAW, EVERY BENEFITS DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICES WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.",
      ],
    },
    {
      title: "10. Limitation of liability",
      paragraphs: [
        "TO THE MAXIMUM EXTENT PERMITTED BY LAW, EVERY BENEFITS AND ITS AFFILIATES, OFFICERS, EMPLOYEES, AND AGENTS WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR LOST PROFITS, REVENUE, DATA, OR GOODWILL, ARISING FROM OR RELATED TO YOUR USE OF THE SERVICES.",
        "OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF OR RELATING TO THE SERVICES WILL NOT EXCEED THE GREATER OF (A) THE AMOUNTS YOU PAID TO EVERY BENEFITS FOR THE SERVICES IN THE TWELVE MONTHS BEFORE THE CLAIM OR (B) ONE HUNDRED US DOLLARS (US $100).",
      ],
    },
    {
      title: "11. Indemnification",
      paragraphs: [
        "You agree to defend, indemnify, and hold harmless Every Benefits and its affiliates, officers, employees, and agents from and against claims, damages, losses, and expenses (including reasonable attorneys’ fees) arising out of your content, your misuse of the Services, or your violation of these Terms or applicable law.",
      ],
    },
    {
      title: "12. Termination",
      paragraphs: [
        "You may stop using the Services at any time. We may suspend or terminate access if you violate these Terms or if we discontinue the Services. Provisions that by their nature should survive (including ownership, disclaimers, limitations of liability, and indemnity) will survive termination.",
      ],
    },
    {
      title: "13. Governing law and venue",
      paragraphs: [
        "These Terms are governed by the laws of the State of Florida, United States, without regard to conflict-of-law principles. Except where prohibited by law, exclusive venue for disputes arising out of these Terms or the Services will be the state or federal courts located in Florida, and you consent to personal jurisdiction there.",
      ],
    },
    {
      title: "14. Changes",
      paragraphs: [
        "We may update these Terms from time to time. We will post the updated Terms on this page and update the “Last updated” date. If you continue using the Services after changes take effect, you accept the revised Terms.",
      ],
    },
    {
      title: "15. Contact",
      paragraphs: [
        "Every Benefits — EVERY Pulse support: support@everybenefits.com.",
      ],
    },
  ],
};

const termsEs: LegalDoc = {
  title: "Términos de uso",
  sections: [
    {
      title: "1. Aceptación de estos Términos",
      paragraphs: [
        "Estos Términos de uso (“Términos”) rigen tu acceso y uso de EVERY Pulse y los servicios web y móviles relacionados operados por Every Benefits (los “Servicios”). Al crear una cuenta o usar los Servicios, aceptas estos Términos y nuestra Política de privacidad.",
        "Si no estás de acuerdo, no uses los Servicios. Consultas: support@everybenefits.com.",
      ],
    },
    {
      title: "2. Elegibilidad y cuentas",
      paragraphs: [
        "Los Servicios están pensados para adultos que los usan en relación con la profesión de seguros en EE. UU. o el aprendizaje profesional relacionado. Debes proporcionar información de registro precisa y mantener tus credenciales seguras. Eres responsable de la actividad bajo tu cuenta.",
        "Podemos suspender o cancelar cuentas que violen estos Términos, representen un riesgo de seguridad o estén inactivas.",
      ],
    },
    {
      title: "3. Los Servicios",
      paragraphs: [
        "EVERY Pulse ofrece foros comunitarios, mensajería, contenido de aprendizaje de la academia y asistencia de Pulse AI para profesionales de seguros. Las funciones pueden cambiar, y podemos modificar, suspender o discontinuar partes de los Servicios con o sin aviso cuando sea razonablemente necesario por operaciones, seguridad o cumplimiento legal.",
      ],
    },
    {
      title: "4. Uso aceptable",
      paragraphs: [
        "Aceptas no hacer un mal uso de los Servicios. La conducta prohibida incluye, sin limitación:",
      ],
      bullets: [
        "Publicar contenido ilegal, acosador, difamatorio, fraudulento o que infrinja derechos.",
        "Compartir datos confidenciales de clientes, información de salud protegida u otros datos personales sensibles de terceros sin base legal y salvaguardas adecuadas.",
        "Intentar eludir la seguridad, hacer scraping, interrumpir o realizar ingeniería inversa de los Servicios salvo lo permitido por la ley.",
        "Suplantar a otros, enviar spam o manipular sistemas de votación, ranking o participación.",
        "Usar Pulse AI u otras funciones para generar marketing engañoso, evadir normas de licencia o brindar asesoría regulada que no estés autorizado a dar.",
      ],
    },
    {
      title: "5. Contenido del usuario",
      paragraphs: [
        "Conservas la propiedad del contenido que envías. Al enviar contenido, otorgas a Every Benefits una licencia mundial, no exclusiva y libre de regalías para alojar, almacenar, reproducir, mostrar y distribuir ese contenido según sea necesario para operar y mejorar los Servicios y para poner el contenido compartido a disposición según los permisos del producto.",
        "Declaras que tienes derechos para enviar el contenido y que no viola la ley ni derechos de terceros. Podemos eliminar contenido que viole estos Términos o que razonablemente consideremos dañino o ilegal.",
      ],
    },
    {
      title: "6. Descargo de Pulse AI",
      paragraphs: [
        "Pulse AI proporciona información educativa para profesionales de seguros. No es un asesor con licencia, abogado ni responsable de cumplimiento, y sus salidas no constituyen asesoría legal, de cumplimiento, fiscal ni recomendaciones personalizadas de seguros.",
        "Tú sigues siendo responsable de verificar la información frente a fuentes oficiales, normas de carriers, regulaciones estatales y tus propias obligaciones profesionales antes de actuar. Every Benefits no garantiza la exactitud, integridad o idoneidad de las salidas de la IA para ningún propósito particular.",
      ],
    },
    {
      title: "7. Propiedad intelectual",
      paragraphs: [
        "Los Servicios, incluido el software, la marca, los materiales de la academia (salvo el contenido de usuarios) y la documentación, son propiedad de Every Benefits o de sus licenciantes y están protegidos por las leyes de propiedad intelectual. Salvo los derechos limitados expresamente otorgados para usar los Servicios, no se te transfieren otros derechos.",
      ],
    },
    {
      title: "8. Servicios de terceros",
      paragraphs: [
        "Los Servicios pueden depender de infraestructura y proveedores de terceros (incluida autenticación, alojamiento y proveedores de modelos de IA). Tu uso de esos componentes está sujeto a estos Términos y, cuando corresponda, a los términos de los proveedores. No somos responsables de servicios de terceros que no controlamos.",
      ],
    },
    {
      title: "9. Descargos de garantía",
      paragraphs: [
        "LOS SERVICIOS SE PROPORCIONAN “TAL CUAL” Y “SEGÚN DISPONIBILIDAD”. EN LA MÁXIMA MEDIDA PERMITIDA POR LA LEY, EVERY BENEFITS RENUNCIA A TODAS LAS GARANTÍAS, EXPRESAS O IMPLÍCITAS, INCLUIDAS COMERCIABILIDAD, IDONEIDAD PARA UN PROPÓSITO PARTICULAR Y NO INFRACCIÓN. NO GARANTIZAMOS QUE LOS SERVICIOS SEAN ININTERRUMPIDOS, LIBRES DE ERRORES O SEGUROS.",
      ],
    },
    {
      title: "10. Limitación de responsabilidad",
      paragraphs: [
        "EN LA MÁXIMA MEDIDA PERMITIDA POR LA LEY, EVERY BENEFITS Y SUS AFILIADOS, DIRECTIVOS, EMPLEADOS Y AGENTES NO SERÁN RESPONSABLES POR DAÑOS INDIRECTOS, INCIDENTALES, ESPECIALES, CONSECUENTES, EJEMPLARES O PUNITIVOS, NI POR LUCRO CESANTE, PÉRDIDA DE INGRESOS, DATOS O CLIENTES, DERIVADOS DE O RELACIONADOS CON TU USO DE LOS SERVICIOS.",
        "NUESTRA RESPONSABILIDAD TOTAL POR CUALQUIER RECLAMO DERIVADO DE O RELACIONADO CON LOS SERVICIOS NO EXCEDERÁ EL MAYOR DE (A) LOS MONTOS QUE PAGASTE A EVERY BENEFITS POR LOS SERVICIOS EN LOS DOCE MESES ANTERIORES AL RECLAMO O (B) CIEN DÓLARES ESTADOUNIDENSES (US $100).",
      ],
    },
    {
      title: "11. Indemnización",
      paragraphs: [
        "Aceptas defender, indemnizar y mantener indemne a Every Benefits y a sus afiliados, directivos, empleados y agentes frente a reclamos, daños, pérdidas y gastos (incluidos honorarios razonables de abogados) derivados de tu contenido, tu mal uso de los Servicios o tu violación de estos Términos o de la ley aplicable.",
      ],
    },
    {
      title: "12. Terminación",
      paragraphs: [
        "Puedes dejar de usar los Servicios en cualquier momento. Podemos suspender o terminar el acceso si violas estos Términos o si discontinuamos los Servicios. Las disposiciones que por su naturaleza deban sobrevivir (incluida propiedad, descargos, limitaciones de responsabilidad e indemnización) sobrevivirán a la terminación.",
      ],
    },
    {
      title: "13. Ley aplicable y foro",
      paragraphs: [
        "Estos Términos se rigen por las leyes del Estado de Florida, Estados Unidos, sin perjuicio de los principios de conflicto de leyes. Salvo cuando lo prohíba la ley, el foro exclusivo para disputas derivadas de estos Términos o de los Servicios serán los tribunales estatales o federales ubicados en Florida, y consientes la jurisdicción personal allí.",
      ],
    },
    {
      title: "14. Cambios",
      paragraphs: [
        "Podemos actualizar estos Términos periódicamente. Publicaremos los Términos actualizados en esta página y actualizaremos la fecha de “Última actualización”. Si continúas usando los Servicios después de que los cambios surtan efecto, aceptas los Términos revisados.",
      ],
    },
    {
      title: "15. Contacto",
      paragraphs: [
        "Every Benefits — soporte de EVERY Pulse: support@everybenefits.com.",
      ],
    },
  ],
};

export function getPrivacyDoc(locale: AppLocale): LegalDoc {
  return locale === "es" ? privacyEs : privacyEn;
}

export function getTermsDoc(locale: AppLocale): LegalDoc {
  return locale === "es" ? termsEs : termsEn;
}
