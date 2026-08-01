// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Spanish Castilian (`es`).
class AppLocalizationsEs extends AppLocalizations {
  AppLocalizationsEs([String locale = 'es']) : super(locale);

  @override
  String get appTitle => 'Every Insurance';

  @override
  String get navHome => 'Inicio';

  @override
  String get navChats => 'Chats';

  @override
  String get navAi => 'IA';

  @override
  String get navAcademy => 'Academia';

  @override
  String get navProfile => 'Perfil';

  @override
  String get fabNewQuestion => 'Nueva pregunta';

  @override
  String get fabNewChat => 'Nuevo chat';

  @override
  String get fabNewConversation => 'Nueva conversación';

  @override
  String get fabSearchCourses => 'Buscar cursos';

  @override
  String get fabEditProfile => 'Editar perfil';

  @override
  String get fabSupport => 'Soporte';

  @override
  String get supportSheetTitle => 'Soporte';

  @override
  String get supportSheetBody =>
      '¿Necesitas ayuda con tu cuenta o la app? Abre el chat de soporte: un asistente responde al momento y nuestro equipo puede unirse.';

  @override
  String get supportSheetEmail => 'support@everybenefits.com';

  @override
  String get supportSheetEmailSubject =>
      'Solicitud de soporte — Every Benefits';

  @override
  String get supportSheetEmailFailed =>
      'No se pudo abrir la app de correo. Puedes escribir a support@everybenefits.com.';

  @override
  String get supportSheetClose => 'Cerrar';

  @override
  String get supportSheetOpenChat => 'Abrir chat de soporte';

  @override
  String get supportChatAiName => 'Asistente de soporte';

  @override
  String get supportChatWelcome =>
      '¡Hola! Soy el asistente de soporte. Cuéntame qué necesitas — un compañero humano puede unirse a este chat cuando haga falta.';

  @override
  String get supportChatAiReply =>
      'Gracias por los detalles. Estoy aquí para ayudarte mientras un compañero humano revisa este hilo.';

  @override
  String get supportChatSubtitle => 'Soporte AI + humano';

  @override
  String get supportChatOpening => 'Abriendo chat de soporte…';

  @override
  String get editProfileNameFrozen => 'Tu nombre queda bloqueado tras el alta.';

  @override
  String get editProfileNpnFrozen => 'Tu NPN queda bloqueado tras el alta.';

  @override
  String get roleGuest => 'Invitado';

  @override
  String get roleStudent => 'Estudiante';

  @override
  String get roleAgent => 'Agente';

  @override
  String get roleInstructor => 'Instructor';

  @override
  String get roleManager => 'Gerente';

  @override
  String get roleAdmin => 'Admin';

  @override
  String get you => 'Tú';

  @override
  String get welcomeTagline => 'El pulso de tu comunidad profesional.';

  @override
  String get welcomeEnter => 'Entrar';

  @override
  String get welcomeGuest => 'Soy invitado';

  @override
  String get welcomeCreateAccount => 'Crear cuenta';

  @override
  String get welcomePhone => 'Teléfono';

  @override
  String get onboardingSkip => 'Saltar';

  @override
  String get onboardingNext => 'Siguiente';

  @override
  String get onboardingGetStarted => 'Empezar';

  @override
  String get onboardingCommunityTitle => 'Aprende en voz alta';

  @override
  String get onboardingCommunityBody =>
      'Haz preguntas, comparte logros y crece con agentes que hacen el mismo trabajo que tú.';

  @override
  String get onboardingChatsTitle => 'Mantente al día';

  @override
  String get onboardingChatsBody =>
      'Mensajes directos y grupos de equipo reúnen mentoría y coordinación diaria en un solo lugar.';

  @override
  String get onboardingAiTitle => 'Un asistente a tu lado';

  @override
  String get onboardingAiBody =>
      'Pulse AI responde cuando necesitas una ayuda rápida — beneficios, cursos o contexto de la comunidad.';

  @override
  String get onboardingAcademyTitle => 'Sube de nivel';

  @override
  String get onboardingAcademyBody =>
      'Rutas y cursos pensados para profesionales de seguros — progreso que sí se nota.';

  @override
  String get loginTitle => 'Iniciar sesión';

  @override
  String get loginSubtitle => 'Accede a tu comunidad profesional de agentes.';

  @override
  String get fieldEmail => 'Correo';

  @override
  String get validationEmail => 'Ingresa un correo válido.';

  @override
  String get fieldPassword => 'Contraseña';

  @override
  String get loginForgotPassword => '¿Olvidaste tu contraseña?';

  @override
  String get loginSubmit => 'Entrar';

  @override
  String get loginMagicLink => 'Entrar con enlace mágico';

  @override
  String get loginMagicLinkResend => 'Reenviar enlace mágico';

  @override
  String get loginMagicLinkInvalid =>
      'Ingresa un correo válido para el enlace mágico.';

  @override
  String loginMagicLinkSent(String email) {
    return 'Enlace enviado a $email';
  }

  @override
  String get loginNoAccount => '¿No tienes cuenta? Crear cuenta';

  @override
  String get authDividerContinueWith => 'o continúa con';

  @override
  String get authContinueGoogle => 'Continuar con Google';

  @override
  String get authContinuePhone => 'Continuar con teléfono';

  @override
  String get registerTitle => 'Crear cuenta';

  @override
  String get registerSubtitle =>
      'Únete como agente y desbloquea la comunidad completa.';

  @override
  String get fieldConfirmPassword => 'Confirmar contraseña';

  @override
  String get validationPasswordsMismatch => 'Las contraseñas no coinciden.';

  @override
  String get validationPasswordMin => 'Mínimo 6 caracteres.';

  @override
  String get registerSubmit => 'Crear cuenta';

  @override
  String get registerHaveAccount => '¿Ya tienes cuenta? Iniciar sesión';

  @override
  String get forgotTitle => 'Recuperar acceso';

  @override
  String get forgotSubtitle =>
      'Te enviaremos un enlace para restablecer tu contraseña.';

  @override
  String get forgotSubtitleSent =>
      'Revisa tu correo y sigue el enlace para crear una nueva contraseña.';

