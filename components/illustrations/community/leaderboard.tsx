import {
  ShadowDefs,
  Card,
  AvatarDot,
  Divider,
  colors,
  getAvatarColor,
} from "../shared";

interface LeaderboardProps {
  className?: string;
}

const members = [
  { rank: 1, initials: "JB", name: "Jake B.", pts: "2,847", streak: 12 },
  { rank: 2, initials: "MR", name: "Mia R.", pts: "2,341", streak: 8 },
  { rank: 3, initials: "CS", name: "Chris S.", pts: "1,986", streak: 5 },
  { rank: 4, initials: "AL", name: "Amy L.", pts: "1,744", streak: 3 },
  { rank: 5, initials: "TW", name: "Tom W.", pts: "1,512", streak: 7 },
];

export function Leaderboard({ className }: LeaderboardProps) {
  const rowH = 38;
  const startY = 82;

  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Leaderboard showing top 5 community members by points this month"
    >
      <ShadowDefs />

      {/* Background */}
      <rect width={400} height={300} rx={16} fill={colors.slate100} />

      {/* Main card */}
      <Card x={20} y={16} width={360} height={268} rx={12} shadow="lg" />

      {/* ── Header ── */}
      {/* Trophy icon */}
      <circle cx={44} cy={40} r={14} fill={colors.amber} opacity="0.15" />
      <text
        x={44}
        y={45}
        textAnchor="middle"
        fontSize="14"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.amber}
        fontWeight="700"
      >
        🏆
      </text>

      <text
        x={64}
        y={36}
        fontSize="13"
        fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.slate900}
      >
        Leaderboard
      </text>

      {/* "This Month" tab */}
      <rect x={64} y={43} width={68} height={18} rx={9} fill={colors.blue} opacity="0.1" />
      <text
        x={98}
        y={56}
        textAnchor="middle"
        fontSize="9"
        fontWeight="600"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.blue}
      >
        This Month
      </text>

      {/* Column headers */}
      <text x={36} y={74} fontSize="9" fontFamily="Inter, system-ui, sans-serif" fill={colors.slate400} fontWeight="600">#</text>
      <text x={60} y={74} fontSize="9" fontFamily="Inter, system-ui, sans-serif" fill={colors.slate400} fontWeight="600">MEMBER</text>
      <text x={262} y={74} fontSize="9" fontFamily="Inter, system-ui, sans-serif" fill={colors.slate400} fontWeight="600">POINTS</text>
      <text x={330} y={74} fontSize="9" fontFamily="Inter, system-ui, sans-serif" fill={colors.slate400} fontWeight="600">STREAK</text>

      <Divider x={28} y={78} width={344} />

      {members.map((m, i) => {
        const y = startY + i * rowH;
        const isFirst = i === 0;

        return (
          <g key={m.rank}>
            {/* #1 row highlight */}
            {isFirst && (
              <rect
                x={28}
                y={y - 2}
                width={344}
                height={rowH - 4}
                rx={8}
                fill={colors.amber}
                opacity="0.08"
              />
            )}

            {/* Rank number */}
            {isFirst ? (
              <g>
                <circle cx={40} cy={y + 15} r={10} fill={colors.amber} opacity="0.2" />
                <text
                  x={40}
                  y={y + 19}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="800"
                  fontFamily="Inter, system-ui, sans-serif"
                  fill={colors.amber}
                >
                  1
                </text>
              </g>
            ) : (
              <text
                x={40}
                y={y + 20}
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fontFamily="Inter, system-ui, sans-serif"
                fill={colors.slate400}
              >
                {m.rank}
              </text>
            )}

            {/* Avatar */}
            <AvatarDot
              cx={64}
              cy={y + 15}
              r={11}
              initials={m.initials}
              color={getAvatarColor(i)}
            />

            {/* Name */}
            <text
              x={82}
              y={y + 19}
              fontSize="11"
              fontWeight={isFirst ? "700" : "600"}
              fontFamily="Inter, system-ui, sans-serif"
              fill={isFirst ? colors.slate900 : colors.slate700}
            >
              {m.name}
            </text>

            {/* Points */}
            <text
              x={262}
              y={y + 19}
              fontSize="11"
              fontWeight="700"
              fontFamily="Inter, system-ui, sans-serif"
              fill={isFirst ? colors.amber : colors.slate700}
            >
              {m.pts} pts
            </text>

            {/* Streak dot + number */}
            <circle cx={334} cy={y + 15} r={7} fill={colors.pink} opacity="0.15" />
            <circle cx={334} cy={y + 15} r={3.5} fill={colors.pink} />
            <text
              x={346}
              y={y + 19}
              fontSize="9"
              fontWeight="600"
              fontFamily="Inter, system-ui, sans-serif"
              fill={colors.slate500}
            >
              {m.streak}d
            </text>

            {i < members.length - 1 && (
              <Divider x={28} y={y + rowH - 4} width={344} />
            )}
          </g>
        );
      })}
    </svg>
  );
}
