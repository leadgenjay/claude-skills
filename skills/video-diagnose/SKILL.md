---
name: video-diagnose
version: 1.0.0
description: "Diagnose technical video and audio production issues. Use when user says 'diagnose video', 'video issues', 'video problems', 'check my video', 'audio issues', 'frame drops', 'video quality', 'mic issues', 'audio quality check'."
user_invocable: true
command: video-diagnose
arguments: "[path to video file]"
---

# Video Production Diagnostics

Technical diagnostic tool for video and audio issues. Runs automated analysis and cross-references results with Jay's specific hardware setup to provide targeted fix recommendations.

## Jay's Recording Setup

### Camera Setup: Sony A7IV + CamLink 4K
- **Signal path**: Sony A7IV HDMI out -> Elgato CamLink 4K -> Mac Studio USB
- **Recording software**: OBS Studio (talking head), Screen Studio (screen recordings)
- **Audio**: Shure SM7B dynamic mic -> Shure preamp -> Mac Studio USB

### Setup B: Screen Recording
- **Software**: Screen Studio or OBS
- **Audio**: Same Shure SM7B chain

---

## Workflow

### Step 1: Identify the video file

If the user provides a file path, use it directly. If not, ask:

> What video file do you want to diagnose? Provide the full path.

### Step 2: Identify recording source

Check the video metadata (encoder field) to auto-detect the source. If unclear, ask:

> How was this recorded?
> 1. **Camera** (Sony A7IV via CamLink into OBS)
> 2. **Screen recording** (Screen Studio)
> 3. **Screen recording** (OBS)
> 4. **Other** (describe)

Store the answer as `RECORDING_SOURCE` for hardware-specific recommendations.

### Step 3: Run the diagnostic script

```bash
./scripts/diagnose-video.sh --json "<video-file-path>"
```

Parse the JSON output. The script checks:
- Container format, codec, resolution, bitrate
- Frame rate (VFR detection)
- Frame timing (dropped/duplicate frames)
- Audio levels (peak, RMS, clipping)
- Loudness (EBU R128 LUFS)
- Silence/dropout detection
- Noise floor
- 60Hz hum detection
- Generates spectrogram PNG

### Step 4: Cross-reference with hardware-specific known issues

For EACH issue found, cross-reference with the relevant hardware profile below and provide targeted recommendations instead of generic advice.

### Step 5: Generate report

Present findings as a structured report:

```
## Diagnostic Results

**File**: [filename]
**Source**: [Camera/Screen Studio/OBS]
**Duration**: [duration]

### Issues Found

[For each issue, show:]
- What was detected
- Why it likely happened (based on their specific gear)
- How to fix it (copy-paste commands where possible)
- How to prevent it next time (settings changes)

### All Clear
[For checks that passed, brief confirmation]
```

---

## Hardware Profiles & Known Issues

### Sony A7IV + CamLink 4K

#### Known Issues

**VFR / Frame drops**
- CamLink 4K converts HDMI to USB UVC. It shares USB bandwidth with other devices
- CamLink on a shared USB hub or bus with the Shure preamp WILL cause frame drops
- **Fix**: CamLink must be on its own dedicated USB port, not shared with audio or storage
- CamLink maxes out at 1080p30 4:2:0 via USB. If the A7IV outputs 4K, CamLink downscales — this can cause frame timing issues
- **Fix**: Set A7IV HDMI output to 1080p (Menu > Setup > HDMI > HDMI Resolution > 1080p)

**Color / exposure shifts**
- CamLink converts YUV 4:2:2 from HDMI to NV12 (4:2:0) for USB — slight color shift is normal
- If video looks washed out: A7IV HDMI output may be sending log/HLG
- **Fix**: Set A7IV to standard color profile for HDMI output, not S-Log or HLG

**Clean HDMI output**
- If you see camera UI overlays in the recording, clean HDMI is not enabled
- **Fix**: A7IV Menu > Setup > HDMI > HDMI Info. Display > Off

**Overheating**
- A7IV can overheat recording 4K60 over ~30min, especially with HDMI output active
- Not an issue at 1080p or if using external power (dummy battery)

#### Diagnostic Signals
| Script Result | Likely A7IV/CamLink Cause |
|--------------|--------------------------|
| VFR detected | CamLink USB bandwidth contention or A7IV output resolution mismatch |
| Dropped frames >1% | CamLink on shared USB bus. Move to dedicated port |
| Duplicate frames | A7IV outputting lower FPS than OBS expects (e.g., camera at 24p, OBS at 30) |
| Low bitrate for resolution | CamLink USB throughput limit. Normal for 1080p capture |
| 4:2:0 chroma | Normal — CamLink always outputs 4:2:0 regardless of HDMI input |

---

### Shure SM7B + Shure Preamp

#### Known Issues

**Low audio levels / high noise floor**
- SM7B is a low-output dynamic mic. It needs ~60dB of clean gain
- If the preamp gain is too low, you'll see: low peak levels (<-20dB), high noise floor when boosted in post
- **Fix**: Increase preamp gain until peaks hit -6dB to -3dB during normal speech. The SM7B can handle high gain without distortion

**Clipping**
- If preamp gain is too high, audio clips at the preamp stage (before it reaches the computer)
- Digital clipping is unrecoverable
- **Fix**: Lower preamp gain until peaks are -6dB to -3dB. Never let peaks hit 0dB