  @override
  String get forgotSendLink => 'Enviar enlace';

  @override
  String get forgotResendLink => 'Reenviar enlace';

  @override
  String forgotLinkSent(String email) {
    return 'Enviamos un enlace a $email';
  }

  @override
  String get phoneTitle => 'Teléfono';

  @override
  String get phoneCodeTitle => 'Código SMS';

  @override
  String phoneSubtitleCode(String phone) {
    return 'Escribe el código que enviamos a $phone.';
  }

  @override
  String get fieldPhoneNumber => 'Número de teléfono';

  @override
  String get validationPhoneCountry => 'Incluye el código de país (+…)';

  @override
  String get phoneSendCode => 'Enviar código';

  @override
  String get fieldVerificationCode => 'Código de verificación';

  @override
  String get phoneVerifyEnter => 'Verificar y entrar';

  @override
  String get phoneChangeNumber => 'Cambiar número';

  @override
  String get phoneResendCode => 'Reenviar código';

  @override
  String get phoneSmsSent => 'Código SMS enviado';

  @override
  String get validationSmsCode => 'Ingresa el código de 6 dígitos.';

  @override
  String get authErrInvalidEmail => 'El correo no es válido.';

  @override
  String get authErrUserDisabled => 'Esta cuenta está deshabilitada.';

  @override
  String get authErrUserNotFound => 'No encontramos una cuenta con ese correo.';

  @override
  String get authErrWrongPassword => 'Correo o contraseña incorrectos.';

  @override
  String get authErrEmailInUse => 'Ya existe una cuenta con ese correo.';

  @override
  String get authErrWeakPassword =>
      'La contraseña es demasiado débil (mín. 6 caracteres).';

  @override
  String get authErrTooManyRequests =>
      'Demasiados intentos. Espera un momento e inténtalo de nuevo.';

  @override
  String get authErrNetwork =>
      'Sin conexión. Revisa tu red e inténtalo de nuevo.';

  @override
  String get authErrEmulatorUnreachable =>
      'No se pudo conectar con Firebase. ¿Están corriendo los emuladores locales?';

  @override
  String get authErrPermission =>
      'No tienes permiso para esta acción (revisa reglas o sesión en el emulador).';

  @override
  String get authErrInvalidPhone =>
      'Número de teléfono inválido. Usa formato internacional (+506…).';

  @override
  String get authErrInvalidSms => 'El código SMS no es válido.';

  @override
  String get authErrSmsExpired => 'El código expiró. Solicita uno nuevo.';

  @override
  String get authErrOpNotAllowed => 'Este método de acceso no está habilitado.';

  @override
  String get authErrRequiresRecentLogin =>
      'Por seguridad, inicia sesión de nuevo e inténtalo otra vez.';

  @override
  String get authErrEmailRequired =>
      'Tu cuenta necesita un correo para establecer una contraseña.';

  @override
  String get authErrUnauthenticated => 'Inicia sesión para continuar.';

  @override
  String get authErrCredentialInUse =>
      'Esa credencial ya está vinculada a otra cuenta.';

  @override
  String authErrUnknown(String code) {
    return 'No se pudo completar la autenticación ($code).';
  }

  @override
  String get setPasswordTitle => 'Establece una contraseña de respaldo';

  @override
  String get setPasswordSubtitle =>
      'Si pierdes acceso a Google, podrás entrar con tu correo y esta contraseña.';

  @override
  String get setPasswordSave => 'Guardar contraseña';

  @override
  String get setPasswordMismatch => 'Las contraseñas no coinciden.';

  @override
  String get mfaTitle => 'Verificación en dos pasos';

  @override
  String get mfaSubtitle => 'Ingresa el código de tu autenticador o SMS.';

  @override
  String get mfaChooseFactor => 'Elige un método de verificación';

  @override
  String get mfaTotpLabel => 'App autenticadora';

  @override
  String get mfaSmsLabel => 'Mensaje de texto';

  @override
  String get mfaCodeLabel => 'Código de verificación';

  @override
  String get mfaVerify => 'Verificar';

  @override
  String get mfaSendSms => 'Enviar código SMS';

  @override
  String get settingsSecurity => 'Seguridad';

  @override
  String get settingsSecurityHint => 'Contraseña y verificación en dos pasos.';

  @override
  String get securitySetPassword => 'Establecer contraseña';

  @override
  String get securityChangePassword => 'Cambiar contraseña';

  @override
  String get securityCurrentPassword => 'Contraseña actual';

  @override
  String get securityNewPassword => 'Nueva contraseña';

  @override
  String get securityPasswordSaved => 'Contraseña actualizada.';

  @override
  String get securityMfaTitle => 'Verificación en dos pasos';

  @override
  String get securityMfaHint =>
      'Añade SMS o una app autenticadora como segundo factor.';

  @override
  String get securityEnrollTotp => 'Añadir autenticador';

  @override
  String get securityEnrollSms => 'Añadir teléfono (SMS)';

  @override
  String get securityTotpScan =>
      'Escanea este código QR en tu app autenticadora y luego ingresa el código de 6 dígitos.';

  @override
  String get securityTotpSecret => 'O ingresa esta clave manualmente';

  @override
  String get securityPhoneHint =>
      'Número de teléfono (E.164, p. ej. +15551234567)';

  @override
  String get securityFactorRemove => 'Quitar';

  @override
  String get securityFactorRemoved => 'Segundo factor eliminado.';

  @override
  String get securityFactorAdded => 'Segundo factor añadido.';

  @override
  String get securityNoFactors => 'Aún no hay segundos factores.';

  @override
  String get securityReauthHint => 'Confirma tu contraseña para continuar.';

  @override
  String get profileCompleteRoleTitle => 'Tu rol';

  @override
  String get profileCompleteDataTitle => 'Tus datos';

  @override
  String get profileCompleteSignOut => 'Salir';

  @override
  String get profileCompleteHeadline => '¿Cómo late\ntu Pulse?';

  @override
  String get profileCompleteSubtitle =>
      'Elige cómo participas. Puedes cambiarlo después.';

  @override
  String get profileCompleteAgentTitle => 'Soy agente';

