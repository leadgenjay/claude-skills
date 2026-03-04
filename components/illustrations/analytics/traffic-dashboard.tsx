import {
  ShadowDefs,
  Card,
  Badge,
  MiniChart,
  Divider,
  colors,
} from "../shared";

interface TrafficDashboardProps {
  className?: string;
}

const sparklineValues = [55, 62, 48, 70, 65, 80, 74, 88, 78, 95, 86, 100];

const sources = [
  { label: "Organic", pct: "42%", color: colors.emerald },
  { label: "Paid", pct: "28%", color: colors.blue },
  { label: "Email", pct: "18%", color: colors.pink },
  { label: "Referral", pct: "12%", color: colors.amber },
];

export function TrafficDashboard({ className }: TrafficDashboardProps) {
  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Traffic dashboard showing 24,847 total visitors with upward trend and source breakdown"
    >
      <ShadowDefs />

      {/* Background */}
      <rect width={400} height={300} rx={16} fill={colors.slate100} />

      {/* Main card */}
      <Card x={16} y={14} width={368} height={272} rx={12} shadow="lg" />

      {/* ── Header ── */}
      <text
        x={32}
        y={42}
        fontSize="13"
        fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.slate900}
      >
        Traffic Overview
      </text>

      {/* Date range */}
      <rect x={234} y={28} width={88} height={20} rx={10} fill={colors.slate100} />
      <text
        x={278}
        y={42}
        textAnchor="middle"
        fontSize="9"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.slate400}
        fontWeight="600"
      >
        Last 30 Days
      </text>

      <Divider x={16} y={56} width={368} />

      {/* ── Hero stat ── */}
      <text
        x={32}
        y={90}
        fontSize="34"
        fontWeight="800"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.slate900}
      >
        24,847
      </text>
      <text
        x={32}
        y={106}
        fontSize="10"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.slate400}
      >
        Total Visitors
      </text>

      {/* Green up-arrow + trend */}
      <polygon
        points="192,80 200,96 184,96"
        fill={colors.emerald}
        opacity="0.9"
      />
      <text
        x={204}
        y={93}
        fontSize="13"
        fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.emerald}
      >
        +12.3%
      </text>
      <text
        x={204}
        y={107}
        fontSize="9"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.slate400}
      >
        vs last month
      </text>

      {/* Sparkline next to total */}
      <MiniChart
        x={296}
        y={72}
        width={72}
        height={36}
        values={sparklineValues}
        color={colors.emerald}
      />

      <Divider x={32} y={118} width={336} />

      {/* ── Line chart area ── */}
      <rect x={32} y={126} width={336} height={88} rx={6} fill={colors.slate100} opacity="0.6" />

      {/* Grid lines */}
      {[0, 1, 2, 3].map((i) => (
        <line
          key={i}
          x1={32}
          y1={148 + i * 22}
          x2={368}
          y2={148 + i * 22}
          stroke={colors.slate200}
          strokeWidth="0.8"
        />
      ))}

      {/* Polyline chart — upward trend */}
      <polyline
        points="32,204 64,194 96,198 128,183 160,188 192,170 224,175 256,158 288,163 320,148 352,152 368,134"
        fill="none"
        stroke={colors.blue}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Fill area under line */}
      <path
        d="M32,204 64,194 96,198 128,183 160,188 192,170 224,175 256,158 288,163 320,148 352,152 368,134 L368,214 L32,214 Z"
        fill={colors.blue}
        opacity="0.06"
      />

      {/* Data point dots */}
      {[
        [32, 204], [96, 198], [160, 188], [224, 175], [288, 163], [368, 134],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3} fill={colors.blue} opacity="0.7" />
      ))}

      {/* Peak dot with tooltip */}
      <circle cx={368} cy={134} r={5} fill={colors.blue} />
      <rect x={340} y={120} width={44} height={14} rx={7} fill={colors.blue} />
      <text
        x={362}
        y={131}
        textAnchor="middle"
        fontSize="8"
        fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.white}
      >
        Peak
      </text>

      <Divider x={32} y={222} width={336} />

      {/* ── Source breakdown pills ── */}
      <text
        x={32}
        y={238}
        fontSize="9"
        fontWeight="600"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.slate400}
        letterSpacing="0.5"
      >
        TRAFFIC SOURCES
      </text>

      {sources.map((src, i) => {
        const pillX = 32 + i * 84;
        const pillW = src.label.length * 6.5 + 42;
        return (
          <g key={src.label}>
            <rect
              x={pillX}
              y={246}
              width={pillW}
              height={22}
              rx={11}
              fill={src.color}
              opacity="0.12"
            />
            <circle cx={pillX + 10} cy={257} r={4} fill={src.color} />
            <text
              x={pillX + 18}
              y={261}
              fontSize="9"
              fontWeight="700"
              fontFamily="Inter, system-ui, sans-serif"
              fill={src.color}
            >
              {src.label}
            </text>
            <text
              x={pillX + 18 + src.label.length * 5.5}
              y={261}
              fontSize="9"
              fontFamily="Inter, system-ui, sans-serif"
              fill={colors.slate400}
            >
              {src.pct}
            </text>
          </g>
        );
      })}

      {/* Active users badge */}
      <Badge
        x={290}
        y={246}
        label="● 1,247 active"
        color={colors.emerald}
        shadow="sm"
        fontSize={9}
      />
    </svg>
  );
}
