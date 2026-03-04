import {
  ShadowDefs,
  Card,
  Badge,
  OutlineBadge,
  CheckIcon,
  colors,
} from "../shared";

interface AICodeAssistantProps {
  className?: string;
}

// Tiny inline X icon for reject button
function SmallX({ x, y }: { x: number; y: number }) {
  return (
    <path
      d={`M${x} ${y} l6 6 M${x + 6} ${y} l-6 6`}
      stroke={colors.white}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  );
}

export function AICodeAssistant({ className }: AICodeAssistantProps) {
  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="AI code assistant with suggestion overlay in a code editor"
    >
      <ShadowDefs />

      {/* Background */}
      <rect width="400" height="300" fill={colors.slate100} rx="12" />

      {/* ── Main editor card ── */}
      <Card x={14} y={14} width={372} height={272} shadow="lg" />

      {/* Dark editor header bar */}
      <rect x={14} y={14} width={372} height={36} rx="8" fill="#1e293b" />
      <rect x={14} y={40} width={372} height={10} fill="#1e293b" />

      {/* Traffic-light dots */}
      <circle cx={32} cy={32} r={5} fill="#ef4444" />
      <circle cx={48} cy={32} r={5} fill={colors.amber} />
      <circle cx={64} cy={32} r={5} fill={colors.emerald} />

      {/* Filename tab */}
      <rect x={80} y={20} width={110} height={24} rx="4" fill="#334155" />
      <text
        x={135}
        y={35}
        textAnchor="middle"
        fill={colors.slate400}
        fontSize="9"
        fontFamily="'SF Mono', 'Fira Code', monospace"
      >
        webhook-handler.ts
      </text>

      {/* Second tab (inactive) */}
      <rect x={196} y={22} width={80} height={20} rx="4" fill="transparent" />
      <text
        x={236}
        y={35}
        textAnchor="middle"
        fill={colors.slate400}
        fontSize="9"
        fontFamily="'SF Mono', 'Fira Code', monospace"
        opacity="0.5"
      >
        types.ts
      </text>

      {/* Editor body — dark background */}
      <rect x={14} y={50} width={372} height={236} fill="#0f172a" />
      <rect x={14} y={272} width={372} height={14} rx="8" fill="#0f172a" />

      {/* Line numbers column */}
      <rect x={14} y={50} width={30} height={236} fill="#1e293b" />
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n, i) => (
        <text
          key={n}
          x={37}
          y={68 + i * 16}
          textAnchor="end"
          fill="#475569"
          fontSize="8"
          fontFamily="'SF Mono', 'Fira Code', monospace"
        >
          {n}
        </text>
      ))}

      {/* ── Code lines ── */}
      {/* Line 1 */}
      <text x={52} y={68} fill="#8b5cf6" fontSize="9" fontFamily="'SF Mono', 'Fira Code', monospace">import</text>
      <text x={88} y={68} fill={colors.white} fontSize="9" fontFamily="'SF Mono', 'Fira Code', monospace">{"{ NextRequest } "}</text>
      <text x={188} y={68} fill="#8b5cf6" fontSize="9" fontFamily="'SF Mono', 'Fira Code', monospace">from</text>
      <text x={210} y={68} fill="#f59e0b" fontSize="9" fontFamily="'SF Mono', 'Fira Code', monospace">'next/server'</text>

      {/* Line 2 blank */}

      {/* Line 3 */}
      <text x={52} y={100} fill="#8b5cf6" fontSize="9" fontFamily="'SF Mono', 'Fira Code', monospace">export async function</text>
      <text x={192} y={100} fill="#60a5fa" fontSize="9" fontFamily="'SF Mono', 'Fira Code', monospace">POST</text>
      <text x={216} y={100} fill={colors.white} fontSize="9" fontFamily="'SF Mono', 'Fira Code', monospace">(req: NextRequest) {"{"}</text>

      {/* Line 4 */}
      <text x={68} y={116} fill="#8b5cf6" fontSize="9" fontFamily="'SF Mono', 'Fira Code', monospace">const</text>
      <text x={96} y={116} fill={colors.white} fontSize="9" fontFamily="'SF Mono', 'Fira Code', monospace">body =</text>
      <text x={130} y={116} fill="#60a5fa" fontSize="9" fontFamily="'SF Mono', 'Fira Code', monospace">await</text>
      <text x={160} y={116} fill={colors.white} fontSize="9" fontFamily="'SF Mono', 'Fira Code', monospace">req.</text>
      <text x={182} y={116} fill="#34d399" fontSize="9" fontFamily="'SF Mono', 'Fira Code', monospace">json</text>
      <text x={206} y={116} fill={colors.white} fontSize="9" fontFamily="'SF Mono', 'Fira Code', monospace">()</text>

      {/* Line 5 */}
      <text x={68} y={132} fill="#8b5cf6" fontSize="9" fontFamily="'SF Mono', 'Fira Code', monospace">const</text>
      <text x={96} y={132} fill={colors.white} fontSize="9" fontFamily="'SF Mono', 'Fira Code', monospace">{"{ email, name } = body"}</text>

      {/* Line 6 — highlighted, current cursor line */}
      <rect x={44} y={140} width={340} height={15} fill="#1e3a5f" opacity="0.6" />
      <text x={68} y={152} fill={colors.slate400} fontSize="9" fontFamily="'SF Mono', 'Fira Code', monospace">// TODO: validate input</text>
      {/* cursor blink */}
      <rect x={232} y={142} width={2} height={11} rx="1" fill={colors.white} opacity="0.8" />

      {/* Line 7 */}
      <text x={68} y={170} fill={colors.white} fontSize="9" fontFamily="'SF Mono', 'Fira Code', monospace">...</text>

      {/* ── AI Suggestion overlay ── */}
      <rect
        x={44}
        y={182}
        width={300}
        height={74}
        rx="8"
        fill="#1e293b"
        opacity="0.97"
        stroke="#8b5cf6"
        strokeWidth="1"
      />

      {/* "AI Suggestion" label inside overlay */}
      <rect x={52} y={187} width={72} height={14} rx="3" fill="#8b5cf6" opacity="0.2" />
      <text x={88} y={197} textAnchor="middle" fill="#8b5cf6" fontSize="8" fontWeight="600" fontFamily="Inter, system-ui, sans-serif">AI Suggestion</text>

      {/* Suggested code in green */}
      <text x={52} y={213} fill={colors.emerald} fontSize="9" fontFamily="'SF Mono', 'Fira Code', monospace">
        {"if (!email || !validateEmail(email)) {"}
      </text>
      <text x={52} y={227} fill={colors.emerald} fontSize="9" fontFamily="'SF Mono', 'Fira Code', monospace">
        {'  return NextResponse.json('}
      </text>
      <text x={52} y={241} fill={colors.emerald} fontSize="9" fontFamily="'SF Mono', 'Fira Code', monospace">
        {"    { error: 'Invalid email' }, { status: 400 })"}
      </text>

      {/* Accept button */}
      <rect x={52} y={248} width={52} height={18} rx="4" fill={colors.emerald} />
      <CheckIcon x={58} y={252} size={10} color={colors.white} />
      <text x={74} y={260} fill={colors.white} fontSize="8" fontWeight="600" fontFamily="Inter, system-ui, sans-serif">Accept</text>

      {/* Reject button */}
      <rect x={112} y={248} width={48} height={18} rx="4" fill={colors.pink} />
      <SmallX x={118} y={253} />
      <text x={130} y={260} fill={colors.white} fontSize="8" fontWeight="600" fontFamily="Inter, system-ui, sans-serif">Reject</text>

      {/* Claude badge on overlay */}
      <Badge x={262} y={185} label="Claude AI" color="#8b5cf6" fontSize={9} shadow="sm" />

      {/* Floating "AI Suggestion" badge outside card */}
      <OutlineBadge x={296} y={190} label="AI Suggestion" color={colors.purple} fontSize={9} />
    </svg>
  );
}