  @override
  String get profileCompleteAgentSubtitle =>
      'NPN, agencia y comunidad profesional';

  @override
  String get profileCompleteStudentTitle => 'Soy estudiante';

  @override
  String get profileCompleteStudentSubtitle => 'Campus, práctica y networking';

  @override
  String get actionContinue => 'Continuar';

  @override
  String get profileCompleteChangeRole => '← Cambiar rol';

  @override
  String get profileCompleteTellMore => 'Cuéntanos un poco más';

  @override
  String get profileCompleteFinish => 'Finalizar';

  @override
  String get profileSaveFailed => 'No se pudo guardar el perfil.';

  @override
  String get fieldFullName => 'Nombre completo';

  @override
  String get validationName => 'Ingresa tu nombre.';

  @override
  String get countryCodePickerTitle => 'País / código';

  @override
  String get fieldPhone => 'Teléfono';

  @override
  String get validationPhone => 'Número inválido.';

  @override
  String get fieldNpn => 'NPN';

  @override
  String get fieldNpnHint => 'National Producer Number';

  @override
  String get validationNpn => 'Ingresa un NPN válido.';

  @override
  String get fieldAddress => 'Dirección';

  @override
  String get validationAddress => 'Ingresa tu dirección.';

  @override
  String get fieldAgency => 'Agencia';

  @override
  String get fieldAgencyHelper => 'Por defecto: Every Benefits';

  @override
  String get validationAgency => 'Ingresa la agencia.';

  @override
  String get editProfileTitle => 'Editar perfil';

  @override
  String get editProfileAccountType => 'Tipo de cuenta';

  @override
  String get editProfileAgentSubtitle => 'NPN, dirección y agencia';

  @override
  String get editProfileStudentSubtitle => 'Nombre y teléfono';

  @override
  String get editProfileSave => 'Guardar cambios';

  @override
  String editProfileUpdateFailed(String error) {
    return 'No se pudo actualizar: $error';
  }

  @override
  String get profileTitle => 'Perfil';

  @override
  String get profileSettingsTooltip => 'Ajustes';

  @override
  String get profileBioGuest =>
      'Invitado en Every Insurance. Únete para publicar.';

  @override
  String get profileBioMember => 'Comunidad · Academia · Chats';

  @override
  String get profileAddPhoto => 'Agregar foto de perfil';

  @override
  String get profilePickGallery => 'Elegir de la galería';

  @override
  String get profileTakePhoto => 'Tomar foto';

  @override
  String profilePickImageFailed(String error) {
    return 'No se pudo elegir imagen: $error';
  }

  @override
  String profileUploadFailed(String error) {
    return 'No se pudo subir la foto: $error';
  }

  @override
  String get settingsTitle => 'Ajustes';

  @override
  String get settingsYourInfo => 'Tu información';

  @override
  String get settingsLabelName => 'Nombre';

  @override
  String get settingsLabelEmail => 'Email';

  @override
  String get settingsNoEmail => 'Sin email vinculado';

  @override
  String get settingsTheme => 'Tema';

  @override
  String get themeModeAuto => 'Auto';

  @override
  String get themeModeLight => 'Claro';

  @override
  String get themeModeDark => 'Oscuro';

  @override
  String get settingsLanguage => 'Idioma';

  @override
  String get settingsLanguageSystem => 'Sistema';

  @override
  String get settingsLanguageEnglish => 'English';

  @override
  String get settingsLanguageSpanish => 'Español';

  @override
  String get settingsAccentColor => 'Color de acento';

  @override
  String get settingsAccentHint =>
      'Se aplica a botones, tabs y acentos de la app.';

  @override
  String get settingsSignOut => 'Cerrar sesión';

  @override
  String get seedGreen => 'Verde';

  @override
  String get seedAmber => 'Ámbar';

  @override
  String get seedTeal => 'Teal';

  @override
  String get seedBlue => 'Azul';

  @override
  String get seedViolet => 'Violeta';

  @override
  String get seedRose => 'Rosa';

  @override
  String get forumsTitle => 'Inicio';

  @override
  String get forumsSearchHint => 'Buscar preguntas…';

  @override
  String get forumsSearchOpen => 'Buscar preguntas';

  @override
  String get forumsSearchClose => 'Cerrar búsqueda';

  @override
  String get forumsSortTooltip => 'Ordenar';

  @override
  String get forumsSortRecent => 'Más recientes';

  @override
  String get forumsSortRelevant => 'Más relevantes';

  @override
  String get forumsFilterMine => 'Mías';

  @override
  String get forumsFilterRelevant => 'Relevantes';

  @override
  String get forumsFilterRecent => 'Recientes';

  @override
  String get forumsClearFilters => 'Limpiar';

  @override
  String get forumsReadOnlyBanner => 'Modo lectura — regístrate para publicar.';

  @override
  String get forumsFilterYourQuestions => 'Tus preguntas';

  @override
  String get forumsFilterSearchLoaded => 'búsqueda en resultados cargados';

  @override
  String get forumsLoadErrorTitle => 'No se pudo cargar';

  @override
  String get actionRetry => 'Reintentar';

  @override
  String get forumsEmptyMineTitle => 'Aún no has preguntado';

  @override
  String get forumsEmptyFeedTitle => 'El feed está en calma';

  @override
  String get forumsEmptyMineSubtitle =>
      'Publica tu primera pregunta para verla aquí.';

  @override
  String get forumsEmptyFeedSubtitle =>
      'Sé el primero en publicar una pregunta.';

  @override
  String get forumsNoMatchesTitle => 'Sin coincidencias';

  @override
  String forumsNoMatchesQuery(String query) {
    return 'No hay preguntas para “$query”.';
  }

  @override
  String get forumsNoMatchesFilter => 'Prueba otro filtro o tag.';

  @override
  String get forumsLoadMore => 'Cargar más';

  @override
  String get composerAskCommunity => 'Haz una pregunta a la comunidad';

  @override
  String get composerAskHint =>
      'NPN, productos, ventas… alguien ya pudo resolverlo.';

  @override
  String get createThreadTitle => 'Nueva publicación';

  @override
  String get createFieldQuestion => 'Pregunta';

