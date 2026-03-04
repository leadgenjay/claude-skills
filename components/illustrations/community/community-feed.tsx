import {
  ShadowDefs,
  Card,
  Badge,
  AvatarDot,
  Divider,
  StatusDot,
  colors,
  getAvatarColor,
} from "../shared";

interface CommunityFeedProps {
  className?: string;
}

const posts = [
  {
    initials: "AR",
    name: "Alex R.",
    time: "2m ago",
    line1: "Just booked 3 meetings from yesterday's cold email batch!",
    line2: "The AI personalization is incredible.",
  },
  {
    initials: "SK",
    name: "Sara K.",
    time: "8m ago",
    line1: "Week 2 update: 47% open rate on my new sequence.",
    line2: "Following the template from Module 3.",
  },
  {
    initials: "DM",
    name: "Dan M.",
    time: "15m ago",
    line1: "Anyone else seeing huge improvements with the new",
    line2: "domain warmup strategy?",
  },
];

const hearts = [24, 11, 7];
const comments = [5, 3, 2];

export function CommunityFeed({ className }: CommunityFeedProps) {
  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Community feed with member posts, likes, and comments"
    >
      <ShadowDefs />

      {/* Background */}
      <rect width={400} height={300} rx={16} fill={colors.slate100} />

      {/* Main card */}
      <Card x={20} y={16} width={360} height={268} rx={12} shadow="lg" />

      {/* ── Header ── */}
      <text
        x={36}
        y={42}
        fontSize="13"
        fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.slate900}
      >
        Community
      </text>

      {/* Active Now indicator */}
      <StatusDot cx={168} cy={37} r={5} status="success" />
      <text
        x={178}
        y={41}
        fontSize="9"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.emerald}
        fontWeight="600"
      >
        Active Now
      </text>

      {/* 847 members badge */}
      <Badge
        x={272}
        y={26}
        label="847 members"
        color={colors.blue}
        shadow="sm"
        fontSize={9}
      />

      {/* New Post button */}
      <rect x={290} y={48} width={76} height={22} rx={11} fill={colors.pink} />
      <text
        x={328}
        y={63}
        textAnchor="middle"
        fontSize="9"
        fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.white}
      >
        + New Post
      </text>

      <Divider x={20} y={72} width={360} />

      {/* ── Posts ── */}
      {posts.map((post, i) => {
        const baseY = 80 + i * 66;
        return (
          <g key={post.initials}>
            {/* Avatar */}
            <AvatarDot
              cx={40}
              cy={baseY + 12}
              r={11}
              initials={post.initials}
              color={getAvatarColor(i)}
            />

            {/* Name + time */}
            <text
              x={58}
              y={baseY + 8}
              fontSize="11"
              fontWeight="700"
              fontFamily="Inter, system-ui, sans-serif"
              fill={colors.slate900}
            >
              {post.name}
            </text>
            <text
              x={58}
              y={baseY + 20}
              fontSize="9"
              fontFamily="Inter, system-ui, sans-serif"
              fill={colors.slate400}
            >
              {post.time}
            </text>

            {/* Post text lines */}
            <text
              x={58}
              y={baseY + 30}
              fontSize="8"
              fontFamily="Inter, system-ui, sans-serif"
              fill={colors.slate500}
            >
              {post.line1}
            </text>
            <text
              x={58}
              y={baseY + 41}
              fontSize="8"
              fontFamily="Inter, system-ui, sans-serif"
              fill={colors.slate500}
            >
              {post.line2}
            </text>

            {/* Engagement row */}
            {/* Heart icon */}
            <path
              d={`M58 ${baseY + 54} c0-2 3-4 4 0 c1-4 4-2 4 0 c0 3-4 5-4 6 c0-1-4-3-4-6z`}
              fill={colors.pink}
              opacity="0.7"
            />
            <text
              x={68}
              y={baseY + 58}
              fontSize="9"
              fontFamily="Inter, system-ui, sans-serif"
              fill={colors.slate400}
            >
              {hearts[i]}
            </text>

            {/* Comment icon */}
            <rect
              x={84}
              y={baseY + 49}
              width={10}
              height={8}
              rx={2}
              fill="none"
              stroke={colors.slate300}
              strokeWidth="1.2"
            />
            <path
              d={`M86 ${baseY + 57} l2 3 2-3`}
              fill="none"
              stroke={colors.slate300}
              strokeWidth="1.2"
            />
            <text
              x={98}
              y={baseY + 58}
              fontSize="9"
              fontFamily="Inter, system-ui, sans-serif"
              fill={colors.slate400}
            >
              {comments[i]}
            </text>

            {i < posts.length - 1 && (
              <Divider x={28} y={baseY + 64} width={344} />
            )}
          </g>
        );
      })}
    </svg>
  );
}
