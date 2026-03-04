import {
  ShadowDefs,
  Card,
  Badge,
  AvatarDot,
  StarRating,
  StatusDot,
  CheckIcon,
  colors,
} from "../shared";

interface VerifiedLeadCardProps {
  className?: string;
}

export function VerifiedLeadCard({ className }: VerifiedLeadCardProps) {
  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Verified business lead card for Sarah Mitchell, owner of Mitchell's Bakery and Cafe"
    >
      <ShadowDefs />

      {/* Background fill */}
      <rect width={400} height={300} fill={colors.slate100} rx={12} />

      {/* Background card — rotated for depth */}
      <g transform="rotate(2, 200, 160)">
        <rect
          x={52}
          y={52}
          width={280}
          height={184}
          rx={10}
          fill={colors.white}
          stroke={colors.slate200}
          strokeWidth={1}
          opacity={0.7}
        />
      </g>

      {/* Main card */}
      <Card x={40} y={44} width={290} height={188} rx={10} shadow="lg">
        {/* Card header bar */}
        <rect x={40} y={44} width={290} height={38} rx={10} fill={colors.slate100} />
        <rect x={40} y={62} width={290} height={20} fill={colors.slate100} />

        {/* Header label */}
        <text
          x={60}
          y={68}
          fill={colors.slate700}
          fontSize={10}
          fontWeight="600"
          fontFamily="Inter, system-ui, sans-serif"
          letterSpacing="0.5"
        >
          BUSINESS CONTACT
        </text>

        {/* B2B Lead badge in header */}
        <rect x={248} y={52} width={64} height={20} rx={10} fill={colors.blue} />
        <text
          x={280}
          y={65}
          textAnchor="middle"
          fill={colors.white}
          fontSize={9}
          fontWeight="700"
          fontFamily="Inter, system-ui, sans-serif"
        >
          B2B Lead
        </text>

        {/* Avatar */}
        <AvatarDot cx={68} cy={116} r={20} initials="SM" color={colors.pink} />

        {/* Name */}
        <text
          x={98}
          y={105}
          fill={colors.slate900}
          fontSize={14}
          fontWeight="700"
          fontFamily="Inter, system-ui, sans-serif"
        >
          Sarah Mitchell
        </text>

        {/* Title */}
        <text
          x={98}
          y={120}
          fill={colors.slate700}
          fontSize={10}
          fontFamily="Inter, system-ui, sans-serif"
        >
          Owner &amp; Founder
        </text>

        {/* Star rating */}
        <StarRating x={98} y={132} rating={4} size={10} />
        <text
          x={158}
          y={140}
          fill={colors.slate400}
          fontSize={9}
          fontFamily="Inter, system-ui, sans-serif"
        >
          4.5
        </text>

        {/* Divider */}
        <line x1={40} y1={152} x2={330} y2={152} stroke={colors.slate200} strokeWidth={1} />

        {/* Company row */}
        <text x={60} y={168} fill={colors.slate400} fontSize={9} fontFamily="Inter, system-ui, sans-serif">
          COMPANY
        </text>
        <text x={60} y={181} fill={colors.slate900} fontSize={11} fontWeight="600" fontFamily="Inter, system-ui, sans-serif">
          Mitchell&apos;s Bakery &amp; Cafe
        </text>

        {/* Email row */}
        <text x={185} y={168} fill={colors.slate400} fontSize={9} fontFamily="Inter, system-ui, sans-serif">
          EMAIL
        </text>
        <text x={185} y={181} fill={colors.blue} fontSize={10} fontFamily="Inter, system-ui, sans-serif">
          sarah@mitchells.com
        </text>

        {/* Phone + location row */}
        <text x={60} y={200} fill={colors.slate500} fontSize={9} fontFamily="Inter, system-ui, sans-serif">
          Portland, OR
        </text>
        <text x={185} y={200} fill={colors.slate500} fontSize={9} fontFamily="Inter, system-ui, sans-serif">
          (503) 847-2291
        </text>

        {/* Email Verified badge */}
        <CheckIcon x={58} y={213} size={14} color={colors.emerald} />
        <rect x={76} y={213} width={86} height={14} rx={7} fill={colors.emerald} opacity={0.12} />
        <text
          x={119}
          y={223}
          textAnchor="middle"
          fill={colors.emerald}
          fontSize={9}
          fontWeight="600"
          fontFamily="Inter, system-ui, sans-serif"
        >
          Email Verified
        </text>

        {/* Industry tag */}
        <rect x={175} y={213} width={54} height={14} rx={7} fill={colors.slate100} />
        <text
          x={202}
          y={223}
          textAnchor="middle"
          fill={colors.slate700}
          fontSize={9}
          fontFamily="Inter, system-ui, sans-serif"
        >
          Food &amp; Bev
        </text>

        {/* Employees tag */}
        <rect x={238} y={213} width={52} height={14} rx={7} fill={colors.slate100} />
        <text
          x={264}
          y={223}
          textAnchor="middle"
          fill={colors.slate700}
          fontSize={9}
          fontFamily="Inter, system-ui, sans-serif"
        >
          1-10 emp
        </text>
      </Card>

      {/* Floating pink pill badge overlapping card edge */}
      <Badge x={230} y={33} label="Owner email included!" color={colors.pink} fontSize={9} shadow="md" />

      {/* Floating stat badges */}
      <Badge x={318} y={110} label="Local Biz" color={colors.blue} fontSize={9} shadow="sm" />
      <Badge x={318} y={140} label="Hot Lead" color={colors.pink} fontSize={9} shadow="sm" />

      {/* Decorative dots */}
      <StatusDot cx={355} cy={80} r={5} status="success" />
      <StatusDot cx={365} cy={92} r={3} status="info" />
      <StatusDot cx={348} cy={96} r={3} status="success" />
    </svg>
  );
}
