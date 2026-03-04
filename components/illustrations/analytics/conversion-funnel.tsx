import { ShadowDefs, Badge, colors } from "../shared";

interface ConversionFunnelProps {
  className?: string;
}

const stages = [
  {
    label: "Visitors",
    value: "10,000",
    width: 300,
    fill: colors.slate700,
    textFill: colors.white,
  },
  {
    label: "Leads",
    value: "2,847",
    width: 220,
    fill: colors.blue,
    textFill: colors.white,
  },
  {
    label: "Calls",
    value: "456",
    width: 150,
    fill: colors.pink,
    textFill: colors.white,
  },
  {
    label: "Clients",
    value: "128",
    width: 96,
    fill: colors.emerald,
    textFill: colors.white,
  },
];

const dropoffs = ["28.5% →", "16.0% →", "28.1% →"];

export function ConversionFunnel({ className }: ConversionFunnelProps) {
  const centerX = 200;
  const stageH = 40;
  const gap = 10;
  const startY = 28;

  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Conversion funnel: 10,000 visitors → 2,847 leads → 456 calls → 128 clients"
    >
      <ShadowDefs />

      {/* Background */}
      <rect width={400} height={300} rx={16} fill={colors.slate100} />

      {/* Title */}
      <text
        x={200}
        y={20}
        textAnchor="middle"
        fontSize="12"
        fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.slate900}
      >
        Conversion Funnel
      </text>

      {stages.map((stage, i) => {
        const y = startY + i * (stageH + gap);
        const x = centerX - stage.width / 2;

        // Trapezoid: top wider, bottom slightly narrower (tapered effect)
        const nextWidth = stages[i + 1]?.width ?? stage.width * 0.7;
        const taper = (stage.width - nextWidth) / 2;

        const trapezoid =
          i < stages.length - 1
            ? `M${x},${y} L${x + stage.width},${y} L${x + stage.width - taper / 2},${y + stageH} L${x + taper / 2},${y + stageH} Z`
            : `M${x},${y} L${x + stage.width},${y} L${x + stage.width},${y + stageH} L${x},${y + stageH} Z`;

        return (
          <g key={stage.label}>
            {/* Shadow layer — path does not accept rx, use g filter */}
            <g filter="url(#shadow-sm)">
              <path d={trapezoid} fill={stage.fill} />
            </g>

            {/* Stage label */}
            <text
              x={centerX - stage.width / 2 + 10}
              y={y + stageH / 2 + 4}
              fontSize="10"
              fontWeight="600"
              fontFamily="Inter, system-ui, sans-serif"
              fill={stage.textFill}
              opacity="0.85"
            >
              {stage.label}
            </text>

            {/* Stage value (right-aligned inside bar) */}
            <text
              x={centerX + stage.width / 2 - 10}
              y={y + stageH / 2 + 4}
              textAnchor="end"
              fontSize="14"
              fontWeight="800"
              fontFamily="Inter, system-ui, sans-serif"
              fill={stage.textFill}
            >
              {stage.value}
            </text>

            {/* Drop-off percentage between stages */}
            {i < stages.length - 1 && (
              <g>
                {/* Arrow */}
                <line
                  x1={centerX}
                  y1={y + stageH}
                  x2={centerX}
                  y2={y + stageH + gap - 2}
                  stroke={colors.slate400}
                  strokeWidth="1.5"
                />
                <polygon
                  points={`${centerX - 4},${y + stageH + gap - 4} ${centerX + 4},${y + stageH + gap - 4} ${centerX},${y + stageH + gap + 2}`}
                  fill={colors.slate400}
                />
                {/* Drop-off label — right side */}
                <text
                  x={centerX + stages[i + 1].width / 2 + 14}
                  y={y + stageH + gap / 2 + 4}
                  fontSize="9"
                  fontFamily="Inter, system-ui, sans-serif"
                  fill={colors.slate400}
                  fontWeight="600"
                >
                  {dropoffs[i]}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* 3.2% Overall conversion badge */}
      <Badge
        x={134}
        y={258}
        label="3.2% Overall Conversion"
        color={colors.emerald}
        shadow="md"
        fontSize={10}
      />
    </svg>
  );
}
