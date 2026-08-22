# CAD Lab refurbishment seed

This branch mounts the focused legacy CAD prototype at `/cad-lab/index.html` and links it from the Legendary OS navigation.

## Source decision

Two old single-file demos were reviewed:

- The larger dashboard/CAD hybrid contains useful ideas but also duplicated auth handling, unrelated R2/YouTube surfaces, obsolete navigation, and many placeholder API calls.
- The smaller CAD-only page is the safer visual seed because it isolates the planning workspace.

The mounted page is a containment step, not the target architecture.

## Prototype boundaries

- Save is browser-local only.
- AI generation is visibly disconnected.
- No legacy bearer-token handling is introduced.
- No CAD, upload, export, or AI backend contract is implied.
- The existing Legendary OS dashboard and production routes remain unchanged.

## Refurbishment direction

The next iteration should rebuild the useful concepts as typed React modules inside `frontend/src`, with stable backend contracts added only after the core user workflow is chosen:

1. Project and property context.
2. Upload a plan/photo.
3. Calibrate scale and measure.
4. Produce takeoff quantities and estimate inputs.
5. Save a versioned project artifact.
6. Export/share a customer-safe proposal.

Do not extend the legacy single-file JavaScript as the long-term implementation.
