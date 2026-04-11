# Caption Styles Reference

## Pop (Default)

**Best for:** YouTube Shorts, Instagram Reels

- 1-2 words displayed at a time
- Spring scale animation (0.7 → 1.0 with overshoot)
- White text, bold uppercase
- Active word highlighted in accent (#ED0D51)
- Font: Manrope 700

**Config defaults:**
```json
{
  "style": "pop",
  "fontSize": 64,
  "wordsPerGroup": 2,
  "color": "#FFFFFF",
  "highlightColor": "#ED0D51",
  "outlineColor": "#000000",
  "outlineWidth": 3
}
```

## Pill

**Best for:** Professional content, LinkedIn

- 3-word groups in rounded pill background
- Active word highlighted with accent color
- Clean, minimal look

**Config defaults:**
```json
{
  "style": "pill",
  "fontSize": 48,
  "wordsPerGroup": 3,
  "color": "#FFFFFF",
  "highlightColor": "#ED0D51"
}
```

## Karaoke

**Best for:** Music content, lyric videos

- Full phrase displayed
- Word-by-word color highlight sweep
- Active word changes to accent color as audio progresses

**Config defaults:**
```json
{
  "style": "karaoke",
  "fontSize": 48,
  "wordsPerGroup": 6,
  "color": "#FFFFFF",
  "highlightColor": "#ED0D51"
}
```

## TikTok

**Best for:** TikTok-native feel

- Full phrase in bold
- Centered, large text
- Simple fade transitions

**Config defaults:**
```json
{
  "style": "tiktok",
  "fontSize": 56,
  "wordsPerGroup": 5,
  "color": "#FFFFFF"
}
```

## Subtitle Bar

**Best for:** Accessibility, formal content

- Dark semi-transparent bar across bottom
- Full sentence text
- Traditional subtitle appearance

**Config defaults:**
```json
{
  "style": "subtitle-bar",
  "fontSize": 36,
  "wordsPerGroup": 8,
  "color": "#FFFFFF"
}
```

## Safe Zone

All caption styles respect a bottom safe zone (default 15%) to avoid overlapping platform UI elements (subscribe buttons, comment icons, etc.).

The `safeZoneBottom` config value (percentage) controls vertical positioning from the bottom edge.

## Phrase Building

Captions are grouped into phrases using `wordsPerGroup`. Punctuation marks (periods, question marks, exclamation marks) force a phrase break regardless of word count, ensuring natural reading flow.
