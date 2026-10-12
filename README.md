# PlayroomScreenTest

A small browser-only synthetic canvas experiment. No screen capture or operating-system input. The default page exchanges generated PNG images between tabs through BroadcastChannel. The optional Playroom page exchanges a tiny generated canvas, fixed demo actions, and explicit textarea content through Playroom RPC.

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

`npm test` runs sixteen tests covering tile changes and mocked synthetic input/RPC handling. JavaScript syntax checks pass. Mocked tests and static hosting checks are not real Playroom delivery evidence. Live browser automation was unavailable during development; the reported live input issue has not been reproduced or proven resolved. On-screen diagnostics separate detection, send attempts, receipt, application, and image acknowledgement.

Generated pixels, fixed demo actions, and the contents of the explicitly labeled Viewer textarea are sent through Playroom. The local baseline's dummy text stays in same-origin browser tabs. No OS capture, native input injection, shell execution, remote-desktop functionality, or stored credentials are included.

### Shared text (independent of frames)

Connect Source and Viewer, then type in the Viewer's Shared text box. The Source displays the received content as read-only text before, during, and after the image run. Changes, Backspace, paste, and clearing send content snapshots after a 400 ms pause, at most twice per second. IME composition is sent after completion. Limits: 1,024 characters and 8 KiB per text snapshot; text has a separate budget from images and no frame-window gate. Text is not stored by this application.

Receipt status confirms a Source response, not merely a send attempt. If Source joined later or a response timed out, use Send current text. Disconnect unloads the SDK by reloading the page into its initial disconnected state; pending edits are canceled and unsent text is discarded. Reconnect explicitly. Share only text intended for the other participant. This is ordinary in-app content sharing, not keyboard forwarding.

## Separate pages

Use [Host](./host.html) on the receiving device and [Viewer](./viewer.html) on the typing device. Roles are fixed; no selector is needed. The old service link is now a chooser. Connect Host first, copy its room code into Viewer, and Connect there. The Viewer textarea is editable immediately for local drafts; after connection, edits are shared. Use Send current text for a draft entered before connecting. Images remain a separate bounded test controlled by Host.
