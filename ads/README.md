# VibeVerse AdSense deployment and ad placement plan

## Live configuration — 17 November 2026

Original live application: https://vibeverse-bright-studio.vercel.app/

Publisher: `ca-pub-3767027718493089`.

The site owner verified ownership in Google AdSense and submitted the website for review. **Site approval and advertising revenue are NOT confirmed.**

The live **root homepage only** is now served by a public, minimal Vercel project (`vibeverse-adsense-homepage`) via an exact `/` rewrite rule on the original project (`vibeverse-bright-studio`). The replacement HTML differs from the original production HTML only by one AdSense loader script inserted before `</head>`. All other app routes, assets and backend endpoints still use the original live deployment. The existing exact `/ads.txt` rule is unchanged.

- Live root: `/` — returns HTML containing the publisher script.
- Ads authorization: `/ads.txt` — HTTP 200, `google.com, pub-3767027718493089, DIRECT, f08c47fec0942fa0`.
- Checked: `/api/status`, `/app.js`, `/styles.css`, `/account.html`, `/wallet.html` — HTTP 200.
- Production routing version after change: `1e975fe6-3709-4de4-8d27-6dcf4d3e0e20`.
- Earlier ads.txt-only route version: `5df9ff74-8706-45aa-9187-8937d4b1db34`.
- Public bridge: https://vibeverse-adsense-homepage-brightusiabulu0-1852.vercel.app/

## Important deployment limitations

This approach avoids redeploying incomplete recovery sources. It only changes responses for the exact root path. It does **not** add ads automatically to subpages or guarantee that third-party scripts render in user browsers. If the homepage HTML changes later, refresh both the bridge and source snapshot before further updates. The bridge must remain available while the root rewrite is active.

If an issue occurs, use Vercel Routes to **restore the earlier ads.txt-only version** above. Do not overwrite the original production app with the incomplete GitHub snapshot.

## Placement preparation — NOT ENABLED

`placements.js` provides a disabled-by-default placement-planning utility. No live feed advertising was enabled or monetization revenue promised.

After AdSense reports the website **Ready**, create separate official AdSense In-feed ad units in **Ads > By ad unit > In-feed ads**, preferably for the photo/list feed first. Follow Google's exact generated code (including any layout key), and place it **between actual feed items**. Avoid blocking video playback and keep ads distinctly labeled `Advertisements`. Do not incentivize ad clicks or artificially refresh ad units. For native apps use a separately compliant mobile ad strategy.

Before turning on ad placements, review consent handling and content policies, especially for minors and user-uploaded content. Do not put ads into private messages or on prohibited content.

## References
- https://support.google.com/adsense/answer/7584263
- https://support.google.com/adsense/answer/9274643
- https://support.google.com/adsense/answer/9189560
- https://support.google.com/adsense/answer/1346295