  @override
  String get createQuestionHint => '¿Qué necesitas resolver?';

  @override
  String get validationTitleShort => 'Escribe un título más descriptivo.';

  @override
  String get createFieldContext => 'Contexto';

  @override
  String get createContextHint =>
      'Detalles, lo que ya intentaste, y el resultado esperado…';

  @override
  String get validationBodyShort => 'Añade un poco más de contexto.';

  @override
  String get createTopics => 'Temas';

  @override
  String get createTopicsHelp =>
      'Hasta 5 etiquetas para que otros encuentren tu pregunta.';

  @override
  String get fieldTag => 'Etiqueta';

  @override
  String get fieldTagHint => 'ej. npn';

  @override
  String get actionAdd => 'Agregar';

  @override
  String get createFrequentTopics => 'Temas frecuentes';

  @override
  String get actionPublish => 'Publicar';

  @override
  String get createMaxTags => 'Máximo 5 tags por hilo.';

  @override
  String get createNeedTag => 'Agrega al menos un tag.';

  @override
  String get actionReply => 'Responder';

  @override
  String get actionShareChats => 'Chats';

  @override
  String get replyCountOne => '1 respuesta';

  @override
  String replyCountOther(int count) {
    return '$count respuestas';
  }

  @override
  String get actionLike => 'Me gusta';

  @override
  String get relevanceLabel => 'Relevancia';

  @override
  String relevanceScoreShort(int score) {
    return '$score relev.';
  }

  @override
  String get relevanceUpTooltip => 'Más relevante';

  @override
  String get relevanceDownTooltip => 'Menos relevante';

  @override
  String get threadFallbackTitle => 'Pregunta';

  @override
  String get threadShareTooltip => 'Compartir en chat';

  @override
  String get threadNotFoundTitle => 'Pregunta no encontrada';

  @override
  String get threadNotFoundSubtitle => 'Puede haber sido eliminada.';

  @override
  String get threadSortedByRelevance => 'Ordenadas por relevancia';

  @override
  String get threadFirstToReply => 'Sé el primero en responder.';

  @override
  String get actionOptions => 'Opciones';

  @override
  String get actionEdit => 'Editar';

  @override
  String get actionDelete => 'Eliminar';

  @override
  String get actionCancel => 'Cancelar';

  @override
  String get actionSave => 'Guardar';

  @override
  String get deleteThreadTitle => 'Eliminar pregunta';

  @override
  String get deleteReplyTitle => 'Eliminar respuesta';

  @override
  String get deleteIrreversible => 'Esta acción no se puede deshacer.';

  @override
  String get acceptedBadge => 'Aceptada';

  @override
  String get actionAccept => 'Aceptar';

  @override
  String get actionUnaccept => 'Quitar aceptación';

  @override
  String get editThreadTitle => 'Editar pregunta';

  @override
  String get fieldTitle => 'Título';

  @override
  String get fieldContent => 'Contenido';

  @override
  String get fieldAddTag => 'Agregar tag';

  @override
  String get editReplyTitle => 'Editar respuesta';

  @override
  String get fieldReply => 'Respuesta';

  @override
  String get replyHint => 'Escribe una respuesta…';

  @override
  String get replyRegisterPrompt =>
      'Regístrate para responder en la comunidad.';

  @override
  String get shareToChatTitle => 'Compartir en chat';

  @override
  String get shareToChatSubtitle =>
      'Se envía como tarjeta. Al tocarla, abren la pregunta.';

  @override
  String get shareNoChats =>
      'Aún no tienes chats. Abre Chats y escribe a alguien primero.';

  @override
  String get sharedPostLabel => 'Pregunta';

  @override
  String sharedPostLabelAuthor(String name) {
    return 'Pregunta · $name';
  }

  @override
  String get timeNow => 'ahora';

  @override
  String get timeMinutesOne => 'hace 1 min';

  @override
  String timeMinutesOther(int count) {
    return 'hace $count min';
  }

  @override
  String get timeHoursOne => 'hace 1 h';

  @override
  String timeHoursOther(int count) {
    return 'hace $count h';
  }

  @override
  String get timeYesterday => 'ayer';

  @override
  String timeDays(int count) {
    return 'hace $count d';
  }

  @override
  String get errNoPermission => 'No tienes permiso para esta acción.';

  @override
  String get errGenericRetry => 'Algo salió mal. Intenta de nuevo.';

  @override
  String get errForumNoPostPermission =>
      'No tienes permiso para publicar en la comunidad.';

  @override
  String get errForumTitleBodyRequired =>
      'Título y contenido son obligatorios.';

  @override
  String get errForumNeedTag => 'Agrega al menos un tag.';

  @override
  String get errForumCantEditQuestion => 'No puedes editar esta pregunta.';

  @override
  String get errForumNoReplyPermission => 'No tienes permiso para responder.';

  @override
  String get errForumEmptyReply => 'La respuesta no puede estar vacía.';

  @override
  String get errForumCantEditReply => 'No puedes editar esta respuesta.';

  @override
  String get errForumCantDeleteQuestion => 'No puedes eliminar esta pregunta.';

  @override
  String get errForumCantDeleteReply => 'No puedes eliminar esta respuesta.';

  @override
  String get errForumOnlyAuthorAccept =>
      'Solo el autor de la pregunta puede aceptar respuestas.';

  @override
  String get errForumReplyNotOnThread =>
      'La respuesta no pertenece a esta pregunta.';

  @override
  String get errForumRegisterToVote => 'Regístrate para marcar relevancia.';

  @override
  String get errForumCantVoteOwnQuestion =>
      'No puedes votar tu propia pregunta.';

  @override
  String get errForumCantVoteOwnReply => 'No puedes votar tu propia respuesta.';

  @override
  String get errForumVoteUnavailable =>
      'El voto no está disponible por ahora. Inténtalo de nuevo.';

  @override
  String get errChatCantChatSelf => 'No puedes chatear contigo mismo.';

  @override
  String get errChatEmptyMessage => 'Escribe un mensaje.';

  @override
  String get errChatInvalidShare => 'La pregunta a compartir no es válida.';

