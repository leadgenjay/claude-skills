// Background patterns for SVG illustrations

import { colors } from "./shared";

// ─── Dot Grid Background ─────────────────────────────────────────
// Subtle dot pattern — use as the first element inside an SVG
interface DotGridBackgroundProps {
  width?: number;
  height?: number;
  spacing?: number;
  dotRadius?: number;
  color?: string;
  opacity?: number;
}

export function DotGridBackground({
  width = 400,
  height = 300,
  spacing = 20,
  dotRadius = 1,
  color = colors.slate300,
  opacity = 0.4,
}: DotGridBackgroundProps) {
  const dots: { cx: number; cy: number }[] = [];
  for (let x = spacing; x < width; x += spacing) {
    for (let y = spacing; y < height; y += spacing) {
      dots.push({ cx: x, cy: y });
    }
  }
  return (
    <g opacity={opacity}>
      {dots.map((dot, i) => (
        <circle key={i} cx={dot.cx} cy={dot.cy} r={dotRadius} fill={color} />
      ))}
    </g>
  );
}

// ─── Glow Orbs ───────────────────────────────────────────────────
// Soft colored gradient circles for ambient background depth
interface GlowOrbsProps {
  orbs?: Array<{
    cx: number;
    cy: number;
    r: number;
    color: string;
  }>;
}

const defaultOrbs = [
  { cx: 60, cy: 60, r: 80, color: "#ED0D51" },
  { cx: 340, cy: 240, r: 70, color: "#0144F8" },
];

export function GlowOrbs({ orbs = defaultOrbs }: GlowOrbsProps) {
  return (
    <g>
      <defs>
        {orbs.map((orb, i) => (
          <radialGradient key={i} id={`glow-orb-${i}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={orb.color} stopOpacity="0.12" />
            <stop offset="100%" stopColor={orb.color} stopOpacity="0" />
          </radialGradient>
        ))}
      </defs>
      {orbs.map((orb, i) => (
        <circle
          key={i}
          cx={orb.cx}
          cy={orb.cy}
          r={orb.r}
          fill={`url(#glow-orb-${i})`}
        />
      ))}
    </g>
  );
}
