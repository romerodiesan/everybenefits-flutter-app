import 'package:firebase_auth/firebase_auth.dart';

/// Shared [ActionCodeSettings] for passwordless email-link sign-in.
ActionCodeSettings everyInsuranceEmailLinkSettings({
  String continueUrl = 'https://every-insurance.firebaseapp.com/finishSignIn',
}) {
  return ActionCodeSettings(
    url: continueUrl,
    handleCodeInApp: true,
    iOSBundleId: 'com.everybenefits.everyinsurance',
    androidPackageName: 'com.everybenefits.everyinsurance',
    androidInstallApp: true,
    androidMinimumVersion: '21',
  );
}
