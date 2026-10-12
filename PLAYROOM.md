# Bounded Playroom service trial

Open [the service page](./playroom.html) in two tabs or windows. The public browser gameId is prefilled. The SDK loads from the official documentation's CDN example only after **Connect to Playroom** is clicked.

1. First tab: choose **Source**, leave room blank, and Connect.
2. Second tab: choose **Viewer**, enter the source's displayed room code, and Connect.
3. Check both display the same room and different player IDs. Source role does not need to match the elected host; RPC uses OTHERS.
4. On Source choose full PNG or changed 32px tiles, then **Send 10 frames at 1 fps**.
5. Immediately click the viewer canvas and type slowly during frames 1-9. Each click/letter cycles the number after `const demo =`; actual characters are never sent or displayed as text.
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

Seven local tests pass, including a mocked viewer-to-source RPC response and inactive-run rejection. No live Playroom round-trip was verified by automation; browser startup was blocked. The user's reported live input-delivery symptom is not proven fixed. Static deployment checks only establish that files are hosted correctly.

The public gameId comes from the user's Playroom project. No credentials or account changes are part of this repository. If using a different project, enter its public gameId in the page. The SDK CDN URL follows the official unversioned example; future SDK changes may require checking compatibility.

Official references:

- https://docs.joinplayroom.com/setup
- https://docs.joinplayroom.com/api-reference/js/InitOptions
- https://docs.joinplayroom.com/api-reference/js/RPC/register
- https://docs.joinplayroom.com/api-reference/js/RPC/call
