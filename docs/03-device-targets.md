# Device targets

**Written:** 2026-09-07
**Settles:** the top open decision from `context.md` §8. Decided by Chris.

## The ladder

**Tablet → laptop → phone.** In that order of priority.

| Tier | Posture | Input | Status |
|---|---|---|---|
| **Tablet** | Propped up, landscape, beside the television | Touch | **Primary.** Design here first |
| **Laptop** | On a desk or lap | Pointer + keyboard | Close second. Shares the tablet layout |
| **Phone** | In the hand | Touch, one-thumb | Supported, reduced. See §4 |

Tablet and laptop are near-neighbours — roughly 1024–1440 logical pixels wide in
landscape — so one layout serves both. **The phone is the outlier**, and treating
it as the same layout squeezed smaller will produce something bad on the device
where attention is scarcest.

---

## 1. Hover is gone, and that breaks an inherited rule

The primary device has **no pointer**. Nothing may depend on hover: no tooltips
carrying values, no reveal-on-hover controls, no hover-only affordances.

This directly contradicts a finding carried forward from the August build:

> *"The hover target is the column, not the mark. A 2 px scatter dot is not a
> pointer target."*

That reasoning was right and its conclusion was pointer-shaped. **The underlying
insight survives and the mechanism does not.** The insight is that the target
must be far larger than the mark. On touch that becomes:

- **Tap a column, not a mark.** Same generous hit area, now sized for a
  fingertip rather than a cursor — a minimum 44 px touch target.
- **The value display is permanent, not summoned.** A tooltip that appears on
  hover has no touch equivalent that isn't worse. Instead the reading lives in a
  fixed place in the layout and updates on tap. It shows the current selection,
  or the latest value, or an explicit empty state — but it always occupies its
  space, so nothing reflows when a selection changes.
- **Selection persists.** Touch has no "un-hover". A tapped value stays selected
  until something else is tapped or it is explicitly dismissed.

A permanent readout costs layout space that a tooltip does not. On the tablet
there is room. **This is a reason the phone is a reduced product rather than a
scaled one.**

`context.md` §11 has been amended so the inherited finding is not read as an
instruction to build hover.

---

## 2. A race is two hours, which is a very long session

Most web pages are open for minutes. This one is open for the length of a Grand
Prix, continuously receiving data and — if the 3D scene is running — rendering
continuously too. That is an unusual load and it has consequences a shorter
session never surfaces.

- **Thermal throttling and battery.** Sustained WebGL on a tablet will heat the
  device and drain it across two hours. The scene must stop rendering when it is
  not visible, and should degrade rather than fight for frames.
- **Memory growth.** Two hours of accumulating telemetry, laps and events at ~10
  Hz is a lot of retained objects. Anything unbounded will eventually be a
  problem, and it will show up ninety minutes in — which is the worst possible
  moment and the hardest to reproduce.
- **The device will sleep.** A tablet propped up beside a television locks
  itself. On wake, the connection is dead and the clock has drifted — possibly
  by an hour. **This is the single most likely real-world failure**, it happens
  to every user rather than a few, and it happens at exactly the moment they
  look back at the screen. Reconnect, re-sync the clock, and backfill what was
  missed, visibly.

None of this is optimisation. On the primary device it is whether the thing
works.

---

## 3. Orientation

Landscape is the second-screen posture — a tablet in a case, stood up. Design
landscape first.

Portrait must not break, but it does not need the same layout. Recommended: the
landscape layout is a side-by-side split; portrait stacks the same panels
vertically in priority order. Not yet settled.

---

## 4. The phone is a reduced product

Recommended, not yet ratified.

The three moments in `context.md` §3 do not survive the phone equally:

| Moment | Tablet / laptop | Phone |
|---|---|---|
| **Glance** | Yes | **Yes — this is what the phone is for** |
| **Question** | Yes | Partially. A few prepared questions, not the full explorer |
| **Dig** | Yes | No. The explorer and the 3D scene need room to be usable |

A phone in a hand during a race is a glance device. Trying to fit the explorer
onto it produces a control surface too fiddly to use one-thumbed while watching
something else, and the effort would come out of the tablet layout that most
people will actually use.

**Open:** whether the phone shows a genuinely different, simpler screen, or the
same screen with sections collapsed. The first is better and costs more.

---

## 5. What this settles for the design system

- Minimum touch target 44 px, everywhere, including on laptop — a pointer can
  hit a large target, a finger cannot hit a small one.
- No hover-dependent meaning anywhere. Hover may add polish on laptop; it may
  never be the only route to information.
- Type sized for arm's length, not desk distance. A propped tablet is further
  from the eye than a laptop screen.
- Layout breakpoints follow the ladder: one layout for tablet and laptop, a
  separate one for phone. Not a continuous responsive squeeze.
