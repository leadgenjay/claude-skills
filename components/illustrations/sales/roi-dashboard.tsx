import {
  ShadowDefs,
  Card,
  Badge,
  MiniChart,
  Divider,
  colors,
} from "../shared";

interface ROIDashboardProps {
  className?: string;
}

const metrics = [
  {
    label: "Leads Generated",
    value: "2,847",
    change: "+24%",
    changeUp: true,
    icon: colors.emerald,
    iconSymbol: "↗",
    chartValues: [40, 55, 48, 72, 68, 84, 92, 100],
    chartColor: colors.emerald,
    x: 24,
    y: 70,
  },
  {
    label: "Emails Sent",
    value: "12,400",
    change: "+18%",
    changeUp: true,
    icon: colors.blue,
    iconSymbol: "✉",
    chartValues: [60, 70, 65, 80, 78, 85, 90, 95],
    chartColor: colors.blue,
    x: 214,
    y: 70,
  },
  {
    label: "Meetings Booked",
    value: "156",
    change: "+31%",
    changeUp: true,
    icon: colors.pink,
    iconSymbol: "📅",
    chartValues: [30, 45, 40, 58, 62, 70, 80, 90],
    chartColor: colors.pink,
    x: 24,
    y: 178,
  },
  {
    label: "Revenue",
    value: "$284K",
    change: "+42%",
    changeUp: true,
    icon: colors.emerald,
    iconSymbol: "$",
    chartValues: [20, 35, 55, 60, 72, 78, 88, 100],
    chartColor: colors.emerald,
    x: 214,
    y: 178,
  },
];

export function ROIDashboard({ className }: ROIDashboardProps) {
  const cardW = 168;
  const cardH = 96;

  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="ROI dashboard showing 2,847 leads generated, 12,400 emails sent, 156 meetings booked, and $284K revenue"
    >
      <ShadowDefs />

      {/* Background */}
      <rect width="400" height="300" fill={colors.slate100} rx="12" />

      {/* Outer wrapper card */}
      <Card x={10} y={10} width={380} height={284} rx={12} shadow="lg">

        {/* Header */}
        <text
          x="24"
          y="34"
          fill={colors.slate900}
          fontSize="13"
          fontWeight="700"
          fontFamily="Inter, system-ui, sans-serif"
        >
          Campaign ROI
        </text>

        {/* Date range badge */}
        <rect x="130" y="22" width="90" height="18" rx="9" fill={colors.slate100} stroke={colors.slate200} strokeWidth="1" />
        <text
          x="175"
          y="34"
          textAnchor="middle"
          fill={colors.slate700}
          fontSize="8.5"
          fontFamily="Inter, system-ui, sans-serif"
        >
          Last 30 Days
        </text>

        {/* Live badge */}
        <circle cx="288" cy="31" r="4" fill={colors.emerald} />
        <text x="296" y="35" fill={colors.emerald} fontSize="9" fontWeight="600" fontFamily="Inter, system-ui, sans-serif">
          Live
        </text>

        <Divider x={10} y={50} width={380} />

        {/* 4 metric cards */}
        {metrics.map((metric, mi) => (
          <g key={metric.label}>
            {/* Card background */}
            <rect
              x={metric.x}
              y={metric.y}
              width={cardW}
              height={cardH}
              rx={8}
              fill={colors.white}
              stroke={colors.slate200}
              strokeWidth="1"
            />

            {/* Colored left bar */}
            <rect
              x={metric.x}
              y={metric.y + 12}
              width={3}
              height={cardH - 24}
              rx={1.5}
              fill={metric.icon}
            />

            {/* Icon circle */}
            <circle cx={metric.x + 26} cy={metric.y + 26} r={14} fill={metric.icon} opacity="0.1" />
            <text
              x={metric.x + 26}
              y={metric.y + 31}
              textAnchor="middle"
              fill={metric.icon}
              fontSize="12"
              fontFamily="Inter, system-ui, sans-serif"
            >
              {metric.iconSymbol}
            </text>

            {/* Label */}
            <text
              x={metric.x + 48}
              y={metric.y + 22}
              fill={colors.slate500}
              fontSize="8.5"
              fontFamily="Inter, system-ui, sans-serif"
            >
              {metric.label}
            </text>

            {/* Value */}
            <text
              x={metric.x + 48}
              y={metric.y + 40}
              fill={colors.slate900}
              fontSize="18"
              fontWeight="800"
              fontFamily="Inter, system-ui, sans-serif"
            >
              {metric.value}
            </text>

            {/* Change badge */}
            <rect
              x={metric.x + 48}
              y={metric.y + 46}
              width={36}
              height={14}
              rx={7}
              fill={metric.changeUp ? colors.emerald : colors.pink}
              opacity={0.12}
            />
            <text
              x={metric.x + 66}
              y={metric.y + 56}
              textAnchor="middle"
              fill={metric.changeUp ? colors.emerald : colors.pink}
              fontSize="8.5"
              fontWeight="600"
              fontFamily="Inter, system-ui, sans-serif"
            >
              {metric.change}
            </text>

            {/* Mini sparkline chart */}
            <MiniChart
              x={metric.x + 10}
              y={metric.y + 66}
              width={cardW - 20}
              height={20}
              values={metric.chartValues}
              color={metric.chartColor}
            />
          </g>
        ))}

        {/* Footer */}
        <Divider x={10} y={284} width={380} />
      </Card>

      {/* Floating summary badge */}
      <Badge x={282} y={18} label="↑ All metrics up" color={colors.emerald} fontSize={9} shadow="md" />
    </svg>
  );
}
