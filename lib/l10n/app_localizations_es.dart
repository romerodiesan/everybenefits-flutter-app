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
      '¿Necesitas ayuda con tu cuenta o la app? Contáctanos y te responderemos.';

  @override
  String get supportSheetEmail => 'support@everybenefits.com';

  @override
  String get supportSheetClose => 'Cerrar';

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
  String authErrUnknown(String code) {
    return 'No se pudo completar la autenticación ($code).';
  }

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
  String get chatsDefaultGroupBadge => 'Comunidad';

  @override
  String get chatsDefaultGroupTitle => 'Agentes';

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
  String get chatInfoTitle => 'Info';

  @override
  String get chatPin => 'Fijar chat';

  @override
  String get chatUnpin => 'Quitar de fijados';

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
  String get aiDemoReply =>
      'Respuesta demo. Cuando conectemos Gemini, verás ayuda real aquí.';

  @override
  String get aiHistoryTooltip => 'Historial';

  @override
  String get aiNewTooltip => 'Nueva';

  @override
  String get aiThinking => 'Pensando…';

  @override
  String get aiInputHint => 'Pregunta lo que sea';

  @override
  String get aiEmptyPrompt => '¿En qué puedo ayudarte?';

  @override
  String get aiSettings => 'Ajustes';

  @override
  String get aiSettingsTitle => 'Ajustes de IA';

  @override
  String get aiModelSection => 'Modelo';

  @override
  String get aiModelSubtitle => 'Próximamente vía Firebase AI Logic';

  @override
  String get academyTitle => 'Academia';

  @override
  String get actionSearch => 'Buscar';

  @override
  String get academyMyLearning => 'Mi aprendizaje';

  @override
  String get academyPaths => 'Rutas';

  @override
  String get academyCourses => 'Cursos';

  @override
  String get academyCatalogDemo =>
      'Catálogo demo — cursos reales próximamente.';

  @override
  String get searchCoursesHint => 'Buscar cursos…';

  @override
  String get myLearningInProgress => 'En progreso';

  @override
  String get myLearningEmpty => 'Aún no tienes cursos en progreso.';

  @override
  String get courseDetailTitle => 'Curso';

  @override
  String courseByTeacher(String name) {
    return 'Por $name';
  }

  @override
  String courseStudents(String count) {
    return '$count estudiantes';
  }

  @override
  String get courseStart => 'Empezar curso';

  @override
  String get courseContinue => 'Continuar';

  @override
  String get courseAbout => 'Sobre este curso';

  @override
  String get courseAboutDemo =>
      'Contenido demo. Los módulos reales llegarán cuando conectemos el LMS.';

  @override
  String courseModule(int index) {
    return 'Módulo $index';
  }

  @override
  String get courseLessonsCount => '4 clases';

  @override
  String get playerVideoSoon => 'Video próximamente';

  @override
  String get playerVideoSoonBody =>
      'Aquí irá el reproductor cuando haya contenido.';

  @override
  String get playerClasses => 'Clases';

  @override
  String playerClass(int index) {
    return 'Clase $index';
  }

  @override
  String get levelBasic => 'Básico';

  @override
  String get levelIntermediate => 'Intermedio';

  @override
  String get levelAdvanced => 'Avanzado';

  @override
  String get pathNewAgent => 'Agente nuevo';

  @override
  String get pathClosing => 'Cierre de ventas';

  @override
  String get pathLeadership => 'Liderazgo de agencia';

  @override
  String pathMetaCoursesHours(int courses, int hours) {
    return '$courses cursos · ${hours}h';
  }

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
  String get settingsAdminHint => 'Promueve estudiantes a agentes.';

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
  String get settingsAppearance => 'Apariencia';

  @override
  String get settingsPreferences => 'Preferencias';

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
}
