---
name: La Subida
description: A 1990s jazz-noir anime cel laid over Torres del Paine, where the sensor HUD shows its error out loud.
colors:
  ink: "#141b2d"
  ink-2: "#1f2840"
  bone: "#f2e8d5"
  bone-dim: "#cfc4ad"
  mustard: "#e8b92f"
  oxblood: "#a3322a"
  teal: "#1f6f73"
  turq: "#3fb8af"
  danger: "#e2553f"
  granite: "#6f7d8c"
  glacier-water: "#7fd3e0"
  skin: "#d9a07a"
  sky-zenith: "#22406a"
  sky-steel: "#5f7fa0"
  sky-dawn: "#e9a95e"
  sky-horizon: "#f6d7a0"
  range-slate: "#7f8fa8"
  massif-slate: "#5f6d86"
  granite-lit: "#e9a77c"
  granite-shade: "#8f6670"
  snow: "#f2ece2"
  pampa: "#c99b45"
  pampa-shadow: "#bd8f3e"
  road: "#ae8a60"
  verge: "#e3d2ad"
  fog-haze: "#d9b48c"
  lenga-green: "#5d7a43"
  lenga-rust: "#c9643a"
typography:
  display: { fontFamily: "League Gothic, Oswald, Arial Narrow, sans-serif", fontSize: "clamp(5rem, 17vw, 8.5rem)", fontWeight: 400, lineHeight: 0.82, letterSpacing: "0.01em" }
  headline: { fontFamily: "League Gothic, Oswald, Arial Narrow, sans-serif", fontSize: "clamp(2.6rem, 7vw, 4.4rem)", fontWeight: 400, lineHeight: 0.9 }
  title: { fontFamily: "League Gothic, Oswald, Arial Narrow, sans-serif", fontSize: "1.9rem", fontWeight: 400, lineHeight: 1 }
  numeral: { fontFamily: "League Gothic, Oswald, Arial Narrow, sans-serif", fontSize: "2.3rem", fontWeight: 400, lineHeight: 1, letterSpacing: "0.03em", fontFeature: "tnum" }
  button: { fontFamily: "League Gothic, Oswald, Arial Narrow, sans-serif", fontSize: "1.55rem", fontWeight: 400, lineHeight: 1, letterSpacing: "0.04em" }
  body: { fontFamily: "Barlow Semi Condensed, Arial Narrow, system-ui, sans-serif", fontSize: "18px", fontWeight: 400, lineHeight: 1.4 }
  body-lead: { fontFamily: "Barlow Semi Condensed, Arial Narrow, system-ui, sans-serif", fontSize: "1.2rem", fontWeight: 400, lineHeight: 1.4 }
  data: { fontFamily: "Courier Prime, Courier New, monospace", fontSize: "0.9rem", fontWeight: 400, lineHeight: 1.2 }
  data-value: { fontFamily: "Courier Prime, Courier New, monospace", fontSize: "1.6rem", fontWeight: 700, lineHeight: 1, fontFeature: "tnum" }
  label: { fontFamily: "Courier Prime, Courier New, monospace", fontSize: "0.85rem", fontWeight: 700, lineHeight: 1 }
rounded:
  none: "0"
  key: "5px"
  chip: "10px"
  instrument: "12px"
  panel: "14px"
  hud: "18px 18px 0 0"
  pill: "999px"
  circle: "50%"
spacing:
  xs: "6px"
  sm: "10px"
  md: "14px"
  lg: "18px"
  xl: "26px"
