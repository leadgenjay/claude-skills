import {
  ShadowDefs,
  Card,
  Badge,
  OutlineBadge,
  StatusDot,
  CheckIcon,
  colors,
} from "../shared";

interface WebhookTriggerProps {
  className?: string;
}

export function WebhookTrigger({ className }: WebhookTriggerProps) {
  // Stage positions
  const s1x = 12;
  const s2x = 148;
  const s3x = 286;
  const sy = 60;
  const cardW = 118;
  const cardH = 130;

  // Connector midpoints
  const conn1x1 = s1x + cardW;
  const conn1y = sy + cardH / 2;
  const conn2x1 = s2x + cardW;
  const conn2y = sy + cardH / 2;

  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Three-stage webhook trigger flow: receive, process, deliver"
    >
      <ShadowDefs />

      {/* Background */}
      <rect width="400" height="300" fill={colors.slate100} rx="12" />

      {/* Title row */}
      <text
        x={200}
        y={36}
        textAnchor="middle"
        fill={colors.slate900}
        fontSize="13"
        fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
      >
        Webhook Event Flow
      </text>
      <text
        x={200}
        y={50}
        textAnchor="middle"
        fill={colors.slate400}
        fontSize="9"
        fontFamily="Inter, system-ui, sans-serif"
      >
        POST → Process → Deliver in under 1 second
      </text>

      {/* ── Connectors (behind cards) ── */}
      {/* Stage 1 → Stage 2 */}
      <path
        d={`M ${conn1x1} ${conn1y} C ${conn1x1 + 20} ${conn1y}, ${s2x - 20} ${conn2y}, ${s2x} ${conn2y}`}
        fill="none"
        stroke={colors.slate300}
        strokeWidth="2"
        strokeDasharray="5 3"
      />
      {/* Arrow head */}
      <path d={`M ${s2x - 6} ${conn2y - 5} L ${s2x} ${conn2y} L ${s2x - 6} ${conn2y + 5}`} fill={colors.slate300} />

      {/* Timestamp label on connector 1 */}
      <OutlineBadge x={s1x + cardW + 8} y={conn1y - 22} label="0.1s" color={colors.blue} fontSize={9} />

      {/* Stage 2 → Stage 3 */}
      <path
        d={`M ${conn2x1} ${conn2y} C ${conn2x1 + 20} ${conn2y}, ${s3x - 20} ${sy + cardH / 2}, ${s3x} ${sy + cardH / 2}`}
        fill="none"
        stroke={colors.slate300}
        strokeWidth="2"
        strokeDasharray="5 3"
      />
      <path d={`M ${s3x - 6} ${sy + cardH / 2 - 5} L ${s3x} ${sy + cardH / 2} L ${s3x - 6} ${sy + cardH / 2 + 5}`} fill={colors.slate300} />

      {/* Timestamp label on connector 2 */}
      <OutlineBadge x={s2x + cardW + 8} y={conn2y - 22} label="0.2s" color={colors.blue} fontSize={9} />

      {/* ── Stage 1: Receive ── */}
      <Card x={s1x} y={sy} width={cardW} height={cardH} shadow="md" />

      {/* Incoming arrow */}
      <path
        d={`M ${s1x - 16} ${sy + 30} L ${s1x} ${sy + 30}`}
        stroke={colors.blue}
        strokeWidth="1.5"
      />
      <path d={`M ${s1x - 5} ${sy + 25} L ${s1x} ${sy + 30} L ${s1x - 5} ${sy + 35}`} fill={colors.blue} />

      {/* POST badge */}
      <rect x={s1x + 10} y={sy + 10} width={36} height={14} rx="3" fill={colors.blue} />
      <text x={s1x + 28} y={sy + 20} textAnchor="middle" fill={colors.white} fontSize="7" fontWeight="700" fontFamily="'SF Mono', 'Fira Code', monospace">POST</text>

      <text x={s1x + 50} y={sy + 20} fill={colors.slate900} fontSize="8" fontWeight="600" fontFamily="'SF Mono', 'Fira Code', monospace">/webhook</text>

      {/* JSON payload preview */}
      <rect x={s1x + 10} y={sy + 30} width={98} height={74} rx="4" fill={colors.slate900} />
      <text x={s1x + 16} y={sy + 44} fill={colors.slate400} fontSize="7" fontFamily="'SF Mono', 'Fira Code', monospace">{"{"}</text>
      <text x={s1x + 22} y={sy + 57} fill="#60a5fa" fontSize="7" fontFamily="'SF Mono', 'Fira Code', monospace">"event":</text>
      <text x={s1x + 63} y={sy + 57} fill="#34d399" fontSize="7" fontFamily="'SF Mono', 'Fira Code', monospace">"lead"</text>
      <text x={s1x + 22} y={sy + 69} fill="#60a5fa" fontSize="7" fontFamily="'SF Mono', 'Fira Code', monospace">"email":</text>
      <text x={s1x + 63} y={sy + 69} fill="#fbbf24" fontSize="7" fontFamily="'SF Mono', 'Fira Code', monospace">"j@co"</text>
      <text x={s1x + 22} y={sy + 81} fill="#60a5fa" fontSize="7" fontFamily="'SF Mono', 'Fira Code', monospace">"ts":</text>
      <text x={s1x + 51} y={sy + 81} fill={colors.white} fontSize="7" fontFamily="'SF Mono', 'Fira Code', monospace">1738400</text>
      <text x={s1x + 16} y={sy + 93} fill={colors.slate400} fontSize="7" fontFamily="'SF Mono', 'Fira Code', monospace">{"}"}</text>

      {/* Stage label */}
      <text x={s1x + cardW / 2} y={sy + cardH + 16} textAnchor="middle" fill={colors.slate700} fontSize="9" fontWeight="600" fontFamily="Inter, system-ui, sans-serif">Receive</text>

      {/* ── Stage 2: Processing ── */}
      <Card x={s2x} y={sy} width={cardW} height={cardH} shadow="md" />

      <text x={s2x + cardW / 2} y={sy + 22} textAnchor="middle" fill={colors.slate700} fontSize="9" fontWeight="600" fontFamily="Inter, system-ui, sans-serif">Processing...</text>

      {/* Spinner — static representation with arc segments */}
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const r = 22;
        const cx2 = s2x + cardW / 2;
        const cy2 = sy + 75;
        const dotX = cx2 + r * Math.cos(angle);
        const dotY = cy2 + r * Math.sin(angle);
        return (
          <circle
            key={i}
            cx={dotX}
            cy={dotY}
            r={3.5}
            fill={colors.blue}
            opacity={0.2 + (i / 8) * 0.8}
          />
        );
      })}

      {/* Center dot */}
      <circle cx={s2x + cardW / 2} cy={sy + 75} r={5} fill={colors.blue} opacity="0.2" />

      <StatusDot cx={s2x + cardW / 2} cy={sy + 75} r={4} status="info" />

      {/* Stage label */}
      <text x={s2x + cardW / 2} y={sy + cardH + 16} textAnchor="middle" fill={colors.slate700} fontSize="9" fontWeight="600" fontFamily="Inter, system-ui, sans-serif">Process</text>

      {/* ── Stage 3: Delivered ── */}
      <Card x={s3x} y={sy} width={cardW} height={cardH} shadow="md" />

      {/* Big checkmark */}
      <circle cx={s3x + cardW / 2} cy={sy + 38} r={18} fill={colors.emerald} opacity="0.12" />
      <path
        d={`M${s3x + cardW / 2 - 10} ${sy + 38} l8 8 14-14`}
        fill="none"
        stroke={colors.emerald}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Delivered badge */}
      <Badge x={s3x + 20} y={sy + 62} label="Delivered" color={colors.emerald} fontSize={9} />

      {/* Result data */}
      <rect x={s3x + 10} y={sy + 90} width={98} height={34} rx="4" fill={colors.slate100} />
      <text x={s3x + 16} y={sy + 103} fill={colors.slate700} fontSize="7" fontFamily="'SF Mono', 'Fira Code', monospace">status: 200 OK</text>
      <text x={s3x + 16} y={sy + 115} fill={colors.slate400} fontSize="7" fontFamily="'SF Mono', 'Fira Code', monospace">id: lead_8f3b2</text>

      {/* Stage label */}
      <text x={s3x + cardW / 2} y={sy + cardH + 16} textAnchor="middle" fill={colors.slate700} fontSize="9" fontWeight="600" fontFamily="Inter, system-ui, sans-serif">Deliver</text>

      {/* ── Total time floating badge ── */}
      <Badge x={162} y={244} label="Total: 0.3s" color={colors.slate900} fontSize={10} shadow="md" />

      {/* 200 OK badge near stage 3 */}
      <Badge x={s3x + 26} y={210} label="200 OK" color={colors.emerald} fontSize={9} shadow="sm" />

      {/* Bottom stats row */}
      <text x={12} y={282} fill={colors.slate400} fontSize="8" fontFamily="Inter, system-ui, sans-serif">24,891 webhooks processed today</text>
      <text x={290} y={282} fill={colors.emerald} fontSize="8" fontWeight="600" fontFamily="Inter, system-ui, sans-serif">99.97% success rate</text>
    </svg>
  );
}
