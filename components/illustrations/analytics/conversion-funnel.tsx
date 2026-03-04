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
    dotColor: colors.slate400,
  },
  {
    label: "Leads",
    value: "2,847",
    width: 220,
    fill: colors.blue,
    textFill: colors.white,
    dotColor: colors.blue,
  },
  {
    label: "Calls",
    value: "456",
    width: 150,
    fill: colors.pink,
    textFill: colors.white,
    dotColor: colors.pink,
  },
  {
    label: "Clients",
    value: "128",
    width: 96,
    fill: colors.emerald,
    textFill: colors.white,
    dotColor: colors.emerald,
  },
];

const dropoffs = ["28.5%", "16.0%", "28.1%"];

export function ConversionFunnel({ className }: ConversionFunnelProps) {
  const centerX = 200;
  const stageH = 40;
  const gap = 10;
  const startY = 28;

  // Badge geometry — centred at x=200
  const badgeLabel = "3.2% Overall Conversion";
  const badgeFontSize = 10;
  const badgePaddingX = 10;
  const badgeH = 22;
  const badgeW = badgeLabel.length * (badgeFontSize * 0.6) + badgePaddingX * 2;
  const badgeX = centerX - badgeW / 2;
  const badgeY = 260;

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

        // Conversion rate label x-position: just right of the narrower next bar
        const labelX = centerX + (stages[i + 1]?.width ?? stage.width) / 2 + 10;
        const labelMidY = y + stageH + gap / 2 + 3;

        return (
          <g key={stage.label}>
            {/* Shadow layer */}
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

            {/* Connector + drop-off between stages */}
            {i < stages.length - 1 && (
              <g>
                {/* Connector stem — taller, darker, wider */}
                <line
                  x1={centerX}
                  y1={y + stageH}
                  x2={centerX}
                  y2={y + stageH + gap - 3}
                  stroke={colors.slate500}
                  strokeWidth="2"
                />
                {/* Arrowhead */}
                <polygon
                  points={`${centerX - 5},${y + stageH + gap - 5} ${centerX + 5},${y + stageH + gap - 5} ${centerX},${y + stageH + gap + 2}`}
                  fill={colors.slate500}
                />

                {/* Colored dot indicator on right side */}
                <circle
                  cx={labelX + 3}
                  cy={labelMidY}
                  r={3.5}
                  fill={stages[i + 1].dotColor}
                  opacity="0.85"
                />

                {/* Drop-off label */}
                <text
                  x={labelX + 11}
                  y={labelMidY + 3.5}
                  fontSize="9"
                  fontFamily="Inter, system-ui, sans-serif"
                  fill={colors.slate500}
                  fontWeight="600"
                >
                  {dropoffs[i]} →
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* Glow circle behind the badge */}
      <circle
        cx={centerX}
        cy={badgeY + badgeH / 2}
        r={badgeW * 0.55}
        fill={colors.emerald}
        opacity="0.08"
      />

      {/* 3.2% Overall conversion badge */}
      <Badge
        x={badgeX}
        y={badgeY}
        label={badgeLabel}
        color={colors.emerald}
        shadow="md"
        fontSize={badgeFontSize}
      />

      {/* Upward trend arrow to the right of the badge */}
      <g transform={`translate(${badgeX + badgeW + 6}, ${badgeY + badgeH / 2 - 5})`}>
        {/* Shaft */}
        <line
          x1={4}
          y1={9}
          x2={4}
          y2={2}
          stroke={colors.emerald}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        {/* Arrowhead pointing up */}
        <polyline
          points="1,5 4,1 7,5"
          fill="none"
          stroke={colors.emerald}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
