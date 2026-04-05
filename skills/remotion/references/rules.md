# Remotion Rules Reference

Consolidated from the official Remotion skills (remotion-dev/skills). 30+ topics organized by category.

---

## Animations

### useCurrentFrame + interpolate

All animation is frame-based. Access frame with `useCurrentFrame()` (starts at 0). Map frame ranges to output values with `interpolate()`:

```tsx
const frame = useCurrentFrame();
const opacity = interpolate(frame, [0, 30], [0, 1], {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
});
```

**Rules:**
- Never use CSS animations, CSS transitions, or `requestAnimationFrame`
- Never use `setTimeout`/`setInterval` for timing
- Always use `extrapolateLeft: 'clamp'` and `extrapolateRight: 'clamp'` to prevent values overshooting
- Chain multiple interpolations for complex sequences

### spring()

Preferred for natural, physics-based motion:

```tsx
const scale = spring({
  fps,
  frame,
  config: {damping: 200},
});
```

Config options: `damping` (default 10, higher = less bounce), `mass`, `stiffness`, `overshootClamping`.

### Deterministic Rendering

- Never use `Math.random()` — use `random('seed')` from remotion (returns 0-1)
- Never use `Date.now()` or wall-clock time
- Components must produce identical output for the same frame number

---

## Compositions

### Defining Compositions

```tsx
<Composition
  id="MyVideo"
  component={MyComponent}
  durationInFrames={300}
  width={1920}
  height={1080}
  fps={30}
  defaultProps={{title: "Hello"}}
  schema={myZodSchema}  // optional, enables visual prop editor
/>
```

### calculateMetadata

For dynamic duration, dimensions, or props based on input:

```tsx
<Composition
  id="MyVideo"
  component={MyComponent}
  calculateMetadata={async ({props}) => {
    const duration = await computeDuration(props.videoSrc);
    return {
      durationInFrames: Math.ceil(duration * 30),
      width: 1920,
      height: 1080,
    };
  }}
/>
```

### Parameters (Zod Schemas)

Define props with Zod for visual UI controls in Remotion Studio:

```tsx
import {z} from 'zod';

const schema = z.object({
  title: z.string(),
  color: z.string(),
  fontSize: z.number().min(12).max(120),
});
```

---

## Sequencing & Timing

### Sequence

Delay element appearance. Child `useCurrentFrame()` resets to 0 from the Sequence start:

```tsx
<Sequence from={30} durationInFrames={60}>
  <Child />  {/* Child sees frame 0 when parent is at frame 30 */}
</Sequence>
```

Negative `from` values trim content from the beginning (useful for trimming video/audio).

### Series

Sequential playback without manual `from` calculations:

```tsx
<Series>
  <Series.Sequence durationInFrames={30}><A /></Series.Sequence>
  <Series.Sequence durationInFrames={45}><B /></Series.Sequence>
  <Series.Sequence durationInFrames={30} offset={-10}><C /></Series.Sequence>
</Series>
```

`offset` shifts timing relative to previous sequence end (negative = overlap, positive = gap).

### Time Calculation

Convert seconds to frames: `seconds * fps`. Access fps via `useVideoConfig()`.

---

## Transitions

### TransitionSeries

Scene-to-scene effects. Transition tags must separate Sequence tags:

```tsx
import {TransitionSeries, springTiming, linearTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {wipe} from '@remotion/transitions/wipe';
import {slide} from '@remotion/transitions/slide';

<TransitionSeries>
  <TransitionSeries.Sequence durationInFrames={60}><SceneA /></TransitionSeries.Sequence>
  <TransitionSeries.Transition
    timing={springTiming({config: {damping: 200}})}
    presentation={fade()}
  />
  <TransitionSeries.Sequence durationInFrames={60}><SceneB /></TransitionSeries.Sequence>
</TransitionSeries>
```

Available presentations: `fade()`, `wipe()`, `slide()`, `flip()`, `clockWipe()`.
Timing options: `springTiming({config})`, `linearTiming({durationInFrames})`.

---

## Audio

### Audio Component

```tsx
import {Audio, staticFile} from 'remotion';

<Audio
  src={staticFile('music.mp3')}
  startFrom={30}      // trim from start (frames)
  endAt={300}          // end playback (frames)
  volume={0.5}         // 0-1
  playbackRate={1.0}   // speed
  loop                 // repeat
/>
```

### Audio Visualization

```tsx
import {visualizeAudio} from '@remotion/media-utils';

const visualization = visualizeAudio({
  fps, frame, sampleRate: 'audio-buffer', numberOfSamples: 256,
  audioData,
});
// Returns array of frequency values (0-1) for spectrum rendering
```

### Get Audio Duration

```tsx
import {getAudioDurationInSeconds} from '@remotion/media-utils';
const duration = await getAudioDurationInSeconds(staticFile('audio.mp3'));
```

---

## Video

### OffthreadVideo

Always use `<OffthreadVideo>` (NOT `<Video>` or HTML `<video>`):

```tsx
import {OffthreadVideo, staticFile} from 'remotion';

<OffthreadVideo
  src={staticFile('clip.mp4')}
  startFrom={60}
  endAt={180}
  volume={0.8}
  playbackRate={1.5}
  style={{width: '100%'}}
/>
```

### Get Video Duration & Dimensions

```tsx
import {getVideoMetadata} from '@remotion/media-utils';
const {durationInSeconds, width, height} = await getVideoMetadata(src);
```

---

## Images

Always use `<Img>` from remotion. **Never** use HTML `<img>`, Next.js `<Image>`, or CSS `background-image`:

```tsx
import {Img, staticFile} from 'remotion';

<Img src={staticFile('photo.png')} style={{width: '100%'}} />
```