  @override
  String get errChatNotMember => 'No eres miembro de este chat.';

  @override
  String get errChatGone => 'Este chat ya no existe.';

  @override
  String get errChatRegister =>
      'Regístrate con una cuenta para usar los chats.';

  @override
  String get errChatCannotCreateGroup =>
      'Solo admins, instructores y managers pueden crear grupos.';

  @override
  String get chatsTitle => 'Chats';

  @override
  String get chatsGuestPrompt =>
      'Regístrate con una cuenta para enviar y recibir mensajes.';

  @override
  String get chatsEmptyTitle => 'Aún no tienes chats';

  @override
  String get chatsEmptySubtitle => 'Toca + para escribirle a un compañero.';

  @override
  String get chatsSectionPinned => 'Fijados';

  @override
  String get chatsSectionRecent => 'Recientes';

  @override
  String get chatsSectionCommunity => 'Comunidad';

  @override
  String get chatsSectionSupport => 'Soporte';

  @override
  String get chatsDefaultGroupBadge => 'Comunidad';

  @override
  String get chatsDefaultGroupTitle => 'Equipo';

  @override
  String get chatsSupportTitle => 'Soporte';

  @override
  String get chatsSupportBadge => 'AI + humano';

  @override
  String get chatsNoMessagesYet => 'Sin mensajes todavía';

  @override
  String get chatTypeGroup => 'Grupo';

  @override
  String get newGroupTitle => 'Nuevo grupo';

  @override
  String get newGroupNameLabel => 'Nombre del grupo';

  @override
  String get newGroupNameHint => 'ej. Cohorte Miami';

  @override
  String get newGroupMembersHeader => 'Miembros';

  @override
  String get newGroupCreate => 'Crear grupo';

  @override
  String get newGroupNeedMembers => 'Elige al menos otro miembro.';

  @override
  String get newGroupNeedTitle => 'Ingresa un nombre de grupo.';

  @override
  String get newGroupTooMany => 'Los grupos pueden tener máximo 20 miembros.';

  @override
  String get newChatCreateGroup => 'Crear un grupo';

  @override
  String get fabNewGroup => 'Nuevo grupo';

  @override
  String get chatTypePrivate => 'Chat privado';

  @override
  String get newChatTitle => 'Nuevo chat';

  @override
  String get newChatEmpty =>
      'No hay otros usuarios todavía. Cuando alguien se registre, aparecerá aquí.';

  @override
  String get newChatContactsHeader => 'CONTACTOS';

  @override
  String get chatEmptyThread =>
      'Di el primero. Los mensajes se sincronizan en vivo.';

  @override
  String get chatMessageHint => 'Escribe un mensaje…';

  @override
  String get chatEmojiPicker => 'Emojis';

  @override
  String get chatReact => 'Reaccionar';

  @override
  String get chatInfoTitle => 'Info';

  @override
  String get chatPin => 'Fijar chat';

  @override
  String get chatUnpin => 'Quitar de fijados';

  @override
  String get chatDelete => 'Eliminar';

  @override
  String get chatDeleteConfirmTitle => '¿Eliminar chat?';

  @override
  String get chatDeleteConfirmBody =>
      'Se quitará de tu bandeja. Puede volver a aparecer si alguien escribe de nuevo.';

  @override
  String get chatDeleteConfirmAction => 'Eliminar';

  @override
  String get chatDeleteCancel => 'Cancelar';

  @override
  String get chatDeleted => 'Chat eliminado';

  @override
  String get chatPinned => 'Chat fijado';

  @override
  String get chatUnpinned => 'Chat desafijado';

  @override
  String get chatTimeYesterday => 'Ayer';

  @override
  String get weekdayMon => 'Lun';

  @override
  String get weekdayTue => 'Mar';

  @override
  String get weekdayWed => 'Mié';

  @override
  String get weekdayThu => 'Jue';

  @override
  String get weekdayFri => 'Vie';

  @override
  String get weekdaySat => 'Sáb';

  @override
  String get weekdaySun => 'Dom';

  @override
  String get aiNewConversation => 'Nueva conversación';

  @override
  String get aiHistoryTooltip => 'Historial';

  @override
  String get aiNewTooltip => 'Nueva';

  @override
  String get aiThinking => 'Trabajando…';

  @override
  String get aiInputHint =>
      'Pregunta sobre productos, licencias, cumplimiento o ventas…';

  @override
  String get aiEmptyPrompt => '¿En qué estás trabajando?';

  @override
  String get aiEmptySubtitle =>
      'Pregunta lo que necesites sobre el negocio de seguros en EE. UU. Pulse AI busca en respuestas aceptadas del foro, en la academia y en fuentes oficiales, y te muestra de dónde salió cada dato.';

  @override
  String get aiSuggestion1 =>
      '¿Qué cambia para un cliente durante el AEP de Medicare?';

  @override
  String get aiSuggestion2 => '¿Cómo manejo la objeción “lo tengo que pensar”?';

  @override
  String get aiSuggestion3 =>
      '¿Qué necesito para obtener licencia en otro estado?';

  @override
  String get aiSuggestion4 =>
      'Explica en qué se diferencia un IUL de un whole life';

  @override
  String get aiSources => 'Fuentes';

  @override
  String get aiDisclaimer =>
      'Pulse AI puede equivocarse. Las reglas cambian por estado y aseguradora: verifica antes de asesorar a un cliente.';

  @override
  String get aiActivityForum => 'Buscando respuestas aceptadas';

  @override
  String get aiActivityAcademy => 'Buscando en la academia';

  @override
  String get aiActivityOfficial => 'Revisando fuentes oficiales';

  @override
  String get aiActivityWeb => 'Revisando sitios oficiales';

  @override
  String get aiActivityProfile => 'Revisando tu aprendizaje';

  @override
  String aiActivityResults(int count) {
    return '$count encontrados';
  }

  @override
  String get aiActivityNone => 'sin resultados';

  @override
  String get aiActivityFailed => 'falló';

  @override
  String get aiSourceForum => 'Respuesta de la comunidad';

  @override
  String get aiSourceCourse => 'Curso';

  @override
  String get aiSourcePath => 'Ruta de aprendizaje';

