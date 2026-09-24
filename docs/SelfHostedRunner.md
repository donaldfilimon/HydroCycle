# Self-hosted macOS runner

The two trusted CI jobs in `.github/workflows/ci.yml` run on a macOS arm64
runner registered to this repository:

| Job id  | Check name                  | Runs on                                   |
| ------- | --------------------------- | ----------------------------------------- |
| `check` | `Full gate (bun run check)` | `[self-hosted, macOS, ARM64, hydrocycle]` |
| `e2e`   | `Playwright e2e`            | `[self-hosted, macOS, ARM64, hydrocycle]` |

GitHub-hosted jobs cannot start while the account's Actions billing is locked
(they fail in about two seconds with no runner assigned), but self-hosted jobs
still run. The job ids and check names are unchanged, so branch protection that
keys on them keeps working.

## Registration

| Field       | Value                                                                                                                                                       |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Labels      | `self-hosted`, `macOS`, `ARM64`, `hydrocycle`                                                                                                               |
| Register at | [Settings → Actions → Runners → New self-hosted runner](https://github.com/donaldfilimon/HydroCycle/settings/actions/runners/new?arch=arm64) (macOS, ARM64) |

A runner is registered to one repository. If the same Mac already serves
another repository (for example the `abi` runner), install a second runner in
its own directory, such as `~/actions-runner-hydrocycle`, run `./config.sh`
from there with the URL and token GitHub shows, add the custom label
`hydrocycle` when asked, then run `./svc.sh install && ./svc.sh start`.

Configure the runner from a shell where Homebrew, Node.js and Bun resolve:
`config.sh` records that `PATH` in the runner's `.path` file, and the service
uses it. After installing a new tool, edit `.path` (or re-run the
configuration) and restart the service.

Until a runner with these labels is online, the self-hosted jobs wait in the
queue.

## Host requirements

- Xcode Command Line Tools (`xcode-select --install`) for `git` and the
  compilers native packages may need.
- Homebrew, used to install the tools below.
- Node.js 20.9 or newer on the runner `PATH` (`brew install node`). The
  GitHub-hosted Ubuntu image ships Node.js; Next.js 16, the mobile loopback
  probe and other package bins run under it. Both jobs fail fast with a clear
  error if it is missing.
- Google Chrome in `/Applications` for `e2e`. The Playwright projects use
  `channel: "chrome"`, which the hosted Ubuntu image provides. The job checks
  for it before it starts.
- Free loopback ports `8000`, `8787` and `5173` while `e2e` runs. Playwright
  starts the model, gateway and web servers itself and does not reuse a running
  dev server, so stop `bun run dev` on that Mac first, and do not give another
  runner on the same Mac jobs that listen on those ports at the same time.
- Nothing needs `sudo`. The jobs install per user:
  - Bun 1.4.0 through `oven-sh/setup-bun` into the runner tool cache.
  - uv through `astral-sh/setup-uv`.
  - Python from `services/model/.python-version` with `uv python install`
    into `~/.local/share/uv/python`. `actions/setup-python` is not used on this
    runner: its macOS builds only work from `/Users/runner/hostedtoolcache`.
    Every Python command in this repository already runs through uv.
  - Playwright's Chromium into `~/Library/Caches/ms-playwright`.
    `playwright install --with-deps` installs system packages only on Linux and
    Windows; on macOS it downloads the browser only.
- Enough disk for the Bun, uv and Playwright caches, plus the `apps/mobile`
  install and the Hermes bundle exports the gate runs. The iOS export does not
  need Xcode or a simulator.

## Security

This repository is public. The self-hosted jobs run only when
`github.repository == 'donaldfilimon/HydroCycle'` and the event is a `push`
to `main` or a pull request whose head branch is in this repository. Pull
requests from forks run the `check-hosted` and `e2e-hosted` jobs on
GitHub-hosted runners instead: untrusted code never reaches the Mac.
Checkouts use `persist-credentials: false`, and the workflow token stays
`contents: read`.

Where you can, run the runner as a dedicated macOS user rather than your daily
account, and keep no production secrets on the host.

## Jobs that stay GitHub-hosted

- `check-hosted` and `e2e-hosted` in `ci.yml`: fork pull requests only, by
  design.
- `build` and `deploy` in `.github/workflows/pages.yml`. They start from
  `workflow_run` on CI, which also completes for pull requests (a fork branch
  named `main` matches the `branches` filter), and `build` checks out and
  installs `github.event.workflow_run.head_sha`. Running that on the Mac would
  run untrusted code there. Moving them first needs a gate on
  `github.event.workflow_run.event == 'push'` and
  `github.event.workflow_run.head_repository.full_name == github.repository`.
  They stay blocked until the billing lock is cleared.
