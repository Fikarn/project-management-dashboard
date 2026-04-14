# UI Console Refresh Plan

## Goal

Make the app feel like a polished, dense, desktop-first studio control console that lives permanently on a second monitor.

Constraints:

- No page scrolling during normal use on the main dashboard views
- Optimized for 2560x1440
- Fully usable at 1920x1080 minimum
- Preserve current behavior unless a UX change is clearly warranted

## Audit Summary

The current interface already has the right dark studio tone, but the main shell still behaves like a centered web app instead of a fixed console. The largest issues are:

- too much vertical budget spent on top-level chrome
- no shared viewport contract across dashboard, lighting, audio, planning, and setup
- inconsistent density, hierarchy, and status treatment between views
- setup still uses a document-style stacked page instead of a commissioning workspace

## Implementation Plan

### Batch 1: Shared Shell And Layout Contract

- Replace the current page shell with a fixed-height console frame
- Compress the top header into a denser command and status area
- Introduce shared layout and panel primitives for console surfaces
- Reset or version persisted UI and resizable layout keys where needed
- Add viewport-fit checks for the primary dashboard views

### Batch 2: Dashboard And Planning

- Remove redundant intro chrome from the planning view
- Tighten spacing and improve hierarchy for fast scanning
- Use fixed-height board columns with designated internal overflow
- Improve planning as a secondary workspace, not a hero surface

### Batch 3: Lighting

- Rework lighting into a denser operator surface
- Reduce card height and tighten control groupings
- Improve global controls, status visibility, and sidebar balance
- Keep internal panel scrolling local to lighting content where required

### Batch 4: Spatial Studio Layout

- Turn the spatial lighting view into a production-grade studio plot surface
- Add an explicit in-canvas operator rail instead of relying on hidden gestures
- Improve studio orientation, marker handling, and node readability for fast scanning
- Make live interactions safer by separating preview actions from persisted changes
- Add dedicated spatial viewport and interaction validation

### Batch 5: Audio

- Replace the generic mixer with a fixed Fireface UFX III console model
- Keep front preamps 9-12 as the primary live input surface, with rear line inputs 1-8 secondary
- Add software playback returns and explicit output mix targets for main XLR and both headphone outs
- Remove unsafe write-on-open behavior and rely on safe OSC transport startup instead
- Improve live safety with guarded 48V control, verified meter return status, and corrected snapshot recall
- Keep the full control room and source surface usable at 1920x1080 without page overflow

### Batch 6: Setup And Onboarding

- Convert setup into a fixed commissioning workspace
- Align setup and the setup wizard with the same console primitives
- Improve onboarding polish and hierarchy without changing core setup behavior

### Batch 7: Final Consistency Pass

- Unify empty states, modal styling, motion, and status badges
- Normalize typography, spacing rhythm, and panel language across views
- Resolve remaining inconsistencies and polish issues

## Validation

After each substantial batch:

- run `npm run lint`
- run `npm run build`
- run targeted tests when behavior changes

Add viewport-focused validation for:

- dashboard at 1920x1080
- lighting at 1920x1080
- lighting spatial studio view at 1920x1080
- audio at 1920x1080
- setup at 1920x1080
