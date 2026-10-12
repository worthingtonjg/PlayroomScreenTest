# PlayroomScreenTest

A small browser-only synthetic canvas experiment. No screen capture or operating-system input. The default page exchanges generated PNG images between tabs through BroadcastChannel. The optional Playroom page exchanges a tiny generated canvas and fixed demo actions through Playroom RPC.

## Open

- Local baseline: `index.html` through a web server, or the published site's root.
- Optional service trial: [playroom.html](./playroom.html).
- Local server: run `npm start`, then open http://127.0.0.1:4173.

Node.js is needed only for the local server and tests. No install/build step is required. GitHub Pages serves the static HTML and JavaScript; it does not run the Node server.

## Baseline

Open the viewer using the source page's link and keep both windows visible. Compare full PNG frames against changed 64px tiles at the same frame rate (1, 2, or 5 fps). Source counters reset on mode change. Runs pause after 60 seconds. Click/type in the viewer to modify only the fake canvas; use dummy text.

PNG bytes count image payloads. JSON bytes include base64 and metadata, but exclude transport overhead and control messages. Average rates include pauses, so reset counters before comparing equal-duration runs. Background-tab throttling affects results. These local measurements do not establish Playroom bandwidth or network latency.

## Playroom trial

See [PLAYROOM.md](./PLAYROOM.md). The public project gameId is prefilled. Connect is explicit; opening the page does not start an external session. The trial is capped at two participants, ten tiny frames at 1 fps, twenty fixed input actions, 8 KiB per application message and 64 KiB sent per tab. These are test caps, not published service limits.

## Verification

`npm test` runs seven tests covering tile changes and mocked synthetic input/RPC handling. JavaScript syntax checks pass. Mocked tests and static hosting checks are not real Playroom delivery evidence. Live browser automation was unavailable during development; the reported live input issue has not been reproduced or proven resolved. On-screen diagnostics separate detection, send attempts, receipt, application, and image acknowledgement.

Only generated pixels and fixed demo actions are sent through Playroom. The local baseline's dummy text stays in same-origin browser tabs. No OS capture, native input injection, shell execution, remote-desktop functionality, or stored credentials are included.
