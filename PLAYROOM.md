# Bounded Playroom service trial

Open [Host](./host.html) and [Viewer](./viewer.html) on their respective devices. Roles are fixed; the [old link](./playroom.html) is now a chooser. The public browser gameId is prefilled. The SDK loads from the official documentation's CDN example only after **Connect to Playroom** is clicked.

1. Host page: leave room blank and Connect.
2. Viewer page: enter the Host room code and Connect.
3. Check both display the same room and different player IDs. Source role does not need to match the elected host; RPC uses OTHERS.
4. On Source choose full PNG or changed 32px tiles, then **Send 10 frames at 1 fps**.
5. Immediately click the viewer canvas and type slowly during frames 1-9. Each click/letter cycles the number after `const demo =`; the canvas action never sends characters. The separate Shared text box sends its contents as text.
6. Close both tabs after the trial. Reload BOTH tabs and reconnect for a fresh run or another mode.

## Diagnosing input

- Local inputs: the viewer detected a click/key.
- Action send attempts: the local gates passed and RPC.call was invoked; this is not receipt confirmation.
- Source RPC callbacks / action callbacks: the source handler was reached / decoded an action.
- Source actions applied: the demo number changed while the run was active.
- Confirmed source replies: the viewer received an applied/rejected RPC response.
- Image acknowledgement: the viewer drew a frame containing the acknowledged demo action.

Input before the first frame, after frame ten, outside the recent-frame window, or within the half-second throttle explains the gate in the UI. Source receipts after the run are counted but rejected. An old room URL fragment is cleared before connecting so the entered room choice wins. If send attempts rise while source callbacks remain zero, compare room/player IDs. The source's frame attempts also do not prove viewer receipt.

## Limits

Two participants; 160x96 generated canvas; ten frame attempts over ten seconds per connection; twenty fixed input actions at most, throttled to two per second. Outgoing application JSON is capped at 8 KiB/message and 64 KiB/tab. SDK signaling, RPC wrappers/responses and network overhead are excluded from those counters. Close the tabs to terminate the SDK connection after the bounded frame run.

These caps are experiment choices, not Playroom guarantees. Numeric service limits and suitability for image streaming remain unverified. Changed tiles need an initial full frame; a missing sequence requires a fresh run. Keep both windows visible to reduce browser throttling. Input-to-image timing includes frame scheduling, encoding, transport, decoding and drawing, but not physical screen presentation.

## Verification status

Twenty local tests pass, including a mocked viewer-to-source RPC response and inactive-run rejection. No live Playroom round-trip was verified by automation; browser startup was blocked. The user's reported live input-delivery symptom is not proven fixed. Static deployment checks only establish that files are hosted correctly.

The public gameId comes from the user's Playroom project. No credentials or account changes are part of this repository. If using a different project, enter its public gameId in the page. The SDK CDN URL follows the official unversioned example; future SDK changes may require checking compatibility.

Official references:

- https://docs.joinplayroom.com/setup
- https://docs.joinplayroom.com/api-reference/js/InitOptions
- https://docs.joinplayroom.com/api-reference/js/RPC/register
- https://docs.joinplayroom.com/api-reference/js/RPC/call

## Shared textarea

After both participants connect, type in the Viewer Shared text textarea and read it in the Source panel. No frames need to run. Clear and Backspace are shared as full snapshots, including an empty string. Text snapshots use a separate RPC with a 400 ms debounce, maximum two attempts/sec, a 1,024-character limit, and an 8 KiB message limit. Composition waits until completion; newer revisions supersede older snapshots. The source uses textContent, so markup stays literal. Pending text is canceled on disconnect. Disconnect reloads the document to unload the SDK; reconnect requires Connect again. No persistence is provided.

Text delivery has a three-second receipt timeout and no automatic retries. Send current text retries explicitly, including after reconnect or when the Source joins late. Test coverage includes edits/clear, rapid changes, composition, disconnect/reconnect, stale revisions, limits, and receipt timeout. These remain mocked local tests; real Playroom exchange has not been verified by automation.

Opening Viewer now immediately displays an editable textarea even before connection or after a lost connection. Offline edits stay as a local draft and send nothing. Connect, then use Send current text to send an existing draft; subsequent edits are debounced automatically. Opening Host shows only the read-only received-text panel. The old initial disabled attribute and connection-only role update caused the textbox to be unfocusable while not yet connected; those gates are removed. The image run never controls textarea editability. These state transitions are covered by local tests; no live browser/overlay verification is claimed.
