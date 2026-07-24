# Reference implementation — patterns from a shipped build

Copy-pasteable solutions to the problems that actually cost time on a real
product-demo build. All of these are frame-pure and satisfy the showcase doctrine.

## 1. Poster-safe camera bookends

Frame 0 is the MP4 poster frame and the paused-GIF frame. An intro that ramps
`opacity: 0 → 1` therefore ships a **blank thumbnail**. Start partway and let blur and
scale carry the focus-in. Mirror the treatment at the tail so a loop has no pop.

```tsx
const isIntro = frame <= 22;

const introScale   = clampInterp(frame, [0, 22], [1.035, 1], Easing.out(Easing.cubic));
const introBlur    = clampInterp(frame, [0, 20], [4, 0],     Easing.out(Easing.cubic));
const introOpacity = clampInterp(frame, [0, 16], [0.6, 1]);   // never 0

const outroScale   = clampInterp(frame, [274, 300], [1, 1.035], Easing.in(Easing.cubic));
const outroBlur    = clampInterp(frame, [278, 300], [0, 4],     Easing.in(Easing.cubic));
const outroOpacity = clampInterp(frame, [282, 300], [1, 0.6]);

const camera = {
  scale:   isIntro ? introScale   : outroScale,
  blur:    isIntro ? introBlur    : outroBlur,
  opacity: isIntro ? introOpacity : outroOpacity,
};
```

```tsx
function clampInterp(frame, input, output, easing) {
  return interpolate(frame, input, output, {
    easing, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
}
```

Keep the camera at `scale: 1` during the interaction beats — otherwise absolute cursor
coordinates no longer line up with the rendered layout.

## 2. Row stagger via CSS on a FULL array (never slice)

The doctrine's Rule 4. Slicing the array to reveal rows hits the real component's empty
state. Instead pass every row and animate them with injected CSS, flooring opacity so
rows *dip and settle* between result sets rather than disappearing.

```tsx
const ROW_STAGGER = 0.05;
const ROW_MIN_OPACITY = 0.35;   // rows refresh, never vanish

function rowRevealCss(rowCount: number, progress: number): string {
  if (progress >= 1) return '';               // settled — emit nothing
  const span = Math.max(0.2, 1 - ROW_STAGGER * rowCount);
  const rules: string[] = [];
  for (let i = 0; i < rowCount; i++) {
    const start = ROW_STAGGER * i;
    const local = Math.min(1, Math.max(0, (progress - start) / span));
    const eased = local * local * (3 - 2 * local);           // smoothstep
    const opacity = ROW_MIN_OPACITY + (1 - ROW_MIN_OPACITY) * eased;
    const shift = (1 - eased) * 6;
    rules.push(
      `[data-video-results] tbody tr:nth-child(${i + 1}) {` +
      `opacity:${opacity.toFixed(3)};transform:translateY(${shift.toFixed(2)}px)}`,
    );
  }
  return rules.join('\n');
}
```

Guard the input so a violation fails loudly instead of shipping:

```tsx
if (rows.length === 0) {
  throw new Error('showcase doctrine: never render the empty state — pass a full row set');
}
```

## 3. One count feeds every surface

A separately-animated header count and table footer will disagree mid-transition
(header still reads `~3.99M` while the footer already reads `~1.22M`). Interpolate once
between two large values and pass the result everywhere it appears.

```tsx
const totalCount = Math.round(
  clampInterp(frame, [CHIP_COMMIT + 4, CHIP_COMMIT + 48],
    [BROAD_MATCH_COUNT, REFINED_MATCH_COUNT], Easing.out(Easing.cubic)),
);
// → headline, sidebar estimate, grid footer, selection banner all receive `totalCount`
```

Format it through the app's own count formatter so `~`/`K`/`M` match production.

## 4. Cursor anchoring — measure in the TALLEST layout

Anchors are absolute composition pixels read off a rendered still. Two traps:

- **A banner that mounts mid-clip shifts everything below it.** An anchor measured
  before the shift is wrong after it. Measure anchors used post-shift in the *shifted*
  layout, and carry the offset explicitly for anchors used in both:

  ```tsx
  const BANNER_OFFSET = 72;
  const shift = pageSelected ? BANNER_OFFSET : 0;
  to: { x: SELECT_ALL_BOX.x, y: SELECT_ALL_BOX.y + shift },
  ```

- **Walk order is not row order.** When the cursor tours specific rows (e.g. only the
  verified ones), carry each target's real grid index instead of using the walk index:

  ```tsx
  const WALK = rows
    .map((row, rowIndex) => ({ id: row.id, rowIndex }))
    .filter((_, i) => rows[i].status === 'good');

  to: { x: TABLE_X, y: TABLE_Y + WALK[step].rowIndex * ROW_HEIGHT },
  ```

Give the cursor a small **lead** (start its move ~6 frames before the highlight lands)
so it arrives on the row as that row lights up, instead of trailing it.

## 5. Square (1:1) reframe without letterbox bands

Scaling a 16:9 scene into a square leaves ~44% of the frame as empty bands — dead space
the QA gate rejects. Crop the app's own page header out and pair the window with a
square-optimised headline block instead:

```tsx
const APP_HEADER_H = 118;           // measured height of the in-app page header
const INSET = 112;

<AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', gap: 44, padding: 56 }}>
  <HeadlineBlock />                 {/* eyebrow + H1 + subtitle, square-friendly sizes */}
  <div style={{ width: 1080 - INSET, overflow: 'hidden', borderRadius: 16,
                boxShadow: '0 28px 70px rgba(15,23,42,.18)', position: 'relative' }}>
    <div style={{ position: 'absolute', width: 1920, height: 1080,
                  // translate is applied before scale → it's in SCENE pixels
                  transform: `scale(${(1080 - INSET) / 1920}) translateY(${-APP_HEADER_H}px)`,
                  transformOrigin: 'top left' }}>
      <MyDemo />                    {/* one animation, reframed — not a second build */}
    </div>
  </div>
</AbsoluteFill>
```

The scene stays a single source of truth; the square composition only reframes it.

## 6. Scene state as one pure function of frame

Keep every per-frame decision in one place so a storyboard change is a one-file edit:

```tsx
function useSceneState(frame: number): SceneState {
  // camera bookends, typed text, chips, counts, row reveal, selection,
  // highlight target, cursor path — all derived from `frame`, nothing stateful
  return { camera, view, cursor };
}
```

Then the composition is just:

```tsx
const { camera, view, cursor } = useSceneState(useCurrentFrame());
```

Label the frame windows in a comment block at the top of the file (`0–22 focus-in`,
`22–40 cursor → filter`, …). It is the storyboard, and it's what you re-read when a QA
frame fails.
