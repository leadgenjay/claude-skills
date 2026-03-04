import {
  ShadowDefs,
  Card,
  Badge,
  OutlineBadge,
  AvatarDot,
  StarRating,
  colors,
} from "../shared";

interface TestimonialCardProps {
  className?: string;
}

export function TestimonialCard({ className }: TestimonialCardProps) {
  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Testimonial card with 5-star review from Tom Henderson"
    >
      <ShadowDefs />

      {/* Background card (rotated for depth) */}
      <g transform="rotate(2, 200, 150)">
        <rect
          x="38"
          y="42"
          width="314"
          height="188"
          rx="12"
          fill={colors.slate100}
          stroke={colors.slate200}
          strokeWidth="1"
        />
      </g>

      {/* Main white card */}
      <Card x={28} y={32} width={314} height={188} rx={12} shadow="lg" />

      {/* Decorative large quotation mark */}
      <text
        x="52"
        y="104"
        fontSize="72"
        fontFamily="Georgia, serif"
        fill={colors.pink}
        opacity="0.18"
        fontWeight="700"
      >
        &ldquo;
      </text>

      {/* Pink accent bar top-left */}
      <rect x="28" y="32" width="4" height="188" rx="2" fill={colors.pink} />

      {/* Star rating */}
      <StarRating x={56} y={68} rating={5} size={12} />
      {/* Rating number next to stars */}
      <text
        x="138"
        y="74"
        fontSize="10"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.amber}
        fontWeight="700"
      >
        5.0
      </text>

      {/* Quote text — line 1 */}
      <text
        x="56"
        y="100"
        fontSize="11.5"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.slate700}
        fontStyle="italic"
      >
        &ldquo;Lead Gen Jay transformed our outreach.
      </text>
      {/* Quote text — line 2 */}
      <text
        x="56"
        y="118"
        fontSize="11.5"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.slate700}
        fontStyle="italic"
      >
        We went from 2 meetings a month to 15.&rdquo;
      </text>

      {/* Divider */}
      <line
        x1="56"
        y1="136"
        x2="320"
        y2="136"
        stroke={colors.slate200}
        strokeWidth="1"
      />

      {/* Avatar */}
      <AvatarDot cx={70} cy={162} r={14} initials="TH" color={colors.blue} />

      {/* Name and company */}
      <text
        x="92"
        y="157"
        fontSize="12"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.slate900}
        fontWeight="700"
      >
        Tom Henderson
      </text>
      <text
        x="92"
        y="172"
        fontSize="10"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.slate400}
      >
        Henderson Roofing
      </text>

      {/* Industry badge next to company name */}
      <OutlineBadge
        x={196}
        y={162}
        label="Roofing"
        color={colors.blue}
        fontSize={9}
      />

      {/* Results metric — upward arrow + stat, right-aligned */}
      <text
        x="248"
        y="157"
        fontSize="9"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.slate400}
        fontWeight="500"
      >
        Results
      </text>
      {/* Up arrow */}
      <path
        d="M248 167 L251 162 L254 167"
        fill={colors.emerald}
        stroke="none"
      />
      <text
        x="258"
        y="168"
        fontSize="10"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.emerald}
        fontWeight="700"
      >
        15 mtgs/mo
      </text>

      {/* Verified Customer badge — overlapping card edge */}
      <Badge
        x={236}
        y={197}
        label="✓ Verified Customer"
        color={colors.emerald}
        shadow="md"
        fontSize={10}
      />
    </svg>
  );
}
