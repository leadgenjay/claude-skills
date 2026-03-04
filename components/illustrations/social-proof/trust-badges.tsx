import {
  ShadowDefs,
  Card,
  StarRating,
  LockIcon,
  colors,
} from "../shared";

interface TrustBadgesProps {
  className?: string;
}

export function TrustBadges({ className }: TrustBadgesProps) {
  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Four trust badges: Trustpilot, Verified Business, 14-Day Guarantee, SSL Security"
    >
      <ShadowDefs />

      {/* Background */}
      <rect width="400" height="300" rx="16" fill={colors.slate100} />

      {/* Section label */}
      <text
        x="200"
        y="38"
        textAnchor="middle"
        fontSize="12"
        fontWeight="600"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.slate400}
        letterSpacing="1"
      >
        TRUSTED &amp; VERIFIED
      </text>

      {/* ── Badge 1: Trustpilot ── */}
      <Card x={18} y={52} width={84} height={120} rx={10} shadow="md" />
      {/* Green Trustpilot star background strip */}
      <rect x="18" y="52" width="84" height="36" rx="10" fill={colors.emerald} opacity="0.1" />
      <rect x="18" y="80" width="84" height="8" fill={colors.emerald} opacity="0.1" />
      {/* Trustpilot TP logo */}
      <rect x="44" y="57" width="32" height="16" rx="3" fill={colors.emerald} opacity="0.2" />
      <text
        x="60"
        y="68"
        textAnchor="middle"
        fontSize="9"
        fontWeight="800"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.emerald}
      >
        TP
      </text>
      <StarRating x={24} y={76} rating={5} size={11} />
      <text
        x="60"
        y="114"
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.slate900}
      >
        Excellent
      </text>
      <text
        x="60"
        y="129"
        textAnchor="middle"
        fontSize="9"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.slate400}
      >
        Trustpilot
      </text>

      {/* ── Badge 2: Verified Business ── */}
      <Card x={114} y={52} width={84} height={120} rx={10} shadow="md" />
      {/* Shield icon — drawn inline */}
      <path
        d="M156 64 l18 0 l0 22 a18 18 0 0 1-18 12 a18 18 0 0 1-18-12 l0-22 z"
        fill={colors.blue}
        opacity="0.12"
      />
      <path
        d="M156 66 l14 0 l0 18 a14 14 0 0 1-14 10 a14 14 0 0 1-14-10 l0-18 z"
        fill="none"
        stroke={colors.blue}
        strokeWidth="1.5"
      />
      {/* Check inside shield */}
      <path
        d="M150 75 l4 4 7-8"
        fill="none"
        stroke={colors.blue}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x="156"
        y="114"
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.slate900}
      >
        Verified
      </text>
      <text
        x="156"
        y="129"
        textAnchor="middle"
        fontSize="9"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.slate400}
      >
        Business
      </text>

      {/* ── Badge 3: 14-Day Guarantee ── */}
      <Card x={210} y={52} width={84} height={120} rx={10} shadow="md" />
      {/* Circular guarantee badge */}
      <circle cx="252" cy="82" r="20" fill={colors.pink} opacity="0.1" />
      <circle cx="252" cy="82" r="20" fill="none" stroke={colors.pink} strokeWidth="1.5" strokeDasharray="3 2" />
      <text
        x="252"
        y="79"
        textAnchor="middle"
        fontSize="10"
        fontWeight="800"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.pink}
      >
        14
      </text>
      <text
        x="252"
        y="90"
        textAnchor="middle"
        fontSize="7"
        fontWeight="600"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.pink}
      >
        DAY
      </text>
      <text
        x="252"
        y="114"
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.slate900}
      >
        Money Back
      </text>
      <text
        x="252"
        y="129"
        textAnchor="middle"
        fontSize="9"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.slate400}
      >
        Guarantee
      </text>

      {/* ── Badge 4: SSL Security ── */}
      <Card x={306} y={52} width={76} height={120} rx={10} shadow="md" />
      {/* Green glow behind lock */}
      <circle cx="346" cy="78" r="18" fill={colors.emerald} opacity="0.08" />
      {/* Lock icon centered */}
      <LockIcon x={332} y={60} size={28} color={colors.emerald} />
      <text
        x="344"
        y="114"
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.slate900}
      >
        256-bit
      </text>
      <text
        x="344"
        y="129"
        textAnchor="middle"
        fontSize="9"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.slate400}
      >
        SSL Secure
      </text>

      {/* Thin divider between badges and trusted-by section */}
      <line
        x1="40"
        y1="192"
        x2="360"
        y2="192"
        stroke={colors.slate400}
        strokeWidth="0.75"
        opacity="0.3"
      />

      {/* Stacked avatar dots (tighter overlap: spacing 14 instead of 18) */}
      {[0, 1, 2, 3, 4].map((i) => (
        <circle
          key={i}
          cx={147 + i * 14}
          cy={223}
          r={9}
          fill={[colors.pink, colors.blue, colors.emerald, colors.amber, colors.blue][i]}
          opacity="0.75"
          stroke={colors.white}
          strokeWidth="2"
        />
      ))}

      {/* "+2,395 more" text aligned right of avatars */}
      <text
        x="215"
        y="227"
        fontSize="10"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.slate400}
      >
        +2,395 more
      </text>

      {/* "Trusted by 2,400+ businesses" pill container */}
      <rect
        x="90"
        y="248"
        width="220"
        height="30"
        rx="15"
        fill={colors.white}
        stroke={colors.slate400}
        strokeWidth="0.75"
        opacity="0.6"
      />
      <text
        x="200"
        y="268"
        textAnchor="middle"
        fontSize="11"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.slate400}
      >
        Trusted by{" "}
        <tspan fontWeight="700" fill={colors.slate700}>2,400+ businesses</tspan>
      </text>
    </svg>
  );
}
