import {
  ShadowDefs,
  Card,
  Badge,
  CheckIcon,
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

      {/* Row 1 */}
      <XIcon x={22} y={54} size={10} />
      <text x={37} y={62} fill={colors.slate700} fontSize="8" fontFamily="Inter, system-ui, sans-serif">Find leads manually</text>
      <text x={183} y={62} textAnchor="end" fill={colors.slate500} fontSize="8" fontFamily="Inter, system-ui, sans-serif">~20/day</text>

      {/* Row 2 */}
      <XIcon x={22} y={76} size={10} />
      <text x={37} y={84} fill={colors.slate700} fontSize="8" fontFamily="Inter, system-ui, sans-serif">Write emails one by one</text>
      <text x={183} y={84} textAnchor="end" fill={colors.slate500} fontSize="8" fontFamily="Inter, system-ui, sans-serif">~10/day</text>

      {/* Row 3 */}
      <XIcon x={22} y={98} size={10} />
      <text x={37} y={106} fill={colors.slate700} fontSize="8" fontFamily="Inter, system-ui, sans-serif">Track in spreadsheet</text>
      <text x={183} y={106} textAnchor="end" fill={colors.slate500} fontSize="8" fontFamily="Inter, system-ui, sans-serif">Error-prone</text>

      {/* Row 4 */}
      <XIcon x={22} y={120} size={10} />
      <text x={37} y={128} fill={colors.slate700} fontSize="8" fontFamily="Inter, system-ui, sans-serif">Follow up manually</text>
      <text x={183} y={128} textAnchor="end" fill={colors.slate500} fontSize="8" fontFamily="Inter, system-ui, sans-serif">Often forgotten</text>

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

      {/* Row 1 */}
      <CheckIcon x={226} y={54} size={10} color={colors.emerald} />
      <text x={241} y={62} fill={colors.slate700} fontSize="8" fontFamily="Inter, system-ui, sans-serif">AI finds verified leads</text>
      <text x={383} y={62} textAnchor="end" fill={colors.emerald} fontSize="8" fontWeight="600" fontFamily="Inter, system-ui, sans-serif">500+/day</text>

      {/* Row 2 */}
      <CheckIcon x={226} y={76} size={10} color={colors.emerald} />
      <text x={241} y={84} fill={colors.slate700} fontSize="8" fontFamily="Inter, system-ui, sans-serif">Personalized at scale</text>
      <text x={383} y={84} textAnchor="end" fill={colors.emerald} fontSize="8" fontWeight="600" fontFamily="Inter, system-ui, sans-serif">1000+/day</text>

      {/* Row 3 */}
      <CheckIcon x={226} y={98} size={10} color={colors.emerald} />
      <text x={241} y={106} fill={colors.slate700} fontSize="8" fontFamily="Inter, system-ui, sans-serif">CRM auto-updated</text>
      <text x={383} y={106} textAnchor="end" fill={colors.emerald} fontSize="8" fontWeight="600" fontFamily="Inter, system-ui, sans-serif">Real-time</text>

      {/* Row 4 */}
      <CheckIcon x={226} y={120} size={10} color={colors.emerald} />
      <text x={241} y={128} fill={colors.slate700} fontSize="8" fontFamily="Inter, system-ui, sans-serif">Smart sequences</text>
      <text x={383} y={128} textAnchor="end" fill={colors.emerald} fontSize="8" fontWeight="600" fontFamily="Inter, system-ui, sans-serif">100% follow-up</text>

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
