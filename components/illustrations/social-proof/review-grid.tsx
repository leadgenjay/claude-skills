import {
  ShadowDefs,
  Card,
  Badge,
  AvatarDot,
  StarRating,
  Divider,
  colors,
  getAvatarColor,
} from "../shared";

interface ReviewGridProps {
  className?: string;
}

const reviews = [
  {
    initials: "SR",
    name: "Sarah R.",
    rating: 5,
    quoteLine1: "Best lead gen service we've",
    quoteLine2: "used. Results in week one!",
    highlight: true,
  },
  {
    initials: "MK",
    name: "Mike K.",
    rating: 4,
    quoteLine1: "Great leads, solid support.",
    quoteLine2: "Would recommend.",
    highlight: false,
  },
  {
    initials: "JL",
    name: "Jane L.",
    rating: 5,
    quoteLine1: "Transformed our outreach",
    quoteLine2: "completely. Amazing!",
    highlight: false,
  },
];

export function ReviewGrid({ className }: ReviewGridProps) {
  const cardWidth = 110;
  const cardHeight = 130;
  const startX = 22;
  const startY = 60;
  const gap = 8;

  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Grid of three customer reviews with star ratings"
    >
      <ShadowDefs />

      {/* Background */}
      <rect width={400} height={300} rx={16} fill={colors.slate100} />

      {/* Header text */}
      <text
        x={22}
        y={44}
        fontSize="13"
        fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.slate900}
      >
        Customer Reviews
      </text>

      {/* 174 reviews badge — top right */}
      <Badge
        x={286}
        y={26}
        label="174 reviews"
        color={colors.emerald}
        shadow="sm"
        fontSize={10}
      />

      {reviews.map((r, i) => {
        const cx = startX + i * (cardWidth + gap);
        const cy = startY;

        return (
          <g key={r.initials}>
            {/* Trustpilot-style green star wash on first card */}
            {r.highlight && (
              <rect
                x={cx}
                y={cy}
                width={cardWidth}
                height={cardHeight}
                rx={10}
                fill={colors.emerald}
                opacity="0.06"
              />
            )}

            <Card x={cx} y={cy} width={cardWidth} height={cardHeight} rx={10} shadow="md" />

            {/* Avatar */}
            <AvatarDot
              cx={cx + 18}
              cy={cy + 20}
              r={12}
              initials={r.initials}
              color={getAvatarColor(i)}
            />

            {/* Name */}
            <text
              x={cx + 36}
              y={cy + 15}
              fontSize="10"
              fontWeight="700"
              fontFamily="Inter, system-ui, sans-serif"
              fill={colors.slate900}
            >
              {r.name}
            </text>

            {/* Stars */}
            <StarRating x={cx + 36} y={cy + 26} rating={r.rating} size={9} />

            {/* Divider */}
            <Divider x={cx + 10} y={cy + 46} width={cardWidth - 20} />

            {/* Quote lines */}
            <text
              x={cx + 10}
              y={cy + 62}
              fontSize="8"
              fontFamily="Inter, system-ui, sans-serif"
              fill={colors.slate500}
              fontStyle="italic"
            >
              {r.quoteLine1}
            </text>
            <text
              x={cx + 10}
              y={cy + 74}
              fontSize="8"
              fontFamily="Inter, system-ui, sans-serif"
              fill={colors.slate500}
              fontStyle="italic"
            >
              {r.quoteLine2}
            </text>

            {/* Rating pill */}
            <rect
              x={cx + 10}
              y={cy + 100}
              width={34}
              height={18}
              rx={9}
              fill={r.rating === 5 ? colors.emerald : colors.amber}
              opacity="0.15"
            />
            <text
              x={cx + 27}
              y={cy + 112}
              textAnchor="middle"
              fontSize="9"
              fontWeight="700"
              fontFamily="Inter, system-ui, sans-serif"
              fill={r.rating === 5 ? colors.emerald : colors.amber}
            >
              {r.rating}.0
            </text>
          </g>
        );
      })}

      {/* 4.9 Average badge — bottom center */}
      <Badge
        x={155}
        y={208}
        label="★ 4.9 Average"
        color={colors.amber}
        shadow="md"
        fontSize={10}
      />
    </svg>
  );
}
