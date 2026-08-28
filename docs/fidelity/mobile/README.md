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

Physical-device, TestFlight, and App Store validation are not represented by
these artifacts and remain explicitly outside V1: those targets cannot reach a
host service that remains bound to `127.0.0.1`.
