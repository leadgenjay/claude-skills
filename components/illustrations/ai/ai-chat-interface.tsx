import {
  ShadowDefs,
  Card,
  Badge,
  AvatarDot,
  StatusDot,
  CheckIcon,
  Divider,
  TextLine,
  OutlineBadge,
  colors,
} from "../shared";

interface AIChatInterfaceProps {
  className?: string;
}

export function AIChatInterface({ className }: AIChatInterfaceProps) {
  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="AI chat interface showing conversation between user and AI assistant"
    >
      <ShadowDefs />

      {/* Background */}
      <rect width="400" height="300" fill={colors.slate100} rx="12" />

      {/* Main chat window card */}
      <Card x={20} y={16} width={268} height={268} shadow="lg" />

      {/* Chat header bar */}
      <rect x={20} y={16} width={268} height={40} rx="8" fill={colors.slate900} />
      <rect x={20} y={40} width={268} height={8} fill={colors.slate900} />

      {/* Header dots */}
      <circle cx={38} cy={36} r={4} fill="#ef4444" />
      <circle cx={52} cy={36} r={4} fill={colors.amber} />
      <circle cx={66} cy={36} r={4} fill={colors.emerald} />

      {/* Header title */}
      <text
        x={154}
        y={40}
        textAnchor="middle"
        fill={colors.white}
        fontSize="11"
        fontWeight="600"
        fontFamily="Inter, system-ui, sans-serif"
      >
        AI Assistant
      </text>

      {/* Online status dot */}
      <StatusDot cx={221} cy={36} r={3} status="success" />
      <text
        x={228}
        y={40}
        fill={colors.slate400}
        fontSize="8"
        fontFamily="Inter, system-ui, sans-serif"
      >
        Online
      </text>

      {/* ── Message 1: User (right-aligned blue bubble) ── */}
      <rect x={148} y={68} width={122} height={30} rx="10" fill={colors.blue} />
      <text
        x={160}
        y={80}
        fill={colors.white}
        fontSize="8"
        fontFamily="Inter, system-ui, sans-serif"
      >
        Show me the API endpoints
      </text>
      <text
        x={160}
        y={91}
        fill="rgba(255,255,255,0.7)"
        fontSize="8"
        fontFamily="Inter, system-ui, sans-serif"
      >
        for lead capture
      </text>
      <AvatarDot cx={275} cy={74} r={8} initials="J" color={colors.blue} />

      {/* ── Message 2: AI response ── */}
      <AvatarDot cx={35} cy={124} r={9} initials="AI" color={colors.purple} />

      {/* AI bubble */}
      <rect x={50} y={112} width={192} height={72} rx="10" fill={colors.white} />
      <rect x={50} y={112} width={192} height={72} rx="10" stroke={colors.slate200} strokeWidth="1" />

      <text
        x={62}
        y={126}
        fill={colors.slate700}
        fontSize="8"
        fontFamily="Inter, system-ui, sans-serif"
      >
        Here are the available endpoints:
      </text>

      {/* Code snippet area */}
      <rect x={60} y={131} width={172} height={44} rx="5" fill={colors.slate900} />

      {/* GET /api/leads — green */}
      <text
        x={68}
        y={144}
        fill={colors.emerald}
        fontSize="8"
        fontWeight="600"
        fontFamily="'SF Mono', 'Fira Code', monospace"
      >
        GET
      </text>
      <text
        x={90}
        y={144}
        fill={colors.white}
        fontSize="8"
        fontFamily="'SF Mono', 'Fira Code', monospace"
      >
        /api/leads
      </text>

      {/* POST /webhook — pink */}
      <text
        x={68}
        y={157}
        fill={colors.pink}
        fontSize="8"
        fontWeight="600"
        fontFamily="'SF Mono', 'Fira Code', monospace"
      >
        POST
      </text>
      <text
        x={93}
        y={157}
        fill={colors.white}
        fontSize="8"
        fontFamily="'SF Mono', 'Fira Code', monospace"
      >
        /webhook
      </text>

      {/* DELETE — amber */}
      <text
        x={68}
        y={170}
        fill={colors.amber}
        fontSize="8"
        fontWeight="600"
        fontFamily="'SF Mono', 'Fira Code', monospace"
      >
        DELETE
      </text>
      <text
        x={104}
        y={170}
        fill={colors.white}
        fontSize="8"
        fontFamily="'SF Mono', 'Fira Code', monospace"
      >
        /api/leads/:id
      </text>

      {/* Action buttons below AI message */}
      {/* Copy */}
      <rect x={60} y={188} width={36} height={16} rx="4" fill={colors.slate100} stroke={colors.slate200} strokeWidth="1" />
      <text x={78} y={199} textAnchor="middle" fill={colors.slate700} fontSize="7" fontFamily="Inter, system-ui, sans-serif">Copy</text>

      {/* Run */}
      <rect x={100} y={188} width={30} height={16} rx="4" fill={colors.emerald} />
      <text x={115} y={199} textAnchor="middle" fill={colors.white} fontSize="7" fontFamily="Inter, system-ui, sans-serif">Run</text>

      {/* Edit */}
      <rect x={134} y={188} width={30} height={16} rx="4" fill={colors.slate100} stroke={colors.slate200} strokeWidth="1" />
      <text x={149} y={199} textAnchor="middle" fill={colors.slate700} fontSize="7" fontFamily="Inter, system-ui, sans-serif">Edit</text>

      {/* ── Message 3: User ── */}
      <rect x={148} y={210} width={110} height={22} rx="10" fill={colors.blue} opacity="0.85" />
      <text
        x={160}
        y={224}
        fill={colors.white}
        fontSize="8"
        fontFamily="Inter, system-ui, sans-serif"
      >
        How do I auth these?
      </text>
      <AvatarDot cx={275} cy={221} r={8} initials="J" color={colors.blue} />

      {/* ── Message 4: Typing indicator ── */}
      <AvatarDot cx={35} cy={254} r={9} initials="AI" color={colors.purple} />
      <rect x={50} y={244} width={56} height={20} rx="10" fill={colors.white} stroke={colors.slate200} strokeWidth="1" />
      <circle cx={64} cy={254} r={3} fill={colors.slate400} />
      <circle cx={74} cy={254} r={3} fill={colors.slate400} />
      <circle cx={84} cy={254} r={3} fill={colors.slate400} />

      {/* Divider above input */}
      <Divider x={20} y={272} width={268} />
      {/* Input area hint */}
      <rect x={28} y={278} width={192} height={0} rx="4" fill={colors.slate100} />
      <TextLine x={28} y={279} width={140} height={6} color={colors.slate200} />

      {/* ── Floating Vision AI badge ── */}
      <Badge x={296} y={28} label="Vision AI" color={colors.purple} />

      {/* ── Side panel: endpoint details card ── */}
      <Card x={300} y={60} width={84} height={106} shadow="md" />

      <text
        x={308}
        y={75}
        fill={colors.slate900}
        fontSize="8"
        fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
      >
        Endpoints
      </text>

      <StatusDot cx={308} cy={86} r={3} status="success" />
      <text x={315} y={89} fill={colors.slate700} fontSize="7" fontFamily="Inter, system-ui, sans-serif">/api/leads</text>
      <StatusDot cx={308} cy={98} r={3} status="success" />
      <text x={315} y={101} fill={colors.slate700} fontSize="7" fontFamily="Inter, system-ui, sans-serif">/webhook</text>
      <StatusDot cx={308} cy={110} r={3} status="info" />
      <text x={315} y={113} fill={colors.slate700} fontSize="7" fontFamily="Inter, system-ui, sans-serif">/api/auth</text>
      <StatusDot cx={308} cy={122} r={3} status="warning" />
      <text x={315} y={125} fill={colors.slate700} fontSize="7" fontFamily="Inter, system-ui, sans-serif">/api/export</text>

      <Divider x={308} y={132} width={68} />
      <text x={308} y={143} fill={colors.slate400} fontSize="7" fontFamily="Inter, system-ui, sans-serif">4 endpoints</text>
      <CheckIcon x={344} y={134} size={10} color={colors.emerald} />

      {/* Status bar card */}
      <Card x={300} y={178} width={84} height={60} shadow="sm" />
      <text x={308} y={192} fill={colors.slate700} fontSize="7" fontWeight="600" fontFamily="Inter, system-ui, sans-serif">Response</text>
      <rect x={308} y={197} width={28} height={12} rx="3" fill={colors.emerald} />
      <text x={322} y={206} textAnchor="middle" fill={colors.white} fontSize="7" fontWeight="600" fontFamily="Inter, system-ui, sans-serif">200 OK</text>
      <text x={308} y={218} fill={colors.slate400} fontSize="7" fontFamily="'SF Mono', 'Fira Code', monospace">142ms</text>
      <text x={308} y={230} fill={colors.slate400} fontSize="7" fontFamily="Inter, system-ui, sans-serif">JSON</text>

      {/* Bottom floating badge */}
      <OutlineBadge x={300} y={252} label="Secure Auth" color={colors.emerald} />
    </svg>
  );
}