components:
  button-ink: { backgroundColor: "{colors.ink}", textColor: "{colors.bone}", typography: "{typography.button}", rounded: "{rounded.pill}", padding: ".55em 1.15em .5em" }
  button-ink-hover: { backgroundColor: "{colors.ink-2}", textColor: "{colors.bone}" }
  button-ghost: { backgroundColor: "transparent", textColor: "currentColor", typography: "{typography.button}", rounded: "{rounded.pill}", padding: ".55em 1.15em .5em" }
  button-finale: { backgroundColor: "{colors.mustard}", textColor: "{colors.ink}", rounded: "{rounded.pill}", padding: ".55em 1.15em .5em" }
  icon-button: { backgroundColor: "{colors.bone}", textColor: "{colors.ink}", rounded: "{rounded.circle}", size: "46px" }
  keycap: { textColor: "currentColor", typography: "{typography.data}", rounded: "{rounded.key}", padding: ".12em .4em" }
  card-mustard: { backgroundColor: "{colors.mustard}", textColor: "{colors.ink}", rounded: "{rounded.none}", padding: "26px 30px 22px" }
  card-teal: { backgroundColor: "{colors.teal}", textColor: "{colors.bone}", rounded: "{rounded.none}", padding: "26px 30px 22px" }
  card-oxblood: { backgroundColor: "{colors.oxblood}", textColor: "{colors.bone}", rounded: "{rounded.none}", padding: "26px 30px 22px" }
  card-ink: { backgroundColor: "{colors.ink}", textColor: "{colors.bone}", rounded: "16px", padding: "26px 30px" }
  end-panel: { backgroundColor: "{colors.bone}", textColor: "{colors.ink}", rounded: "{rounded.panel}", padding: "18px 20px" }
  toast: { backgroundColor: "{colors.mustard}", textColor: "{colors.ink}", rounded: "{rounded.chip}", padding: "8px 18px 6px" }
  toast-bad: { backgroundColor: "{colors.oxblood}", textColor: "{colors.bone}" }
  toast-sensor: { backgroundColor: "{colors.turq}", textColor: "{colors.ink}" }
  clock: { backgroundColor: "{colors.ink}", textColor: "{colors.bone}", typography: "{typography.numeral}", rounded: "{rounded.instrument}", padding: "6px 14px 4px" }
  hud: { backgroundColor: "{colors.ink}", textColor: "{colors.bone}", rounded: "{rounded.hud}", padding: "8px 16px 10px", width: "min(1040px, 100%)" }
  gauge-bar: { rounded: "{rounded.pill}", height: "18px" }
  tab: { backgroundColor: "transparent", textColor: "{colors.ink}", typography: "{typography.label}", rounded: "{rounded.pill}", padding: "4px 12px" }
  tab-active: { backgroundColor: "{colors.ink}", textColor: "{colors.bone}" }
  touch-pad: { backgroundColor: "{colors.bone}", textColor: "{colors.ink}", rounded: "{rounded.circle}", size: "76px" }
---

# Design System: La Subida

## Overview

**Creative North Star: "Cel jazz-noir sobre Patagonia"**

Every surface is a hand-inked animation cel: flat fills, a thick night-blue outline, halftone dots where shadow falls, film grain over everything. The world is drawn live on canvas (Torres del Paine at dawn, a pseudo-3D dirt road, lenga flag trees bent by the wind) and the interface floats over it as color cards and instruments built from the same ink and paint. Nothing is photographic, nothing is glossy, nothing is flat-vector "clean".

The thesis is that the HUD is the argument. The sensor's readout is an estimate with its margin drawn as a band, and it can go dead: it drops to TV static, its LED turns red. The rider's body is the second instrument, with speech bubbles over the cyclist. The system deliberately rejects the clean, self-assured fitness dashboard. Story cards lean like cels slid under a camera; instruments stay level and bezeled, like gear.

Density is cinematic: one big card or one road scene at a time, condensed display type at poster scale, short Spanish copy.

