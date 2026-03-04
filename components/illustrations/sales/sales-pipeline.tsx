import {
  ShadowDefs,
  Card,
  Badge,
  StatusDot,
  Divider,
  colors,
} from "../shared";

interface SalesPipelineProps {
  className?: string;
}

const stages = [
  {
    label: "Prospect",
    count: 247,
    amount: "$284K",
    color: colors.slate700,
    bgColor: "#f8fafc",
    width: 88,
    x: 10,
  },
  {
    label: "Qualified",
    count: 94,
    amount: "$198K",
    color: colors.blue,
    bgColor: "#eff6ff",
    width: 82,
    x: 106,
  },
  {
    label: "Proposal",
    count: 41,
    amount: "$142K",
    color: colors.pink,
    bgColor: "#fff1f4",
    width: 76,
    x: 196,
  },
  {
    label: "Closed",
    count: 18,
    amount: "$86K",
    color: colors.emerald,
    bgColor: "#f0fdf9",
    width: 70,
    x: 280,
  },
];

const conversions = [
  { pct: "38%", x: 101 },
  { pct: "44%", x: 191 },
  { pct: "44%", x: 279 },
];

export function SalesPipeline({ className }: SalesPipelineProps) {
  const cardY = 48;
  const cardH = 200;

  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Sales pipeline funnel showing Prospect through Closed stages with $86K in closed revenue"
    >
      <ShadowDefs />

      {/* Background */}
      <rect width={400} height={300} fill={colors.slate100} rx={12} />

      {/* Title */}
      <text
        x={20}
        y={32}
        fill={colors.slate900}
        fontSize={14}
        fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
      >
        Sales Pipeline
      </text>

      <text
        x={20}
        y={44}
        fill={colors.slate400}
        fontSize={9}
        fontFamily="Inter, system-ui, sans-serif"
      >
        March 2026 · 400 deals tracked
      </text>

      {/* Stage cards */}
      {stages.map((stage) => (
        <g key={stage.label}>
          <g filter="url(#shadow-md)">
            <rect
              x={stage.x}
              y={cardY}
              width={stage.width}
              height={cardH}
              rx={8}
              fill={stage.bgColor}
              stroke={colors.slate200}
              strokeWidth={1}
            />

            {/* Top color bar */}
            <rect
              x={stage.x}
              y={cardY}
              width={stage.width}
              height={5}
              rx={3}
              fill={stage.color}
            />
            <rect
              x={stage.x}
              y={cardY + 2}
              width={stage.width}
              height={3}
              fill={stage.color}
            />

            {/* Stage label */}
            <text
              x={stage.x + stage.width / 2}
              y={cardY + 22}
              textAnchor="middle"
              fill={stage.color}
              fontSize={9}
              fontWeight="700"
              fontFamily="Inter, system-ui, sans-serif"
              letterSpacing="0.3"
            >
              {stage.label.toUpperCase()}
            </text>

            {/* Count */}
            <text
              x={stage.x + stage.width / 2}
              y={cardY + 54}
              textAnchor="middle"
              fill={colors.slate900}
              fontSize={24}
              fontWeight="800"
              fontFamily="Inter, system-ui, sans-serif"
            >
              {stage.count}
            </text>

            <text
              x={stage.x + stage.width / 2}
              y={cardY + 68}
              textAnchor="middle"
              fill={colors.slate400}
              fontSize={8}
              fontFamily="Inter, system-ui, sans-serif"
            >
              deals
            </text>

            {/* Divider */}
            <line
              x1={stage.x + 8}
              y1={cardY + 80}
              x2={stage.x + stage.width - 8}
              y2={cardY + 80}
              stroke={colors.slate200}
              strokeWidth={1}
            />

            {/* Amount */}
            <text
              x={stage.x + stage.width / 2}
              y={cardY + 100}
              textAnchor="middle"
              fill={stage.color}
              fontSize={14}
              fontWeight="700"
              fontFamily="Inter, system-ui, sans-serif"
            >
              {stage.amount}
            </text>

            <text
              x={stage.x + stage.width / 2}
              y={cardY + 114}
              textAnchor="middle"
              fill={colors.slate400}
              fontSize={7.5}
              fontFamily="Inter, system-ui, sans-serif"
            >
              pipeline value
            </text>

            {/* Status dot */}
            <StatusDot
              cx={stage.x + stage.width / 2}
              cy={cardY + 138}
              r={4}
              status={
                stage.color === colors.emerald
                  ? "success"
                  : stage.color === colors.pink
                  ? "error"
                  : stage.color === colors.blue
                  ? "info"
                  : "warning"
              }
            />

            {/* Avg deal size */}
            <text
              x={stage.x + stage.width / 2}
              y={cardY + 160}
              textAnchor="middle"
              fill={colors.slate500}
              fontSize={8}
              fontFamily="Inter, system-ui, sans-serif"
            >
              Avg deal
            </text>
            <text
              x={stage.x + stage.width / 2}
              y={cardY + 172}
              textAnchor="middle"
              fill={colors.slate700}
              fontSize={9}
              fontWeight="600"
              fontFamily="Inter, system-ui, sans-serif"
            >
              {Math.round(
                parseInt(stage.amount.replace(/\D/g, "")) / stage.count
              ).toLocaleString()}K
            </text>

            {/* Bottom strip */}
            <rect
              x={stage.x}
              y={cardY + cardH - 8}
              width={stage.width}
              height={8}
              rx={3}
              fill={stage.color}
              opacity={0.12}
            />
            <rect
              x={stage.x}
              y={cardY + cardH - 8}
              width={stage.width}
              height={5}
              fill={stage.color}
              opacity={0.12}
            />
          </g>
        </g>
      ))}

      {/* Conversion arrows between stages */}
      {conversions.map((conv, i) => (
        <g key={i}>
          <path
            d={`M ${conv.x - 4} ${cardY + cardH / 2} L ${conv.x + 6} ${cardY + cardH / 2}`}
            stroke={colors.slate300}
            strokeWidth={1.5}
            fill="none"
          />
          <path
            d={`M ${conv.x + 3} ${cardY + cardH / 2 - 4} L ${conv.x + 8} ${cardY + cardH / 2} L ${conv.x + 3} ${cardY + cardH / 2 + 4}`}
            stroke={colors.slate300}
            strokeWidth={1.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Conversion rate pill */}
          <rect
            x={conv.x - 14}
            y={cardY + cardH / 2 - 20}
            width={30}
            height={14}
            rx={7}
            fill={colors.white}
            stroke={colors.slate200}
            strokeWidth={1}
          />
          <text
            x={conv.x + 1}
            y={cardY + cardH / 2 - 10}
            textAnchor="middle"
            fill={colors.slate700}
            fontSize={8}
            fontWeight="600"
            fontFamily="Inter, system-ui, sans-serif"
          >
            {conv.pct}
          </text>
        </g>
      ))}

      {/* Revenue badge at end */}
      <Badge x={358} y={108} label="$86K" color={colors.emerald} fontSize={10} shadow="md" />
      <text
        x={375}
        y={142}
        textAnchor="middle"
        fill={colors.slate400}
        fontSize={8}
        fontFamily="Inter, system-ui, sans-serif"
      >
        closed
      </text>

      {/* Footer stats row */}
      <Card x={10} y={264} width={358} height={26} rx={6} shadow="sm">
        <text x={30} y={281} fill={colors.slate400} fontSize={8.5} fontFamily="Inter, system-ui, sans-serif">Total pipeline</text>
        <text x={100} y={281} fill={colors.slate900} fontSize={8.5} fontWeight="700" fontFamily="Inter, system-ui, sans-serif">$710K</text>

        <line x1={148} y1={268} x2={148} y2={290} stroke={colors.slate200} strokeWidth={1} />

        <text x={162} y={281} fill={colors.slate400} fontSize={8.5} fontFamily="Inter, system-ui, sans-serif">Avg cycle</text>
        <text x={210} y={281} fill={colors.slate900} fontSize={8.5} fontWeight="700" fontFamily="Inter, system-ui, sans-serif">18 days</text>

        <line x1={262} y1={268} x2={262} y2={290} stroke={colors.slate200} strokeWidth={1} />

        <text x={274} y={281} fill={colors.slate400} fontSize={8.5} fontFamily="Inter, system-ui, sans-serif">Win rate</text>
        <text x={316} y={281} fill={colors.emerald} fontSize={8.5} fontWeight="700" fontFamily="Inter, system-ui, sans-serif">7.3%</text>
      </Card>
    </svg>
  );
}
