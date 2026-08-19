import Flutter
import FirebaseAuth
import UIKit

class SceneDelegate: FlutterSceneDelegate {
  override func scene(
    _ scene: UIScene,
    openURLContexts URLContexts: Set<UIOpenURLContext>
  ) {
    if URLContexts.contains(where: { Auth.auth().canHandle($0.url) }) {
      return
    }
    super.scene(scene, openURLContexts: URLContexts)
  }
}
