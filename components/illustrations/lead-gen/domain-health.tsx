import {
  ShadowDefs,
  Card,
  Badge,
  ProgressBar,
  CheckIcon,
  Divider,
  colors,
} from "../shared";

interface DomainHealthProps {
  className?: string;
}

export function DomainHealth({ className }: DomainHealthProps) {
  const barData = [
    { label: "Gmail", value: 0.87, color: colors.blue },
    { label: "Outlook", value: 0.92, color: colors.emerald },
    { label: "Yahoo", value: 0.78, color: colors.amber },
    { label: "Other", value: 0.83, color: colors.pink },
  ];

  const checks = [
    { label: "SPF", status: "Pass" },
    { label: "DKIM", status: "Pass" },
    { label: "DMARC", status: "Pass" },
  ];

  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Domain health dashboard showing 94% sender reputation and Excellent status"
    >
      <ShadowDefs />

      {/* Background */}
      <rect width={400} height={300} fill={colors.slate100} rx={12} />

      {/* Background depth card */}
      <g transform="rotate(-1, 200, 150)">
        <rect
          x={18}
          y={18}
          width={364}
          height={268}
          rx={10}
          fill={colors.white}
          stroke={colors.slate200}
          strokeWidth={1}
          opacity={0.55}
        />
      </g>

      {/* Main card */}
      <Card x={14} y={14} width={256} height={276} rx={10} shadow="lg">

        {/* Header */}
        <text
          x={28}
          y={38}
          fill={colors.slate900}
          fontSize={13}
          fontWeight="700"
          fontFamily="Inter, system-ui, sans-serif"
        >
          Domain Health
        </text>

        {/* Excellent badge */}
        <rect x={158} y={24} width={64} height={20} rx={10} fill={colors.emerald} />
        <text
          x={190}
          y={37}
          textAnchor="middle"
          fill={colors.white}
          fontSize={9}
          fontWeight="700"
          fontFamily="Inter, system-ui, sans-serif"
        >
          Excellent
        </text>

        {/* Domain name */}
        <text x={28} y={56} fill={colors.slate500} fontSize={9.5} fontFamily="Inter, system-ui, sans-serif">
          leadgenjay.com
        </text>

        <Divider x={14} y={65} width={256} />

        {/* Sender reputation */}
        <text x={28} y={82} fill={colors.slate700} fontSize={9.5} fontWeight="600" fontFamily="Inter, system-ui, sans-serif">
          Sender Reputation
        </text>

        <text
          x={241}
          y={82}
          textAnchor="end"
          fill={colors.emerald}
          fontSize={12}
          fontWeight="700"
          fontFamily="Inter, system-ui, sans-serif"
        >
          94%
        </text>

        <ProgressBar x={28} y={88} width={214} height={8} progress={0.94} color={colors.emerald} bgColor={colors.slate100} />

        <text x={28} y={108} fill={colors.slate400} fontSize={8.5} fontFamily="Inter, system-ui, sans-serif">
          Based on 30-day sending history
        </text>

        <Divider x={14} y={118} width={256} />

        {/* Stats row */}
        <text x={28} y={134} fill={colors.slate700} fontSize={9.5} fontWeight="600" fontFamily="Inter, system-ui, sans-serif">
          Bounce Rate
        </text>
        <text
          x={241}
          y={134}
          textAnchor="end"
          fill={colors.pink}
          fontSize={12}
          fontWeight="700"
          fontFamily="Inter, system-ui, sans-serif"
        >
          2.1%
        </text>
        <ProgressBar x={28} y={140} width={214} height={6} progress={0.021} color={colors.pink} bgColor={colors.slate100} />

        <text x={28} y={160} fill={colors.slate700} fontSize={9.5} fontWeight="600" fontFamily="Inter, system-ui, sans-serif">
          Spam Complaints
        </text>
        <text
          x={241}
          y={160}
          textAnchor="end"
          fill={colors.amber}
          fontSize={12}
          fontWeight="700"
          fontFamily="Inter, system-ui, sans-serif"
        >
          0.04%
        </text>
        <ProgressBar x={28} y={166} width={214} height={6} progress={0.004} color={colors.amber} bgColor={colors.slate100} />

        <Divider x={14} y={180} width={256} />

        {/* Inbox placement bar chart */}
        <text x={28} y={196} fill={colors.slate700} fontSize={9.5} fontWeight="600" fontFamily="Inter, system-ui, sans-serif">
          Inbox Placement
        </text>

        {barData.map((bar, i) => {
          const barX = 28 + i * 56;
          const maxBarH = 40;
          const barH = bar.value * maxBarH;
          const barBaseY = 244;
          return (
            <g key={bar.label}>
              <rect
                x={barX}
                y={barBaseY - barH}
                width={36}
                height={barH}
                rx={3}
                fill={bar.color}
                opacity={0.85}
              />
              <text
                x={barX + 18}
                y={barBaseY - barH - 5}
                textAnchor="middle"
                fill={bar.color}
                fontSize={9}
                fontWeight="700"
                fontFamily="Inter, system-ui, sans-serif"
              >
                {Math.round(bar.value * 100)}%
              </text>
              <text
                x={barX + 18}
                y={barBaseY + 12}
                textAnchor="middle"
                fill={colors.slate500}
                fontSize={8.5}
                fontFamily="Inter, system-ui, sans-serif"
              >
                {bar.label}
              </text>
            </g>
          );
        })}
      </Card>

      {/* SPF/DKIM/DMARC checks card */}
      <Card x={282} y={14} width={106} height={104} rx={10} shadow="md">
        <text
          x={296}
          y={32}
          fill={colors.slate700}
          fontSize={9}
          fontWeight="600"
          fontFamily="Inter, system-ui, sans-serif"
          letterSpacing="0.3"
        >
          AUTH CHECKS
        </text>

        {checks.map((check, i) => (
          <g key={check.label}>
            <CheckIcon x={292} y={42 + i * 22} size={14} color={colors.emerald} />
            <text
              x={310}
              y={52 + i * 22}
              fill={colors.slate900}
              fontSize={10}
              fontWeight="600"
              fontFamily="Inter, system-ui, sans-serif"
            >
              {check.label}
            </text>
            <text
              x={348}
              y={52 + i * 22}
              fill={colors.emerald}
              fontSize={9}
              fontFamily="Inter, system-ui, sans-serif"
            >
              {check.status}
            </text>
          </g>
        ))}
      </Card>

      {/* Volume card */}
      <Card x={282} y={130} width={106} height={76} rx={10} shadow="md">
        <text x={296} y={148} fill={colors.slate400} fontSize={8.5} fontFamily="Inter, system-ui, sans-serif">
          Daily Volume
        </text>
        <text x={296} y={164} fill={colors.slate900} fontSize={14} fontWeight="700" fontFamily="Inter, system-ui, sans-serif">
          480
        </text>
        <text x={296} y={177} fill={colors.slate400} fontSize={8} fontFamily="Inter, system-ui, sans-serif">
          emails / day
        </text>

        <Divider x={296} y={184} width={80} />
        <text x={296} y={197} fill={colors.emerald} fontSize={8.5} fontWeight="600" fontFamily="Inter, system-ui, sans-serif">
          Within limits
        </text>
      </Card>

      {/* Warmup card */}
      <Card x={282} y={218} width={106} height={70} rx={10} shadow="md">
        <text x={296} y={236} fill={colors.slate400} fontSize={8.5} fontFamily="Inter, system-ui, sans-serif">
          Warmup Status
        </text>
        <Badge x={290} y={242} label="Complete" color={colors.emerald} fontSize={8} shadow="sm" />
        <text x={296} y={278} fill={colors.slate400} fontSize={8} fontFamily="Inter, system-ui, sans-serif">
          Day 42 of 42
        </text>
      </Card>
    </svg>
  );
}