  @override
  String get aiSourceLesson => 'Lección';

  @override
  String get aiSourceOfficial => 'Fuente oficial';

  @override
  String get aiSourceMissing => 'Esa fuente ya no está disponible.';

  @override
  String get aiNoticeCompliance =>
      'Información educativa, no asesoría legal. Revisa la póliza, las reglas de tu estado o tu equipo de cumplimiento antes de actuar.';

  @override
  String get aiNoticeLegal =>
      'Pulse AI explica cómo funcionan en general la ley y la regulación de seguros, pero nunca asesora sobre tu caso concreto.';

  @override
  String get aiNoticeScope =>
      'Pulse AI solo cubre la industria de seguros de EE. UU. y el negocio asegurador.';

  @override
  String get aiNoticeNoSources =>
      'Ninguna fuente indexada respalda esta respuesta: tómala como conocimiento general del sector y verifícala antes de actuar.';

  @override
  String get aiFeedbackUp => 'Útil';

  @override
  String get aiFeedbackDown => 'No útil';

  @override
  String get aiHistoryEmpty => 'Aún no hay conversaciones.';

  @override
  String get aiUntitled => 'Conversación sin título';

  @override
  String get aiDeleteChat => 'Eliminar conversación';

  @override
  String get aiError => 'Pulse AI tuvo un error. Inténtalo de nuevo.';

  @override
  String get aiStop => 'Detener';

  @override
  String get aiSignInRequired =>
      'Inicia sesión con una cuenta completa para usar Pulse AI.';

  @override
  String get aiLoading => 'Cargando conversación…';

  @override
  String get aiAssistantSubtitle => 'Impulsado por el agente Every Benefits';

  @override
  String get aiStatusOnline => 'En línea';

  @override
  String get aiSettings => 'Ajustes';

  @override
  String get aiSettingsTitle => 'Ajustes de IA';

  @override
  String get aiModelSection => 'Modelo';

  @override
  String get aiModelName => 'Pulse AI';

  @override
  String get aiModelSubtitle =>
      'El agente Every Benefits busca en foros, cursos de la academia y fuentes oficiales de reguladores.';

  @override
  String get academyTitle => 'Academia';

  @override
  String get actionSearch => 'Buscar';

  @override
  String get academyMyLearning => 'Mi aprendizaje';

  @override
  String get academyPaths => 'Rutas';

  @override
  String get academySeeAll => 'Ver todas';

  @override
  String get academyCourses => 'Cursos';

  @override
  String get academyStudio => 'Studio';

  @override
  String get academyContinueLearning => 'Continuar aprendiendo';

  @override
  String get academyCatalogEmpty => 'Aún no hay cursos publicados.';

  @override
  String get academyFilterAll => 'Todos';

  @override
  String get academyMyCourses => 'Mis cursos';

  @override
  String get academyPendingReview => 'Pendientes de aprobación';

  @override
  String get searchCoursesHint => 'Buscar cursos…';

  @override
  String searchNoResults(String query) {
    return 'Sin resultados para «$query»';
  }

  @override
  String get myLearningInProgress => 'En progreso';

  @override
  String get myLearningCompleted => 'Completados';

  @override
  String get myLearningEmpty => 'Aún no tienes cursos en progreso.';

  @override
  String get courseDetailTitle => 'Curso';

  @override
  String courseByTeacher(String name) {
    return 'Por $name';
  }

