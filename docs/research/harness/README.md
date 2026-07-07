# Research harness — the acting curator's workbench

Offline scripts. Nothing in production imports or calls them; the deployed
app is specs + WASM + agent skills only. Exactly one artifact crosses from
here into the app: `style_background_v1.json` (a counted frequency table,
reviewed and versioned into the finalizer WASM).

Contents: instrument calibration and bake-off, mirror-negative calibration,
fusion analysis, the VOICE.md builder, and `voice_check_local.py` — a Python
mirror of the WASM checker used only for pre-flight iteration. The mirror is
a known dual-implementation risk and is scheduled for deletion once the
conformance endpoint exposes the real WASM checker as a governed action
(RFC-0002 roadmap): agents will pre-flight against the actual instrument.

Longer-term convergence with the Temper vision: bands derivation and
VOICE.md building move into the curator skill (session work), and background
regeneration becomes a curation job type whose output enters through a
governed action. This directory shrinks as the platform absorbs it.
