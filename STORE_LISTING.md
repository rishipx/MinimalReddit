# Store submission notes

Copy for the Chrome Web Store and AMO dashboards. Not part of the extension package.

**Single purpose:** declutter and restyle Reddit, with optional media tools.

**Short description:** Declutter Reddit with 70+ toggles, themes, content filters, keyboard navigation and media tools.

**Permission justifications**

- `storage`: saves settings and theme.
- `unlimitedStorage`: an optional custom background image can exceed the default quota.
- `scripting`: loads the bundled crop, measure and forensics scripts into the current tab when the user opens them. No remote code.
- `contextMenus`: right-click actions for links and media.
- `downloads`: saves media the user chooses to download.
- `reddit.com`, `redd.it`: the content script, and Reddit-hosted media for the media tools.
- `api.pullpush.io`, `arctic-shift.photon-reddit.com`: optional removed-comment lookup. Only the comment ID is sent, only when the user clicks the archive button.

**Data disclosure:** nothing is collected by the developer. Two optional actions send data to third parties: the comment ID (archive lookup) and the image URL (reverse image search, in a new tab). Privacy policy URL: https://github.com/rishipx/minimal-reddit/blob/main/PRIVACY.md

**AMO reviewer notes:** the package is the source. `npm run build` only zips the files and generates the Firefox manifest (`scripts/firefox-manifest.mjs`). Firefox users approve Reddit site access in the extension's permissions panel.

**Listing text to include:** "Not affiliated with Reddit, Inc."