  @override
  String courseStudentsPlural(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count estudiantes',
      one: '1 estudiante',
      zero: 'Sin estudiantes',
    );
    return '$_temp0';
  }

  @override
  String courseLessonsPlural(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count clases',
      one: '1 clase',
      zero: 'Sin clases',
    );
    return '$_temp0';
  }

  @override
  String courseDurationMinutes(int minutes) {
    return '$minutes min';
  }

  @override
  String courseDurationHoursMinutes(int hours, int minutes) {
    return '$hours h $minutes min';
  }

  @override
  String courseProgressPercent(int percent) {
    return '$percent% completado';
  }

  @override
  String get courseCompletedBadge => 'Completado';

  @override
  String get courseNoLessons => 'Este curso todavía no tiene clases.';

  @override
  String get courseStart => 'Empezar curso';

  @override
  String get courseContinue => 'Continuar';

  @override
  String get courseAbout => 'Sobre este curso';

  @override
  String courseModule(int index) {
    return 'Módulo $index';
  }

  @override
  String get moduleLocked =>
      'Aprueba los quizzes del módulo anterior para desbloquear este.';

  @override
  String get moduleLockedShort => 'Bloqueado';

  @override
  String get courseStatusDraft => 'Borrador';

  @override
  String get courseStatusPending => 'En revisión';

  @override
  String get courseStatusPublished => 'Publicado';

  @override
  String get courseManageTitle => 'Gestionar curso';

  @override
  String get courseEditTitle => 'Editar curso';

  @override
  String get courseFieldTitle => 'Título';

  @override
  String get courseFieldDescription => 'Descripción';

  @override
  String get courseFieldTeacher => 'Instructor';

  @override
  String get courseFieldLevel => 'Nivel';

  @override
  String get courseActionSubmitReview => 'Enviar a revisión';

  @override
  String get courseActionApprove => 'Aprobar y publicar';

  @override
  String get courseActionUnpublish => 'Despublicar';

  @override
  String get courseActionRejectToDraft => 'Devolver a borrador';

  @override
  String courseDeleteConfirm(String title) {
    return '¿Eliminar «$title»? Esta acción no se puede deshacer.';
  }

  @override
  String get courseSavedToast => 'Cambios guardados';

  @override
  String get courseSubmittedToast => 'Enviado a revisión';

  @override
  String get coursePublishedToast => 'Curso publicado';

  @override
  String get courseUnpublishedToast => 'Curso despublicado';

  @override
  String get courseDeletedToast => 'Curso eliminado';

  @override
  String get studioWebOnlyHint =>
      'Abre Pulse Studio en la web para subir videos y organizar módulos.';

  @override
  String get playerClasses => 'Clases';

  @override
  String get playerLoading => 'Cargando video…';

  @override
  String get playerNoVideo => 'Esta clase todavía no tiene video.';

  @override
  String get playerError => 'No se pudo reproducir el video.';

  @override
  String get playerNextLesson => 'Siguiente clase';

  @override
  String get playerCourseCompleted => '¡Completaste el curso!';

  @override
  String playerLessonOf(int index, int total) {
    return 'Clase $index de $total';
  }

  @override
  String get lessonTypeVideo => 'Video';

  @override
  String get lessonTypeReading => 'Lectura';

  @override
  String get lessonTypeQuiz => 'Quiz';

  @override
  String get readingEmpty => 'Esta lectura todavía no tiene contenido.';

  @override
  String get readingMarkComplete => 'Marcar como completada';

  @override
  String get readingCompleted => 'Lectura completada';

  @override
  String get quizEmpty => 'Este quiz todavía no tiene preguntas.';

  @override
  String quizPassRequirement(int percent) {
    return 'Necesitas $percent% para aprobar.';
  }

  @override
  String get quizPickOne => 'Elige una respuesta';

  @override
  String get quizPickMany => 'Elige todas las que apliquen';

  @override
  String get quizSubmit => 'Enviar respuestas';

  @override
  String get quizGrading => 'Calificando…';

  @override
  String get quizRetry => 'Intentar de nuevo';

  @override
  String quizScore(int score) {
    return 'Tu puntaje: $score%';
  }

  @override
  String get quizPassed => 'Aprobado';

  @override
  String get quizFailed => 'Aún no aprobado';

  @override
  String quizQuestionOf(int index, int total) {
    return 'Pregunta $index de $total';
  }

  @override
  String get quizAnswerCorrect => 'Correcta';

  @override
  String get quizAnswerIncorrect => 'Incorrecta';

  @override
  String get levelBasic => 'Básico';

  @override
  String get levelIntermediate => 'Intermedio';

  @override
  String get levelAdvanced => 'Avanzado';

  @override
  String get pathDetailTitle => 'Ruta';

  @override
  String get pathsEmpty => 'Aún no hay rutas publicadas.';

  @override
  String get pathIncludedCourses => 'Cursos de la ruta';

  @override
  String pathMetaCoursesHours(int courses, int hours) {
    return '$courses cursos · ${hours}h';
  }

  @override
  String get errCourseNoPermission =>
      'No tienes permiso para gestionar cursos.';

  @override
  String get errCourseTitleRequired => 'El título del curso es obligatorio.';

  @override
  String get errCourseAlreadyPublished =>
      'Solo un admin puede editar un curso publicado.';

  @override
  String get errCourseNotPublished => 'Este curso todavía no está publicado.';

  @override
  String get errCourseSignInRequired => 'Inicia sesión para inscribirte.';

  @override
  String get errCourseOnlyAdminPublishes =>
      'Solo un admin puede publicar cursos.';

  @override
  String get errQuizIncomplete =>
      'Responde todas las preguntas antes de enviar.';

  @override
  String get errQuizNoAnswerKey =>
      'Este quiz todavía no está listo para calificarse.';

  @override
  String profileBootstrapFailed(String error) {
    return 'No se pudo cargar el perfil:\n$error';
  }

  @override
  String get profileBootstrapBack => 'Volver al inicio';

  @override
  String get profilePulseEyebrow => 'Tu Pulse';

  @override
  String get profileChangePhoto => 'Cambiar foto';

  @override
  String get profileTapToAddPhoto => 'Toca para agregar una foto';

  @override
  String get profileQuickEdit => 'Editar';

  @override
  String get profileQuickSettings => 'Ajustes';

  @override
  String get profileDetailAgency => 'Agencia';

  @override
  String get profileDetailNpn => 'NPN';

  @override
  String get profileDetailPhone => 'Teléfono';

  @override
  String get profileDetailEmail => 'Correo';

  @override
  String get profileDetailAddress => 'Dirección';

  @override
  String get profileDossierEyebrow => 'Expediente';

  @override
  String get profileRoleLockedHint =>
      'Tu tipo de cuenta queda fijo tras el alta. Contacta a un admin para ser agente.';

  @override
  String get fieldAddressStreet => 'Calle y número';

  @override
  String get fieldAddressApt => 'Apto / Suite';

  @override
  String get fieldAddressCity => 'Ciudad';

  @override
  String get fieldAddressState => 'Estado';

  @override
  String get fieldAddressZip => 'ZIP';

  @override
  String get validationAddressStreet => 'Ingresa la calle y número.';

  @override
  String get validationAddressCity => 'Ingresa la ciudad.';

  @override
  String get validationAddressState => 'Usa el código de estado de 2 letras.';

  @override
  String get validationAddressZip => 'Ingresa un ZIP válido.';

  @override
  String get editProfileRoleSection => 'Tipo de cuenta';

  @override
  String get editProfileBasicsSection => 'Datos básicos';

  @override
  String get editProfileCredentialsSection => 'Licencia y ubicación';

  @override
  String get editProfileRoleFrozen =>
      'Elegido al registrarte — solo un admin puede cambiarlo.';

  @override
  String get settingsAdmin => 'Admin';

  @override
  String get settingsAdminHint =>
      'Promueve estudiantes a agentes y gestiona funciones de la plataforma.';

  @override
  String get settingsAdminPulseAi => 'Pulse AI';

  @override
  String get settingsAdminPulseAiHint =>
      'Si está desactivado, los miembros no pueden abrir ni chatear con Pulse AI.';

  @override
  String get settingsAdminPromote => 'Promover a agente';

  @override
  String get settingsAdminEmpty => 'No hay estudiantes para promover.';

  @override
  String get settingsAdminPromoteOk => 'Promovido a agente.';

  @override
  String settingsAdminPromoteFailed(String error) {
    return 'No se pudo promover: $error';
  }

  @override
  String get aiDisabled => 'Pulse AI no está disponible temporalmente.';

  @override
  String get settingsAppearance => 'Apariencia';

  @override
  String get settingsPreferences => 'Preferencias';

  @override
  String get settingsPrivacy => 'Privacidad';

  @override
  String get settingsPrivacyHint =>
      'Los reportes de fallos nos ayudan a corregir errores. La analítica de producto permanece desactivada hasta que la actives.';

  @override
  String get settingsAnalytics => 'Analítica de producto';

  @override
  String get settingsAnalyticsHint =>
      'Solo eventos de uso anónimos — sin nombre, correo ni contenido de mensajes.';

  @override
  String get settingsAccount => 'Cuenta';

  @override
  String get settingsThemeHint => 'Sigue el sistema o fija claro / oscuro.';

  @override
  String get settingsLanguageHint =>
      'Idioma de la interfaz de Every Insurance.';

  @override
  String get settingsAccentStudio => 'Señal de marca';

  @override
  String get settingsEditAccount => 'Editar datos de la cuenta';

  @override
  String get settingsSignOutHint =>
      'Necesitarás iniciar sesión de nuevo para volver.';

  @override
  String get navNotifications => 'Notificaciones';

  @override
  String get notificationsTitle => 'Notificaciones';

  @override
  String get notificationsEmpty => 'Estás al día.';

  @override
  String get notificationsMarkAll => 'Marcar todo leído';

  @override
  String get notificationsSignIn =>
      'Inicia sesión para ver tus notificaciones.';

  @override
  String get notificationsPrefsTitle => 'Preferencias de notificaciones';

  @override
  String get notificationsPrefChats => 'Mensajes de chat';

  @override
  String get notificationsPrefForums => 'Actividad en foros';

  @override
  String get notificationsPrefAcademy => 'Novedades de academia';

  @override
  String get notificationsPrefSupport => 'Respuestas de soporte';

  @override
  String get notificationsPrefsHint =>
      'Elige qué alertas llegan como push en este dispositivo.';

  @override
  String get notificationsEnablePush => 'Activar notificaciones push';

  @override
  String get notificationsPushEnabled => 'Notificaciones push activadas';

  @override
  String get notificationsPushUnavailable =>
      'No se pudieron activar. Permite notificaciones en Ajustes del sistema.';

  @override
  String get phoneProfileVerifyTitle => 'Verifica tu teléfono';

  @override
  String phoneProfileVerifyHint(String phone) {
    return 'Enviaremos un SMS a $phone para confirmar que es tuyo.';
  }

  @override
  String get phoneProfileVerifyConfirm => 'Confirmar teléfono';

  @override
  String get phoneProfileVerifiedBadge => 'Teléfono verificado';

  @override
  String get phoneProfileUnverifiedBadge => 'Teléfono aún sin verificar';

  @override
  String get dangerTitle => 'Zona de peligro';

  @override
  String get dangerNav => 'Desactivar o eliminar';

  @override
  String get dangerSubtitle =>
      'Acciones sensibles de la cuenta. Léelas con cuidado.';

  @override
  String get dangerDeactivate => 'Desactivar cuenta';

  @override
  String get dangerDeactivateHint =>
      'Tu cuenta se pausa y dejas de recibir notificaciones. Puedes reactivarla iniciando sesión de nuevo.';

  @override
  String get dangerDeactivateConfirmHint =>
      'Se cerrará tu sesión ahora. Para volver, inicia sesión y toca Reactivar.';

  @override
  String get dangerDeactivateConfirm => 'Sí, desactivar';

  @override
  String get dangerDelete => 'Eliminar cuenta';

  @override
  String get dangerDeleteHint =>
      'Tus datos personales se conservan 3 meses y luego se eliminan automáticamente. Puedes cancelar la eliminación en ese periodo iniciando sesión.';

  @override
  String dangerDeleteConfirmHint(String date) {
    return 'Tus datos se eliminarán definitivamente el $date. Hasta entonces puedes cancelar iniciando sesión.';
  }

  @override
  String get dangerDeleteAnonymizeHint =>
      'Tus publicaciones en foros y chats permanecen con un nombre anónimo. Si cancelas, recuperan tu nombre.';

  @override
  String get dangerDeleteConfirm => 'Eliminar mi cuenta';

  @override
  String get dangerCurrentPassword => 'Contraseña actual';

  @override
  String get dangerReauthFailed =>
      'No pudimos confirmar tu identidad. Revisa tu contraseña e inténtalo de nuevo.';

  @override
  String get tourEyebrow => 'Bienvenido a Pulse';

  @override
  String tourStep(int current, int total) {
    return '$current de $total';
  }

  @override
  String get tourSkip => 'Omitir';

  @override
  String get tourBack => 'Atrás';

  @override
  String get tourNext => 'Siguiente';

  @override
  String get tourDone => 'Empezar';

  @override
  String get tourWelcomeTitle => 'Un Pulse renovado';

  @override
  String get tourWelcomeBody =>
      'Foros, chats, academia y Pulse AI — rediseñados para sentirse más rápidos y claros. Este tour rápido te muestra qué puedes hacer.';

  @override
  String get tourCommunityTitle => 'Pregunta a la red';

  @override
  String get tourCommunityBody =>
      'Inicio es tu feed de comunidad. Publica preguntas, sigue hilos destacados y encuentra respuestas aceptadas de agentes y colegas.';

  @override
  String get tourChatsTitle => 'Conversemos';

  @override
  String get tourChatsBody =>
      'Escribe a compañeros, crea grupos o abre Soporte cuando lo necesites. Las insignias de no leídos te mantienen al día.';

  @override
  String get tourAcademyTitle => 'Aprende a tu ritmo';

  @override
  String get tourAcademyBody =>
      'Explora cursos y rutas publicados, retoma donde lo dejaste y sigue tu progreso en Academia.';

  @override
  String get tourAiTitle => 'Pregunta a Pulse AI';

  @override
  String get tourAiBody =>
      'Tu asistente en la app para dudas del oficio — con contexto de la comunidad cuando esté disponible.';

  @override
  String get tourYouTitle => 'Tu espacio';

  @override
  String get tourYouBody =>
      'En Perfil están tus datos, preferencias de notificación y seguridad. Puedes volver a todo desde la navegación cuando quieras.';

  @override
  String get tourYouBodyAgent =>
      'En Perfil están tus datos, notificaciones y seguridad. Los agentes pueden saltar a Studio desde el selector de apps para crear cursos.';
}