---

## GIFs & Animated Images

Use `<AnimatedImage>` (or `<Gif>` from `@remotion/gif`):

```tsx
import {Gif} from '@remotion/gif';

<Gif src={staticFile('animation.gif')} style={{width: 200}} />
```

Supports GIF, APNG, animated AVIF, animated WebP. Playback synced to video timeline.

---

## Fonts

### Google Fonts

```tsx
import {loadFont} from '@remotion/google-fonts/Montserrat';
const {fontFamily} = loadFont();

<div style={{fontFamily}}>Text</div>
```

### Local Fonts

```tsx
import {loadFont} from '@remotion/fonts';

await loadFont({
  family: 'MyFont',
  url: staticFile('fonts/MyFont.woff2'),
  weight: '400',
});
```

---

## Assets

Reference files from `public/` folder using `staticFile()`:

```tsx
import {staticFile} from 'remotion';

const videoSrc = staticFile('videos/intro.mp4');
const imageSrc = staticFile('images/logo.png');
const audioSrc = staticFile('audio/bg-music.mp3');
```

Never use relative paths or `import` for media assets.

---

## Captions & SRT

### Display Captions

```tsx
import {parseSrt} from '@remotion/captions';

const captions = parseSrt(srtContent);
// Group into pages, highlight current word based on frame/timestamp
```

### Import SRT

```tsx
import {parseSrt} from '@remotion/captions';

const subtitles = parseSrt(fs.readFileSync('subs.srt', 'utf-8'));
// Returns array of {text, startMs, endMs} entries
```

Word-level highlighting: match current time (frame/fps * 1000) against word timestamps.

---

## Charts

### Bar Charts

Animate bar height with `spring()`:

```tsx
const progress = spring({fps, frame, config: {damping: 200}});
const barHeight = interpolate(progress, [0, 1], [0, maxHeight]);
```

### Pie Charts

SVG circles with `stroke-dasharray` and `stroke-dashoffset`.

### Line Charts

Use `@remotion/paths` for SVG path animations with `evolvePath()`.

---

## 3D (Three.js)

```tsx
import {ThreeCanvas} from '@remotion/three';

<ThreeCanvas width={1920} height={1080}>
  <ambientLight intensity={0.5} />
  <pointLight position={[10, 10, 10]} />
  <mesh rotation={[0, frame * 0.02, 0]}>
    <boxGeometry args={[1, 1, 1]} />
    <meshStandardMaterial color="blue" />
  </mesh>
</ThreeCanvas>
```

**Rules:**
- Always include lighting (ambientLight + pointLight/directionalLight)
- Animate via frame number, never shader animations or dynamic model loading
- Use React Three Fiber components only

---

## Voiceover (ElevenLabs)

Generate TTS audio, then use `calculateMetadata` to set video duration:

```tsx
calculateMetadata={async ({props}) => {
  const audioDuration = await getAudioDurationInSeconds(props.voiceoverSrc);
  return {durationInFrames: Math.ceil(audioDuration * fps)};
}}
```

---

## Transparent Videos

Use ProRes 4444 codec or WebM VP9 with alpha channel:

```tsx
// Rendering
npx remotion render MyComp output.mov --codec prores --prores-profile 4444
// or
npx remotion render MyComp output.webm --codec vp9

// In composition, set PNG image format for transparency
```

---

## Lottie

```tsx
import {Lottie, LottieAnimationData} from '@remotion/lottie';
import {delayRender, continueRender, staticFile} from 'remotion';

// Load async with delayRender/continueRender
const [handle] = useState(() => delayRender());
const [data, setData] = useState<LottieAnimationData | null>(null);

useEffect(() => {
  fetch(staticFile('animation.json'))
    .then(res => res.json())
    .then(json => { setData(json); continueRender(handle); });
}, [handle]);

if (!data) return null;
return <Lottie animationData={data} />;
```

---

## Light Leaks

```tsx
import {LightLeak} from '@remotion/light-leaks';

<LightLeak seed={42} hueShift={0} />
```

---

## Maps (Mapbox)

Mapbox GL + Turf.js for animated camera movements. Animate lat/lng/zoom with `interpolate()`.

---

## Utilities

### calculateMetadata

Set dynamic duration, dimensions, or derived props before rendering:

```tsx
calculateMetadata={async ({props}) => ({
  durationInFrames: computedDuration,
  width: 1920,
  height: 1080,
  props: {...props, derivedValue: computed},
})}
```

### Built-in FFmpeg

```bash
bunx remotion ffmpeg -i input.mp4 -vf scale=1080:-1 output.mp4
bunx remotion ffprobe input.mp4
```

### Extract Frames

```tsx
import {extractFrames} from '@remotion/renderer';
// Extract individual frames as images from a composition
```

### Measuring DOM Nodes

Use `getBoundingClientRect()` with `useCurrentScale()` correction for accurate measurements during rendering.

### TailwindCSS

Fully supported. Configure in project setup (`npx create-video@latest` with TailwindCSS option).

---

## Common Patterns

### Fade In/Out

```tsx
const opacity = interpolate(frame, [0, 15, durationInFrames - 15, durationInFrames], [0, 1, 1, 0], {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
});
```

### Slide In

```tsx
const translateX = interpolate(frame, [0, 20], [-100, 0], {
  extrapolateRight: 'clamp',
});
```

### Scale Bounce

```tsx
const scale = spring({fps, frame, config: {damping: 10, stiffness: 100}});
```

### Typewriter

```tsx
const text = "Hello World";
const charsToShow = Math.floor(interpolate(frame, [0, 60], [0, text.length], {
  extrapolateRight: 'clamp',
}));
return <div>{text.slice(0, charsToShow)}</div>;
```
