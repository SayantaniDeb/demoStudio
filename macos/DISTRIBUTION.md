# Website download

The homepage links to `/downloads/DemoTake-Mac-AppleSilicon.dmg`. Vite serves it from `public/downloads` and copies it into the website build. The disk image includes the app, an Applications shortcut, and installation instructions.

Run `npm run mac:release` on an Apple silicon Mac to build the app, package the disk image with its SHA-256 checksum, and build the website with the current download. Packaging requires permission to create a disk image. Native app resources exclude website downloads to prevent recursive installer bundling.

Current requirements: Apple silicon, macOS 15 or later. This is an ad-hoc signed developer preview. The website deliberately discloses that it is not notarized. A warning-free public distribution requires a Developer ID Application certificate, hardened runtime signing, notarization, and stapling before replacing the download. Do not describe this preview as notarized.

Publishing the website must include the generated `public/downloads` artifacts (or the corresponding files in `dist/downloads`). Updating local code does not publish the website to a hosting provider.
