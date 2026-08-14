import 'package:firebase_auth/firebase_auth.dart';

/// Shared [ActionCodeSettings] for passwordless email-link sign-in.
/// Continue URL uses every-benefits-us (canonical Firebase project).
ActionCodeSettings everyInsuranceEmailLinkSettings({
  String continueUrl =
      'https://every-benefits-us.firebaseapp.com/finishSignIn',
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
