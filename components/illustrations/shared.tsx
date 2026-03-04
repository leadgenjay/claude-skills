// SVG illustration helpers — shared primitives for all Lead Gen Jay illustrations
// Style: "Product UI, but illustrated" — white cards, soft shadows, vivid accents

import type { ReactNode } from "react";

// ─── Color Tokens ─────────────────────────────────────────────────
export const colors = {
  pink: "#ED0D51",
  blue: "#0144F8",
  emerald: "#10b981",
  amber: "#f59e0b",
  purple: "#8b5cf6",
  slate900: "#0f172a",
  slate700: "#334155",
  slate500: "#64748b",
  slate400: "#94a3b8",
  slate300: "#cbd5e1",
  slate200: "#e2e8f0",
  slate100: "#f1f5f9",
  white: "#ffffff",
} as const;

// ─── Shadow Filter Defs ──────────────────────────────────────────
// Drop this inside every <svg> to enable filter="url(#shadow-*)"
export function ShadowDefs() {
  return (
    <defs>
      <filter id="shadow-sm" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow
          dx="0"
          dy="1"
          stdDeviation="2"
          floodOpacity="0.08"
          floodColor={colors.slate900}
        />
      </filter>
      <filter id="shadow-md" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow
          dx="0"
          dy="2"
          stdDeviation="4"
          floodOpacity="0.1"
          floodColor={colors.slate900}
        />
      </filter>
      <filter id="shadow-lg" x="-15%" y="-15%" width="140%" height="140%">
        <feDropShadow
          dx="0"
          dy="4"
          stdDeviation="8"
          floodOpacity="0.12"
          floodColor={colors.slate900}
        />
      </filter>
    </defs>
  );
}

// ─── Card ─────────────────────────────────────────────────────────
interface CardProps {
  x: number;
  y: number;
  width: number;
  height: number;
  rx?: number;
  shadow?: "sm" | "md" | "lg";
  children?: ReactNode;
}

export function Card({
  x,
  y,
  width,
  height,
  rx = 8,
  shadow = "md",
  children,
}: CardProps) {
  return (
    <g filter={`url(#shadow-${shadow})`}>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={rx}
        fill={colors.white}
        stroke={colors.slate200}
        strokeWidth="1"
      />
      {children}
    </g>
  );
}

// ─── Badge / Pill ─────────────────────────────────────────────────
interface BadgeProps {
  x: number;
  y: number;
  label: string;
  color?: string;
  textColor?: string;
  shadow?: "sm" | "md";
  fontSize?: number;
}

export function Badge({
  x,
  y,
  label,
  color = colors.pink,
  textColor = colors.white,
  shadow = "sm",
  fontSize = 10,
}: BadgeProps) {
  const paddingX = 10;
  const height = 22;
  const width = label.length * (fontSize * 0.6) + paddingX * 2;
  return (
    <g filter={`url(#shadow-${shadow})`}>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={height / 2}
        fill={color}
      />
      <text
        x={x + width / 2}
        y={y + height / 2 + fontSize * 0.35}
        textAnchor="middle"
        fill={textColor}
        fontSize={fontSize}
        fontWeight="600"
        fontFamily="Inter, system-ui, sans-serif"
      >
        {label}
      </text>
    </g>
  );
}

// ─── Outline Badge ────────────────────────────────────────────────
interface OutlineBadgeProps {
  x: number;
  y: number;
  label: string;
  color?: string;
  fontSize?: number;
}

export function OutlineBadge({
  x,
  y,
  label,
  color = colors.pink,
  fontSize = 10,
}: OutlineBadgeProps) {
  const paddingX = 10;
  const height = 22;
  const width = label.length * (fontSize * 0.6) + paddingX * 2;
  return (
    <g filter="url(#shadow-sm)">
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={height / 2}
        fill={colors.white}
        stroke={colors.slate200}
        strokeWidth="1"
      />
      <text
        x={x + width / 2}
        y={y + height / 2 + fontSize * 0.35}
        textAnchor="middle"
        fill={color}
        fontSize={fontSize}
        fontWeight="600"
        fontFamily="Inter, system-ui, sans-serif"
      >
        {label}
      </text>
    </g>
  );
}

// ─── Avatar Dot ───────────────────────────────────────────────────
interface AvatarDotProps {
  cx: number;
  cy: number;
  r?: number;
  initials?: string;
  color?: string;
}

const avatarColors = [colors.pink, colors.blue, colors.emerald, colors.amber];

