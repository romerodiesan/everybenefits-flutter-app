import Flutter
import UIKit
import FirebaseAppCheck
import FirebaseCore

/// No-op App Check provider — never calls DeviceCheck / App Attest / network.
///
/// Flutter's `firebase_app_check` plugin registers a factory that **defaults to
/// DeviceCheck** on plugin load (before Dart `activate`). That hits
/// `exchangeDeviceCheckToken` for unregistered app IDs. We replace the factory
/// after plugin registration while App Check remains disabled (ADR-005).
final class DisabledAppCheckProviderFactory: NSObject, AppCheckProviderFactory {
  func createProvider(with app: FirebaseApp) -> AppCheckProvider? {
    DisabledAppCheckProvider()
  }
}

final class DisabledAppCheckProvider: NSObject, AppCheckProvider {
  func getToken(completion handler: @escaping (AppCheckToken?, Error?) -> Void) {
    handler(
      AppCheckToken(token: "app-check-disabled", expirationDate: .distantFuture),
      nil
    )
  }

  @available(iOS 14.0, *)
  func getLimitedUseToken(completion handler: @escaping (AppCheckToken?, Error?) -> Void) {
    getToken(completion: handler)
  }
}

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  /// Factory must be set **before** `FirebaseApp.configure()`. Do not call
  /// `AppCheck.appCheck()` here — that requires a configured default app and
  /// crashes with `com.firebase.appCheck` if invoked too early.
  private func installDisabledAppCheckFactory() {
    AppCheck.setAppCheckProviderFactory(DisabledAppCheckProviderFactory())
  }

  private func disableAppCheckTokenRefreshIfReady() {
    guard FirebaseApp.app() != nil else { return }
    AppCheck.appCheck().isTokenAutoRefreshEnabled = false
  }

  override func application(
    _ application: UIApplication,
    willFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    installDisabledAppCheckFactory()
    return super.application(application, willFinishLaunchingWithOptions: launchOptions)
  }

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    installDisabledAppCheckFactory()
    let ok = super.application(application, didFinishLaunchingWithOptions: launchOptions)
    // Plugin registration can overwrite the factory during super — reinstall.
    installDisabledAppCheckFactory()
    disableAppCheckTokenRefreshIfReady()
    DispatchQueue.main.async { [weak self] in
      self?.installDisabledAppCheckFactory()
      self?.disableAppCheckTokenRefreshIfReady()
    }
    return ok
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)
    // FlutterAppCheckPlugin.register overwrites the factory with DeviceCheck —
    // put the no-op factory back immediately.
    installDisabledAppCheckFactory()
    disableAppCheckTokenRefreshIfReady()
  }
}
