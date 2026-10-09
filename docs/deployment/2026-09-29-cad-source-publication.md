# CAD source and Sites publication boundary, 2026-09-29

The CAD upgrade continues canonical `main` from the existing `93e9cba` change.
It preserves the separate in-progress model foundation work.

Sites project `appgprj_6a90c3906d348191a7246cec80b63c6e` was queried successfully.
It is active, public, owned by the user, and reports version 7 at
https://hydrocycle-simulator.underswitch.chatgpt.site.
That is the existing deployment, not evidence that this CAD update is live.

The current Sites source workflow was attempted with a short-lived credential.
It fetched source revision `d79e5e50d2ec70d2b57236ae99a40ee395924d4d`, then
stopped because that revision has no root `.openai/hosting.json`. The fetched
revision stores its manifest below `apps/site`; canonical main stores its prior
app-level manifest below `apps/web`. Neither supplies the root manifest
required by the current publisher.

The fetched Site history and canonical main also diverge. Their common
ancestor is `ee999db3ba5bfd599cc7eff276325a88e79a4d57`; the Site contains two
unique commits, `becd447` and `d79e5e5`. No force push, source replacement,
Site version save, deployment, or access-policy change was performed.
Reconcile those source changes into canonical main before a normal source
push and exact-version deployment. Do not treat a source commit as a deployment.

The new root `.openai/hosting.json` retains the exact project ID and declares
`apps/web/out` as its static directory. `bun run build:sites:static` exports the
current fixture-only Next application at root paths, including `/cad/`, without
local API rewrites. GitHub Pages retains its separate `/HydroCycle` build.

The artifact can be packaged from the repository root with the Sites hosting
packager after the static build. Saving/publishing it still requires the exact
source commit to be pushed to the reconciled Sites source branch. Keep the
existing public audience when that deployment is completed.
