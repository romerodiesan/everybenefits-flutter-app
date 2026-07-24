// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'Every Insurance';

  @override
  String get navHome => 'Home';

  @override
  String get navChats => 'Chats';

  @override
  String get navAi => 'AI';

  @override
  String get navAcademy => 'Academy';

  @override
  String get navProfile => 'Profile';

  @override
  String get fabNewQuestion => 'New question';

  @override
  String get fabNewChat => 'New chat';

  @override
  String get fabNewConversation => 'New conversation';

  @override
  String get fabSearchCourses => 'Search courses';

  @override
  String get fabEditProfile => 'Edit profile';

  @override
  String get fabSupport => 'Support';

  @override
  String get supportSheetTitle => 'Support';

  @override
  String get supportSheetBody =>
      'Need help with your account or the app? Start a support chat — an assistant replies right away and our team can join.';

  @override
  String get supportSheetEmail => 'support@everybenefits.com';

  @override
  String get supportSheetEmailSubject => 'Support request — Every Benefits';

  @override
  String get supportSheetEmailFailed =>
      'Couldn\'t open your email app. You can write to support@everybenefits.com.';

  @override
  String get supportSheetClose => 'Close';

  @override
  String get supportSheetOpenChat => 'Open support chat';

  @override
  String get supportChatAiName => 'Support Assistant';

  @override
  String get supportChatWelcome =>
      'Hi! I’m the support assistant. Tell me what you need — a teammate can join this chat anytime.';

  @override
  String get supportChatAiReply =>
      'Thanks for the details. I’m here to help while a human teammate reviews this thread.';

  @override
  String get supportChatSubtitle => 'AI + human support';

  @override
  String get supportChatOpening => 'Opening support chat…';

  @override
  String get editProfileNameFrozen => 'Your name is locked after setup.';

  @override
  String get editProfileNpnFrozen => 'Your NPN is locked after setup.';

  @override
  String get roleGuest => 'Guest';

  @override
  String get roleStudent => 'Student';

  @override
  String get roleAgent => 'Agent';

  @override
  String get roleInstructor => 'Instructor';

  @override
  String get roleManager => 'Manager';

  @override
  String get roleAdmin => 'Admin';

  @override
  String get you => 'You';

  @override
  String get welcomeTagline => 'The pulse of your professional community.';

  @override
  String get welcomeEnter => 'Sign in';

  @override
  String get welcomeGuest => 'Continue as guest';

  @override
  String get welcomeCreateAccount => 'Create account';

  @override
  String get welcomePhone => 'Phone';

  @override
  String get onboardingSkip => 'Skip';

  @override
  String get onboardingNext => 'Next';

  @override
  String get onboardingGetStarted => 'Get started';

  @override
  String get onboardingCommunityTitle => 'Learn out loud';

  @override
  String get onboardingCommunityBody =>
      'Ask questions, share wins, and grow with agents who do the same work you do.';

  @override
  String get onboardingChatsTitle => 'Stay in the loop';

  @override
  String get onboardingChatsBody =>
      'Direct messages and team groups keep mentorship and daily coordination in one place.';

  @override
  String get onboardingAiTitle => 'An assistant on call';

  @override
  String get onboardingAiBody =>
      'Pulse AI is ready when you need a quick answer — benefits, courses, or community context.';

  @override
  String get onboardingAcademyTitle => 'Level up your craft';

  @override
  String get onboardingAcademyBody =>
      'Paths and courses designed for insurance professionals — progress that actually sticks.';

  @override
  String get loginTitle => 'Sign in';

  @override
  String get loginSubtitle => 'Access your professional agent community.';

  @override
  String get fieldEmail => 'Email';

  @override
  String get validationEmail => 'Enter a valid email.';

  @override
  String get fieldPassword => 'Password';

  @override
  String get loginForgotPassword => 'Forgot your password?';

  @override
  String get loginSubmit => 'Sign in';

  @override
  String get loginMagicLink => 'Sign in with magic link';

  @override
  String get loginMagicLinkResend => 'Resend magic link';

  @override
  String get loginMagicLinkInvalid => 'Enter a valid email for the magic link.';

  @override
  String loginMagicLinkSent(String email) {
    return 'Link sent to $email';
  }

  @override
  String get loginNoAccount => 'Don\'t have an account? Create one';

  @override
  String get authDividerContinueWith => 'or continue with';

  @override
  String get authContinueGoogle => 'Continue with Google';

  @override
  String get authContinuePhone => 'Continue with phone';

  @override
  String get registerTitle => 'Create account';

  @override
  String get registerSubtitle =>
      'Join as an agent and unlock the full community.';

  @override
  String get fieldConfirmPassword => 'Confirm password';

  @override
  String get validationPasswordsMismatch => 'Passwords do not match.';

  @override
  String get validationPasswordMin => 'At least 6 characters.';

  @override
  String get registerSubmit => 'Create account';

  @override
  String get registerHaveAccount => 'Already have an account? Sign in';

  @override
  String get forgotTitle => 'Recover access';

  @override
  String get forgotSubtitle => 'We\'ll send a link to reset your password.';

  @override
  String get forgotSubtitleSent =>
      'Check your email and follow the link to create a new password.';

  @override
  String get forgotSendLink => 'Send link';

  @override
  String get forgotResendLink => 'Resend link';

  @override
  String forgotLinkSent(String email) {
    return 'We sent a link to $email';
  }

  @override
  String get phoneTitle => 'Phone';

  @override
  String get phoneCodeTitle => 'SMS code';

  @override
  String phoneSubtitleCode(String phone) {
    return 'Enter the code we sent to $phone.';
  }

  @override
  String get fieldPhoneNumber => 'Phone number';

  @override
  String get validationPhoneCountry => 'Include the country code (+…)';

  @override
  String get phoneSendCode => 'Send code';

  @override
  String get fieldVerificationCode => 'Verification code';

  @override
  String get phoneVerifyEnter => 'Verify and sign in';

  @override
  String get phoneChangeNumber => 'Change number';

  @override
  String get phoneResendCode => 'Resend code';

  @override
  String get phoneSmsSent => 'SMS code sent';

  @override
  String get validationSmsCode => 'Enter the 6-digit code.';

  @override
  String get authErrInvalidEmail => 'The email is not valid.';

  @override
  String get authErrUserDisabled => 'This account is disabled.';

  @override
  String get authErrUserNotFound =>
      'We couldn\'t find an account with that email.';

  @override
  String get authErrWrongPassword => 'Incorrect email or password.';

  @override
  String get authErrEmailInUse => 'An account with that email already exists.';

  @override
  String get authErrWeakPassword => 'Password is too weak (min. 6 characters).';

  @override
  String get authErrTooManyRequests =>
      'Too many attempts. Wait a moment and try again.';

  @override
  String get authErrNetwork =>
      'No connection. Check your network and try again.';

  @override
  String get authErrEmulatorUnreachable =>
      'Couldn\'t reach Firebase. Are the local emulators running?';

  @override
  String get authErrPermission => 'You don\'t have permission for this action.';

  @override
  String get authErrInvalidPhone =>
      'Invalid phone number. Use international format (+1…).';

  @override
  String get authErrInvalidSms => 'The SMS code is invalid.';

  @override
  String get authErrSmsExpired => 'The code expired. Request a new one.';

  @override
  String get authErrOpNotAllowed => 'This sign-in method is not enabled.';

  @override
  String authErrUnknown(String code) {
    return 'Authentication failed ($code).';
  }

  @override
  String get profileCompleteRoleTitle => 'Your role';

  @override
  String get profileCompleteDataTitle => 'Your details';

  @override
  String get profileCompleteSignOut => 'Sign out';

  @override
  String get profileCompleteHeadline => 'How does\nyour Pulse beat?';

  @override
  String get profileCompleteSubtitle =>
      'Choose how you participate. You can change it later.';

  @override
  String get profileCompleteAgentTitle => 'I\'m an agent';

  @override
  String get profileCompleteAgentSubtitle =>
      'NPN, agency, and professional community';

  @override
  String get profileCompleteStudentTitle => 'I\'m a student';

  @override
  String get profileCompleteStudentSubtitle =>
      'Campus, practice, and networking';

  @override
  String get actionContinue => 'Continue';

  @override
  String get profileCompleteChangeRole => '← Change role';

  @override
  String get profileCompleteTellMore => 'Tell us a bit more';

  @override
  String get profileCompleteFinish => 'Finish';

  @override
  String get profileSaveFailed => 'Couldn\'t save the profile.';

  @override
  String get fieldFullName => 'Full name';

  @override
  String get validationName => 'Enter your name.';

  @override
  String get countryCodePickerTitle => 'Country / code';

  @override
  String get fieldPhone => 'Phone';

  @override
  String get validationPhone => 'Invalid number.';

  @override
  String get fieldNpn => 'NPN';

  @override
  String get fieldNpnHint => 'National Producer Number';

  @override
  String get validationNpn => 'Enter a valid NPN.';

  @override
  String get fieldAddress => 'Address';

  @override
  String get validationAddress => 'Enter your address.';

  @override
  String get fieldAgency => 'Agency';

  @override
  String get fieldAgencyHelper => 'Default: Every Benefits';

  @override
  String get validationAgency => 'Enter the agency.';

  @override
  String get editProfileTitle => 'Edit profile';

  @override
  String get editProfileAccountType => 'Account type';

  @override
  String get editProfileAgentSubtitle => 'NPN, address, and agency';

  @override
  String get editProfileStudentSubtitle => 'Name and phone';

  @override
  String get editProfileSave => 'Save changes';

  @override
  String editProfileUpdateFailed(String error) {
    return 'Couldn\'t update: $error';
  }

  @override
  String get profileTitle => 'Profile';

  @override
  String get profileSettingsTooltip => 'Settings';

  @override
  String get profileBioGuest => 'Guest on Every Insurance. Join to post.';

  @override
  String get profileBioMember => 'Community · Academy · Chats';

  @override
  String get profileAddPhoto => 'Add profile photo';

  @override
  String get profilePickGallery => 'Choose from gallery';

  @override
  String get profileTakePhoto => 'Take photo';

  @override
  String profilePickImageFailed(String error) {
    return 'Couldn\'t pick image: $error';
  }

  @override
  String profileUploadFailed(String error) {
    return 'Couldn\'t upload photo: $error';
  }

  @override
  String get settingsTitle => 'Settings';

  @override
  String get settingsYourInfo => 'Your information';

  @override
  String get settingsLabelName => 'Name';

  @override
  String get settingsLabelEmail => 'Email';

  @override
  String get settingsNoEmail => 'No email linked';

  @override
  String get settingsTheme => 'Theme';

  @override
  String get themeModeAuto => 'Auto';

  @override
  String get themeModeLight => 'Light';

  @override
  String get themeModeDark => 'Dark';

  @override
  String get settingsLanguage => 'Language';

  @override
  String get settingsLanguageSystem => 'System';

  @override
  String get settingsLanguageEnglish => 'English';

  @override
  String get settingsLanguageSpanish => 'Spanish';

  @override
  String get settingsAccentColor => 'Accent color';

  @override
  String get settingsAccentHint =>
      'Applies to buttons, tabs, and accents across the app.';

  @override
  String get settingsSignOut => 'Sign out';

  @override
  String get seedGreen => 'Green';

  @override
  String get seedAmber => 'Amber';

  @override
  String get seedTeal => 'Teal';

  @override
  String get seedBlue => 'Blue';

  @override
  String get seedViolet => 'Violet';

  @override
  String get seedRose => 'Rose';

  @override
  String get forumsTitle => 'Home';

  @override
  String get forumsSearchHint => 'Search questions…';

  @override
  String get forumsSearchOpen => 'Search questions';

  @override
  String get forumsSearchClose => 'Close search';

  @override
  String get forumsSortTooltip => 'Sort';

  @override
  String get forumsSortRecent => 'Most recent';

  @override
  String get forumsSortRelevant => 'Most relevant';

  @override
  String get forumsFilterMine => 'Mine';

  @override
  String get forumsFilterRelevant => 'Relevant';

  @override
  String get forumsFilterRecent => 'Recent';

  @override
  String get forumsClearFilters => 'Clear';

  @override
  String get forumsReadOnlyBanner => 'Read-only — sign up to post.';

  @override
  String get forumsFilterYourQuestions => 'Your questions';

  @override
  String get forumsFilterSearchLoaded => 'search in loaded results';

  @override
  String get forumsLoadErrorTitle => 'Couldn\'t load';

  @override
  String get actionRetry => 'Retry';

  @override
  String get forumsEmptyMineTitle => 'You haven\'t asked yet';

  @override
  String get forumsEmptyFeedTitle => 'The feed is quiet';

  @override
  String get forumsEmptyMineSubtitle =>
      'Post your first question to see it here.';

  @override
  String get forumsEmptyFeedSubtitle => 'Be the first to post a question.';

  @override
  String get forumsNoMatchesTitle => 'No matches';

  @override
  String forumsNoMatchesQuery(String query) {
    return 'No questions for “$query”.';
  }

  @override
  String get forumsNoMatchesFilter => 'Try another filter or tag.';

  @override
  String get forumsLoadMore => 'Load more';

  @override
  String get composerAskCommunity => 'Ask the community a question';

  @override
  String get composerAskHint =>
      'NPN, products, sales… someone may have solved it already.';

  @override
  String get createThreadTitle => 'New post';

  @override
  String get createFieldQuestion => 'Question';

  @override
  String get createQuestionHint => 'What do you need to solve?';

  @override
  String get validationTitleShort => 'Write a more descriptive title.';

  @override
  String get createFieldContext => 'Context';

  @override
  String get createContextHint =>
      'Details, what you already tried, and the expected result…';

  @override
  String get validationBodyShort => 'Add a bit more context.';

  @override
  String get createTopics => 'Topics';

  @override
  String get createTopicsHelp =>
      'Up to 5 tags so others can find your question.';

  @override
  String get fieldTag => 'Tag';

  @override
  String get fieldTagHint => 'e.g. npn';

  @override
  String get actionAdd => 'Add';

  @override
  String get createFrequentTopics => 'Popular topics';

  @override
  String get actionPublish => 'Publish';

  @override
  String get createMaxTags => 'Maximum 5 tags per thread.';

  @override
  String get createNeedTag => 'Add at least one tag.';

  @override
  String get actionReply => 'Reply';

  @override
  String get actionShareChats => 'Chats';

  @override
  String get replyCountOne => '1 reply';

  @override
  String replyCountOther(int count) {
    return '$count replies';
  }

  @override
  String get relevanceLabel => 'Relevance';

  @override
  String relevanceScoreShort(int score) {
    return '$score relev.';
  }

  @override
  String get relevanceUpTooltip => 'More relevant';

  @override
  String get relevanceDownTooltip => 'Less relevant';

  @override
  String get threadFallbackTitle => 'Question';

  @override
  String get threadShareTooltip => 'Share to chat';

  @override
  String get threadNotFoundTitle => 'Question not found';

  @override
  String get threadNotFoundSubtitle => 'It may have been deleted.';

  @override
  String get threadSortedByRelevance => 'Sorted by relevance';

  @override
  String get threadFirstToReply => 'Be the first to reply.';

  @override
  String get actionOptions => 'Options';

  @override
  String get actionEdit => 'Edit';

  @override
  String get actionDelete => 'Delete';

  @override
  String get actionCancel => 'Cancel';

  @override
  String get actionSave => 'Save';

  @override
  String get deleteThreadTitle => 'Delete question';

  @override
  String get deleteReplyTitle => 'Delete reply';

  @override
  String get deleteIrreversible => 'This can\'t be undone.';

  @override
  String get acceptedBadge => 'Accepted';

  @override
  String get actionAccept => 'Accept';

  @override
  String get actionUnaccept => 'Remove acceptance';

  @override
  String get editThreadTitle => 'Edit question';

  @override
  String get fieldTitle => 'Title';

  @override
  String get fieldContent => 'Content';

  @override
  String get fieldAddTag => 'Add tag';

  @override
  String get editReplyTitle => 'Edit reply';

  @override
  String get fieldReply => 'Reply';

  @override
  String get replyHint => 'Write a reply…';

  @override
  String get replyRegisterPrompt => 'Sign up to reply in the community.';

  @override
  String get shareToChatTitle => 'Share to chat';

  @override
  String get shareToChatSubtitle =>
      'Sent as a card. Tapping it opens the question.';

  @override
  String get shareNoChats =>
      'You don\'t have chats yet. Open Chats and message someone first.';

  @override
  String get sharedPostLabel => 'Question';

  @override
  String sharedPostLabelAuthor(String name) {
    return 'Question · $name';
  }

  @override
  String get timeNow => 'now';

  @override
  String get timeMinutesOne => '1 min ago';

  @override
  String timeMinutesOther(int count) {
    return '$count min ago';
  }

  @override
  String get timeHoursOne => '1 h ago';

  @override
  String timeHoursOther(int count) {
    return '$count h ago';
  }

  @override
  String get timeYesterday => 'yesterday';

  @override
  String timeDays(int count) {
    return '$count d ago';
  }

  @override
  String get errNoPermission => 'You don\'t have permission for this action.';

  @override
  String get errGenericRetry => 'Something went wrong. Try again.';

  @override
  String get errForumNoPostPermission =>
      'You don\'t have permission to post in the community.';

  @override
  String get errForumTitleBodyRequired => 'Title and body are required.';

  @override
  String get errForumNeedTag => 'Add at least one tag.';

  @override
  String get errForumCantEditQuestion => 'You can\'t edit this question.';

  @override
  String get errForumNoReplyPermission =>
      'You don\'t have permission to reply.';

  @override
  String get errForumEmptyReply => 'The reply can\'t be empty.';

  @override
  String get errForumCantEditReply => 'You can\'t edit this reply.';

  @override
  String get errForumCantDeleteQuestion => 'You can\'t delete this question.';

  @override
  String get errForumCantDeleteReply => 'You can\'t delete this reply.';

  @override
  String get errForumOnlyAuthorAccept =>
      'Only the question author can accept replies.';

  @override
  String get errForumReplyNotOnThread =>
      'The reply doesn\'t belong to this question.';

  @override
  String get errForumRegisterToVote => 'Sign up to mark relevance.';

  @override
  String get errForumCantVoteOwnQuestion =>
      'You can\'t vote on your own question.';

  @override
  String get errForumCantVoteOwnReply => 'You can\'t vote on your own reply.';

  @override
  String get errChatCantChatSelf => 'You can\'t chat with yourself.';

  @override
  String get errChatEmptyMessage => 'Write a message.';

  @override
  String get errChatInvalidShare => 'The question to share isn\'t valid.';

  @override
  String get errChatNotMember => 'You\'re not a member of this chat.';

  @override
  String get errChatGone => 'This chat no longer exists.';

  @override
  String get errChatRegister => 'Sign up with an account to use chats.';

  @override
  String get errChatCannotCreateGroup =>
      'Only admins, instructors, and managers can create groups.';

  @override
  String get chatsTitle => 'Chats';

  @override
  String get chatsGuestPrompt =>
      'Sign up with an account to send and receive messages.';

  @override
  String get chatsEmptyTitle => 'You don\'t have chats yet';

  @override
  String get chatsEmptySubtitle => 'Tap + to message a teammate.';

  @override
  String get chatsSectionPinned => 'Pinned';

  @override
  String get chatsSectionRecent => 'Recent';

  @override
  String get chatsSectionCommunity => 'Community';

  @override
  String get chatsSectionSupport => 'Support';

  @override
  String get chatsDefaultGroupBadge => 'Community';

  @override
  String get chatsDefaultGroupTitle => 'Team';

  @override
  String get chatsSupportTitle => 'Support';

  @override
  String get chatsSupportBadge => 'AI + human';

  @override
  String get chatsNoMessagesYet => 'No messages yet';

  @override
  String get chatTypeGroup => 'Group';

  @override
  String get newGroupTitle => 'New group';

  @override
  String get newGroupNameLabel => 'Group name';

  @override
  String get newGroupNameHint => 'e.g. Miami cohort';

  @override
  String get newGroupMembersHeader => 'Members';

  @override
  String get newGroupCreate => 'Create group';

  @override
  String get newGroupNeedMembers => 'Pick at least one other member.';

  @override
  String get newGroupNeedTitle => 'Enter a group name.';

  @override
  String get newGroupTooMany => 'Groups can have at most 20 members.';

  @override
  String get newChatCreateGroup => 'Create a group';

  @override
  String get fabNewGroup => 'New group';

  @override
  String get chatTypePrivate => 'Private chat';

  @override
  String get newChatTitle => 'New chat';

  @override
  String get newChatEmpty =>
      'No other users yet. When someone signs up, they\'ll appear here.';

  @override
  String get newChatContactsHeader => 'CONTACTS';

  @override
  String get chatEmptyThread => 'Say hello. Messages sync live.';

  @override
  String get chatMessageHint => 'Write a message…';

  @override
  String get chatEmojiPicker => 'Emojis';

  @override
  String get chatReact => 'React';

  @override
  String get chatInfoTitle => 'Info';

  @override
  String get chatPin => 'Pin chat';

  @override
  String get chatUnpin => 'Unpin chat';

  @override
  String get chatDelete => 'Delete';

  @override
  String get chatDeleteConfirmTitle => 'Delete chat?';

  @override
  String get chatDeleteConfirmBody =>
      'This removes the chat from your inbox. It can come back if someone messages again.';

  @override
  String get chatDeleteConfirmAction => 'Delete';

  @override
  String get chatDeleteCancel => 'Cancel';

  @override
  String get chatDeleted => 'Chat deleted';

  @override
  String get chatPinned => 'Chat pinned';

  @override
  String get chatUnpinned => 'Chat unpinned';

  @override
  String get chatTimeYesterday => 'Yesterday';

  @override
  String get weekdayMon => 'Mon';

  @override
  String get weekdayTue => 'Tue';

  @override
  String get weekdayWed => 'Wed';

  @override
  String get weekdayThu => 'Thu';

  @override
  String get weekdayFri => 'Fri';

  @override
  String get weekdaySat => 'Sat';

  @override
  String get weekdaySun => 'Sun';

  @override
  String get aiNewConversation => 'New conversation';

  @override
  String get aiDemoReply =>
      'Demo reply. When we connect Gemini, you\'ll see real help here.';

  @override
  String get aiHistoryTooltip => 'History';

  @override
  String get aiNewTooltip => 'New';

  @override
  String get aiThinking => 'Thinking…';

  @override
  String get aiInputHint => 'Ask anything';

  @override
  String get aiEmptyPrompt => 'How can I help?';

  @override
  String get aiEmptySubtitle =>
      'Ask about benefits, courses, or community — demo replies for now.';

  @override
  String get aiAssistantSubtitle => 'Pulse AI';

  @override
  String get aiSettings => 'Settings';

  @override
  String get aiSettingsTitle => 'AI settings';

  @override
  String get aiModelSection => 'Model';

  @override
  String get aiModelName => 'Gemini';

  @override
  String get aiModelSubtitle => 'Coming soon via Firebase AI Logic';

  @override
  String get academyTitle => 'Academy';

  @override
  String get actionSearch => 'Search';

  @override
  String get academyMyLearning => 'My learning';

  @override
  String get academyPaths => 'Paths';

  @override
  String get academyCourses => 'Courses';

  @override
  String get academyCatalogDemo => 'Demo catalog — real courses coming soon.';

  @override
  String get searchCoursesHint => 'Search courses…';

  @override
  String get myLearningInProgress => 'In progress';

  @override
  String get myLearningEmpty => 'You don\'t have courses in progress yet.';

  @override
  String get courseDetailTitle => 'Course';

  @override
  String courseByTeacher(String name) {
    return 'By $name';
  }

  @override
  String courseStudents(String count) {
    return '$count students';
  }

  @override
  String get courseStart => 'Start course';

  @override
  String get courseContinue => 'Continue';

  @override
  String get courseAbout => 'About this course';

  @override
  String get courseAboutDemo =>
      'Demo content. Real modules will arrive when we connect the LMS.';

  @override
  String courseModule(int index) {
    return 'Module $index';
  }

  @override
  String get courseLessonsCount => '4 lessons';

  @override
  String get playerVideoSoon => 'Video coming soon';

  @override
  String get playerVideoSoonBody =>
      'The player will go here when content is ready.';

  @override
  String get playerClasses => 'Lessons';

  @override
  String playerClass(int index) {
    return 'Lesson $index';
  }

  @override
  String get levelBasic => 'Basic';

  @override
  String get levelIntermediate => 'Intermediate';

  @override
  String get levelAdvanced => 'Advanced';

  @override
  String get pathNewAgent => 'New agent';

  @override
  String get pathClosing => 'Sales closing';

  @override
  String get pathLeadership => 'Agency leadership';

  @override
  String pathMetaCoursesHours(int courses, int hours) {
    return '$courses courses · ${hours}h';
  }

  @override
  String profileBootstrapFailed(String error) {
    return 'Couldn\'t load the profile:\n$error';
  }

  @override
  String get profileBootstrapBack => 'Back to start';

  @override
  String get profilePulseEyebrow => 'Your Pulse';

  @override
  String get profileChangePhoto => 'Change photo';

  @override
  String get profileTapToAddPhoto => 'Tap to add a photo';

  @override
  String get profileQuickEdit => 'Edit';

  @override
  String get profileQuickSettings => 'Settings';

  @override
  String get profileDetailAgency => 'Agency';

  @override
  String get profileDetailNpn => 'NPN';

  @override
  String get profileDetailPhone => 'Phone';

  @override
  String get profileDetailEmail => 'Email';

  @override
  String get profileDetailAddress => 'Address';

  @override
  String get profileDossierEyebrow => 'Identity file';

  @override
  String get profileRoleLockedHint =>
      'Your account type is locked after setup. Contact an admin to become an agent.';

  @override
  String get fieldAddressStreet => 'Street address';

  @override
  String get fieldAddressApt => 'Apt / Suite';

  @override
  String get fieldAddressCity => 'City';

  @override
  String get fieldAddressState => 'State';

  @override
  String get fieldAddressZip => 'ZIP';

  @override
  String get validationAddressStreet => 'Enter your street address.';

  @override
  String get validationAddressCity => 'Enter your city.';

  @override
  String get validationAddressState => 'Use a 2-letter state code.';

  @override
  String get validationAddressZip => 'Enter a valid ZIP code.';

  @override
  String get editProfileRoleSection => 'Account type';

  @override
  String get editProfileBasicsSection => 'Basics';

  @override
  String get editProfileCredentialsSection => 'License & location';

  @override
  String get editProfileRoleFrozen =>
      'Chosen at signup — only an admin can change this.';

  @override
  String get settingsAdmin => 'Admin';

  @override
  String get settingsAdminHint => 'Promote students to agents.';

  @override
  String get settingsAdminPromote => 'Promote to agent';

  @override
  String get settingsAdminEmpty => 'No students waiting for promotion.';

  @override
  String get settingsAdminPromoteOk => 'Promoted to agent.';

  @override
  String settingsAdminPromoteFailed(String error) {
    return 'Couldn\'t promote: $error';
  }

  @override
  String get settingsAppearance => 'Appearance';

  @override
  String get settingsPreferences => 'Preferences';

  @override
  String get settingsAccount => 'Account';

  @override
  String get settingsThemeHint => 'Match the system or lock light / dark.';

  @override
  String get settingsLanguageHint => 'Interface language for Every Insurance.';

  @override
  String get settingsAccentStudio => 'Brand signal';

  @override
  String get settingsEditAccount => 'Edit account details';

  @override
  String get settingsSignOutHint => 'You\'ll need to sign in again to return.';
}
