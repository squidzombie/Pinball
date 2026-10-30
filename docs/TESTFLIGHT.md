# Getting Cyber Psychosis onto TestFlight

The iPhone app is the web game inside a native shell made with
[Capacitor](https://capacitorjs.com). Its Xcode project is in `ios/`. Everything that can be
prepared without a Mac is done; what's left needs a Mac with Xcode and an Apple Developer
account.

## What's set up

| | |
|---|---|
| App name | Cyber Psychosis |
| Bundle ID | `com.squidzombie.cyberpsychosis` (in `capacitor.config.ts` and the Xcode project) |
| Version | 0.20 (software version 20), build 1 |
| Devices | iPhone and iPad, iOS 15 or later, portrait only |
| Screen | Full screen with no status bar. Swipes from the screen's edges need a second swipe, so a flipper press near the bottom doesn't send you home. |
| Icon | The table's brain in neon on steel (`art/app/`) |
| Launch screen | Black, with the brain and the logo |
| Start screen | Shows the touch controls only (phones and tablets in Safari too; a computer shows the keys) |
| Game manual | The start screen's **Game manual** button opens the PDF in iOS's own viewer, with Done and a share button for saving or printing it. On the web it opens in a new tab. |
| Shake to nudge | Works in the app with no prompt |
| Sound | Follows the silent switch, as in Safari |
| Saved data | The high score and speed setting stay on the phone; deleting the app deletes them |
| Network | None needed: the whole game is inside the app |
| Export compliance | Answered in the app (no non-exempt encryption), so uploads don't ask |

## What you need

- **A Mac with the current Xcode** from the Mac App Store. Apple only accepts uploads built with a
  recent Xcode.
- **An Apple Developer Program membership** ($99 a year) at
  [developer.apple.com/programs](https://developer.apple.com/programs/). Enrolment can take a day
  or two while Apple checks your identity.
- **Node.js 22 or later** on the Mac ([nodejs.org](https://nodejs.org)).
- An iPhone with a cable, to try the app before uploading (optional, but worth it).

## 1. Get the project ready (Terminal, on the Mac)

**New to this?** [`MAC-SETUP.md`](MAC-SETUP.md) covers steps 1 to 3 click by click: what to
download, connecting your Apple account, and getting the game onto your own iPhone. The project's
`Open in Xcode.command` does the Terminal part below with a double-click.

```bash
git clone https://github.com/squidzombie/Pinball.git
cd Pinball
git checkout claude/gifted-dijkstra-sxn6no   # or main, once this is merged
npm install
npm run ios        # builds the game and copies it into the iOS project
npm run ios:open   # opens the project in Xcode
```

Run `npm run ios` again whenever the game changes, before building in Xcode.

The first time Xcode opens the project, it downloads Capacitor (a Swift package). That takes a
minute.

## 2. Signing (Xcode)

1. In the left sidebar, click **App** (the blue project icon), then the **App** target.
2. Open **Signing & Capabilities**.
3. Tick **Automatically manage signing** and choose your **Team** (your developer account).
4. Leave the **Bundle Identifier** as `com.squidzombie.cyberpsychosis`. If Apple says it's taken,
   pick another (for example `com.yourname.cyberpsychosis`), and put the same one in
   `capacitor.config.ts` as `appId`.

## 3. Try it on your iPhone (optional)

1. Plug in the iPhone and pick it from the device menu at the top of Xcode.
2. Press **Run** (the ▶ button).
3. The first time, the phone asks you to turn on **Developer Mode** (Settings, Privacy & Security)
   and to trust your developer certificate (Settings, General, VPN & Device Management).

## 4. Create the app in App Store Connect

At [appstoreconnect.apple.com](https://appstoreconnect.apple.com): **Apps**, the **+** button,
**New App**.

| Field | What to enter |
|---|---|
| Platform | iOS |
| Name | Cyber Psychosis. This is the App Store name and must be unique; if it's taken, add something (for example "Cyber Psychosis Pinball"). The name under the icon stays as it is. |
| Primary language | English |
| Bundle ID | Pick `com.squidzombie.cyberpsychosis` from the list. If it isn't listed, run the app once from Xcode with your team selected (step 3), which registers it. |
| SKU | Anything private to you, for example `cyberpsychosis` |
| User access | Full access |

## 5. Upload a build (Xcode)

1. Set the device menu at the top to **Any iOS Device (arm64)**.
2. **Product, Archive.** When it finishes, the **Organizer** window opens.
3. Select the archive, then **Distribute App**, **App Store Connect**, **Upload**, and accept the
   defaults.
4. Apple processes the build for 5 to 30 minutes and emails you when it's ready in TestFlight.

## 6. Invite your friends (App Store Connect, TestFlight tab)

There are two kinds of testers:

- **Internal testers:** up to 100 people who are members of your App Store Connect team. No review,
  but each friend would need adding to your team, so this is mainly for you.
- **External testers:** anyone, up to 10,000. Use this for friends:
  1. Under **External Testing**, create a group (for example "Friends") and add the build.
  2. Fill in **Test Information**:
     - a short beta description (what the game is);
     - a feedback email;
     - your contact details for Apple's reviewer;
     - a few words under **What to Test** (for example: "Play a few games. Try to break in,
       start a job, and reach a multiball.").

     If it insists on a privacy policy link, a one-line page on squidzombie.com saying the game
     collects no data will do.
  3. The first build goes to **Beta App Review**, which usually takes under a day. Later builds of
     the same version usually go straight through.
  4. Invite friends by email, or turn on the **Public Link** and send them that.

Your friends install **TestFlight** from the App Store, open your invite or link, and tap
**Install**. They can send feedback and screenshots from inside TestFlight. Each build lasts 90
days.

You don't need screenshots, an App Store description or the privacy questions for TestFlight.
Those are for an App Store release.

## Uploading a new version

Each upload needs a higher build number:

1. In Xcode: **App** target, **General**, **Identity**, raise **Build** (2, 3, 4…).
2. Change **Version** too when you want testers to see a new version (0.21 and so on).
3. Run `npm run ios`, then **Product, Archive**, and upload as in step 5.

TestFlight tells your testers there's an update.

## No Mac?

The build and upload can run in the cloud on a Mac from GitHub Actions or a service such as
Codemagic. That needs these stored as secrets with the service:

- an **App Store Connect API key**, from App Store Connect, Users and Access, Integrations;
- your **signing certificate**.

Ask, and the workflow can be added to this repo.

## Worth adding later

- **Haptics:** a light buzz on each flipper press and a heavy one on a tilt (`@capacitor/haptics`).
- **The home-screen name:** "Cyber Psychosis" may be cut short under the icon on smaller phones.
  If it is, set a shorter **Display Name** in Xcode's General tab (for example "Psychosis").
