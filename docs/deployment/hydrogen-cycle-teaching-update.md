# HydroCycle website update

Existing project: `appgprj_6a90c3906d348191a7246cec80b63c6e`.
Existing public URL: https://hydrocycle-simulator.underswitch.chatgpt.site
Website source commit: `e990f68fdf2f4de40a4ea3e0d7c517c2b201af55`.

The legacy root source layout was repaired by adding the matching root hosting
manifest and a build wrapper that copies the existing Vinext application output
to the repository root `dist`. Existing Summary, Workbench and Test Runs were
preserved. A mobile-friendly “HC-IF-601 teaching model” link opens the corrected
independent teaching asset.

Validation completed:
- Web formatting, ESLint, TypeScript, 23 component tests and Vite build.
- Vinext hosted production build.
- Three teaching-model preset regressions.
- Isolated headless Chromium: all three existing screens at 1536×1024 and
  390×844; no mobile overflow; teaching link and fired preset worked;
  zero page runtime errors. The teaching asset loaded its real external CDN.
- Earlier instrumented simulator QA checked zero-fuel burn, exact TDC/BDC
  clearance, update batching, stable torque geometry and stable GPU counts.

Sites confirmed publication succeeded for version **8** at the existing URL.
Deployment: `appgdep_6abc87f87c288191a9daa765413d9957`.
Saved version: `appgprj_6a90c3906d348191a7246cec80b63c6e~appgver_8c557235ff4881919d5ce89e1757a57c`.
The current audience remained public. No GitHub pull request was merged.
Full repository/model/mobile gates were not run; the relevant web and hosted
build checks passed. Native deployment status confirms publication; production
browser acceptance was not repeated after publishing.