export function AvatarDot({
  cx,
  cy,
  r = 10,
  initials,
  color,
}: AvatarDotProps) {
  const fill = color ?? avatarColors[0];
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={fill} />
      {initials && (
        <text
          x={cx}
          y={cy + r * 0.35}
          textAnchor="middle"
          fill={colors.white}
          fontSize={r * 0.9}
          fontWeight="700"
          fontFamily="Inter, system-ui, sans-serif"
        >
          {initials}
        </text>
      )}
    </g>
  );
}

// Helper to cycle avatar colors
export function getAvatarColor(index: number): string {
  return avatarColors[index % avatarColors.length];
}

// ─── Star Rating ──────────────────────────────────────────────────
interface StarRatingProps {
  x: number;
  y: number;
  rating: number;
  maxStars?: number;
  size?: number;
}

function StarPath({ x, y, size, filled }: { x: number; y: number; size: number; filled: boolean }) {
  const s = size / 2;
  const d = `M${x},${y - s * 0.95} l${s * 0.3},${s * 0.6} ${s * 0.65},${s * 0.1} -${s * 0.48},${s * 0.47} ${s * 0.12},${s * 0.65} -${s * 0.59},-${s * 0.32} -${s * 0.59},${s * 0.32} ${s * 0.12},-${s * 0.65} -${s * 0.48},-${s * 0.47} ${s * 0.65},-${s * 0.1}z`;
  return filled ? (
    <path d={d} fill={colors.amber} />
  ) : (
    <path d={d} fill="none" stroke={colors.amber} strokeWidth="0.8" />
  );
}

export function StarRating({
  x,
  y,
  rating,
  maxStars = 5,
  size = 10,
}: StarRatingProps) {
  return (
    <g>
      {Array.from({ length: maxStars }, (_, i) => (
        <StarPath
          key={i}
          x={x + i * (size + 2)}
          y={y}
          size={size}
          filled={i < rating}
        />
      ))}
    </g>
  );
}

// ─── Status Dot ───────────────────────────────────────────────────
type StatusType = "success" | "warning" | "error" | "info";

interface StatusDotProps {
  cx: number;
  cy: number;
  r?: number;
  status: StatusType;
}

const statusColors: Record<StatusType, string> = {
  success: colors.emerald,
  warning: colors.amber,
  error: colors.pink,
  info: colors.blue,
};

export function StatusDot({ cx, cy, r = 4, status }: StatusDotProps) {
  return <circle cx={cx} cy={cy} r={r} fill={statusColors[status]} />;
}

// ─── Check Icon ───────────────────────────────────────────────────
interface CheckIconProps {
  x: number;
  y: number;
  size?: number;
  color?: string;
}