**60Hz hum**
- SM7B uses XLR (balanced). Hum usually means: unbalanced cable, ground loop, or cable running parallel to power cables
- **Fix**: Use balanced XLR cable. Separate audio cables from power cables. Try a different USB port for the preamp

**Proximity effect**
- SM7B is a cardioid dynamic — bass boost increases dramatically below 6 inches
- Too close: boomy/muddy audio with excessive low end
- Too far: thin audio with high noise floor
- **Optimal distance**: 2-6 inches from mouth

**USB preamp dropouts**
- USB audio preamps can have buffer underruns if buffer size is too low or CPU is under load
- Shows up as: brief silence gaps, clicks, or pops
- **Fix**: Increase USB buffer size in audio settings. Close CPU-heavy apps during recording. Use a powered USB hub

#### Diagnostic Signals
| Script Result | Likely SM7B/Preamp Cause |
|--------------|--------------------------|
| Peak < -20dB | Preamp gain too low. SM7B needs ~60dB gain |
| Clipping detected | Preamp gain too high. Lower by 3-6dB |
| Noise floor > -50dB | Preamp gain too low (compensating in post), or room noise (Mac Studio fans) |
| 60Hz hum | Ground loop or unbalanced cable. Check XLR connection |
| Silence gaps >2s | USB preamp dropout. Check USB connection, increase buffer size |
| LUFS < -20 | Preamp gain too low. Increase until integrated loudness is -16 to -14 LUFS |

---

### OBS Studio

#### Known Issues

**VFR output**
- OBS can produce VFR even when set to constant frame rate
- **Fix**: Settings > Output > Recording > Custom Muxer Settings: add `force-cfr=1`
- **Fix**: Record to MKV container (more resilient), then remux to MP4: File > Remux Recordings

**Encoding overload (frame drops)**
- If OBS shows "Encoding overloaded" in the status bar, frames are being dropped
- Common with software (x264) encoding at high resolution
- **Fix**: Switch to hardware encoding: Settings > Output > Encoder > Apple VT H264 Hardware Encoder (on Mac Studio)
- **Fix**: Lower output resolution or use CQP rate control instead of CBR

**Audio sync drift**
- VFR recordings cause progressive audio desync, especially in long recordings (>30min)
- **Fix**: Enable `force-cfr=1` (see above). Use MKV container
- **Post-fix**: `ffmpeg -nostdin -i input.mp4 -vsync cfr -r 30 -c:a copy output-cfr.mp4`

**Recording format**
- MP4 container: file is corrupted if OBS crashes or recording stops unexpectedly
- MKV container: always recoverable, supports multi-track audio
- **Fix**: Always record to MKV, remux to MP4 after: `ffmpeg -nostdin -i input.mkv -c copy output.mp4`

#### OBS Optimal Settings (Mac Studio)
```
Output Mode: Advanced
Encoder: Apple VT H264 Hardware Encoder
Rate Control: CQP (quality-based, not CBR)
Container: MKV (remux to MP4 after)
Custom Muxer: force-cfr=1
Audio: 48kHz, 320kbps AAC
```

---

### Screen Studio

#### Known Issues

**VFR output**
- Screen Studio commonly outputs variable frame rate video
- **Fix**: After recording, conform to CFR: `ffmpeg -nostdin -i input.mp4 -vsync cfr -r 30 -c:a copy output-cfr.mp4`

**Audio sync drift on long recordings**
- Screen Studio can develop audio drift on recordings >15-20min
- Especially when display refresh rate differs from recording FPS (e.g., 120Hz display, 30fps recording)
- **Fix**: Set display refresh rate to match recording FPS before starting, or conform in post:
  `ffmpeg -nostdin -i input.mp4 -vsync cfr -r 30 -af aresample=async=1 output-fixed.mp4`

**Resolution / display scaling**
- Retina displays record at 2x resolution by default — massive file sizes
- **Fix**: Set Screen Studio output resolution to 1920x1080 (not native retina)

#### Diagnostic Signals
| Script Result | Likely Screen Studio Cause |
|--------------|---------------------------|
| VFR detected | Screen Studio default. Conform to CFR in post |
| Audio sync drift | Long recording + display refresh mismatch |
| Very large file size | Recording at retina resolution. Lower output res |
| Dropped frames | Screen Studio struggling with high-res capture + effects |

---

## Post-Diagnostic Fix Commands

These are the standard fix commands. The script includes them in its output, but use these as reference:

```bash
# Fix VFR -> CFR
ffmpeg -nostdin -i input.mp4 -vsync cfr -r 30 -c:a copy output-cfr.mp4

# Fix loudness (normalize to YouTube's -14 LUFS)
ffmpeg -nostdin -i input.mp4 -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:v copy output-normalized.mp4

# Fix audio sync drift
ffmpeg -nostdin -i input.mp4 -vsync cfr -r 30 -af aresample=async=1 output-synced.mp4

# Remove 60Hz hum
sox input.wav output.wav sinc 65 sinc -65

# Remux MKV to MP4 (lossless, instant)
ffmpeg -nostdin -i input.mkv -c copy output.mp4

# Generate spectrogram for manual inspection
sox input.wav -n spectrogram -o spectrogram.png -x 2000 -y 513 -z 90
```

---

## Dependencies

The diagnostic script requires:
- `ffprobe` / `ffmpeg` (brew install ffmpeg)
- `sox` (brew install sox)
- `mediainfo` (brew install mediainfo)

The script checks for missing deps and tells you what to install.
