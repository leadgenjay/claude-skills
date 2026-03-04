import {
  ShadowDefs,
  Card,
  Badge,
  StatusDot,
  MiniChart,
  Divider,
  TextLine,
  colors,
} from "../shared";

interface BrowserAppPreviewProps {
  className?: string;
}

export function BrowserAppPreview({ className }: BrowserAppPreviewProps) {
  const chartValues = [42, 68, 55, 80, 72, 91, 88, 76, 95, 89];

  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Browser window showing a dashboard application preview"
    >
      <ShadowDefs />

      {/* Background */}
      <rect width="400" height="300" fill={colors.slate100} rx="12" />

      {/* ── Browser outer frame ── */}
      <Card x={12} y={12} width={376} height={276} shadow="lg" />

      {/* Browser chrome bar */}
      <rect x={12} y={12} width={376} height={34} rx="8" fill="#f8fafc" stroke={colors.slate200} strokeWidth="1" />
      <rect x={12} y={36} width={376} height={10} fill="#f8fafc" />

      {/* Traffic-light buttons */}
      <circle cx={30} cy={29} r={5} fill="#ef4444" />
      <circle cx={46} cy={29} r={5} fill={colors.amber} />
      <circle cx={62} cy={29} r={5} fill={colors.emerald} />

      {/* Back / forward nav */}
      <text x={78} y={33} fill={colors.slate400} fontSize="12" fontFamily="Inter, system-ui, sans-serif">‹</text>
      <text x={88} y={33} fill={colors.slate300} fontSize="12" fontFamily="Inter, system-ui, sans-serif">›</text>

      {/* URL address bar */}
      <rect x={102} y={20} width={196} height={18} rx="5" fill={colors.slate100} stroke={colors.slate200} strokeWidth="1" />
      <StatusDot cx={112} cy={29} r={3} status="success" />
      <text x={120} y={33} fill={colors.slate500} fontSize="8" fontFamily="'SF Mono', 'Fira Code', monospace">
        web.leadgenjay.com/admin
      </text>

      {/* Reload icon (circles) */}
      <text x={304} y={33} fill={colors.slate400} fontSize="10" fontFamily="Inter, system-ui, sans-serif">↻</text>

      {/* "Live Preview" badge */}
      <Badge x={318} y={18} label="Live Preview" color={colors.blue} fontSize={9} shadow="sm" />

      {/* ── App content area ── */}
      <rect x={12} y={46} width={376} height={242} fill={colors.white} />
      <rect x={12} y={270} width={376} height={18} rx="8" fill={colors.white} />

      {/* ── Sidebar nav ── */}
      <rect x={12} y={46} width={88} height={242} fill={colors.slate900} />
      <rect x={12} y={270} width={88} height={18} rx="8" fill={colors.slate900} />

      {/* Logo in sidebar */}
      <rect x={24} y={58} width={64} height={14} rx="3" fill={colors.pink} opacity="0.2" />
      <text x={56} y={68} textAnchor="middle" fill={colors.pink} fontSize="8" fontWeight="700" fontFamily="Inter, system-ui, sans-serif">
        Lead Gen Jay
      </text>

      {/* Nav items */}
      {[
        { label: "Dashboard", active: true, icon: "▦", y: 88 },
        { label: "Leads", active: false, icon: "◎", y: 108 },
        { label: "Contracts", active: false, icon: "◻", y: 128 },
        { label: "Analytics", active: false, icon: "◈", y: 148 },
        { label: "Settings", active: false, icon: "⚙", y: 168 },
      ].map(({ label, active, icon, y }) => (
        <g key={label}>
          {active && (
            <rect x={12} y={y - 8} width={88} height={24} fill={colors.pink} opacity="0.15" />
          )}
          <text
            x={24}
            y={y + 5}
            fill={active ? colors.pink : colors.slate400}
            fontSize="8"
            fontFamily="Inter, system-ui, sans-serif"
          >
            {icon}
          </text>
          <text
            x={36}
            y={y + 5}
            fill={active ? colors.white : colors.slate400}
            fontSize="8"
            fontWeight={active ? "600" : "400"}
            fontFamily="Inter, system-ui, sans-serif"
          >
            {label}
          </text>
          {active && (
            <rect x={12} y={y - 8} width={3} height={24} rx="1" fill={colors.pink} />
          )}
        </g>
      ))}

      {/* ── Main content area ── */}
      {/* Page title */}
      <text x={114} y={66} fill={colors.slate900} fontSize="12" fontWeight="700" fontFamily="Inter, system-ui, sans-serif">
        Dashboard
      </text>
      <text x={114} y={78} fill={colors.slate400} fontSize="8" fontFamily="Inter, system-ui, sans-serif">
        Welcome back, Jay
      </text>

      {/* ── 3 metric cards ── */}
      {/* Card 1 */}
      <Card x={114} y={86} width={76} height={44} shadow="sm" />
      <text x={122} y={100} fill={colors.slate400} fontSize="7" fontFamily="Inter, system-ui, sans-serif">Total Leads</text>
      <text x={122} y={117} fill={colors.slate900} fontSize="13" fontWeight="700" fontFamily="Inter, system-ui, sans-serif">2,847</text>
      <text x={162} y={117} fill={colors.emerald} fontSize="7" fontFamily="Inter, system-ui, sans-serif">+12%</text>

      {/* Card 2 */}
      <Card x={196} y={86} width={76} height={44} shadow="sm" />
      <text x={204} y={100} fill={colors.slate400} fontSize="7" fontFamily="Inter, system-ui, sans-serif">Conversion</text>
      <text x={204} y={117} fill={colors.slate900} fontSize="13" fontWeight="700" fontFamily="Inter, system-ui, sans-serif">34.7%</text>
      <text x={244} y={117} fill={colors.blue} fontSize="7" fontFamily="Inter, system-ui, sans-serif">↑</text>

      {/* Card 3 */}
      <Card x={278} y={86} width={98} height={44} shadow="sm" />
      <text x={286} y={100} fill={colors.slate400} fontSize="7" fontFamily="Inter, system-ui, sans-serif">Revenue (MRR)</text>
      <text x={286} y={117} fill={colors.pink} fontSize="13" fontWeight="700" fontFamily="Inter, system-ui, sans-serif">$18,420</text>

      {/* ── Chart area ── */}
      <Card x={114} y={138} width={262} height={66} shadow="sm" />
      <text x={122} y={152} fill={colors.slate700} fontSize="9" fontWeight="600" fontFamily="Inter, system-ui, sans-serif">Weekly Leads</text>
      <StatusDot cx={346} cy={149} r={3} status="success" />
      <text x={352} y={152} fill={colors.emerald} fontSize="7" fontFamily="Inter, system-ui, sans-serif">Live</text>

      <MiniChart x={122} y={157} width={246} height={38} values={chartValues} color={colors.blue} />

      {/* ── Table below ── */}
      <Card x={114} y={212} width={262} height={72} shadow="sm" />
      <text x={122} y={226} fill={colors.slate700} fontSize="9" fontWeight="600" fontFamily="Inter, system-ui, sans-serif">Recent Leads</text>

      <Divider x={114} y={230} width={262} />

      {/* Table rows */}
      {[
        { name: "Sarah K.", source: "Webflow", status: "success" as const, y: 240 },
        { name: "Mike T.", source: "Cold Email", status: "info" as const, y: 252 },
        { name: "Priya M.", source: "LinkedIn", status: "success" as const, y: 264 },
      ].map(({ name, source, status, y }) => (
        <g key={name}>
          <text x={122} y={y} fill={colors.slate900} fontSize="8" fontFamily="Inter, system-ui, sans-serif">{name}</text>
          <TextLine x={160} y={y - 7} width={60} height={7} color={colors.slate100} />
          <text x={162} y={y} fill={colors.slate400} fontSize="7" fontFamily="Inter, system-ui, sans-serif">{source}</text>
          <StatusDot cx={348} cy={y - 3} r={3} status={status} />
        </g>
      ))}
    </svg>
  );
}
