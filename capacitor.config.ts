import type { CapacitorConfig } from '@capacitor/cli';

// The iPhone app: the same web build (dist/) inside a native shell, for TestFlight and the App
// Store. See docs/TESTFLIGHT.md.
const config: CapacitorConfig = {
  // Must match the bundle ID registered in App Store Connect; change it here and in Xcode together.
  appId: 'com.squidzombie.cyberpsychosis',
  appName: 'Cyber Psychosis',
  webDir: 'dist',
  backgroundColor: '#000000',
  ios: {
    // The game draws edge to edge and handles the safe areas itself.
    contentInset: 'never',
    // No rubber-band scrolling or bounce: the page is the game.
    scrollEnabled: false,
    backgroundColor: '#000000',
    // Lets Safari's Web Inspector attach, handy while testing. Turn it off for an App Store release.
    webContentsDebuggingEnabled: true,
  },
};

export default config;
