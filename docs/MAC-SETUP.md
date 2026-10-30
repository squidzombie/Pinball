# Mac setup: from nothing to the game on your iPhone

Everything here is a one-time setup, except step 5, which you repeat whenever the game changes.
When the game runs on your phone, carry on with [`TESTFLIGHT.md`](TESTFLIGHT.md) to share it with
friends.

## What to download

| What | Where | Notes |
|---|---|---|
| **Xcode** | The Mac App Store (search "Xcode") | Free, but a big download (well over 10 GB): start it first. |
| **Node.js** | [nodejs.org](https://nodejs.org): the **LTS** button, then the macOS installer (`.pkg`) | Free. Version 22 or later. |
| **The project** | The zip, `cyber-psychosis-mac.zip`, or GitHub Desktop (below) | About 20 MB. |

You also need an **Apple Account** (the Apple ID you already use is fine). To put the game on
your own iPhone that's enough. To share it through TestFlight you also need the **Apple Developer
Program** ($99 a year) on that account: [developer.apple.com/programs](https://developer.apple.com/programs/).
Enrolment takes a day or two, so it's worth starting now.

## 1. Install Xcode

Install it from the App Store and open it once. Agree to the licence, and when it asks which
platforms to install, keep **iOS** ticked. Wait for that to finish.

## 2. Install Node.js

Open the `.pkg` you downloaded from nodejs.org and click through the installer.

## 3. Connect your Apple account to Xcode

In Xcode: **Xcode** menu, **Settings** (or ⌘ comma), **Accounts**, the **+** button at the bottom
left, **Apple Account**, and sign in. Use the account that has (or will have) the Developer
Program.

## 4. Get the project

**Either** the zip:

1. Double-click `cyber-psychosis-mac.zip`. It unzips into a folder called `CyberPsychosis`.
2. Move that folder somewhere you'll find it, for example **Documents**.

**Or** GitHub Desktop, which makes later updates one click:

1. Download it from [desktop.github.com](https://desktop.github.com) and sign in with the GitHub
   account that has access to `squidzombie/Pinball`.
2. **File, Clone Repository**, pick `squidzombie/Pinball`, and **Clone**.
3. In the **Current Branch** menu at the top, choose `claude/gifted-dijkstra-sxn6no` (until it's
   merged into main).

## 5. Build it and open it in Xcode

In the project folder, double-click **`Open in Xcode.command`**. A Terminal window opens and works
through three steps (installing packages, building the game, opening Xcode). The first time takes
a few minutes.

**If macOS refuses to open it** ("Apple could not verify…" or "unidentified developer"), click
**Done**. Then open **System Settings**, **Privacy & Security**, scroll down to the message about
`Open in Xcode.command`, click **Open Anyway**, and confirm. This happens only once. (Projects from
GitHub Desktop don't get this.)

When Xcode opens, it fetches Capacitor (the app's framework) from the internet; its progress shows
at the top of the window. Wait for it to finish.

## 6. Signing

1. At the top of Xcode's left sidebar, click **App** (the blue icon).
2. Under **TARGETS**, click **App**, then the **Signing & Capabilities** tab.
3. Tick **Automatically manage signing**.
4. Under **Team**, choose your name (or your Developer Program team).

Leave the **Bundle Identifier** as `com.squidzombie.cyberpsychosis`. If Xcode says it's
unavailable, change it to something of your own, such as `com.yourname.cyberpsychosis`, and make the
same change in the project's `capacitor.config.ts` file (the `appId` line).

## 7. Run it on your iPhone

1. Connect the iPhone with a cable and unlock it. If it asks, tap **Trust** to trust this computer.
2. At the top of Xcode, click the device menu (it shows a phone or simulator name) and pick your
   iPhone. The first time, Xcode spends a few minutes preparing it.
3. On the iPhone: **Settings, Privacy & Security, Developer Mode**, turn it on, and let it restart.
   (The option only appears after the phone has been connected to Xcode.)
4. In Xcode, press the **▶** button.
5. If the phone says **Untrusted Developer**: **Settings, General, VPN & Device Management**, tap
   your Apple account, then **Trust**. Press ▶ again.

The game opens on your phone. With a free account it keeps working for 7 days; press ▶ again to
renew it. TestFlight builds last 90 days.

## Next: TestFlight

Carry on with [`TESTFLIGHT.md`](TESTFLIGHT.md) from step 4: create the app in App Store Connect,
upload a build, and invite your friends.

## Updating after the game changes

1. Get the new version: download the new zip, or in GitHub Desktop click **Fetch origin**, then
   **Pull**.
2. Double-click `Open in Xcode.command` again.
3. For TestFlight, raise the **Build** number (App target, **General** tab), then **Product,
   Archive** and upload.

## If something goes wrong

| What you see | What to do |
|---|---|
| The Terminal window says Node.js is missing or too old | Install the LTS version from nodejs.org, then double-click the file again. |
| "No account for team" or no team to choose | Step 3: add your Apple account in Xcode's Settings. |
| "Failed to register bundle identifier" | The identifier is taken: use your own, as in step 6. |
| "Missing package product" or a package error | **File, Packages, Reset Package Caches**, and check the Mac is online. |
| The phone isn't in the device menu | Unlock it, tap Trust, and try a different cable or port. |
| Anything else | Copy the red error text from Xcode or the Terminal window and send it to Claude. |