**Key Characteristics:**
- One ink (#141b2d) outlines everything at 3px in CSS and at a unit-scaled width on canvas, with round joins and caps.
- Four flat card liveries (mustard, teal, oxblood, ink) over a dawn-lit Patagonian palette.
- Halftone dot screen and animated film grain as the only textures.
- Three type voices: condensed poster caps, a semi-condensed reading sans, and a typewriter mono for instruments.
- Estimates always come with a visible margin. Dead signal is shown as static, never hidden.

## Colors

A warm dawn palette (pampa gold, lit granite, steel sky) inked in night blue, with three saturated livery accents.

### Primary
- **Livery Mustard** (mustard): The signature. Title card, how-to card, end header, toasts, the finish arch, the route-progress fill, the "Mirador" tag, the stripe on the jersey and helmet, the focus ring, and the ± margins and the word "estima" in the HUD. It is text on ink and teal only at display sizes.

### Secondary
- **Oxblood Livery** (oxblood): The Nix and event cards, the rider's jersey and sleeves, "bad" toasts, the rider's position dot on the route, and the hatching on the chart's no-signal windows.
- **Petrol Teal** (teal): The tech-intro card, pause card, decision-type panel, the helmet, and the dashed "estimate" line in the end chart.

### Tertiary
- **Lake Turquoise** (turq): A signal that is alive and estimating. The live LED, the patch LED on the rider, the dotted error band in the gauges, the chart error band (22% alpha), sensor toasts, phone screens in the figures, and the lake strip on the horizon.
- **Alarm Red** (danger): Alarms only. The late clock, the dead-signal LED, critical body bubbles, the 45° danger hatching inside the gauge bars, the app-failure marker on the route, the chart's danger zone (14% alpha).
- **Glacier Water** (glacier-water): Water as matter. Sweat drops in the figures, the microfluidic channel, the hydration cue icon, puddles in potholes, and the river marker on the route profile.

### Neutral
- **Night Ink** (ink): All outlines, the app background, the HUD, clock, and primary buttons. **Ink Raised** (ink-2) is only the ink button's hover state.
- **Bone** (bone): Text on ink, teal, and oxblood. Also end panels, icon buttons, and touch pads. **Bone Dim** (bone-dim): secondary instrument text (source labels, the clock goal, sources footer).
- **World palette**: a sky gradient (sky-zenith → sky-steel → sky-dawn → sky-horizon) with a low sun at 80% x; lenticular clouds in three cream tiers; range-slate and massif-slate peaks with snow glaciers; Torres spires in granite-lit with a granite-shade face; pampa and pampa-shadow banding; a road of road and verge; flag trees in lenga-green or lenga-rust (autumn). Distance fogs every road color toward fog-haze, up to 70%.

### Named Rules
**The Two Reds Rule.** Oxblood is livery and danger is alarm. A card, jersey, or "bad" message is oxblood; a reading that is late, dead, or critical is danger red. Never swap them.

**The Ink Is Truth Rule.** The real value is a solid ink line. The sensor's estimate is a dashed teal line or a turquoise tick inside a dotted turquoise band. Wherever an estimate appears, its margin is drawn.

## Typography

**Display Font:** League Gothic (with Oswald, Arial Narrow)
**Body Font:** Barlow Semi Condensed (with Arial Narrow, system-ui)
**Label/Mono Font:** Courier Prime (with Courier New)

**Character:** Condensed poster caps shout like an anime title card, the semi-condensed sans explains in plain Chilean Spanish, and the typewriter mono is the voice of the instrument.

### Hierarchy
- **Display** (400, clamp(5rem, 17vw, 8.5rem), 0.82, uppercase): Only "LA SUBIDA" on the title card. It is fixed at 4.6rem on short landscape screens.
- **Headline** (400, clamp(2.6rem, 7vw, 4.4rem), 0.9, uppercase, balanced): Card titles. The end header and stance stretch to 5–5.4rem in the same voice.
- **Title** (400, 1.9rem, 1, uppercase): End-panel heads, event question (2rem), gauge names (1.5rem, +0.03em).
- **Numeral** (400, 2.3rem, tabular): Race clock, end time (3rem), stats (1.6rem in mustard).
- **Body** (400, 18px / 16px under 760px, 1.4): Lead copy at 1.2rem with a 62–68ch measure. Weight 600 for subtitles and the chart note, 700 for strong. Italic only for the stance question.
- **Data** (400, 0.8–0.95rem): Step counters, durations, place line, HUD header, source labels, chart axes (12px), and keycaps (0.78rem, bordered).
- **Label** (700, 0.72–0.85rem): Chart tabs, the "Mirador" tag, "sin señal" stamps (uppercase, +0.08em). Gauge values use Data-Value (700, 1.6rem, tabular) prefixed with ≈.

### Named Rules
**The Instrument Voice Rule.** Any number the sensor or clock produces is set in League Gothic tabular or Courier Prime, never in Barlow.

**The Caps Are Display Rule.** Uppercase belongs to League Gothic, both in CSS and in canvas text (body bubbles, sign boards, the finish arch). Barlow and Courier stay in sentence case, except the "sin señal" stamp.

## Layout

The canvas world is full-bleed and fixed. Everything else is a fixed overlay on it: a top bar (a three-column grid of clock, route profile up to 420px, and actions), the mute button pinned top-right on every screen (z 30), and the HUD docked bottom-center (up to 1040px, flat bottom edge, safe-area padding). Story cards center at 760px (events 620px) on a 55% ink scrim. The title card is anchored bottom-left at 560px. The end screen is a scrolling column up to 1080px: header, a 1.55fr/1fr grid (chart | decision type), stance card, CTA, sources.

The road's horizon sits at 37% of the height (34% in portrait). The rider stands just above the HUD. Sprites scale down in wide, short windows so the rider never covers half the screen. The mountain and hill layers are 2× width strips that parallax independently.

Gaps run 6 / 10 / 14 / 18px and cards pad around 26px. Under 760px: body text drops to 16px, HUD gauges stack into one-line rows (icon 24px | name+source 92px | bar | value 54px), the end grid collapses to one column, card padding becomes 18px, and 76px circular touch pads sit 14px above the HUD. The touch pads exist only on coarse pointers. Keycaps hide on coarse pointers.

## Elevation & Depth

Depth comes first from the ink outline and flat value steps, then from halftone shading, and only then from shadow. Every CSS shadow is soft, dropped straight down with a negative spread, and pure black at 60–70%: never offset sideways, never hard-edged. On canvas, objects sit on a flat ink-tinted contact ellipse (rgba ink at 28–32%), and distance is atmospheric fog plus two parallax layers. Body states tint the whole frame: warm haze for thirst, a dark vignette for low energy, an oxblood pulse for fatigue.

### Shadow Vocabulary
- **Cel lift** (`0 28px 50px -18px rgba(0,0,0,.65–.7)`): Title, story, and event cards.
- **Toast lift** (`0 14px 26px -12px rgba(0,0,0,.7)`): Toasts.
- **Button lift** (`0 10px 22px -10px rgba(0,0,0,.7)`, `0 6px 14px -6px rgba(0,0,0,.6)` for icons): Ink buttons and icon buttons.
- **HUD rise** (`0 -12px 30px -14px rgba(0,0,0,.7)`): Cast upward from the docked HUD.
- **Signal glow** (`0 0 10px` turq or danger, with a 2px ink ring): Only on the status LED. Pickups get a radial halo in their own color on canvas.

### Named Rules
**The Ink Before Shadow Rule.** If a surface needs separating, give it the 3px ink outline first. A shadow is only ever a soft cel lift beneath it.

## Shapes

The form language is cut paper on a light table. Narrative cards are sharp rectangles with a 3px ink border, rotated by a small `--tilt`: title −2°, story −1°, event +1.2°, end header −1.2°, toasts −2°. Each card carries film grain (multiply, 35%) and a halftone dot screen (9px grid) fading in from the bottom-right corner along a 135° mask. Instruments and end panels stay level and rounded: clock and route 12px, toast and how-to callout 10px, end panels 14px, stance 16px, HUD 18px top corners. Buttons, tabs, and gauge bars are full pills. Icon buttons, pads, and LEDs are circles.

On canvas the same rules apply. Every shape is filled flat, then stroked in ink with round joins at a width scaled to the sprite unit. Limbs are double-stroked (an ink line under a color line). Shadow faces take the 8px dot pattern. Granite is angular with ragged tops and vertical cracks, and the wind bends the flag trees to one side.

### Named Rules
**The Tilt Rule.** Things that tell the story lean. Things that measure stay level. Never tilt the HUD, clock, route, gauges, or end panels.

## Components

### Buttons
Chunky, inked, and poster-voiced.
- **Shape:** full pill (999px), 3px ink border, League Gothic caps.
- **Primary (ink):** ink fill, bone text, button lift. Hover lifts 2px and goes to ink-2. Active presses down 2px at 98% scale, 0.18s on the out-ease.
- **Ghost:** transparent with a border in the current color, 85% opacity. Hover goes to full opacity on a faint ink wash.
- **Finale:** "Jugar de nuevo" is a mustard pill at 1.9rem.
- **Keycap:** a Courier keyboard hint inside the button ("Enter"), with a 1.5px border and 5px radius. Hidden on touch.
- **Focus:** 3px mustard outline at a 3px offset, everywhere.

### Color Cards
The signature container. A flat livery fill, a sharp 3px ink border, tilt, grain, and a corner halftone. They enter with a 0.5s skewed clip-path wipe from the left (`wipe-in`, snap ease). Actions go in a bottom row: ghost on the left, a Courier "n / 3" step counter, primary on the right. Figures inside are inline SVG in the same ink at a 3px stroke.

### HUD (Sensor Readout)
An ink slab docked to the bottom edge, with a bone bezel line at 20% inset 5px. The header is Courier: a blinking LED, "Tu parche · en vivo", and on the right "lo que *estima* el sensor". Each gauge has a bone line icon (2.6px stroke, faintly tinted fill), a League Gothic name, a Courier source label, and a pill bar with a bone border. Inside the bar: a 45° danger hatch at the critical end (left, or right for fatigue), a dotted turquoise error band clipped to ±margin, and a bone tick at the estimate. The value is "≈NN" with the ±margin in mustard. Dead signal swaps the bar for animated bone-grey static stamped "SIN SEÑAL" and the value becomes "--". Alerts turn the value danger red.

### Clock and Route
Instruments with a bezel. The clock is an ink box with a bone inner outline inset 6px: a League Gothic time over a Courier "meta 2:00" with mustard digits. It turns danger red when late. The route is a canvas elevation profile: a granite fill, a mustard fill for progress, a bone ridge line, dashed event markers (glacier-water for the river, danger for the app failure), an oxblood position dot, and a mustard "Mirador" tag overhanging the top.

### Toasts
A tilted (−2°) mustard plaque in League Gothic caps with a Barlow 600 subline. It wipes in from the left (0.35s) and fades up out (0.3s). Variants: oxblood/bone for bad, turq/ink for sensor or good. Countdown numbers grow to 3–6rem.

### Body Bubbles (canvas)
Inked speech-pill stack over the rider: a bone fill for warnings (SED, HAMBRE, CANSANCIO) and danger fill with bone text when critical. Each has a small icon (drop, chocolate, zigzag leg) and the first bubble has a tail. League Gothic caps throughout.

### End Chart Panel
A bone panel with ink pill tabs (the active tab is filled ink). The chart sits on warm paper (#fbf5e8) with a 2px ink frame and 8px radius. Real is a 3.5px ink line, the estimate is a dashed teal line in a turquoise band, no-signal windows are oxblood diagonal hatching labelled "sin señal", and pickup moments are color dots. The legend repeats those exact marks.

## Do's and Don'ts

### Do:
- **Do** outline every UI surface and canvas sprite in ink (#141b2d) — 3px in CSS, unit-scaled with round joins on canvas.
- **Do** pick card color from the four liveries only: mustard with ink text, teal/oxblood/ink with bone text.
- **Do** draw every estimate with its margin (band, ±N) and show signal loss as static plus a red LED.
- **Do** shade with the halftone dot screen and let the animated grain sit over the whole frame.
- **Do** keep sensor and clock numbers in League Gothic or Courier Prime with tabular figures.
- **Do** honour `prefers-reduced-motion`: CSS animation collapses, canvas wobble, tremor, and pulse stop.

### Don't:
- **Don't** build a clean, confident fitness dashboard: no bare needle or number without its error, no thin hairline gauges, no glossy gradients on chrome.
- **Don't** use gradients on cards, buttons, or instruments. Gradients belong to the sky, the low sun, pickup halos, and the title scrim.
- **Don't** use pure black (#000) outlines or hard offset shadows. The only black is in soft cel-lift shadows.
- **Don't** use oxblood for alarms or danger red for liveries (The Two Reds Rule).
- **Don't** tilt instruments or set instrument numbers in Barlow.
- **Don't** set UI text below 0.72rem (about 11.5px). It has to read on a classroom projector.
- **Don't** borrow characters, logos, title treatments, or catchphrases from the anime or runner games that inspired the look.
