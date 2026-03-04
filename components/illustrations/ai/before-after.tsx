import {
  ShadowDefs,
  Card,
  Badge,
  StatusDot,
  CheckIcon,
  TextLine,
  Divider,
  OutlineBadge,
  colors,
} from "../shared";

interface BeforeAfterProps {
  className?: string;
}

// Simple X mark
function XIcon({ x, y, size = 10 }: { x: number; y: number; size?: number }) {
  const s = size;
  return (
    <g>
      <circle cx={x + s / 2} cy={y + s / 2} r={s / 2} fill={colors.pink} opacity="0.12" />
      <path
        d={`M${x + s * 0.28} ${y + s * 0.28} l${s * 0.44} ${s * 0.44} M${x + s * 0.72} ${y + s * 0.28} l-${s * 0.44} ${s * 0.44}`}
        stroke={colors.pink}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </g>
  );
}

export function BeforeAfter({ className }: BeforeAfterProps) {
  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Before and after comparison showing manual versus automated workflow"
    >
      <ShadowDefs />

      {/* Background */}
      <rect width="400" height="300" fill={colors.slate100} rx="12" />

      {/* ─────────── BEFORE CARD (left) ─────────── */}
      <Card x={14} y={14} width={174} height={230} shadow="md" />

      {/* Before header — red tint */}
      <rect x={14} y={14} width={174} height={32} rx="8" fill="#fee2e2" />
      <rect x={14} y={36} width={174} height={10} fill="#fee2e2" />
      <text
        x={30}
        y={34}
        fill="#dc2626"
        fontSize="11"
        fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
      >
        Before
      </text>
      <Badge x={110} y={19} label="Manual" color="#dc2626" fontSize={9} />

      {/* Cluttered content — scattered text lines with varying offsets */}
      <TextLine x={26} y={58} width={88} height={7} color={colors.slate300} />
      <TextLine x={40} y={70} width={112} height={7} color={colors.slate300} />
      <TextLine x={22} y={82} width={64} height={7} color={colors.slate300} />
      <TextLine x={52} y={94} width={96} height={7} color={colors.slate300} />
      <TextLine x={30} y={106} width={80} height={7} color={colors.slate300} />
      <TextLine x={18} y={118} width={120} height={7} color={colors.slate300} />

      {/* X marks — manual errors */}
      <XIcon x={22} y={56} size={10} />
      <XIcon x={22} y={80} size={10} />
      <XIcon x={22} y={104} size={10} />
      <XIcon x={22} y={128} size={10} />

      <Divider x={22} y={140} width={154} />

      {/* Red status dots — failures */}
      <StatusDot cx={30} cy={154} r={4} status="error" />
      <TextLine x={40} y={150} width={80} height={7} color={colors.slate200} />
      <StatusDot cx={30} cy={170} r={4} status="error" />
      <TextLine x={40} y={166} width={100} height={7} color={colors.slate200} />
      <StatusDot cx={30} cy={186} r={4} status="warning" />
      <TextLine x={40} y={182} width={70} height={7} color={colors.slate200} />
      <StatusDot cx={30} cy={202} r={4} status="error" />
      <TextLine x={40} y={198} width={90} height={7} color={colors.slate200} />

      {/* Time label */}
      <rect x={22} y={216} width={70} height={20} rx="5" fill="#fee2e2" />
      <text
        x={57}
        y={229}
        textAnchor="middle"
        fill="#dc2626"
        fontSize="10"
        fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
      >
        3 hours
      </text>

      {/* ─────────── VS badge in center ─────────── */}
      <circle cx={200} cy={130} r={18} fill={colors.slate900} />
      <text
        x={200}
        y={135}
        textAnchor="middle"
        fill={colors.white}
        fontSize="10"
        fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
      >
        VS
      </text>

      {/* ─────────── AFTER CARD (right) ─────────── */}
      <Card x={214} y={14} width={174} height={230} shadow="md" />

      {/* After header — green tint */}
      <rect x={214} y={14} width={174} height={32} rx="8" fill="#d1fae5" />
      <rect x={214} y={36} width={174} height={10} fill="#d1fae5" />
      <text
        x={230}
        y={34}
        fill={colors.emerald}
        fontSize="11"
        fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
      >
        After
      </text>
      <Badge x={316} y={19} label="Auto" color={colors.emerald} fontSize={9} />

      {/* Clean, aligned content */}
      <TextLine x={240} y={58} width={130} height={7} color={colors.slate200} />
      <TextLine x={240} y={72} width={110} height={7} color={colors.slate200} />
      <TextLine x={240} y={86} width={120} height={7} color={colors.slate200} />
      <TextLine x={240} y={100} width={100} height={7} color={colors.slate200} />
      <TextLine x={240} y={114} width={125} height={7} color={colors.slate200} />
      <TextLine x={240} y={128} width={95} height={7} color={colors.slate200} />

      {/* Check marks */}
      <CheckIcon x={226} y={54} size={10} color={colors.emerald} />
      <CheckIcon x={226} y={68} size={10} color={colors.emerald} />
      <CheckIcon x={226} y={82} size={10} color={colors.emerald} />
      <CheckIcon x={226} y={96} size={10} color={colors.emerald} />
      <CheckIcon x={226} y={110} size={10} color={colors.emerald} />
      <CheckIcon x={226} y={124} size={10} color={colors.emerald} />

      <Divider x={222} y={140} width={154} />

      {/* Green status dots */}
      <StatusDot cx={230} cy={154} r={4} status="success" />
      <TextLine x={240} y={150} width={80} height={7} color={colors.slate200} />
      <StatusDot cx={230} cy={170} r={4} status="success" />
      <TextLine x={240} y={166} width={100} height={7} color={colors.slate200} />
      <StatusDot cx={230} cy={186} r={4} status="success" />
      <TextLine x={240} y={182} width={70} height={7} color={colors.slate200} />
      <StatusDot cx={230} cy={202} r={4} status="success" />
      <TextLine x={240} y={198} width={90} height={7} color={colors.slate200} />

      {/* Time label */}
      <rect x={222} y={216} width={80} height={20} rx="5" fill="#d1fae5" />
      <text
        x={262}
        y={229}
        textAnchor="middle"
        fill={colors.emerald}
        fontSize="10"
        fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
      >
        3 minutes
      </text>

      {/* ─────────── Floating "10x Faster" badge ─────────── */}
      <Badge x={148} y={260} label="10x Faster" color={colors.pink} shadow="md" />

      {/* Small arrow below VS hinting direction */}
      <path
        d="M 188 130 L 212 130"
        stroke={colors.slate400}
        strokeWidth="1.5"
        strokeDasharray="3 2"
        markerEnd="url(#arrow)"
      />
      <defs>
        <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={colors.slate400} />
        </marker>
      </defs>
    </svg>
  );
}
