# Background Music Library

Curated royalty-free music catalog for talking head shorts. All tracks are instrumental (no vocals), normalized to -16 LUFS, and tagged for mood-based auto-selection.

---

## Audio Level Preferences (Reference Reel Analysis)

Levels derived from Jay's reference reel (`@leadgenjay` Instagram, 31.8s, ~106 BPM):

| Layer | Target Level | Notes |
|-------|-------------|-------|
| **Voice (speaker)** | -10 to -16 dB RMS | Primary audio, always dominant |
| **Background music** | -25 to -30 dB RMS | Barely perceptible, felt more than heard |
| **Music under voice** | Duck to -12 dB relative to voice | ~12-15 dB below voice at all times |
| **Overall loudness** | -16 LUFS (normalized) | Broadcast standard for social |
| **True peak** | -1.5 dBTP max | Prevents clipping on all platforms |

### Remotion Volume Settings

| Context | `volume` prop | Equivalent |
|---------|--------------|------------|
| Background music (talking head) | `0.08-0.12` | Subtle bed, voice dominates |
| Background music (B-roll only) | `0.15-0.25` | Louder during visual-only segments |
| Background music (kinetic text) | `0.20-0.35` | Music drives energy when no VO |
| Voice / VO | `1.0` | Full volume, never reduced |
| SFX (bass hits, whooshes) | `0.3-0.5` | Punctuation, not overpowering |

### Mixing Rules

1. **Music must never compete with voice** — if you can consciously notice the music during speech, it's too loud
2. **Duck music during speech** — volume 0.08-0.12 under voice, raise to 0.15-0.25 during B-roll/visual-only segments
3. **Fade in/out** — 1-2 second fade at start and end of track, never hard cut
4. **Loop seamlessly** — use `<Loop>` + `<Audio>` wrapping the full video duration
5. **Match energy to content arc** — calm intro, build through middle, resolve at end

---

## Library Location

```
Path: /Users/jayfeldman/Nextcloud/music/Background/
Catalog: /Users/jayfeldman/Nextcloud/music/Background/catalog.json
Search: tsx scripts/search-music.ts --mood <mood> --energy <energy> --no-vocals
Script: node scripts/build-music-library.mjs (download + normalize + catalog)
```

All tracks normalized to -16 LUFS, 44.1kHz, stereo MP3, 128kbps.
Source: Mixkit (free, no attribution required, lifetime commercial license).

---

## Music Selection by Content Type

| Content Type | Mood | Energy | Top Picks |
|-------------|------|--------|-----------|
| Tutorial / How-to | calm | low | Serene Moments, Relaxation 2, Opalescent |
| Tips / Quick wins | upbeat | medium | Rising Forest, Cat Walk, Pop One |
| Case study / Demo | focused | low | Curiosity, Close Up, Digital Clouds |
| Success story | upbeat | medium | Talent in the Air, Pop Track 03 |
| Storytelling / Narrative | calm | low | Valley Sunset, Vastness, Forest Walk |
| Problem → Solution | dramatic | medium | Deep Urban, Cyberpunk City, Infinity |
| Before / After | dramatic | medium | Kodama Night Town, Sci-Fi Score |
| General / Neutral | neutral | low | PlaceIt World 01, Minimal Emotion |

### Search Examples

```bash
# Calm track for a tutorial
tsx scripts/search-music.ts --mood calm --energy low --no-vocals

# Upbeat for success story
tsx scripts/search-music.ts --mood upbeat --energy medium --no-vocals

# Dramatic for problem→solution
tsx scripts/search-music.ts --mood dramatic --no-vocals

# Any hero-quality track
tsx scripts/search-music.ts --usability hero --no-vocals
```

---

## Full Catalog (24 tracks)

### Chill / Lo-fi (tutorials, how-to, educational)

| Track | File | BPM | Duration | Usability |
|-------|------|-----|----------|-----------|
| Serene Moments | `serene-moments.mp3` | 117 | 1:59 | hero |
| Relaxation 2 | `relaxation-2.mp3` | 100 | 1:53 | good |
| Opalescent | `opalescent.mp3` | 121 | 4:44 | good |

### Upbeat / Motivational (tips, wins, success stories)

| Track | File | BPM | Duration | Usability |
|-------|------|-----|----------|-----------|
| Rising Forest | `rising-forest.mp3` | 124 | 1:39 | hero |
| Cat Walk | `cat-walk.mp3` | 131 | 2:04 | hero |
| Pop Track 03 | `pop-track-03.mp3` | 119 | 1:37 | good |
| Pop One | `pop-one.mp3` | 107 | 2:10 | good |
| Talent in the Air | `talent-in-the-air.mp3` | 126 | 1:54 | good |

### Corporate / Minimal (case studies, data, demos)

| Track | File | BPM | Duration | Usability |
|-------|------|-----|----------|-----------|
| Curiosity | `curiosity.mp3` | 122 | 1:40 | hero |
| Close Up | `close-up.mp3` | 109 | 1:35 | hero |
| Digital Clouds | `digital-clouds.mp3` | 116 | 1:41 | good |
| Minimal Emotion | `minimal-emotion.mp3` | 133 | 2:00 | good |
| PlaceIt World 01 | `placeit-world-01.mp3` | 97 | 1:36 | good |

### Ambient / Atmospheric (storytelling, narrative)

| Track | File | BPM | Duration | Usability |
|-------|------|-----|----------|-----------|
| Valley Sunset | `valley-sunset.mp3` | 117 | 2:14 | hero |
| Vastness | `vastness.mp3` | 117 | 3:50 | hero |
| Forest Walk | `forest-walk.mp3` | 108 | 2:54 | good |
| Finding Myself | `finding-myself.mp3` | 112 | 2:14 | good |
| Feedback Dreams | `feedback-dreams.mp3` | 129 | 2:29 | good |

### Tense / Building (problem→solution, before/after)

| Track | File | BPM | Duration | Usability |
|-------|------|-----|----------|-----------|
| Deep Urban | `deep-urban.mp3` | 132 | 4:49 | hero |
| Cyberpunk City | `cyberpunk-city.mp3` | 121 | 1:40 | hero |
| Sci-Fi Score | `sci-fi-score.mp3` | 105 | 1:38 | good |
| Infinity | `infinity.mp3` | 97 | 1:43 | good |
| Kodama Night Town | `kodama-night-town.mp3` | 99 | 3:05 | good |

---

## Manifest Integration

```json
{
  "backgroundMusic": {
    "src": "serene-moments.mp3",
    "volume": 0.10,
    "trackDurationSec": 119
  }
}
```

The `src` field uses the filename from the catalog. The pipeline copies the file from the music library directory into the render bundle.

---

## Adding New Tracks

1. Add entry to `TRACK_LIST` in `video-editor/scripts/build-music-library.mjs`
2. Run `node scripts/build-music-library.mjs` (downloads + normalizes + catalogs new tracks only)
3. Or add files manually to the music dir and run `node scripts/build-music-library.mjs --catalog-only`
4. Verify with `tsx scripts/search-music.ts`
