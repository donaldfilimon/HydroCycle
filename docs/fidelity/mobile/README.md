# Expo iOS Simulator acceptance

Date: 2026-08-28  
Target: iPhone 17 Pro Max simulator, iOS 27.0  
Runtime: Expo Go 2.33.17, Expo SDK 53, React Native 0.79.6

These captures are native Expo/React Native acceptance evidence, separate from
the responsive-browser captures elsewhere in `docs/fidelity`.

## Live stack

The model service and Vite client were started with `bun run dev`, using an
isolated temporary SQLite database and attachments directory so acceptance did
not modify the normal HydroCycle data store. The mobile app was started with
`bun run ios` and connected through `exp://127.0.0.1:8081`.

The operating-system listener audit reported only loopback sockets:

```text
TCP 127.0.0.1:5173 (LISTEN)  Vite
TCP 127.0.0.1:8000 (LISTEN)  FastAPI/Cantera
TCP 127.0.0.1:8081 (LISTEN)  Expo/Metro
```

This audit matters because Expo SDK 53's `--localhost` option controls its
advertised URL but, without HydroCycle's Metro listener guard, the underlying
Node server opens an IPv6 wildcard socket.

## Exercised flow

- **Summary:** the canonical contract fixture returned a failed feasibility
  gate with `insufficient_h2` and `preheat_deficit`. The app displayed the
  motored baseline only, withheld the proposed reactive cycle, identified the
  derived loading basis, and showed solver reproducibility metadata.
- **Workbench:** compression ratio `14` and speed `2400 rpm` round-tripped
  through the local model service. The failed gate displayed motored scalar
  pressure and temperature traces only, explicitly labeled homogeneous 0D and
  not CFD. Switching tabs and returning preserved both the edits and result.
- **Test Runs:** an empty non-synthetic draft was created in the isolated
  database. The native list showed one unmeasured run, zero simulations, and
  em dashes for the null operator and sample fields. A direct API readback
  confirmed `operator: null`, `sample_id: null`, and an empty simulation list.

## Captures

- `summary-ios-simulator.png`
- `workbench-ios-simulator.png`
- `workbench-result-ios-simulator.png`
- `test-runs-ios-simulator.png`
- `summary-ios-accessibility-large-voiceover.png`
- `summary-android-large-text-talkback.png`
- `android-talkback-accessibility.txt`

## Continuation acceptance

The 2026-08-28 continuation pass used the same isolated loopback service and
added these checks:

- **Android emulator:** `gama_api36_arm64`, Android 16 / API 36, Expo Go
  2.33.22. The live app reached the host service only through the emulator's
  `10.0.2.2` loopback alias. The Android accessibility tree exposed named,
  selected Summary/Workbench/Test Runs tabs and the failed-gate content.
- **TalkBack manual observation:** Android Accessibility Suite's TalkBack
  service was enabled and bound with its declared spoken, haptic, and audible
  feedback modes plus touch exploration. Keyboard accessibility navigation
  focused the native `Re-run simulation` button by its React Native
  accessibility label. A concise settings/tree observation record is retained
  in `android-talkback-accessibility.txt`; raw command output and spoken audio
  were not recorded or graded.
- **Large text:** Android `font_scale=1.5` and iOS
  `content_size=accessibility-large` both preserved the critical gate values,
  failure reasons, motored-only statement, scrolling, and tab navigation in the
  captures above.
- **VoiceOver configuration:** the iOS simulator preference readback reported
  `VoiceOverTouchEnabled=1` during the session, but that raw output was not
  retained. Component tests independently verify tab roles, selected state,
  control labels, and chart summaries; the screenshot proves large-text layout,
  not VoiceOver focus or speech.
- **Android bundle:** the root mobile gate now exports both iOS and Android
  Hermes bundles. A platform that stops bundling fails the gate.

Run `bun run --cwd apps/mobile acceptance:ios` or `acceptance:android` to start
an isolated API/database/attachment store and loopback-only Metro session. The
Android command expects an emulator and Expo Go to already be installed. Add
`--smoke` to require Metro to serve the current platform bundle after the Expo
Go deep link. Android additionally verifies current content in the native
accessibility tree by checking HydroCycle's screen identity, canonical
fixture text, and model-service-online state; it does not automate control-role
or operability checks. iOS records a nonempty simulator screenshot but does not
automatically grade its content. The harness independently checks the isolated
model health endpoint and both listener addresses. It does not enable TalkBack
or grade speech.

`bun run --cwd apps/mobile export:simulator-bundles` creates a checksummed audit
archive containing lockfile-pinned iOS and Android Hermes exports and recorded
tool versions. It proves both bundles compile; it is not directly installable
or loadable by Expo Go and is not a simulator app binary. The checksum verifies
one artifact's integrity; byte-identical Hermes output across rebuilds is not
claimed because unchanged-source repeatability testing produced different
bundle hashes.

Physical-device, TestFlight, and App Store validation are not represented by
these artifacts and remain explicitly outside V1: those targets cannot reach a
host service that remains bound to `127.0.0.1`.
