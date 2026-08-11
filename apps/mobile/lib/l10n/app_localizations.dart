import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_es.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('es'),
  ];

  /// No description provided for @appTitle.
  ///
  /// In en, this message translates to:
  /// **'Every Insurance'**
  String get appTitle;

  /// No description provided for @navHome.
  ///
  /// In en, this message translates to:
  /// **'Home'**
  String get navHome;

  /// No description provided for @navChats.
  ///
  /// In en, this message translates to:
  /// **'Chats'**
  String get navChats;

  /// No description provided for @navAcademy.
  ///
  /// In en, this message translates to:
  /// **'Academy'**
  String get navAcademy;

  /// No description provided for @navProfile.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get navProfile;

  /// No description provided for @fabNewQuestion.
  ///
  /// In en, this message translates to:
  /// **'New question'**
  String get fabNewQuestion;

  /// No description provided for @fabNewChat.
  ///
  /// In en, this message translates to:
  /// **'New chat'**
  String get fabNewChat;

  /// No description provided for @fabSearchCourses.
  ///
  /// In en, this message translates to:
  /// **'Search courses'**
  String get fabSearchCourses;

  /// No description provided for @fabEditProfile.
  ///
  /// In en, this message translates to:
  /// **'Edit profile'**
  String get fabEditProfile;

  /// No description provided for @supportSheetTitle.
  ///
  /// In en, this message translates to:
  /// **'Support'**
  String get supportSheetTitle;

  /// No description provided for @supportSheetBody.
  ///
  /// In en, this message translates to:
  /// **'Need help with your account or the app? Email us and our team will get back to you.'**
  String get supportSheetBody;

  /// No description provided for @supportSheetEmail.
  ///
  /// In en, this message translates to:
  /// **'support@everybenefits.com'**
  String get supportSheetEmail;

  /// No description provided for @supportSheetEmailSubject.
  ///
  /// In en, this message translates to:
  /// **'Support request — Every Benefits'**
  String get supportSheetEmailSubject;

  /// No description provided for @supportSheetEmailFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t open your email app. You can write to support@everybenefits.com.'**
  String get supportSheetEmailFailed;

  /// No description provided for @supportSheetClose.
  ///
  /// In en, this message translates to:
  /// **'Close'**
  String get supportSheetClose;

  /// No description provided for @editProfileNameFrozen.
  ///
  /// In en, this message translates to:
  /// **'Your name is locked after setup.'**
  String get editProfileNameFrozen;

  /// No description provided for @editProfileNpnFrozen.
  ///
  /// In en, this message translates to:
  /// **'Your NPN is locked after setup.'**
  String get editProfileNpnFrozen;

  /// No description provided for @roleGuest.
  ///
  /// In en, this message translates to:
  /// **'Guest'**
  String get roleGuest;

  /// No description provided for @roleStudent.
  ///
  /// In en, this message translates to:
  /// **'Student'**
  String get roleStudent;

  /// No description provided for @roleAgent.
  ///
  /// In en, this message translates to:
  /// **'Agent'**
  String get roleAgent;

  /// No description provided for @roleInstructor.
  ///
  /// In en, this message translates to:
  /// **'Instructor'**
  String get roleInstructor;

  /// No description provided for @roleManager.
  ///
  /// In en, this message translates to:
  /// **'Manager'**
  String get roleManager;

  /// No description provided for @roleAdmin.
  ///
  /// In en, this message translates to:
  /// **'Admin'**
  String get roleAdmin;

  /// No description provided for @you.
  ///
  /// In en, this message translates to:
  /// **'You'**
  String get you;

  /// No description provided for @welcomeTagline.
  ///
  /// In en, this message translates to:
  /// **'The pulse of your professional community.'**
  String get welcomeTagline;

  /// No description provided for @welcomeEnter.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get welcomeEnter;

  /// No description provided for @welcomeGuest.
  ///
  /// In en, this message translates to:
  /// **'Continue as guest'**
  String get welcomeGuest;

  /// No description provided for @welcomeCreateAccount.
  ///
  /// In en, this message translates to:
  /// **'Create account'**
  String get welcomeCreateAccount;

  /// No description provided for @welcomePhone.
  ///
  /// In en, this message translates to:
  /// **'Phone'**
  String get welcomePhone;

  /// No description provided for @onboardingSkip.
  ///
  /// In en, this message translates to:
  /// **'Skip'**
  String get onboardingSkip;

  /// No description provided for @onboardingNext.
  ///
  /// In en, this message translates to:
  /// **'Next'**
  String get onboardingNext;

  /// No description provided for @onboardingGetStarted.
  ///
  /// In en, this message translates to:
  /// **'Get started'**
  String get onboardingGetStarted;

  /// No description provided for @onboardingCommunityTitle.
  ///
  /// In en, this message translates to:
  /// **'Learn out loud'**
  String get onboardingCommunityTitle;

  /// No description provided for @onboardingCommunityBody.
  ///
  /// In en, this message translates to:
  /// **'Ask questions, share wins, and grow with agents who do the same work you do.'**
  String get onboardingCommunityBody;

  /// No description provided for @onboardingChatsTitle.
  ///
  /// In en, this message translates to:
  /// **'Stay in the loop'**
  String get onboardingChatsTitle;

  /// No description provided for @onboardingChatsBody.
  ///
  /// In en, this message translates to:
  /// **'Direct messages and team groups keep mentorship and daily coordination in one place.'**
  String get onboardingChatsBody;

  /// No description provided for @onboardingAcademyTitle.
  ///
  /// In en, this message translates to:
  /// **'Level up your craft'**
  String get onboardingAcademyTitle;

  /// No description provided for @onboardingAcademyBody.
  ///
  /// In en, this message translates to:
  /// **'Paths and courses designed for insurance professionals — progress that actually sticks.'**
  String get onboardingAcademyBody;

  /// No description provided for @loginTitle.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get loginTitle;

  /// No description provided for @loginSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Access your professional agent community.'**
  String get loginSubtitle;

  /// No description provided for @fieldEmail.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get fieldEmail;

  /// No description provided for @validationEmail.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid email.'**
  String get validationEmail;

  /// No description provided for @fieldPassword.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get fieldPassword;

  /// No description provided for @loginForgotPassword.
  ///
  /// In en, this message translates to:
  /// **'Forgot your password?'**
  String get loginForgotPassword;

  /// No description provided for @loginSubmit.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get loginSubmit;

  /// No description provided for @loginMagicLink.
  ///
  /// In en, this message translates to:
  /// **'Sign in with magic link'**
  String get loginMagicLink;

  /// No description provided for @loginMagicLinkResend.
  ///
  /// In en, this message translates to:
  /// **'Resend magic link'**
  String get loginMagicLinkResend;

  /// No description provided for @loginMagicLinkInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid email for the magic link.'**
  String get loginMagicLinkInvalid;

  /// No description provided for @loginMagicLinkSent.
  ///
  /// In en, this message translates to:
  /// **'Link sent to {email}'**
  String loginMagicLinkSent(String email);

  /// No description provided for @loginNoAccount.
  ///
  /// In en, this message translates to:
  /// **'Don\'t have an account? Create one'**
  String get loginNoAccount;

  /// No description provided for @authDividerContinueWith.
  ///
  /// In en, this message translates to:
  /// **'or continue with'**
  String get authDividerContinueWith;

  /// No description provided for @authContinueGoogle.
  ///
  /// In en, this message translates to:
  /// **'Continue with Google'**
  String get authContinueGoogle;

  /// No description provided for @authContinuePhone.
  ///
  /// In en, this message translates to:
  /// **'Continue with phone'**
  String get authContinuePhone;

  /// No description provided for @registerTitle.
  ///
  /// In en, this message translates to:
  /// **'Create account'**
  String get registerTitle;

  /// No description provided for @registerSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Join as an agent and unlock the full community.'**
  String get registerSubtitle;

  /// No description provided for @fieldConfirmPassword.
  ///
  /// In en, this message translates to:
  /// **'Confirm password'**
  String get fieldConfirmPassword;

  /// No description provided for @validationPasswordsMismatch.
  ///
  /// In en, this message translates to:
  /// **'Passwords do not match.'**
  String get validationPasswordsMismatch;

  /// No description provided for @validationPasswordMin.
  ///
  /// In en, this message translates to:
  /// **'At least 6 characters.'**
  String get validationPasswordMin;

  /// No description provided for @registerSubmit.
  ///
  /// In en, this message translates to:
  /// **'Create account'**
  String get registerSubmit;

  /// No description provided for @registerHaveAccount.
  ///
  /// In en, this message translates to:
  /// **'Already have an account? Sign in'**
  String get registerHaveAccount;

  /// No description provided for @forgotTitle.
  ///
  /// In en, this message translates to:
  /// **'Recover access'**
  String get forgotTitle;

  /// No description provided for @forgotSubtitle.
  ///
  /// In en, this message translates to:
  /// **'We\'ll send a link to reset your password.'**
  String get forgotSubtitle;

  /// No description provided for @forgotSubtitleSent.
  ///
  /// In en, this message translates to:
  /// **'Check your email and follow the link to create a new password.'**
  String get forgotSubtitleSent;

  /// No description provided for @forgotSendLink.
  ///
  /// In en, this message translates to:
  /// **'Send link'**
  String get forgotSendLink;

  /// No description provided for @forgotResendLink.
  ///
  /// In en, this message translates to:
  /// **'Resend link'**
  String get forgotResendLink;

  /// No description provided for @forgotLinkSent.
  ///
  /// In en, this message translates to:
  /// **'We sent a link to {email}'**
  String forgotLinkSent(String email);

  /// No description provided for @phoneTitle.
  ///
  /// In en, this message translates to:
  /// **'Phone'**
  String get phoneTitle;

  /// No description provided for @phoneCodeTitle.
  ///
  /// In en, this message translates to:
  /// **'SMS code'**
  String get phoneCodeTitle;

  /// No description provided for @phoneSubtitleCode.
  ///
  /// In en, this message translates to:
  /// **'Enter the code we sent to {phone}.'**
  String phoneSubtitleCode(String phone);

  /// No description provided for @fieldPhoneNumber.
  ///
  /// In en, this message translates to:
  /// **'Phone number'**
  String get fieldPhoneNumber;

  /// No description provided for @validationPhoneCountry.
  ///
  /// In en, this message translates to:
  /// **'Include the country code (+…)'**
  String get validationPhoneCountry;

  /// No description provided for @phoneSendCode.
  ///
  /// In en, this message translates to:
  /// **'Send code'**
  String get phoneSendCode;

  /// No description provided for @fieldVerificationCode.
  ///
  /// In en, this message translates to:
  /// **'Verification code'**
  String get fieldVerificationCode;

  /// No description provided for @phoneVerifyEnter.
  ///
  /// In en, this message translates to:
  /// **'Verify and sign in'**
  String get phoneVerifyEnter;

  /// No description provided for @phoneChangeNumber.
  ///
  /// In en, this message translates to:
  /// **'Change number'**
  String get phoneChangeNumber;

  /// No description provided for @phoneResendCode.
  ///
  /// In en, this message translates to:
  /// **'Resend code'**
  String get phoneResendCode;

  /// No description provided for @phoneSmsSent.
  ///
  /// In en, this message translates to:
  /// **'SMS code sent'**
  String get phoneSmsSent;

  /// No description provided for @validationSmsCode.
  ///
  /// In en, this message translates to:
  /// **'Enter the 6-digit code.'**
  String get validationSmsCode;

  /// No description provided for @authErrInvalidEmail.
  ///
  /// In en, this message translates to:
  /// **'The email is not valid.'**
  String get authErrInvalidEmail;

  /// No description provided for @authErrUserDisabled.
  ///
  /// In en, this message translates to:
  /// **'This account is disabled.'**
  String get authErrUserDisabled;

  /// No description provided for @authErrUserNotFound.
  ///
  /// In en, this message translates to:
  /// **'We couldn\'t find an account with that email.'**
  String get authErrUserNotFound;

  /// No description provided for @authErrWrongPassword.
  ///
  /// In en, this message translates to:
  /// **'Incorrect email or password.'**
  String get authErrWrongPassword;

  /// No description provided for @authErrEmailInUse.
  ///
  /// In en, this message translates to:
  /// **'An account with that email already exists.'**
  String get authErrEmailInUse;

  /// No description provided for @authErrWeakPassword.
  ///
  /// In en, this message translates to:
  /// **'Password is too weak (min. 6 characters).'**
  String get authErrWeakPassword;

  /// No description provided for @authErrTooManyRequests.
  ///
  /// In en, this message translates to:
  /// **'Too many attempts. Wait a moment and try again.'**
  String get authErrTooManyRequests;

  /// No description provided for @authErrNetwork.
  ///
  /// In en, this message translates to:
  /// **'No connection. Check your network and try again.'**
  String get authErrNetwork;

  /// No description provided for @authErrEmulatorUnreachable.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t reach Firebase. Are the local emulators running?'**
  String get authErrEmulatorUnreachable;

  /// No description provided for @authErrPermission.
  ///
  /// In en, this message translates to:
  /// **'You don\'t have permission for this action.'**
  String get authErrPermission;

  /// No description provided for @authErrInvalidPhone.
  ///
  /// In en, this message translates to:
  /// **'Invalid phone number. Use international format (+1…).'**
  String get authErrInvalidPhone;

  /// No description provided for @authErrInvalidSms.
  ///
  /// In en, this message translates to:
  /// **'The SMS code is invalid.'**
  String get authErrInvalidSms;

  /// No description provided for @authErrSmsExpired.
  ///
  /// In en, this message translates to:
  /// **'The code expired. Request a new one.'**
  String get authErrSmsExpired;

  /// No description provided for @authErrOpNotAllowed.
  ///
  /// In en, this message translates to:
  /// **'This sign-in method is not enabled.'**
  String get authErrOpNotAllowed;

  /// No description provided for @authErrRequiresRecentLogin.
  ///
  /// In en, this message translates to:
  /// **'For security, sign in again and retry.'**
  String get authErrRequiresRecentLogin;

  /// No description provided for @authErrEmailRequired.
  ///
  /// In en, this message translates to:
  /// **'Your account needs an email to set a password.'**
  String get authErrEmailRequired;

  /// No description provided for @authErrUnauthenticated.
  ///
  /// In en, this message translates to:
  /// **'Sign in to continue.'**
  String get authErrUnauthenticated;

  /// No description provided for @authErrCredentialInUse.
  ///
  /// In en, this message translates to:
  /// **'That credential is already linked to another account.'**
  String get authErrCredentialInUse;

  /// No description provided for @authErrUnknown.
  ///
  /// In en, this message translates to:
  /// **'Authentication failed ({code}).'**
  String authErrUnknown(String code);

  /// No description provided for @setPasswordTitle.
  ///
  /// In en, this message translates to:
  /// **'Set a backup password'**
  String get setPasswordTitle;

  /// No description provided for @setPasswordSubtitle.
  ///
  /// In en, this message translates to:
  /// **'If you lose access to Google, you can still sign in with email and this password.'**
  String get setPasswordSubtitle;

  /// No description provided for @setPasswordSave.
  ///
  /// In en, this message translates to:
  /// **'Save password'**
  String get setPasswordSave;

  /// No description provided for @setPasswordMismatch.
  ///
  /// In en, this message translates to:
  /// **'Passwords don\'t match.'**
  String get setPasswordMismatch;

  /// No description provided for @mfaTitle.
  ///
  /// In en, this message translates to:
  /// **'Two-step verification'**
  String get mfaTitle;

  /// No description provided for @mfaSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Enter the code from your authenticator or SMS.'**
  String get mfaSubtitle;

  /// No description provided for @mfaChooseFactor.
  ///
  /// In en, this message translates to:
  /// **'Choose a verification method'**
  String get mfaChooseFactor;

  /// No description provided for @mfaTotpLabel.
  ///
  /// In en, this message translates to:
  /// **'Authenticator app'**
  String get mfaTotpLabel;

  /// No description provided for @mfaSmsLabel.
  ///
  /// In en, this message translates to:
  /// **'Text message'**
  String get mfaSmsLabel;

  /// No description provided for @mfaCodeLabel.
  ///
  /// In en, this message translates to:
  /// **'Verification code'**
  String get mfaCodeLabel;

  /// No description provided for @mfaVerify.
  ///
  /// In en, this message translates to:
  /// **'Verify'**
  String get mfaVerify;

  /// No description provided for @mfaSendSms.
  ///
  /// In en, this message translates to:
  /// **'Send SMS code'**
  String get mfaSendSms;

  /// No description provided for @settingsSecurity.
  ///
  /// In en, this message translates to:
  /// **'Security'**
  String get settingsSecurity;

  /// No description provided for @settingsSecurityHint.
  ///
  /// In en, this message translates to:
  /// **'Password and two-step verification.'**
  String get settingsSecurityHint;

  /// No description provided for @securitySetPassword.
  ///
  /// In en, this message translates to:
  /// **'Set password'**
  String get securitySetPassword;

  /// No description provided for @securityChangePassword.
  ///
  /// In en, this message translates to:
  /// **'Change password'**
  String get securityChangePassword;

  /// No description provided for @securityCurrentPassword.
  ///
  /// In en, this message translates to:
  /// **'Current password'**
  String get securityCurrentPassword;

  /// No description provided for @securityNewPassword.
  ///
  /// In en, this message translates to:
  /// **'New password'**
  String get securityNewPassword;

  /// No description provided for @securityPasswordSaved.
  ///
  /// In en, this message translates to:
  /// **'Password updated.'**
  String get securityPasswordSaved;

  /// No description provided for @securityMfaTitle.
  ///
  /// In en, this message translates to:
  /// **'Two-step verification'**
  String get securityMfaTitle;

  /// No description provided for @securityMfaHint.
  ///
  /// In en, this message translates to:
  /// **'Add SMS or an authenticator app as a second factor.'**
  String get securityMfaHint;

  /// No description provided for @securityEnrollTotp.
  ///
  /// In en, this message translates to:
  /// **'Add authenticator'**
  String get securityEnrollTotp;

  /// No description provided for @securityEnrollSms.
  ///
  /// In en, this message translates to:
  /// **'Add phone (SMS)'**
  String get securityEnrollSms;

  /// No description provided for @securityTotpScan.
  ///
  /// In en, this message translates to:
  /// **'Scan this QR code in your authenticator app, then enter the 6-digit code.'**
  String get securityTotpScan;

  /// No description provided for @securityTotpSecret.
  ///
  /// In en, this message translates to:
  /// **'Or enter this key manually'**
  String get securityTotpSecret;

  /// No description provided for @securityPhoneHint.
  ///
  /// In en, this message translates to:
  /// **'Phone number (E.164, e.g. +15551234567)'**
  String get securityPhoneHint;

  /// No description provided for @securityFactorRemove.
  ///
  /// In en, this message translates to:
  /// **'Remove'**
  String get securityFactorRemove;

  /// No description provided for @securityFactorRemoved.
  ///
  /// In en, this message translates to:
  /// **'Second factor removed.'**
  String get securityFactorRemoved;

  /// No description provided for @securityFactorAdded.
  ///
  /// In en, this message translates to:
  /// **'Second factor added.'**
  String get securityFactorAdded;

  /// No description provided for @securityNoFactors.
  ///
  /// In en, this message translates to:
  /// **'No second factors enrolled yet.'**
  String get securityNoFactors;

  /// No description provided for @securityReauthHint.
  ///
  /// In en, this message translates to:
  /// **'Confirm your password to continue.'**
  String get securityReauthHint;

  /// No description provided for @profileCompleteRoleTitle.
  ///
  /// In en, this message translates to:
  /// **'Your role'**
  String get profileCompleteRoleTitle;

  /// No description provided for @profileCompleteDataTitle.
  ///
  /// In en, this message translates to:
  /// **'Your details'**
  String get profileCompleteDataTitle;

  /// No description provided for @profileCompleteSignOut.
  ///
  /// In en, this message translates to:
  /// **'Sign out'**
  String get profileCompleteSignOut;

  /// No description provided for @profileCompleteHeadline.
  ///
  /// In en, this message translates to:
  /// **'How does\nyour Pulse beat?'**
  String get profileCompleteHeadline;

  /// No description provided for @profileCompleteSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Choose how you participate. You can change it later.'**
  String get profileCompleteSubtitle;

  /// No description provided for @profileCompleteAgentTitle.
  ///
  /// In en, this message translates to:
  /// **'I\'m an agent'**
  String get profileCompleteAgentTitle;

  /// No description provided for @profileCompleteAgentSubtitle.
  ///
  /// In en, this message translates to:
  /// **'NPN, agency, and professional community'**
  String get profileCompleteAgentSubtitle;

  /// No description provided for @profileCompleteStudentTitle.
  ///
  /// In en, this message translates to:
  /// **'I\'m a student'**
  String get profileCompleteStudentTitle;

  /// No description provided for @profileCompleteStudentSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Campus, practice, and networking'**
  String get profileCompleteStudentSubtitle;

  /// No description provided for @actionContinue.
  ///
  /// In en, this message translates to:
  /// **'Continue'**
  String get actionContinue;

  /// No description provided for @profileCompleteChangeRole.
  ///
  /// In en, this message translates to:
  /// **'← Change role'**
  String get profileCompleteChangeRole;

  /// No description provided for @profileCompleteTellMore.
  ///
  /// In en, this message translates to:
  /// **'Tell us a bit more'**
  String get profileCompleteTellMore;

  /// No description provided for @profileCompleteFinish.
  ///
  /// In en, this message translates to:
  /// **'Finish'**
  String get profileCompleteFinish;

  /// No description provided for @profileSaveFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t save the profile.'**
  String get profileSaveFailed;

  /// No description provided for @fieldFullName.
  ///
  /// In en, this message translates to:
  /// **'Full name'**
  String get fieldFullName;

  /// No description provided for @fieldGivenName.
  ///
  /// In en, this message translates to:
  /// **'First name'**
  String get fieldGivenName;

  /// No description provided for @fieldFamilyName.
  ///
  /// In en, this message translates to:
  /// **'Last name'**
  String get fieldFamilyName;

  /// No description provided for @validationName.
  ///
  /// In en, this message translates to:
  /// **'Enter your name.'**
  String get validationName;

  /// No description provided for @validationNameEmail.
  ///
  /// In en, this message translates to:
  /// **'Use your real name, not your email.'**
  String get validationNameEmail;

  /// No description provided for @validationNameLast.
  ///
  /// In en, this message translates to:
  /// **'Include your last name.'**
  String get validationNameLast;

  /// No description provided for @validationNameShort.
  ///
  /// In en, this message translates to:
  /// **'First and last name need at least 2 letters (middle initials like A are fine).'**
  String get validationNameShort;

  /// No description provided for @countryCodePickerTitle.
  ///
  /// In en, this message translates to:
  /// **'Country / code'**
  String get countryCodePickerTitle;

  /// No description provided for @fieldPhone.
  ///
  /// In en, this message translates to:
  /// **'Phone'**
  String get fieldPhone;

  /// No description provided for @validationPhone.
  ///
  /// In en, this message translates to:
  /// **'Invalid number.'**
  String get validationPhone;

  /// No description provided for @fieldNpn.
  ///
  /// In en, this message translates to:
  /// **'NPN'**
  String get fieldNpn;

  /// No description provided for @fieldNpnHint.
  ///
  /// In en, this message translates to:
  /// **'National Producer Number'**
  String get fieldNpnHint;

  /// No description provided for @validationNpn.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid NPN.'**
  String get validationNpn;

  /// No description provided for @fieldAddress.
  ///
  /// In en, this message translates to:
  /// **'Address'**
  String get fieldAddress;

  /// No description provided for @validationAddress.
  ///
  /// In en, this message translates to:
  /// **'Enter your address.'**
  String get validationAddress;

  /// No description provided for @fieldAgency.
  ///
  /// In en, this message translates to:
  /// **'Agency'**
  String get fieldAgency;

  /// No description provided for @fieldAgencyHelper.
  ///
  /// In en, this message translates to:
  /// **'Default: Every Benefits'**
  String get fieldAgencyHelper;

  /// No description provided for @validationAgency.
  ///
  /// In en, this message translates to:
  /// **'Enter the agency.'**
  String get validationAgency;

  /// No description provided for @editProfileTitle.
  ///
  /// In en, this message translates to:
  /// **'Edit profile'**
  String get editProfileTitle;

  /// No description provided for @editProfileAccountType.
  ///
  /// In en, this message translates to:
  /// **'Account type'**
  String get editProfileAccountType;

  /// No description provided for @editProfileAgentSubtitle.
  ///
  /// In en, this message translates to:
  /// **'NPN, address, and agency'**
  String get editProfileAgentSubtitle;

  /// No description provided for @editProfileStudentSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Name and phone'**
  String get editProfileStudentSubtitle;

  /// No description provided for @editProfileSave.
  ///
  /// In en, this message translates to:
  /// **'Save changes'**
  String get editProfileSave;

  /// No description provided for @editProfileUpdateFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t update: {error}'**
  String editProfileUpdateFailed(String error);

  /// No description provided for @profileTitle.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get profileTitle;

  /// No description provided for @profileSettingsTooltip.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get profileSettingsTooltip;

  /// No description provided for @profileBioGuest.
  ///
  /// In en, this message translates to:
  /// **'Guest on Every Insurance. Join to post.'**
  String get profileBioGuest;

  /// No description provided for @profileBioMember.
  ///
  /// In en, this message translates to:
  /// **'Community · Academy · Chats'**
  String get profileBioMember;

  /// No description provided for @profileAddPhoto.
  ///
  /// In en, this message translates to:
  /// **'Add profile photo'**
  String get profileAddPhoto;

  /// No description provided for @profilePickGallery.
  ///
  /// In en, this message translates to:
  /// **'Choose from gallery'**
  String get profilePickGallery;

  /// No description provided for @profileTakePhoto.
  ///
  /// In en, this message translates to:
  /// **'Take photo'**
  String get profileTakePhoto;

  /// No description provided for @profilePickImageFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t pick image: {error}'**
  String profilePickImageFailed(String error);

  /// No description provided for @profileUploadFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t upload photo: {error}'**
  String profileUploadFailed(String error);

  /// No description provided for @settingsTitle.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get settingsTitle;

  /// No description provided for @settingsYourInfo.
  ///
  /// In en, this message translates to:
  /// **'Your information'**
  String get settingsYourInfo;

  /// No description provided for @settingsLabelName.
  ///
  /// In en, this message translates to:
  /// **'Name'**
  String get settingsLabelName;

  /// No description provided for @settingsLabelEmail.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get settingsLabelEmail;

  /// No description provided for @settingsNoEmail.
  ///
  /// In en, this message translates to:
  /// **'No email linked'**
  String get settingsNoEmail;

  /// No description provided for @settingsTheme.
  ///
  /// In en, this message translates to:
  /// **'Theme'**
  String get settingsTheme;

  /// No description provided for @themeModeAuto.
  ///
  /// In en, this message translates to:
  /// **'Auto'**
  String get themeModeAuto;

  /// No description provided for @themeModeLight.
  ///
  /// In en, this message translates to:
  /// **'Light'**
  String get themeModeLight;

  /// No description provided for @themeModeDark.
  ///
  /// In en, this message translates to:
  /// **'Dark'**
  String get themeModeDark;

  /// No description provided for @settingsLanguage.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get settingsLanguage;

  /// No description provided for @settingsLanguageSystem.
  ///
  /// In en, this message translates to:
  /// **'System'**
  String get settingsLanguageSystem;

  /// No description provided for @settingsLanguageEnglish.
  ///
  /// In en, this message translates to:
  /// **'English'**
  String get settingsLanguageEnglish;

  /// No description provided for @settingsLanguageSpanish.
  ///
  /// In en, this message translates to:
  /// **'Spanish'**
  String get settingsLanguageSpanish;

  /// No description provided for @settingsAccentColor.
  ///
  /// In en, this message translates to:
  /// **'Accent color'**
  String get settingsAccentColor;

  /// No description provided for @settingsAccentHint.
  ///
  /// In en, this message translates to:
  /// **'Applies to buttons, tabs, and accents across the app.'**
  String get settingsAccentHint;

  /// No description provided for @settingsSignOut.
  ///
  /// In en, this message translates to:
  /// **'Sign out'**
  String get settingsSignOut;

  /// No description provided for @seedGreen.
  ///
  /// In en, this message translates to:
  /// **'Green'**
  String get seedGreen;

  /// No description provided for @seedAmber.
  ///
  /// In en, this message translates to:
  /// **'Amber'**
  String get seedAmber;

  /// No description provided for @seedTeal.
  ///
  /// In en, this message translates to:
  /// **'Teal'**
  String get seedTeal;

  /// No description provided for @seedBlue.
  ///
  /// In en, this message translates to:
  /// **'Blue'**
  String get seedBlue;

  /// No description provided for @seedViolet.
  ///
  /// In en, this message translates to:
  /// **'Violet'**
  String get seedViolet;

  /// No description provided for @seedRose.
  ///
  /// In en, this message translates to:
  /// **'Rose'**
  String get seedRose;

  /// No description provided for @forumsTitle.
  ///
  /// In en, this message translates to:
  /// **'Home'**
  String get forumsTitle;

  /// No description provided for @forumsSearchHint.
  ///
  /// In en, this message translates to:
  /// **'Search questions…'**
  String get forumsSearchHint;

  /// No description provided for @forumsSearchOpen.
  ///
  /// In en, this message translates to:
  /// **'Search questions'**
  String get forumsSearchOpen;

  /// No description provided for @forumsSearchClose.
  ///
  /// In en, this message translates to:
  /// **'Close search'**
  String get forumsSearchClose;

  /// No description provided for @forumsSortTooltip.
  ///
  /// In en, this message translates to:
  /// **'Sort'**
  String get forumsSortTooltip;

  /// No description provided for @forumsSortRecent.
  ///
  /// In en, this message translates to:
  /// **'Most recent'**
  String get forumsSortRecent;

  /// No description provided for @forumsSortRelevant.
  ///
  /// In en, this message translates to:
  /// **'Most relevant'**
  String get forumsSortRelevant;

  /// No description provided for @forumsFilterMine.
  ///
  /// In en, this message translates to:
  /// **'Mine'**
  String get forumsFilterMine;

  /// No description provided for @forumsFilterRelevant.
  ///
  /// In en, this message translates to:
  /// **'Relevant'**
  String get forumsFilterRelevant;

  /// No description provided for @forumsFilterRecent.
  ///
  /// In en, this message translates to:
  /// **'Recent'**
  String get forumsFilterRecent;

  /// No description provided for @forumsClearFilters.
  ///
  /// In en, this message translates to:
  /// **'Clear'**
  String get forumsClearFilters;

  /// No description provided for @forumsReadOnlyBanner.
  ///
  /// In en, this message translates to:
  /// **'Read-only — sign up to post.'**
  String get forumsReadOnlyBanner;

  /// No description provided for @forumsFilterYourQuestions.
  ///
  /// In en, this message translates to:
  /// **'Your questions'**
  String get forumsFilterYourQuestions;

  /// No description provided for @forumsFilterSearchLoaded.
  ///
  /// In en, this message translates to:
  /// **'search in loaded results'**
  String get forumsFilterSearchLoaded;

  /// No description provided for @forumsLoadErrorTitle.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load'**
  String get forumsLoadErrorTitle;

  /// No description provided for @actionRetry.
  ///
  /// In en, this message translates to:
  /// **'Retry'**
  String get actionRetry;

  /// No description provided for @forumsEmptyMineTitle.
  ///
  /// In en, this message translates to:
  /// **'You haven\'t asked yet'**
  String get forumsEmptyMineTitle;

  /// No description provided for @forumsEmptyFeedTitle.
  ///
  /// In en, this message translates to:
  /// **'The feed is quiet'**
  String get forumsEmptyFeedTitle;

  /// No description provided for @forumsEmptyMineSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Post your first question to see it here.'**
  String get forumsEmptyMineSubtitle;

  /// No description provided for @forumsEmptyFeedSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Be the first to post a question.'**
  String get forumsEmptyFeedSubtitle;

  /// No description provided for @forumsNoMatchesTitle.
  ///
  /// In en, this message translates to:
  /// **'No matches'**
  String get forumsNoMatchesTitle;

  /// No description provided for @forumsNoMatchesQuery.
  ///
  /// In en, this message translates to:
  /// **'No questions for “{query}”.'**
  String forumsNoMatchesQuery(String query);

  /// No description provided for @forumsNoMatchesFilter.
  ///
  /// In en, this message translates to:
  /// **'Try another filter or tag.'**
  String get forumsNoMatchesFilter;

  /// No description provided for @forumsLoadMore.
  ///
  /// In en, this message translates to:
  /// **'Load more'**
  String get forumsLoadMore;

  /// No description provided for @composerAskCommunity.
  ///
  /// In en, this message translates to:
  /// **'Ask the community a question'**
  String get composerAskCommunity;

  /// No description provided for @composerAskHint.
  ///
  /// In en, this message translates to:
  /// **'NPN, products, sales… someone may have solved it already.'**
  String get composerAskHint;

  /// No description provided for @createThreadTitle.
  ///
  /// In en, this message translates to:
  /// **'New post'**
  String get createThreadTitle;

  /// No description provided for @createFieldQuestion.
  ///
  /// In en, this message translates to:
  /// **'Question'**
  String get createFieldQuestion;

  /// No description provided for @createQuestionHint.
  ///
  /// In en, this message translates to:
  /// **'What do you need to solve?'**
  String get createQuestionHint;

  /// No description provided for @validationTitleShort.
  ///
  /// In en, this message translates to:
  /// **'Write a more descriptive title.'**
  String get validationTitleShort;

  /// No description provided for @createFieldContext.
  ///
  /// In en, this message translates to:
  /// **'Context'**
  String get createFieldContext;

  /// No description provided for @createContextHint.
  ///
  /// In en, this message translates to:
  /// **'Details, what you already tried, and the expected result…'**
  String get createContextHint;

  /// No description provided for @validationBodyShort.
  ///
  /// In en, this message translates to:
  /// **'Add a bit more context.'**
  String get validationBodyShort;

  /// No description provided for @createTopics.
  ///
  /// In en, this message translates to:
  /// **'Topics'**
  String get createTopics;

  /// No description provided for @createTopicsHelp.
  ///
  /// In en, this message translates to:
  /// **'Up to 5 tags so others can find your question.'**
  String get createTopicsHelp;

  /// No description provided for @fieldTag.
  ///
  /// In en, this message translates to:
  /// **'Tag'**
  String get fieldTag;

  /// No description provided for @fieldTagHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. npn'**
  String get fieldTagHint;

  /// No description provided for @actionAdd.
  ///
  /// In en, this message translates to:
  /// **'Add'**
  String get actionAdd;

  /// No description provided for @createFrequentTopics.
  ///
  /// In en, this message translates to:
  /// **'Popular topics'**
  String get createFrequentTopics;

  /// No description provided for @actionPublish.
  ///
  /// In en, this message translates to:
  /// **'Publish'**
  String get actionPublish;

  /// No description provided for @createMaxTags.
  ///
  /// In en, this message translates to:
  /// **'Maximum 5 tags per thread.'**
  String get createMaxTags;

  /// No description provided for @createNeedTag.
  ///
  /// In en, this message translates to:
  /// **'Add at least one tag.'**
  String get createNeedTag;

  /// No description provided for @actionReply.
  ///
  /// In en, this message translates to:
  /// **'Reply'**
  String get actionReply;

  /// No description provided for @actionShareChats.
  ///
  /// In en, this message translates to:
  /// **'Chats'**
  String get actionShareChats;

  /// No description provided for @replyCountOne.
  ///
  /// In en, this message translates to:
  /// **'1 reply'**
  String get replyCountOne;

  /// No description provided for @replyCountOther.
  ///
  /// In en, this message translates to:
  /// **'{count} replies'**
  String replyCountOther(int count);

  /// No description provided for @actionLike.
  ///
  /// In en, this message translates to:
  /// **'Like'**
  String get actionLike;

  /// No description provided for @relevanceLabel.
  ///
  /// In en, this message translates to:
  /// **'Relevance'**
  String get relevanceLabel;

  /// No description provided for @relevanceScoreShort.
  ///
  /// In en, this message translates to:
  /// **'{score} relev.'**
  String relevanceScoreShort(int score);

  /// No description provided for @relevanceUpTooltip.
  ///
  /// In en, this message translates to:
  /// **'More relevant'**
  String get relevanceUpTooltip;

  /// No description provided for @relevanceDownTooltip.
  ///
  /// In en, this message translates to:
  /// **'Less relevant'**
  String get relevanceDownTooltip;

  /// No description provided for @threadFallbackTitle.
  ///
  /// In en, this message translates to:
  /// **'Question'**
  String get threadFallbackTitle;

  /// No description provided for @threadShareTooltip.
  ///
  /// In en, this message translates to:
  /// **'Share to chat'**
  String get threadShareTooltip;

  /// No description provided for @threadNotFoundTitle.
  ///
  /// In en, this message translates to:
  /// **'Question not found'**
  String get threadNotFoundTitle;

  /// No description provided for @threadNotFoundSubtitle.
  ///
  /// In en, this message translates to:
  /// **'It may have been deleted.'**
  String get threadNotFoundSubtitle;

  /// No description provided for @threadSortedByRelevance.
  ///
  /// In en, this message translates to:
  /// **'Sorted by relevance'**
  String get threadSortedByRelevance;

  /// No description provided for @threadFirstToReply.
  ///
  /// In en, this message translates to:
  /// **'Be the first to reply.'**
  String get threadFirstToReply;

  /// No description provided for @actionOptions.
  ///
  /// In en, this message translates to:
  /// **'Options'**
  String get actionOptions;

  /// No description provided for @actionEdit.
  ///
  /// In en, this message translates to:
  /// **'Edit'**
  String get actionEdit;

  /// No description provided for @actionDelete.
  ///
  /// In en, this message translates to:
  /// **'Delete'**
  String get actionDelete;

  /// No description provided for @actionCancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get actionCancel;

  /// No description provided for @actionSave.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get actionSave;

  /// No description provided for @deleteThreadTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete question'**
  String get deleteThreadTitle;

  /// No description provided for @deleteReplyTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete reply'**
  String get deleteReplyTitle;

  /// No description provided for @deleteIrreversible.
  ///
  /// In en, this message translates to:
  /// **'This can\'t be undone.'**
  String get deleteIrreversible;

  /// No description provided for @acceptedBadge.
  ///
  /// In en, this message translates to:
  /// **'Accepted'**
  String get acceptedBadge;

  /// No description provided for @actionAccept.
  ///
  /// In en, this message translates to:
  /// **'Accept'**
  String get actionAccept;

  /// No description provided for @actionUnaccept.
  ///
  /// In en, this message translates to:
  /// **'Remove acceptance'**
  String get actionUnaccept;

  /// No description provided for @editThreadTitle.
  ///
  /// In en, this message translates to:
  /// **'Edit question'**
  String get editThreadTitle;

  /// No description provided for @fieldTitle.
  ///
  /// In en, this message translates to:
  /// **'Title'**
  String get fieldTitle;

  /// No description provided for @fieldContent.
  ///
  /// In en, this message translates to:
  /// **'Content'**
  String get fieldContent;

  /// No description provided for @fieldAddTag.
  ///
  /// In en, this message translates to:
  /// **'Add tag'**
  String get fieldAddTag;

  /// No description provided for @editReplyTitle.
  ///
  /// In en, this message translates to:
  /// **'Edit reply'**
  String get editReplyTitle;

  /// No description provided for @fieldReply.
  ///
  /// In en, this message translates to:
  /// **'Reply'**
  String get fieldReply;

  /// No description provided for @replyHint.
  ///
  /// In en, this message translates to:
  /// **'Write a reply…'**
  String get replyHint;

  /// No description provided for @replyRegisterPrompt.
  ///
  /// In en, this message translates to:
  /// **'Sign up to reply in the community.'**
  String get replyRegisterPrompt;

  /// No description provided for @shareToChatTitle.
  ///
  /// In en, this message translates to:
  /// **'Share to chat'**
  String get shareToChatTitle;

  /// No description provided for @shareToChatSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Sent as a card. Tapping it opens the question.'**
  String get shareToChatSubtitle;

  /// No description provided for @shareNoChats.
  ///
  /// In en, this message translates to:
  /// **'You don\'t have chats yet. Open Chats and message someone first.'**
  String get shareNoChats;

  /// No description provided for @sharedPostLabel.
  ///
  /// In en, this message translates to:
  /// **'Question'**
  String get sharedPostLabel;

  /// No description provided for @sharedPostLabelAuthor.
  ///
  /// In en, this message translates to:
  /// **'Question · {name}'**
  String sharedPostLabelAuthor(String name);

  /// No description provided for @timeNow.
  ///
  /// In en, this message translates to:
  /// **'now'**
  String get timeNow;

  /// No description provided for @timeMinutesOne.
  ///
  /// In en, this message translates to:
  /// **'1 min ago'**
  String get timeMinutesOne;

  /// No description provided for @timeMinutesOther.
  ///
  /// In en, this message translates to:
  /// **'{count} min ago'**
  String timeMinutesOther(int count);

  /// No description provided for @timeHoursOne.
  ///
  /// In en, this message translates to:
  /// **'1 h ago'**
  String get timeHoursOne;

  /// No description provided for @timeHoursOther.
  ///
  /// In en, this message translates to:
  /// **'{count} h ago'**
  String timeHoursOther(int count);

  /// No description provided for @timeYesterday.
  ///
  /// In en, this message translates to:
  /// **'yesterday'**
  String get timeYesterday;

  /// No description provided for @timeDays.
  ///
  /// In en, this message translates to:
  /// **'{count} d ago'**
  String timeDays(int count);

  /// No description provided for @errNoPermission.
  ///
  /// In en, this message translates to:
  /// **'You don\'t have permission for this action.'**
  String get errNoPermission;

  /// No description provided for @errGenericRetry.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong. Try again.'**
  String get errGenericRetry;

  /// No description provided for @errForumNoPostPermission.
  ///
  /// In en, this message translates to:
  /// **'You don\'t have permission to post in the community.'**
  String get errForumNoPostPermission;

  /// No description provided for @errForumTitleBodyRequired.
  ///
  /// In en, this message translates to:
  /// **'Title and body are required.'**
  String get errForumTitleBodyRequired;

  /// No description provided for @errForumNeedTag.
  ///
  /// In en, this message translates to:
  /// **'Add at least one tag.'**
  String get errForumNeedTag;

  /// No description provided for @errForumCantEditQuestion.
  ///
  /// In en, this message translates to:
  /// **'You can\'t edit this question.'**
  String get errForumCantEditQuestion;

  /// No description provided for @errForumNoReplyPermission.
  ///
  /// In en, this message translates to:
  /// **'You don\'t have permission to reply.'**
  String get errForumNoReplyPermission;

  /// No description provided for @errForumEmptyReply.
  ///
  /// In en, this message translates to:
  /// **'The reply can\'t be empty.'**
  String get errForumEmptyReply;

  /// No description provided for @errForumCantEditReply.
  ///
  /// In en, this message translates to:
  /// **'You can\'t edit this reply.'**
  String get errForumCantEditReply;

  /// No description provided for @errForumCantDeleteQuestion.
  ///
  /// In en, this message translates to:
  /// **'You can\'t delete this question.'**
  String get errForumCantDeleteQuestion;

  /// No description provided for @errForumCantDeleteReply.
  ///
  /// In en, this message translates to:
  /// **'You can\'t delete this reply.'**
  String get errForumCantDeleteReply;

  /// No description provided for @errForumOnlyAuthorAccept.
  ///
  /// In en, this message translates to:
  /// **'Only the question author can accept replies.'**
  String get errForumOnlyAuthorAccept;

  /// No description provided for @errForumReplyNotOnThread.
  ///
  /// In en, this message translates to:
  /// **'The reply doesn\'t belong to this question.'**
  String get errForumReplyNotOnThread;

  /// No description provided for @errForumRegisterToVote.
  ///
  /// In en, this message translates to:
  /// **'Sign up to mark relevance.'**
  String get errForumRegisterToVote;

  /// No description provided for @errForumCantVoteOwnQuestion.
  ///
  /// In en, this message translates to:
  /// **'You can\'t vote on your own question.'**
  String get errForumCantVoteOwnQuestion;

  /// No description provided for @errForumCantVoteOwnReply.
  ///
  /// In en, this message translates to:
  /// **'You can\'t vote on your own reply.'**
  String get errForumCantVoteOwnReply;

  /// No description provided for @errForumVoteUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Voting is temporarily unavailable. Try again.'**
  String get errForumVoteUnavailable;

  /// No description provided for @errChatCantChatSelf.
  ///
  /// In en, this message translates to:
  /// **'You can\'t chat with yourself.'**
  String get errChatCantChatSelf;

  /// No description provided for @errChatEmptyMessage.
  ///
  /// In en, this message translates to:
  /// **'Write a message.'**
  String get errChatEmptyMessage;

  /// No description provided for @errChatInvalidShare.
  ///
  /// In en, this message translates to:
  /// **'The question to share isn\'t valid.'**
  String get errChatInvalidShare;

  /// No description provided for @errChatNotMember.
  ///
  /// In en, this message translates to:
  /// **'You\'re not a member of this chat.'**
  String get errChatNotMember;

  /// No description provided for @errChatGone.
  ///
  /// In en, this message translates to:
  /// **'This chat no longer exists.'**
  String get errChatGone;

  /// No description provided for @errChatRegister.
  ///
  /// In en, this message translates to:
  /// **'Sign up with an account to use chats.'**
  String get errChatRegister;

  /// No description provided for @errChatCannotCreateGroup.
  ///
  /// In en, this message translates to:
  /// **'Only admins, instructors, and managers can create groups.'**
  String get errChatCannotCreateGroup;

  /// No description provided for @chatsTitle.
  ///
  /// In en, this message translates to:
  /// **'Chats'**
  String get chatsTitle;

  /// No description provided for @chatsGuestPrompt.
  ///
  /// In en, this message translates to:
  /// **'Sign up with an account to send and receive messages.'**
  String get chatsGuestPrompt;

  /// No description provided for @chatsEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'You don\'t have chats yet'**
  String get chatsEmptyTitle;

  /// No description provided for @chatsEmptySubtitle.
  ///
  /// In en, this message translates to:
  /// **'Tap + to message a teammate.'**
  String get chatsEmptySubtitle;

  /// No description provided for @chatsSectionPinned.
  ///
  /// In en, this message translates to:
  /// **'Pinned'**
  String get chatsSectionPinned;

  /// No description provided for @chatsSectionRecent.
  ///
  /// In en, this message translates to:
  /// **'Recent'**
  String get chatsSectionRecent;

  /// No description provided for @chatsSectionCommunity.
  ///
  /// In en, this message translates to:
  /// **'Community'**
  String get chatsSectionCommunity;

  /// No description provided for @chatsDefaultGroupBadge.
  ///
  /// In en, this message translates to:
  /// **'Community'**
  String get chatsDefaultGroupBadge;

  /// No description provided for @chatsDefaultGroupTitle.
  ///
  /// In en, this message translates to:
  /// **'Team'**
  String get chatsDefaultGroupTitle;

  /// No description provided for @chatsNoMessagesYet.
  ///
  /// In en, this message translates to:
  /// **'No messages yet'**
  String get chatsNoMessagesYet;

  /// No description provided for @chatTypeGroup.
  ///
  /// In en, this message translates to:
  /// **'Group'**
  String get chatTypeGroup;

  /// No description provided for @newGroupTitle.
  ///
  /// In en, this message translates to:
  /// **'New group'**
  String get newGroupTitle;

  /// No description provided for @newGroupNameLabel.
  ///
  /// In en, this message translates to:
  /// **'Group name'**
  String get newGroupNameLabel;

  /// No description provided for @newGroupNameHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Miami cohort'**
  String get newGroupNameHint;

  /// No description provided for @newGroupMembersHeader.
  ///
  /// In en, this message translates to:
  /// **'Members'**
  String get newGroupMembersHeader;

  /// No description provided for @newGroupCreate.
  ///
  /// In en, this message translates to:
  /// **'Create group'**
  String get newGroupCreate;

  /// No description provided for @newGroupNeedMembers.
  ///
  /// In en, this message translates to:
  /// **'Pick at least one other member.'**
  String get newGroupNeedMembers;

  /// No description provided for @newGroupNeedTitle.
  ///
  /// In en, this message translates to:
  /// **'Enter a group name.'**
  String get newGroupNeedTitle;

  /// No description provided for @newGroupTooMany.
  ///
  /// In en, this message translates to:
  /// **'Groups can have at most 20 members.'**
  String get newGroupTooMany;

  /// No description provided for @newChatCreateGroup.
  ///
  /// In en, this message translates to:
  /// **'Create a group'**
  String get newChatCreateGroup;

  /// No description provided for @fabNewGroup.
  ///
  /// In en, this message translates to:
  /// **'New group'**
  String get fabNewGroup;

  /// No description provided for @chatTypePrivate.
  ///
  /// In en, this message translates to:
  /// **'Private chat'**
  String get chatTypePrivate;

  /// No description provided for @newChatTitle.
  ///
  /// In en, this message translates to:
  /// **'New chat'**
  String get newChatTitle;

  /// No description provided for @newChatEmpty.
  ///
  /// In en, this message translates to:
  /// **'No other users yet. When someone signs up, they\'ll appear here.'**
  String get newChatEmpty;

  /// No description provided for @newChatContactsHeader.
  ///
  /// In en, this message translates to:
  /// **'CONTACTS'**
  String get newChatContactsHeader;

  /// No description provided for @chatEmptyThread.
  ///
  /// In en, this message translates to:
  /// **'Say hello. Messages sync live.'**
  String get chatEmptyThread;

  /// No description provided for @chatMessageHint.
  ///
  /// In en, this message translates to:
  /// **'Write a message…'**
  String get chatMessageHint;

  /// No description provided for @chatEmojiPicker.
  ///
  /// In en, this message translates to:
  /// **'Emojis'**
  String get chatEmojiPicker;

  /// No description provided for @chatReact.
  ///
  /// In en, this message translates to:
  /// **'React'**
  String get chatReact;

  /// No description provided for @chatInfoTitle.
  ///
  /// In en, this message translates to:
  /// **'Info'**
  String get chatInfoTitle;

  /// No description provided for @chatPin.
  ///
  /// In en, this message translates to:
  /// **'Pin chat'**
  String get chatPin;

  /// No description provided for @chatUnpin.
  ///
  /// In en, this message translates to:
  /// **'Unpin chat'**
  String get chatUnpin;

  /// No description provided for @chatDelete.
  ///
  /// In en, this message translates to:
  /// **'Delete'**
  String get chatDelete;

  /// No description provided for @chatDeleteConfirmTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete chat?'**
  String get chatDeleteConfirmTitle;

  /// No description provided for @chatDeleteConfirmBody.
  ///
  /// In en, this message translates to:
  /// **'This removes the chat from your inbox. It can come back if someone messages again.'**
  String get chatDeleteConfirmBody;

  /// No description provided for @chatDeleteConfirmAction.
  ///
  /// In en, this message translates to:
  /// **'Delete'**
  String get chatDeleteConfirmAction;

  /// No description provided for @chatDeleteCancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get chatDeleteCancel;

  /// No description provided for @chatDeleted.
  ///
  /// In en, this message translates to:
  /// **'Chat deleted'**
  String get chatDeleted;

  /// No description provided for @chatPinned.
  ///
  /// In en, this message translates to:
  /// **'Chat pinned'**
  String get chatPinned;

  /// No description provided for @chatUnpinned.
  ///
  /// In en, this message translates to:
  /// **'Chat unpinned'**
  String get chatUnpinned;

  /// No description provided for @chatTimeYesterday.
  ///
  /// In en, this message translates to:
  /// **'Yesterday'**
  String get chatTimeYesterday;

  /// No description provided for @weekdayMon.
  ///
  /// In en, this message translates to:
  /// **'Mon'**
  String get weekdayMon;

  /// No description provided for @weekdayTue.
  ///
  /// In en, this message translates to:
  /// **'Tue'**
  String get weekdayTue;

  /// No description provided for @weekdayWed.
  ///
  /// In en, this message translates to:
  /// **'Wed'**
  String get weekdayWed;

  /// No description provided for @weekdayThu.
  ///
  /// In en, this message translates to:
  /// **'Thu'**
  String get weekdayThu;

  /// No description provided for @weekdayFri.
  ///
  /// In en, this message translates to:
  /// **'Fri'**
  String get weekdayFri;

  /// No description provided for @weekdaySat.
  ///
  /// In en, this message translates to:
  /// **'Sat'**
  String get weekdaySat;

  /// No description provided for @weekdaySun.
  ///
  /// In en, this message translates to:
  /// **'Sun'**
  String get weekdaySun;

  /// No description provided for @academyTitle.
  ///
  /// In en, this message translates to:
  /// **'Academy'**
  String get academyTitle;

  /// No description provided for @actionSearch.
  ///
  /// In en, this message translates to:
  /// **'Search'**
  String get actionSearch;

  /// No description provided for @academyMyLearning.
  ///
  /// In en, this message translates to:
  /// **'My learning'**
  String get academyMyLearning;

  /// No description provided for @academyPaths.
  ///
  /// In en, this message translates to:
  /// **'Paths'**
  String get academyPaths;

  /// No description provided for @academySeeAll.
  ///
  /// In en, this message translates to:
  /// **'See all'**
  String get academySeeAll;

  /// No description provided for @academyCourses.
  ///
  /// In en, this message translates to:
  /// **'Courses'**
  String get academyCourses;

  /// No description provided for @academyStudio.
  ///
  /// In en, this message translates to:
  /// **'Studio'**
  String get academyStudio;

  /// No description provided for @academyContinueLearning.
  ///
  /// In en, this message translates to:
  /// **'Keep learning'**
  String get academyContinueLearning;

  /// No description provided for @academyCatalogEmpty.
  ///
  /// In en, this message translates to:
  /// **'No published courses yet.'**
  String get academyCatalogEmpty;

  /// No description provided for @academyFilterAll.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get academyFilterAll;

  /// No description provided for @academyMyCourses.
  ///
  /// In en, this message translates to:
  /// **'My courses'**
  String get academyMyCourses;

  /// No description provided for @academyPendingReview.
  ///
  /// In en, this message translates to:
  /// **'Pending approval'**
  String get academyPendingReview;

  /// No description provided for @searchCoursesHint.
  ///
  /// In en, this message translates to:
  /// **'Search courses…'**
  String get searchCoursesHint;

  /// No description provided for @searchNoResults.
  ///
  /// In en, this message translates to:
  /// **'No results for “{query}”'**
  String searchNoResults(String query);

  /// No description provided for @myLearningInProgress.
  ///
  /// In en, this message translates to:
  /// **'In progress'**
  String get myLearningInProgress;

  /// No description provided for @myLearningCompleted.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get myLearningCompleted;

  /// No description provided for @myLearningEmpty.
  ///
  /// In en, this message translates to:
  /// **'You don\'t have courses in progress yet.'**
  String get myLearningEmpty;

  /// No description provided for @courseDetailTitle.
  ///
  /// In en, this message translates to:
  /// **'Course'**
  String get courseDetailTitle;

  /// No description provided for @courseByTeacher.
  ///
  /// In en, this message translates to:
  /// **'By {name}'**
  String courseByTeacher(String name);

  /// No description provided for @courseStudentsPlural.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{No students yet} =1{1 student} other{{count} students}}'**
  String courseStudentsPlural(int count);

  /// No description provided for @courseLessonsPlural.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{No lessons} =1{1 lesson} other{{count} lessons}}'**
  String courseLessonsPlural(int count);

  /// No description provided for @courseDurationMinutes.
  ///
  /// In en, this message translates to:
  /// **'{minutes} min'**
  String courseDurationMinutes(int minutes);

  /// No description provided for @courseDurationHoursMinutes.
  ///
  /// In en, this message translates to:
  /// **'{hours} h {minutes} min'**
  String courseDurationHoursMinutes(int hours, int minutes);

  /// No description provided for @courseProgressPercent.
  ///
  /// In en, this message translates to:
  /// **'{percent}% complete'**
  String courseProgressPercent(int percent);

  /// No description provided for @courseCompletedBadge.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get courseCompletedBadge;

  /// No description provided for @courseNoLessons.
  ///
  /// In en, this message translates to:
  /// **'This course has no lessons yet.'**
  String get courseNoLessons;

  /// No description provided for @courseStart.
  ///
  /// In en, this message translates to:
  /// **'Start course'**
  String get courseStart;

  /// No description provided for @courseContinue.
  ///
  /// In en, this message translates to:
  /// **'Continue'**
  String get courseContinue;

  /// No description provided for @courseAbout.
  ///
  /// In en, this message translates to:
  /// **'About this course'**
  String get courseAbout;

  /// No description provided for @courseModule.
  ///
  /// In en, this message translates to:
  /// **'Module {index}'**
  String courseModule(int index);

  /// No description provided for @moduleLocked.
  ///
  /// In en, this message translates to:
  /// **'Pass the quizzes in the previous module to unlock this one.'**
  String get moduleLocked;

  /// No description provided for @moduleLockedShort.
  ///
  /// In en, this message translates to:
  /// **'Locked'**
  String get moduleLockedShort;

  /// No description provided for @courseStatusDraft.
  ///
  /// In en, this message translates to:
  /// **'Draft'**
  String get courseStatusDraft;

  /// No description provided for @courseStatusPending.
  ///
  /// In en, this message translates to:
  /// **'In review'**
  String get courseStatusPending;

  /// No description provided for @courseStatusPublished.
  ///
  /// In en, this message translates to:
  /// **'Published'**
  String get courseStatusPublished;

  /// No description provided for @courseManageTitle.
  ///
  /// In en, this message translates to:
  /// **'Manage course'**
  String get courseManageTitle;

  /// No description provided for @courseEditTitle.
  ///
  /// In en, this message translates to:
  /// **'Edit course'**
  String get courseEditTitle;

  /// No description provided for @courseFieldTitle.
  ///
  /// In en, this message translates to:
  /// **'Title'**
  String get courseFieldTitle;

  /// No description provided for @courseFieldDescription.
  ///
  /// In en, this message translates to:
  /// **'Description'**
  String get courseFieldDescription;

  /// No description provided for @courseFieldTeacher.
  ///
  /// In en, this message translates to:
  /// **'Instructor'**
  String get courseFieldTeacher;

  /// No description provided for @courseFieldLevel.
  ///
  /// In en, this message translates to:
  /// **'Level'**
  String get courseFieldLevel;

  /// No description provided for @courseActionSubmitReview.
  ///
  /// In en, this message translates to:
  /// **'Submit for review'**
  String get courseActionSubmitReview;

  /// No description provided for @courseActionApprove.
  ///
  /// In en, this message translates to:
  /// **'Approve and publish'**
  String get courseActionApprove;

  /// No description provided for @courseActionUnpublish.
  ///
  /// In en, this message translates to:
  /// **'Unpublish'**
  String get courseActionUnpublish;

  /// No description provided for @courseActionRejectToDraft.
  ///
  /// In en, this message translates to:
  /// **'Send back to draft'**
  String get courseActionRejectToDraft;

  /// No description provided for @courseDeleteConfirm.
  ///
  /// In en, this message translates to:
  /// **'Delete “{title}”? This can\'t be undone.'**
  String courseDeleteConfirm(String title);

  /// No description provided for @courseSavedToast.
  ///
  /// In en, this message translates to:
  /// **'Changes saved'**
  String get courseSavedToast;

  /// No description provided for @courseSubmittedToast.
  ///
  /// In en, this message translates to:
  /// **'Sent for review'**
  String get courseSubmittedToast;

  /// No description provided for @coursePublishedToast.
  ///
  /// In en, this message translates to:
  /// **'Course published'**
  String get coursePublishedToast;

  /// No description provided for @courseUnpublishedToast.
  ///
  /// In en, this message translates to:
  /// **'Course unpublished'**
  String get courseUnpublishedToast;

  /// No description provided for @courseDeletedToast.
  ///
  /// In en, this message translates to:
  /// **'Course deleted'**
  String get courseDeletedToast;

  /// No description provided for @studioWebOnlyHint.
  ///
  /// In en, this message translates to:
  /// **'Open Pulse Studio on the web to upload videos and organize modules.'**
  String get studioWebOnlyHint;

  /// No description provided for @playerClasses.
  ///
  /// In en, this message translates to:
  /// **'Lessons'**
  String get playerClasses;

  /// No description provided for @playerLoading.
  ///
  /// In en, this message translates to:
  /// **'Loading video…'**
  String get playerLoading;

  /// No description provided for @playerNoVideo.
  ///
  /// In en, this message translates to:
  /// **'This lesson has no video yet.'**
  String get playerNoVideo;

  /// No description provided for @playerError.
  ///
  /// In en, this message translates to:
  /// **'The video couldn\'t be played.'**
  String get playerError;

  /// No description provided for @playerNextLesson.
  ///
  /// In en, this message translates to:
  /// **'Next lesson'**
  String get playerNextLesson;

  /// No description provided for @playerCourseCompleted.
  ///
  /// In en, this message translates to:
  /// **'You finished the course!'**
  String get playerCourseCompleted;

  /// No description provided for @playerLessonOf.
  ///
  /// In en, this message translates to:
  /// **'Lesson {index} of {total}'**
  String playerLessonOf(int index, int total);

  /// No description provided for @lessonTypeVideo.
  ///
  /// In en, this message translates to:
  /// **'Video'**
  String get lessonTypeVideo;

  /// No description provided for @lessonTypeReading.
  ///
  /// In en, this message translates to:
  /// **'Reading'**
  String get lessonTypeReading;

  /// No description provided for @lessonTypeQuiz.
  ///
  /// In en, this message translates to:
  /// **'Quiz'**
  String get lessonTypeQuiz;

  /// No description provided for @readingEmpty.
  ///
  /// In en, this message translates to:
  /// **'This reading has no content yet.'**
  String get readingEmpty;

  /// No description provided for @readingMarkComplete.
  ///
  /// In en, this message translates to:
  /// **'Mark as completed'**
  String get readingMarkComplete;

  /// No description provided for @readingCompleted.
  ///
  /// In en, this message translates to:
  /// **'Reading completed'**
  String get readingCompleted;

  /// No description provided for @quizEmpty.
  ///
  /// In en, this message translates to:
  /// **'This quiz has no questions yet.'**
  String get quizEmpty;

  /// No description provided for @quizPassRequirement.
  ///
  /// In en, this message translates to:
  /// **'You need {percent}% to pass.'**
  String quizPassRequirement(int percent);

  /// No description provided for @quizPickOne.
  ///
  /// In en, this message translates to:
  /// **'Choose one answer'**
  String get quizPickOne;

  /// No description provided for @quizPickMany.
  ///
  /// In en, this message translates to:
  /// **'Choose all that apply'**
  String get quizPickMany;

  /// No description provided for @quizSubmit.
  ///
  /// In en, this message translates to:
  /// **'Submit answers'**
  String get quizSubmit;

  /// No description provided for @quizGrading.
  ///
  /// In en, this message translates to:
  /// **'Grading…'**
  String get quizGrading;

  /// No description provided for @quizRetry.
  ///
  /// In en, this message translates to:
  /// **'Try again'**
  String get quizRetry;

  /// No description provided for @quizScore.
  ///
  /// In en, this message translates to:
  /// **'Your score: {score}%'**
  String quizScore(int score);

  /// No description provided for @quizPassed.
  ///
  /// In en, this message translates to:
  /// **'Passed'**
  String get quizPassed;

  /// No description provided for @quizFailed.
  ///
  /// In en, this message translates to:
  /// **'Not passed yet'**
  String get quizFailed;

  /// No description provided for @quizQuestionOf.
  ///
  /// In en, this message translates to:
  /// **'Question {index} of {total}'**
  String quizQuestionOf(int index, int total);

  /// No description provided for @quizAnswerCorrect.
  ///
  /// In en, this message translates to:
  /// **'Correct'**
  String get quizAnswerCorrect;

  /// No description provided for @quizAnswerIncorrect.
  ///
  /// In en, this message translates to:
  /// **'Incorrect'**
  String get quizAnswerIncorrect;

  /// No description provided for @levelBasic.
  ///
  /// In en, this message translates to:
  /// **'Basic'**
  String get levelBasic;

  /// No description provided for @levelIntermediate.
  ///
  /// In en, this message translates to:
  /// **'Intermediate'**
  String get levelIntermediate;

  /// No description provided for @levelAdvanced.
  ///
  /// In en, this message translates to:
  /// **'Advanced'**
  String get levelAdvanced;

  /// No description provided for @pathDetailTitle.
  ///
  /// In en, this message translates to:
  /// **'Path'**
  String get pathDetailTitle;

  /// No description provided for @pathsEmpty.
  ///
  /// In en, this message translates to:
  /// **'No published paths yet.'**
  String get pathsEmpty;

  /// No description provided for @pathIncludedCourses.
  ///
  /// In en, this message translates to:
  /// **'Courses in this path'**
  String get pathIncludedCourses;

  /// No description provided for @pathMetaCoursesHours.
  ///
  /// In en, this message translates to:
  /// **'{courses} courses · {hours}h'**
  String pathMetaCoursesHours(int courses, int hours);

  /// No description provided for @errCourseNoPermission.
  ///
  /// In en, this message translates to:
  /// **'You don\'t have permission to manage courses.'**
  String get errCourseNoPermission;

  /// No description provided for @errCourseTitleRequired.
  ///
  /// In en, this message translates to:
  /// **'The course title is required.'**
  String get errCourseTitleRequired;

  /// No description provided for @errCourseAlreadyPublished.
  ///
  /// In en, this message translates to:
  /// **'Only an admin can edit a published course.'**
  String get errCourseAlreadyPublished;

  /// No description provided for @errCourseNotPublished.
  ///
  /// In en, this message translates to:
  /// **'This course isn\'t published yet.'**
  String get errCourseNotPublished;

  /// No description provided for @errCourseSignInRequired.
  ///
  /// In en, this message translates to:
  /// **'Sign in to enroll.'**
  String get errCourseSignInRequired;

  /// No description provided for @errCourseOnlyAdminPublishes.
  ///
  /// In en, this message translates to:
  /// **'Only an admin can publish courses.'**
  String get errCourseOnlyAdminPublishes;

  /// No description provided for @errQuizIncomplete.
  ///
  /// In en, this message translates to:
  /// **'Answer every question before submitting.'**
  String get errQuizIncomplete;

  /// No description provided for @errQuizNoAnswerKey.
  ///
  /// In en, this message translates to:
  /// **'This quiz isn\'t ready to be graded yet.'**
  String get errQuizNoAnswerKey;

  /// No description provided for @profileBootstrapFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load the profile:\n{error}'**
  String profileBootstrapFailed(String error);

  /// No description provided for @profileBootstrapBack.
  ///
  /// In en, this message translates to:
  /// **'Back to start'**
  String get profileBootstrapBack;

  /// No description provided for @profilePulseEyebrow.
  ///
  /// In en, this message translates to:
  /// **'Your Pulse'**
  String get profilePulseEyebrow;

  /// No description provided for @profileChangePhoto.
  ///
  /// In en, this message translates to:
  /// **'Change photo'**
  String get profileChangePhoto;

  /// No description provided for @profileTapToAddPhoto.
  ///
  /// In en, this message translates to:
  /// **'Tap to add a photo'**
  String get profileTapToAddPhoto;

  /// No description provided for @profileQuickEdit.
  ///
  /// In en, this message translates to:
  /// **'Edit'**
  String get profileQuickEdit;

  /// No description provided for @profileQuickSettings.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get profileQuickSettings;

  /// No description provided for @profileDetailAgency.
  ///
  /// In en, this message translates to:
  /// **'Agency'**
  String get profileDetailAgency;

  /// No description provided for @profileDetailNpn.
  ///
  /// In en, this message translates to:
  /// **'NPN'**
  String get profileDetailNpn;

  /// No description provided for @profileDetailPhone.
  ///
  /// In en, this message translates to:
  /// **'Phone'**
  String get profileDetailPhone;

  /// No description provided for @profileDetailEmail.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get profileDetailEmail;

  /// No description provided for @profileDetailAddress.
  ///
  /// In en, this message translates to:
  /// **'Address'**
  String get profileDetailAddress;

  /// No description provided for @profileDossierEyebrow.
  ///
  /// In en, this message translates to:
  /// **'Identity file'**
  String get profileDossierEyebrow;

  /// No description provided for @profileRoleLockedHint.
  ///
  /// In en, this message translates to:
  /// **'Your account type is locked after setup. Contact an admin to become an agent.'**
  String get profileRoleLockedHint;

  /// No description provided for @fieldAddressStreet.
  ///
  /// In en, this message translates to:
  /// **'Street address'**
  String get fieldAddressStreet;

  /// No description provided for @fieldAddressApt.
  ///
  /// In en, this message translates to:
  /// **'Apt / Suite'**
  String get fieldAddressApt;

  /// No description provided for @fieldAddressCity.
  ///
  /// In en, this message translates to:
  /// **'City'**
  String get fieldAddressCity;

  /// No description provided for @fieldAddressState.
  ///
  /// In en, this message translates to:
  /// **'State'**
  String get fieldAddressState;

  /// No description provided for @fieldAddressZip.
  ///
  /// In en, this message translates to:
  /// **'ZIP'**
  String get fieldAddressZip;

  /// No description provided for @validationAddressStreet.
  ///
  /// In en, this message translates to:
  /// **'Enter your street address.'**
  String get validationAddressStreet;

  /// No description provided for @validationAddressCity.
  ///
  /// In en, this message translates to:
  /// **'Enter your city.'**
  String get validationAddressCity;

  /// No description provided for @validationAddressState.
  ///
  /// In en, this message translates to:
  /// **'Use a 2-letter state code.'**
  String get validationAddressState;

  /// No description provided for @validationAddressZip.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid ZIP code.'**
  String get validationAddressZip;

  /// No description provided for @editProfileRoleSection.
  ///
  /// In en, this message translates to:
  /// **'Account type'**
  String get editProfileRoleSection;

  /// No description provided for @editProfileBasicsSection.
  ///
  /// In en, this message translates to:
  /// **'Basics'**
  String get editProfileBasicsSection;

  /// No description provided for @editProfileCredentialsSection.
  ///
  /// In en, this message translates to:
  /// **'License & location'**
  String get editProfileCredentialsSection;

  /// No description provided for @editProfileRoleFrozen.
  ///
  /// In en, this message translates to:
  /// **'Chosen at signup — only an admin can change this.'**
  String get editProfileRoleFrozen;

  /// No description provided for @settingsAdmin.
  ///
  /// In en, this message translates to:
  /// **'Admin'**
  String get settingsAdmin;

  /// No description provided for @settingsAdminHint.
  ///
  /// In en, this message translates to:
  /// **'Promote students to agents.'**
  String get settingsAdminHint;

  /// No description provided for @settingsAdminPromote.
  ///
  /// In en, this message translates to:
  /// **'Promote to agent'**
  String get settingsAdminPromote;

  /// No description provided for @settingsAdminEmpty.
  ///
  /// In en, this message translates to:
  /// **'No students waiting for promotion.'**
  String get settingsAdminEmpty;

  /// No description provided for @settingsAdminPromoteOk.
  ///
  /// In en, this message translates to:
  /// **'Promoted to agent.'**
  String get settingsAdminPromoteOk;

  /// No description provided for @settingsAdminPromoteFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t promote: {error}'**
  String settingsAdminPromoteFailed(String error);

  /// No description provided for @settingsAppearance.
  ///
  /// In en, this message translates to:
  /// **'Appearance'**
  String get settingsAppearance;

  /// No description provided for @settingsPreferences.
  ///
  /// In en, this message translates to:
  /// **'Preferences'**
  String get settingsPreferences;

  /// No description provided for @settingsPrivacy.
  ///
  /// In en, this message translates to:
  /// **'Privacy'**
  String get settingsPrivacy;

  /// No description provided for @settingsPrivacyHint.
  ///
  /// In en, this message translates to:
  /// **'Crash reports help us fix bugs. Product analytics stays off until you opt in.'**
  String get settingsPrivacyHint;

  /// No description provided for @settingsAnalytics.
  ///
  /// In en, this message translates to:
  /// **'Product analytics'**
  String get settingsAnalytics;

  /// No description provided for @settingsAnalyticsHint.
  ///
  /// In en, this message translates to:
  /// **'Anonymous usage events only — no name, email, or message content.'**
  String get settingsAnalyticsHint;

  /// No description provided for @settingsAccount.
  ///
  /// In en, this message translates to:
  /// **'Account'**
  String get settingsAccount;

  /// No description provided for @settingsThemeHint.
  ///
  /// In en, this message translates to:
  /// **'Match the system or lock light / dark.'**
  String get settingsThemeHint;

  /// No description provided for @settingsLanguageHint.
  ///
  /// In en, this message translates to:
  /// **'Interface language for Every Insurance.'**
  String get settingsLanguageHint;

  /// No description provided for @settingsAccentStudio.
  ///
  /// In en, this message translates to:
  /// **'Brand signal'**
  String get settingsAccentStudio;

  /// No description provided for @settingsEditAccount.
  ///
  /// In en, this message translates to:
  /// **'Edit account details'**
  String get settingsEditAccount;

  /// No description provided for @settingsSignOutHint.
  ///
  /// In en, this message translates to:
  /// **'You\'ll need to sign in again to return.'**
  String get settingsSignOutHint;

  /// No description provided for @navNotifications.
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get navNotifications;

  /// No description provided for @notificationsTitle.
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get notificationsTitle;

  /// No description provided for @notificationsEmpty.
  ///
  /// In en, this message translates to:
  /// **'You\'re all caught up.'**
  String get notificationsEmpty;

  /// No description provided for @notificationsMarkAll.
  ///
  /// In en, this message translates to:
  /// **'Mark all read'**
  String get notificationsMarkAll;

  /// No description provided for @notificationsSignIn.
  ///
  /// In en, this message translates to:
  /// **'Sign in to see your notifications.'**
  String get notificationsSignIn;

  /// No description provided for @notificationsPrefsTitle.
  ///
  /// In en, this message translates to:
  /// **'Notification preferences'**
  String get notificationsPrefsTitle;

  /// No description provided for @notificationsPrefChats.
  ///
  /// In en, this message translates to:
  /// **'Chat messages'**
  String get notificationsPrefChats;

  /// No description provided for @notificationsPrefForums.
  ///
  /// In en, this message translates to:
  /// **'Forum activity'**
  String get notificationsPrefForums;

  /// No description provided for @notificationsPrefAcademy.
  ///
  /// In en, this message translates to:
  /// **'Academy updates'**
  String get notificationsPrefAcademy;

  /// No description provided for @notificationsPrefsHint.
  ///
  /// In en, this message translates to:
  /// **'Choose which alerts arrive as push on this device.'**
  String get notificationsPrefsHint;

  /// No description provided for @notificationsEnablePush.
  ///
  /// In en, this message translates to:
  /// **'Enable push notifications'**
  String get notificationsEnablePush;

  /// No description provided for @notificationsPushEnabled.
  ///
  /// In en, this message translates to:
  /// **'Push notifications on'**
  String get notificationsPushEnabled;

  /// No description provided for @notificationsPushUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t enable push. Allow notifications in system settings.'**
  String get notificationsPushUnavailable;

  /// No description provided for @phoneProfileVerifyTitle.
  ///
  /// In en, this message translates to:
  /// **'Verify your phone'**
  String get phoneProfileVerifyTitle;

  /// No description provided for @phoneProfileVerifyHint.
  ///
  /// In en, this message translates to:
  /// **'We\'ll send an SMS to {phone} to confirm it\'s yours.'**
  String phoneProfileVerifyHint(String phone);

  /// No description provided for @phoneProfileVerifyConfirm.
  ///
  /// In en, this message translates to:
  /// **'Confirm phone'**
  String get phoneProfileVerifyConfirm;

  /// No description provided for @phoneProfileVerifiedBadge.
  ///
  /// In en, this message translates to:
  /// **'Phone verified'**
  String get phoneProfileVerifiedBadge;

  /// No description provided for @phoneProfileUnverifiedBadge.
  ///
  /// In en, this message translates to:
  /// **'Phone not verified yet'**
  String get phoneProfileUnverifiedBadge;

  /// No description provided for @dangerTitle.
  ///
  /// In en, this message translates to:
  /// **'Danger zone'**
  String get dangerTitle;

  /// No description provided for @dangerNav.
  ///
  /// In en, this message translates to:
  /// **'Deactivate or delete'**
  String get dangerNav;

  /// No description provided for @dangerSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Sensitive account actions. Read them carefully.'**
  String get dangerSubtitle;

  /// No description provided for @dangerDeactivate.
  ///
  /// In en, this message translates to:
  /// **'Deactivate account'**
  String get dangerDeactivate;

  /// No description provided for @dangerDeactivateHint.
  ///
  /// In en, this message translates to:
  /// **'Your account is paused and you stop receiving notifications. You can reactivate it yourself by signing in again.'**
  String get dangerDeactivateHint;

  /// No description provided for @dangerDeactivateConfirmHint.
  ///
  /// In en, this message translates to:
  /// **'You will be signed out now. To come back, sign in and tap Reactivate.'**
  String get dangerDeactivateConfirmHint;

  /// No description provided for @dangerDeactivateConfirm.
  ///
  /// In en, this message translates to:
  /// **'Yes, deactivate'**
  String get dangerDeactivateConfirm;

  /// No description provided for @dangerDelete.
  ///
  /// In en, this message translates to:
  /// **'Delete account'**
  String get dangerDelete;

  /// No description provided for @dangerDeleteHint.
  ///
  /// In en, this message translates to:
  /// **'Your personal data is kept for 3 months and then deleted automatically. You can cancel the deletion during that period by signing in.'**
  String get dangerDeleteHint;

  /// No description provided for @dangerDeleteConfirmHint.
  ///
  /// In en, this message translates to:
  /// **'Your data will be permanently deleted on {date}. Until then you can cancel by signing in.'**
  String dangerDeleteConfirmHint(String date);

  /// No description provided for @dangerDeleteAnonymizeHint.
  ///
  /// In en, this message translates to:
  /// **'Your forum and chat posts stay up from now on under an anonymous name. If you cancel, they get your name back.'**
  String get dangerDeleteAnonymizeHint;

  /// No description provided for @dangerDeleteConfirm.
  ///
  /// In en, this message translates to:
  /// **'Delete my account'**
  String get dangerDeleteConfirm;

  /// No description provided for @dangerCurrentPassword.
  ///
  /// In en, this message translates to:
  /// **'Current password'**
  String get dangerCurrentPassword;

  /// No description provided for @dangerReauthFailed.
  ///
  /// In en, this message translates to:
  /// **'We couldn\'t confirm your identity. Check your password and try again.'**
  String get dangerReauthFailed;

  /// No description provided for @tourEyebrow.
  ///
  /// In en, this message translates to:
  /// **'Welcome to Pulse'**
  String get tourEyebrow;

  /// No description provided for @tourStep.
  ///
  /// In en, this message translates to:
  /// **'{current} of {total}'**
  String tourStep(int current, int total);

  /// No description provided for @tourSkip.
  ///
  /// In en, this message translates to:
  /// **'Skip'**
  String get tourSkip;

  /// No description provided for @tourBack.
  ///
  /// In en, this message translates to:
  /// **'Back'**
  String get tourBack;

  /// No description provided for @tourNext.
  ///
  /// In en, this message translates to:
  /// **'Next'**
  String get tourNext;

  /// No description provided for @tourDone.
  ///
  /// In en, this message translates to:
  /// **'Get started'**
  String get tourDone;

  /// No description provided for @tourWelcomeTitle.
  ///
  /// In en, this message translates to:
  /// **'A fresher Pulse'**
  String get tourWelcomeTitle;

  /// No description provided for @tourWelcomeBody.
  ///
  /// In en, this message translates to:
  /// **'Forums, chats, and academy — rebuilt to feel faster and clearer. Here’s a quick tour of what you can do.'**
  String get tourWelcomeBody;

  /// No description provided for @tourCommunityTitle.
  ///
  /// In en, this message translates to:
  /// **'Ask the network'**
  String get tourCommunityTitle;

  /// No description provided for @tourCommunityBody.
  ///
  /// In en, this message translates to:
  /// **'Home is your community feed. Post questions, follow spotlight threads, and find accepted answers from agents and peers.'**
  String get tourCommunityBody;

  /// No description provided for @tourChatsTitle.
  ///
  /// In en, this message translates to:
  /// **'Talk it through'**
  String get tourChatsTitle;

  /// No description provided for @tourChatsBody.
  ///
  /// In en, this message translates to:
  /// **'Message classmates and start group chats. Unread badges keep you current.'**
  String get tourChatsBody;

  /// No description provided for @tourAcademyTitle.
  ///
  /// In en, this message translates to:
  /// **'Learn at your pace'**
  String get tourAcademyTitle;

  /// No description provided for @tourAcademyBody.
  ///
  /// In en, this message translates to:
  /// **'Browse published courses and paths, resume where you left off, and track progress from Academy.'**
  String get tourAcademyBody;

  /// No description provided for @tourYouTitle.
  ///
  /// In en, this message translates to:
  /// **'Your space'**
  String get tourYouTitle;

  /// No description provided for @tourYouBody.
  ///
  /// In en, this message translates to:
  /// **'Profile holds your details, notification preferences, and security options. You can revisit anything from the nav anytime.'**
  String get tourYouBody;

  /// No description provided for @tourYouBodyAgent.
  ///
  /// In en, this message translates to:
  /// **'Profile holds your details, notification preferences, and security. Agents can jump to Studio from the app switcher to author courses.'**
  String get tourYouBodyAgent;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'es'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'es':
      return AppLocalizationsEs();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