export function CheckIcon({ x, y, size = 12, color = colors.emerald }: CheckIconProps) {
  const s = size;
  return (
    <g>
      <circle cx={x + s / 2} cy={y + s / 2} r={s / 2} fill={color} opacity="0.15" />
      <path
        d={`M${x + s * 0.25} ${y + s * 0.5} l${s * 0.18} ${s * 0.18} ${s * 0.32}-${s * 0.36}`}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

// ─── Lock Icon ────────────────────────────────────────────────────
interface LockIconProps {
  x: number;
  y: number;
  size?: number;
  color?: string;
}

export function LockIcon({ x, y, size = 12, color = colors.slate400 }: LockIconProps) {
  const s = size;
  return (
    <g>
      <rect x={x + s * 0.2} y={y + s * 0.4} width={s * 0.6} height={s * 0.5} rx={2} fill={color} />
      <path
        d={`M${x + s * 0.3} ${y + s * 0.4} v-${s * 0.15} a${s * 0.2} ${s * 0.2} 0 0 1 ${s * 0.4} 0 v${s * 0.15}`}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </g>
  );
}

// ─── N8N-Style Workflow Node ──────────────────────────────────────
type NodeType = "trigger" | "http" | "ai" | "code" | "database" | "output";

interface N8nNodeProps {
  x: number;
  y: number;
  width?: number;
  height?: number;
  label: string;
  sublabel?: string;
  nodeType: NodeType;
  icon?: ReactNode;
}

const nodeTypeColors: Record<NodeType, string> = {
  trigger: colors.pink,
  http: colors.blue,
  ai: "#8b5cf6",
  code: "#475569",
  database: colors.emerald,
  output: colors.amber,
};

export function N8nNode({
  x,
  y,
  width = 120,
  height = 48,
  label,
  sublabel,
  nodeType,
  icon,
}: N8nNodeProps) {
  const borderColor = nodeTypeColors[nodeType];
  return (
    <g filter="url(#shadow-md)">
      {/* Node body */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={8}
        fill={colors.white}
        stroke={colors.slate200}
        strokeWidth="1"
      />
      {/* Colored left border */}
      <rect x={x} y={y + 4} width={4} height={height - 8} rx={2} fill={borderColor} />
      {/* Icon area */}
      <rect
        x={x + 12}
        y={y + (height - 28) / 2}
        width={28}
        height={28}
        rx={6}
        fill={borderColor}
        opacity="0.1"
      />
      {icon ? (
        <g transform={`translate(${x + 16}, ${y + (height - 20) / 2})`}>{icon}</g>
      ) : (
        <circle cx={x + 26} cy={y + height / 2} r={5} fill={borderColor} opacity="0.4" />
      )}
      {/* Labels */}
      <text
        x={x + 48}
        y={sublabel ? y + height * 0.38 : y + height / 2 + 4}
        fill={colors.slate900}
        fontSize="11"
        fontWeight="600"
        fontFamily="Inter, system-ui, sans-serif"
      >
        {label}
      </text>
      {sublabel && (
        <text
          x={x + 48}
          y={y + height * 0.65}
          fill={colors.slate400}
          fontSize="9"
          fontFamily="Inter, system-ui, sans-serif"
        >
          {sublabel}
        </text>
      )}
    </g>
  );
}

// ─── Bezier Connector ─────────────────────────────────────────────
interface BezierConnectorProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  strokeWidth?: number;
  showDots?: boolean;
  executionDot?: boolean;
}

export function BezierConnector({
  x1,
  y1,
  x2,
  y2,
  color = colors.slate300,
  strokeWidth = 1.5,
  showDots = true,
  executionDot = false,
}: BezierConnectorProps) {
  const midX = (x1 + x2) / 2;
  const d = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
  return (
    <g>
      <path d={d} fill="none" stroke={color} strokeWidth={strokeWidth} />
      {showDots && (
        <>
          <circle cx={x1} cy={y1} r={3} fill={color} />
          <circle cx={x2} cy={y2} r={3} fill={color} />
        </>
      )}
      {executionDot && (
        <circle
          cx={midX}
          cy={(y1 + y2) / 2}
          r={4}
          fill={colors.emerald}
        />
      )}
    </g>
  );
}

// ─── Bezier Path Generator (for custom usage) ────────────────────
export function bezierPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): string {
  const midX = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
}

// ─── Progress Bar ─────────────────────────────────────────────────
interface ProgressBarProps {
  x: number;
  y: number;
  width: number;
  height?: number;
  progress: number; // 0 to 1
  color?: string;
  bgColor?: string;
}

export function ProgressBar({
  x,
  y,
  width,
  height = 6,
  progress,
  color = colors.pink,
  bgColor = colors.slate100,
}: ProgressBarProps) {
  const rx = height / 2;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={rx} fill={bgColor} />
      <rect
        x={x}
        y={y}
        width={Math.max(width * Math.min(progress, 1), height)}
        height={height}
        rx={rx}
        fill={color}
      />
    </g>
  );
}

// ─── Horizontal Divider ───────────────────────────────────────────
interface DividerProps {
  x: number;
  y: number;
  width: number;
}

export function Divider({ x, y, width }: DividerProps) {
  return <line x1={x} y1={y} x2={x + width} y2={y} stroke={colors.slate200} strokeWidth="1" />;
}

// ─── Text Line (placeholder content line) ─────────────────────────
interface TextLineProps {
  x: number;
  y: number;
  width: number;
  height?: number;
  color?: string;
}

export function TextLine({
  x,
  y,
  width,
  height = 8,
  color = colors.slate200,
}: TextLineProps) {
  return <rect x={x} y={y} width={width} height={height} rx={height / 2} fill={color} />;
}

// ─── Mini Chart (sparkline-style bar chart) ───────────────────────
interface MiniChartProps {
  x: number;
  y: number;
  width: number;
  height: number;
  values: number[];
  color?: string;
}

export function MiniChart({
  x,
  y,
  width,
  height,
  values,
  color = colors.pink,
}: MiniChartProps) {
  const max = Math.max(...values);
  const barWidth = width / values.length - 2;
  return (
    <g>
      {values.map((v, i) => {
        const barHeight = (v / max) * height;
        return (
          <rect
            key={i}
            x={x + i * (barWidth + 2)}
            y={y + height - barHeight}
            width={barWidth}
            height={barHeight}
            rx={2}
            fill={color}
            opacity={0.6 + (v / max) * 0.4}
          />
        );
      })}
    </g>
  );
}
