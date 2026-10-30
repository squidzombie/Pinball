import UIKit
import Capacitor
import QuickLook

/// The game's screen: the web view, full screen and portrait, with no status bar. Swipes from the
/// screen's edges need a second swipe (the home indicator stays, dimmed), so a flipper press near the
/// bottom doesn't send the player home.
class GameViewController: CAPBridgeViewController {
    override var prefersStatusBarHidden: Bool { true }
    override var preferredScreenEdgesDeferringSystemGestures: UIRectEdge { .all }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .portrait }

    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(ManualPlugin())
    }
}

/// The start screen's "Game manual" button: shows the manual (public/manual.pdf, part of the web
/// build) in iOS's own document viewer, with Done, page thumbnails, and the share sheet for saving
/// or printing it. Called from the game as `Manual.show()`.
@objc(ManualPlugin)
public class ManualPlugin: CAPPlugin, CAPBridgedPlugin, QLPreviewControllerDataSource {
    public let identifier = "ManualPlugin"
    public let jsName = "Manual"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "show", returnType: CAPPluginReturnPromise)
    ]

    private var manualURL: URL? {
        Bundle.main.url(forResource: "manual", withExtension: "pdf", subdirectory: "public")
    }

    @objc func show(_ call: CAPPluginCall) {
        guard manualURL != nil else {
            call.reject("The manual isn't in this build")
            return
        }
        DispatchQueue.main.async {
            let preview = QLPreviewController()
            preview.dataSource = self
            self.bridge?.viewController?.present(preview, animated: true)
            call.resolve()
        }
    }

    public func numberOfPreviewItems(in controller: QLPreviewController) -> Int {
        manualURL == nil ? 0 : 1
    }

    public func previewController(_ controller: QLPreviewController, previewItemAt index: Int) -> QLPreviewItem {
        manualURL! as NSURL
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = GameViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
