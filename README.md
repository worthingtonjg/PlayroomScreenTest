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

`npm test` runs twenty-seven tests covering tile changes and mocked synthetic input/RPC handling. JavaScript syntax checks pass. Mocked tests and static hosting checks are not real Playroom delivery evidence. Live browser automation was unavailable during development; the reported live input issue has not been reproduced or proven resolved. On-screen diagnostics separate detection, send attempts, receipt, application, and image acknowledgement.

Generated pixels, fixed demo actions, and the contents of the explicitly labeled Viewer textarea are sent through Playroom. The local baseline's dummy text stays in same-origin browser tabs. No OS capture, native input injection, shell execution, remote-desktop functionality, or stored credentials are included.

### Shared text (independent of frames)

Connect Source and Viewer, then type in the Viewer's Shared text box. The Source displays the received content as read-only text before, during, and after the image run. Changes, Backspace, paste, and clearing send content snapshots after a 400 ms pause, at most twice per second. IME composition is sent after completion. Limits: 1,024 characters and 8 KiB per text snapshot; text has a separate budget from images and no frame-window gate. Text is not stored by this application.

Receipt status confirms a Source response, not merely a send attempt. If Source joined later or a response timed out, use Send current text. Disconnect unloads the SDK by reloading the page into its initial disconnected state; pending edits are canceled and unsent text is discarded. Reconnect explicitly. Share only text intended for the other participant. This is ordinary in-app content sharing, not keyboard forwarding.

## Separate pages

Use [Host](./host.html) on the receiving device and [Viewer](./viewer.html) on the typing device. Roles are fixed; no selector is needed. The old service link is now a chooser. Connect Host first, copy its room code into Viewer, and Connect there. The Viewer textarea is editable immediately for local drafts; after connection, edits are shared. Use Send current text for a draft entered before connecting. Images remain a separate bounded test controlled by Host.

## Measurements

The panel reports text request-to-source-ack RTT, image-send-to-viewer-draw-ack RTT, and canvas-action-to-source-reply RTT. Each uses performance.now() on the sender, avoiding cross-device clock assumptions. Last and mean values include only matching replies; attempt counts are not delivery counts. Text timing starts after debounce; image timing starts after encoding and includes remote decode/draw plus the reply. Neither measures one-way latency or physical display presentation.

Application byte counters count UTF-8 message bodies and replies (including PNG base64). They exclude RPC envelopes, SDK signaling, network headers, encryption, retransmissions and transport overhead. They are not measured network bandwidth. Reset and reconnect clear measurement counters and invalidate old pending samples; neither overrides frame/traffic limits. No probes or periodic traffic were added.

Manual comparison: reset both panels, send a short text and clear it; record Viewer text RTT and Host receipt count. Start one ten-frame image run and record Host draw-ack RTT and Viewer frame receipts. Repeat after explicitly reconnecting, optionally with the Viewer on another network. No cross-network or physical-device timing results are claimed by the automated tests.

## Larger full-frame / tile comparison

Keep the existing 160x96 interactive test, or select a fixed 320x192 or 640x360 scene on Host. Choose Full PNG, connect Viewer, and click Send. Before transmission the browser loads the ten pre-encoded synthetic comparison frames and checks the unchanged 8 KiB/message and 64 KiB image-session caps. Oversize runs send no image frames; choose a smaller size. Larger frames use verified four-color PNG fixtures, independent of browser font rasterization and PNG encoding.

For comparison, note Image request bytes only, matched image acknowledgements, and image RTT. Reload BOTH pages, reconnect, select the SAME size with Changed tiles, and run again. Each fixed comparison uses the same ten animation positions and initial value; canvas actions cannot alter it. Avoid unrelated text edits during timing comparisons. Text sharing still works independently and its payload bytes are excluded from the image-only counter. Preflight totals exclude reply/SDK overhead. Starting the image run resets measurements, but never raises the traffic caps.

Changed mode sends one full baseline followed by 32px tiles. The Viewer validates dimensions and sequence; missing delta baseline yields a rejection, stopping subsequent sends when the Host receives it. No automatic retries or keyframe traffic is added. A missing acknowledgement remains unmatched in the counter; it is not assigned a latency value. Full frames can recover from sequence gaps. Image RTT still starts after encoding and includes decode/draw plus acknowledgement, not one-way latency or screen presentation.

Twenty-seven local tests cover deterministic draw commands, byte caps, dimension/baseline validation, RTT/byte counters, and existing input behavior. Actual PNG payload sizes are verified offline. Live browser/service performance for the corrected larger fixtures remains unmeasured by automation.

### Verified comparison payload sizes

The former larger browser-canvas PNGs could exceed the cap. The corrected comparison uses a simple four-color scene (code-like rows and a moving square) encoded ahead of time. The same fixture messages are sent by the browser and measured by offline tests. No limit was increased, and no chunking was added.

| Size | Mode | Largest JSON message | Ten-frame JSON total |
| --- | --- | ---: | ---: |
| 320x192 | Full | 439 B | 4,349 B |
| 320x192 | Tiles | 1,304 B | 9,851 B |
| 640x360 | Full | 535 B | 5,301 B |
| 640x360 | Tiles | 907 B | 6,930 B |

These are actual serialized application messages, including base64 and metadata, excluding RPC/network overhead. All four combinations fit the unchanged 8,192 B/message and 65,536 B/session caps. This sparse scene compresses extremely well as a full PNG, so tile overhead produces more bytes here. This is not evidence about real screen-content compression.

`node build-fixtures.mjs` regenerates fixtures with Node's zlib encoder. Tests validate PNG checksums, decompress every patch, reconstruct every frame and compare both modes with the deterministic scene. Browser rendering and live Playroom performance remain unverified by automation because the browser runtime cannot start. The old 160x96 interactive mode is unchanged.
