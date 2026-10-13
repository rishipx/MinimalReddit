# Privacy

Minimal Reddit doesn't collect anything about you. There's no analytics, no telemetry, no ads, and no server of ours for data to go to.

**What it stores.** Your settings, and a custom background image if you add one. They live in your browser's extension storage and go away when you uninstall.

**What it sends, and only when you ask it to:**

- *Show archived comment* sends that comment's ID to PullPush (`api.pullpush.io`). If PullPush has nothing, it tries Arctic Shift (`arctic-shift.photon-reddit.com`). Both are third-party services with their own policies.
- *Reverse image search* opens Google Lens, Yandex, TinEye or Bing in a new tab with the image's URL in the address.
- Downloads and the media tools fetch files from `reddit.com` and `redd.it`, the same places your browser already loads them from.

**Debug info.** "Copy debug info" in the popup puts a report on your clipboard. It lists which selectors matched and a few stripped-down markup samples, without page text, links or your block lists. It isn't sent anywhere. Skim it before pasting it into a bug report.

If you don't want the archive or image-search lookups to happen, don't click those buttons. You can also turn the archive button off in the settings.

Questions or concerns: open an issue on the GitHub repository.
