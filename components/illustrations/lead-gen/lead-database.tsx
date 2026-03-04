import {
  ShadowDefs,
  Card,
  Badge,
  AvatarDot,
  StatusDot,
  Divider,
  colors,
  getAvatarColor,
} from "../shared";

interface LeadDatabaseProps {
  className?: string;
}

const leads = [
  { initials: "TW", name: "Tom Walsh", email: "t.walsh@ironbrew.com", industry: "Food & Bev", status: "success" as const, checked: true },
  { initials: "JL", name: "Jenna Li", email: "jenna@liflowers.com", industry: "Retail", status: "success" as const, checked: true },
  { initials: "MR", name: "Marco Rossi", email: "m.rossi@taproom.io", industry: "Hospitality", status: "warning" as const, checked: false },
  { initials: "DH", name: "Dana Hill", email: "dana@hillsfit.com", industry: "Fitness", status: "success" as const, checked: true },
  { initials: "SP", name: "Sam Park", email: "s.park@parklaw.com", industry: "Legal", status: "warning" as const, checked: false },
];

export function LeadDatabase({ className }: LeadDatabaseProps) {
  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Lead database table showing 2,847 verified business leads with filters"
    >
      <ShadowDefs />

      {/* Background */}
      <rect width={400} height={300} fill={colors.slate100} rx={12} />

      {/* Background card for depth */}
      <g transform="rotate(1.5, 200, 150)">
        <rect
          x={14}
          y={14}
          width={372}
          height={276}
          rx={10}
          fill={colors.white}
          stroke={colors.slate200}
          strokeWidth={1}
          opacity={0.5}
        />
      </g>

      {/* Main database card */}
      <Card x={10} y={10} width={358} height={282} rx={10} shadow="lg">

        {/* Header */}
        <text
          x={24}
          y={34}
          fill={colors.slate900}
          fontSize={13}
          fontWeight="700"
          fontFamily="Inter, system-ui, sans-serif"
        >
          Lead Database
        </text>

        {/* 2,847 leads badge */}
        <rect x={130} y={22} width={78} height={18} rx={9} fill={colors.blue} />
        <text
          x={169}
          y={34}
          textAnchor="middle"
          fill={colors.white}
          fontSize={9}
          fontWeight="700"
          fontFamily="Inter, system-ui, sans-serif"
        >
          2,847 leads
        </text>

        {/* Export button mock */}
        <rect x={304} y={22} width={52} height={18} rx={9} fill={colors.slate100} stroke={colors.slate200} strokeWidth={1} />
        <text
          x={330}
          y={34}
          textAnchor="middle"
          fill={colors.slate700}
          fontSize={9}
          fontFamily="Inter, system-ui, sans-serif"
        >
          Export
        </text>

        {/* Filter chips */}
        <rect x={24} y={44} width={76} height={18} rx={9} fill={colors.emerald} />
        <text x={62} y={56} textAnchor="middle" fill={colors.white} fontSize={8.5} fontWeight="600" fontFamily="Inter, system-ui, sans-serif">
          Verified Only
        </text>

        <rect x={108} y={44} width={62} height={18} rx={9} fill={colors.white} stroke={colors.slate200} strokeWidth={1} />
        <text x={139} y={56} textAnchor="middle" fill={colors.slate700} fontSize={8.5} fontFamily="Inter, system-ui, sans-serif">
          Restaurant
        </text>

        <rect x={178} y={44} width={42} height={18} rx={9} fill={colors.white} stroke={colors.slate200} strokeWidth={1} />
        <text x={199} y={56} textAnchor="middle" fill={colors.slate700} fontSize={8.5} fontFamily="Inter, system-ui, sans-serif">
          Local
        </text>

        <rect x={228} y={44} width={50} height={18} rx={9} fill={colors.white} stroke={colors.slate200} strokeWidth={1} />
        <text x={253} y={56} textAnchor="middle" fill={colors.slate700} fontSize={8.5} fontFamily="Inter, system-ui, sans-serif">
          Owner
        </text>

        {/* Table header */}
        <rect x={10} y={68} width={358} height={20} fill={colors.slate100} />

        {/* Checkbox header */}
        <rect x={24} y={73} width={10} height={10} rx={2} fill="none" stroke={colors.slate300} strokeWidth={1.2} />

        <text x={44} y={81} fill={colors.slate500} fontSize={8.5} fontWeight="600" fontFamily="Inter, system-ui, sans-serif" letterSpacing="0.3">NAME</text>
        <text x={152} y={81} fill={colors.slate500} fontSize={8.5} fontWeight="600" fontFamily="Inter, system-ui, sans-serif" letterSpacing="0.3">EMAIL</text>
        <text x={260} y={81} fill={colors.slate500} fontSize={8.5} fontWeight="600" fontFamily="Inter, system-ui, sans-serif" letterSpacing="0.3">INDUSTRY</text>
        <text x={322} y={81} fill={colors.slate500} fontSize={8.5} fontWeight="600" fontFamily="Inter, system-ui, sans-serif" letterSpacing="0.3">STATUS</text>

        {/* Table rows */}
        {leads.map((lead, i) => {
          const rowY = 94 + i * 37;
          return (
            <g key={lead.name}>
              {/* Row highlight for checked rows */}
              {lead.checked && (
                <rect x={10} y={rowY - 4} width={358} height={36} fill={colors.blue} opacity={0.03} />
              )}

              {/* Checkbox */}
              <rect
                x={24}
                y={rowY + 2}
                width={10}
                height={10}
                rx={2}
                fill={lead.checked ? colors.blue : "none"}
                stroke={lead.checked ? colors.blue : colors.slate300}
                strokeWidth={1.2}
              />
              {lead.checked && (
                <path
                  d={`M27 ${rowY + 7} l3 3 5-5`}
                  stroke={colors.white}
                  strokeWidth={1.2}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Avatar + name */}
              <AvatarDot cx={48} cy={rowY + 12} r={11} initials={lead.initials} color={getAvatarColor(i)} />
              <text x={64} y={rowY + 16} fill={colors.slate900} fontSize={10} fontWeight="600" fontFamily="Inter, system-ui, sans-serif">
                {lead.name}
              </text>

              {/* Email */}
              <text x={152} y={rowY + 16} fill={colors.slate500} fontSize={9} fontFamily="Inter, system-ui, sans-serif">
                {lead.email}
              </text>

              {/* Industry */}
              <rect x={260} y={rowY + 6} width={54} height={14} rx={7} fill={colors.slate100} />
              <text x={287} y={rowY + 16} textAnchor="middle" fill={colors.slate700} fontSize={8.5} fontFamily="Inter, system-ui, sans-serif">
                {lead.industry}
              </text>

              {/* Status dot + label */}
              <StatusDot cx={326} cy={rowY + 12} r={4} status={lead.status} />
              <text
                x={334}
                y={rowY + 16}
                fill={lead.status === "success" ? colors.emerald : colors.amber}
                fontSize={9}
                fontFamily="Inter, system-ui, sans-serif"
              >
                {lead.status === "success" ? "Verified" : "Pending"}
              </text>

              {/* Divider */}
              {i < leads.length - 1 && <Divider x={10} y={rowY + 32} width={358} />}
            </g>
          );
        })}

        {/* Footer */}
        <Divider x={10} y={283} width={358} />
      </Card>

      {/* Floating count badge */}
      <Badge x={308} y={14} label="2,847 leads" color={colors.pink} fontSize={9} shadow="md" />
    </svg>
  );
}
