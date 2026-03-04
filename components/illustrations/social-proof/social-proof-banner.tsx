import { ShadowDefs, colors } from "../shared";

interface SocialProofBannerProps {
  className?: string;
}

export function SocialProofBanner({ className }: SocialProofBannerProps) {
  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Social proof stat pills: 2400+ clients, 4.9 stars, since 2019, 12M+ emails sent"
    >
      <ShadowDefs />

      {/* Dot grid background */}
      {Array.from({ length: 12 }, (_, row) =>
        Array.from({ length: 20 }, (_, col) => (
          <circle
            key={`${row}-${col}`}
            cx={10 + col * 20}
            cy={10 + row * 26}
            r={1.5}
            fill={colors.slate300}
            opacity="0.5"
          />
        ))
      )}

      {/* ── Pill 1: 2,400+ Clients (largest, centre-ish, slight tilt left) ── */}
      <g filter="url(#shadow-lg)" transform="rotate(-4, 200, 120)">
        <rect x="80" y="88" width="172" height="48" rx="24" fill={colors.pink} />
        <text
          x="166"
          y="106"
          textAnchor="middle"
          fontSize="11"
          fontWeight="600"
          fontFamily="Inter, system-ui, sans-serif"
          fill="rgba(255,255,255,0.75)"
          letterSpacing="0.5"
        >
          CLIENTS
        </text>
        <text
          x="166"
          y="125"
          textAnchor="middle"
          fontSize="22"
          fontWeight="800"
          fontFamily="Inter, system-ui, sans-serif"
          fill={colors.white}
        >
          2,400+
        </text>
      </g>

      {/* ── Pill 2: 4.9 Stars (top-right, tilted right) ── */}
      <g filter="url(#shadow-md)" transform="rotate(5, 300, 80)">
        <rect x="248" y="54" width="108" height="38" rx="19" fill={colors.amber} />
        <text
          x="302"
          y="70"
          textAnchor="middle"
          fontSize="9"
          fontWeight="600"
          fontFamily="Inter, system-ui, sans-serif"
          fill="rgba(255,255,255,0.8)"
          letterSpacing="0.5"
        >
          RATING
        </text>
        <text
          x="302"
          y="85"
          textAnchor="middle"
          fontSize="16"
          fontWeight="800"
          fontFamily="Inter, system-ui, sans-serif"
          fill={colors.white}
        >
          ★ 4.9
        </text>
      </g>

      {/* ── Pill 3: Since 2019 (bottom-left, tilted slightly left) ── */}
      <g filter="url(#shadow-md)" transform="rotate(-3, 110, 210)">
        <rect x="44" y="192" width="120" height="38" rx="19" fill={colors.blue} />
        <text
          x="104"
          y="208"
          textAnchor="middle"
          fontSize="9"
          fontWeight="600"
          fontFamily="Inter, system-ui, sans-serif"
          fill="rgba(255,255,255,0.8)"
          letterSpacing="0.5"
        >
          ESTABLISHED
        </text>
        <text
          x="104"
          y="223"
          textAnchor="middle"
          fontSize="16"
          fontWeight="800"
          fontFamily="Inter, system-ui, sans-serif"
          fill={colors.white}
        >
          Since 2019
        </text>
      </g>

      {/* ── Pill 4: 12M+ Emails Sent (bottom-right, tilted right) ── */}
      <g filter="url(#shadow-md)" transform="rotate(4, 300, 216)">
        <rect x="226" y="196" width="140" height="40" rx="20" fill={colors.emerald} />
        <text
          x="296"
          y="213"
          textAnchor="middle"
          fontSize="9"
          fontWeight="600"
          fontFamily="Inter, system-ui, sans-serif"
          fill="rgba(255,255,255,0.8)"
          letterSpacing="0.5"
        >
          EMAILS SENT
        </text>
        <text
          x="296"
          y="229"
          textAnchor="middle"
          fontSize="16"
          fontWeight="800"
          fontFamily="Inter, system-ui, sans-serif"
          fill={colors.white}
        >
          12M+
        </text>
      </g>

      {/* ── Pill 5: small accent pill top-left ── */}
      <g filter="url(#shadow-sm)" transform="rotate(-6, 70, 68)">
        <rect x="30" y="54" width="86" height="30" rx="15" fill={colors.white} stroke={colors.slate200} strokeWidth="1" />
        <circle cx="48" cy="69" r="6" fill={colors.pink} opacity="0.2" />
        <circle cx="48" cy="69" r="3" fill={colors.pink} />
        <text
          x="94"
          y="73"
          textAnchor="middle"
          fontSize="10"
          fontWeight="700"
          fontFamily="Inter, system-ui, sans-serif"
          fill={colors.slate700}
        >
          #1 Agency
        </text>
      </g>
    </svg>
  );
}
