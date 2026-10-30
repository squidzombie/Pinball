# App icon and launch screen

| File | What it is |
|---|---|
| `icon.svg` | The app icon: the table's top-down brain as a neon tube on dark steel. Square and full bleed; iOS rounds the corners. |
| `brain.svg` | The same brain on transparent, for the launch screen. |
| `splash.html` | The launch screen, 2732 × 2732: black, the brain and the logo, kept inside the middle of the square because a phone crops the sides. |
| `render.cjs` | Renders an SVG or HTML file to a PNG with Playwright. |

The rendered files live where they're used:

- `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`: the 1024 × 1024 icon (no
  transparency, as the App Store requires);
- `ios/App/App/Assets.xcassets/Splash.imageset/`: the launch screen, three copies;
- `public/icon.svg` and `public/apple-touch-icon.png`: the web version's icons.

To redraw them after changing a source (from the repo root, with Playwright and Chromium):

```bash
# the icon: wrap the SVG in a page, then render it
printf '<body style="margin:0"><img src="file://%s/art/app/icon.svg" width="1024" height="1024">' "$PWD" > /tmp/icon.html
SRC=/tmp/icon.html OUT=ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png W=1024 node art/app/render.cjs
# the launch screen
SRC=$PWD/art/app/splash.html OUT=/tmp/splash.png W=2732 node art/app/render.cjs
for f in splash-2732x2732.png splash-2732x2732-1.png splash-2732x2732-2.png; do cp /tmp/splash.png ios/App/App/Assets.xcassets/Splash.imageset/$f; done
```

Screenshots come out with no transparency already. If you export the icon some other way, make
sure it has no alpha channel, or App Store Connect rejects the upload.
