import {
  ShadowDefs,
  Card,
  Badge,
  colors,
} from "../shared";

interface ABTestResultsProps {
  className?: string;
}

export function ABTestResults({ className }: ABTestResultsProps) {
  const cardW = 148;
  const cardH = 188;
  const cardY = 44;

  // Bar chart positions
  const barBaseY = 218;
  const barH_A = 52;
  const barH_B = 78;
  const barW = 44;

  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="A/B test results: Variant A 3.2% vs Variant B 4.8% winner with 96% confidence"
    >
      <ShadowDefs />

      {/* Background */}
      <rect width={400} height={300} rx={16} fill={colors.slate100} />

      {/* Title */}
      <text
        x={200}
        y={32}
        textAnchor="middle"
        fontSize="13"
        fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.slate900}
      >
        A/B Test Results
      </text>

      {/* ── Variant A card ── */}
      <Card x={20} y={cardY} width={cardW} height={cardH} rx={12} shadow="md" />

      {/* A label chip */}
      <rect x={36} y={cardY + 14} width={28} height={18} rx={9} fill={colors.slate200} />
      <text
        x={50}
        y={cardY + 27}
        textAnchor="middle"
        fontSize="10"
        fontWeight="800"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.slate500}
      >
        A
      </text>

      <text
        x={70}
        y={cardY + 27}
        fontSize="11"
        fontWeight="600"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.slate500}
      >
        Variant A
      </text>

      {/* Big conversion rate */}
      <text
        x={94}
        y={cardY + 82}
        textAnchor="middle"
        fontSize="36"
        fontWeight="800"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.slate700}
      >
        3.2%
      </text>
      <text
        x={94}
        y={cardY + 98}
        textAnchor="middle"
        fontSize="9"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.slate400}
      >
        conversion rate
      </text>

      {/* Divider */}
      <line x1={36} y1={cardY + 110} x2={152} y2={cardY + 110} stroke={colors.slate200} strokeWidth="1" />

      {/* Sample size */}
      <text
        x={36}
        y={cardY + 128}
        fontSize="9"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.slate400}
      >
        Visitors
      </text>
      <text
        x={36}
        y={cardY + 142}
        fontSize="13"
        fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.slate700}
      >
        5,000
      </text>

      {/* CI */}
      <text
        x={100}
        y={cardY + 128}
        fontSize="9"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.slate400}
      >
        CI Range
      </text>
      <text
        x={100}
        y={cardY + 142}
        fontSize="10"
        fontWeight="600"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.slate500}
      >
        2.8–3.6%
      </text>

      {/* ── Variant B card — winner ── */}
      {/* Green border glow */}
      <rect
        x={230}
        y={cardY - 2}
        width={cardW + 4}
        height={cardH + 4}
        rx={14}
        fill="none"
        stroke={colors.emerald}
        strokeWidth="2"
        opacity="0.4"
      />
      <Card x={232} y={cardY} width={cardW} height={cardH} rx={12} shadow="lg" />

      {/* B label chip */}
      <rect x={248} y={cardY + 14} width={28} height={18} rx={9} fill={colors.blue} opacity="0.15" />
      <text
        x={262}
        y={cardY + 27}
        textAnchor="middle"
        fontSize="10"
        fontWeight="800"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.blue}
      >
        B
      </text>

      <text
        x={282}
        y={cardY + 27}
        fontSize="11"
        fontWeight="600"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.slate700}
      >
        Variant B
      </text>

      {/* Winner badge */}
      <Badge
        x={298}
        y={cardY + 10}
        label="Winner"
        color={colors.emerald}
        shadow="sm"
        fontSize={9}
      />

      {/* Big conversion rate */}
      <text
        x={306}
        y={cardY + 82}
        textAnchor="middle"
        fontSize="36"
        fontWeight="800"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.emerald}
      >
        4.8%
      </text>
      <text
        x={306}
        y={cardY + 98}
        textAnchor="middle"
        fontSize="9"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.slate400}
      >
        conversion rate
      </text>

      {/* Divider */}
      <line x1={248} y1={cardY + 110} x2={364} y2={cardY + 110} stroke={colors.slate200} strokeWidth="1" />

      {/* Sample size */}
      <text
        x={248}
        y={cardY + 128}
        fontSize="9"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.slate400}
      >
        Visitors
      </text>
      <text
        x={248}
        y={cardY + 142}
        fontSize="13"
        fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.slate700}
      >
        5,000
      </text>

      {/* CI */}
      <text
        x={312}
        y={cardY + 128}
        fontSize="9"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.slate400}
      >
        CI Range
      </text>
      <text
        x={312}
        y={cardY + 142}
        fontSize="10"
        fontWeight="600"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.emerald}
      >
        4.2–5.4%
      </text>

      {/* +50% Improvement badge on winner */}
      <Badge
        x={240}
        y={cardY + 155}
        label="+50% Improvement"
        color={colors.pink}
        shadow="sm"
        fontSize={9}
      />

      {/* ── Bar chart comparison ── */}
      <rect x={20} y={230} width={360} height={52} rx={8} fill={colors.white} opacity="0.6" />

      {/* Bar A */}
      <rect
        x={94 - barW / 2}
        y={barBaseY - barH_A}
        width={barW}
        height={barH_A}
        rx={4}
        fill={colors.slate300}
        opacity="0.8"
      />
      <text
        x={94}
        y={barBaseY - barH_A - 4}
        textAnchor="middle"
        fontSize="9"
        fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.slate500}
      >
        3.2%
      </text>

      {/* Bar B */}
      <rect
        x={306 - barW / 2}
        y={barBaseY - barH_B}
        width={barW}
        height={barH_B}
        rx={4}
        fill={colors.emerald}
        opacity="0.85"
      />
      <text
        x={306}
        y={barBaseY - barH_B - 4}
        textAnchor="middle"
        fontSize="9"
        fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.emerald}
      >
        4.8%
      </text>

      {/* Base line */}
      <line x1={20} y1={barBaseY} x2={380} y2={barBaseY} stroke={colors.slate200} strokeWidth="1" />

      {/* 96% Confidence badge floating between the two cards */}
      <Badge
        x={154}
        y={148}
        label="96% Confidence"
        color={colors.blue}
        shadow="md"
        fontSize={10}
      />
    </svg>
  );
}
