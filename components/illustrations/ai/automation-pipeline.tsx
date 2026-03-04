import {
  ShadowDefs,
  Card,
  Badge,
  N8nNode,
  BezierConnector,
  StatusDot,
  CheckIcon,
  TextLine,
  colors,
} from "../shared";

interface AutomationPipelineProps {
  className?: string;
}

export function AutomationPipeline({ className }: AutomationPipelineProps) {
  // Row 1: nodes 1, 2, 3
  const r1y = 52;
  const n1x = 14;
  const n2x = 150;
  const n3x = 284;

  // Row 2: nodes 4, 5 — centred between n2 and n3
  const r2y = 160;
  const n4x = 80;
  const n5x = 218;

  const nW = 112;
  const nH = 44;
  const midY = (r: number) => r + nH / 2;

  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Five-stage automation pipeline for lead processing"
    >
      <ShadowDefs />

      {/* Background */}
      <rect width="400" height="300" fill={colors.slate100} rx="12" />

      {/* Outer canvas card */}
      <Card x={10} y={10} width={380} height={280} shadow="lg" />

      {/* Title bar */}
      <text
        x={22}
        y={30}
        fill={colors.slate900}
        fontSize="11"
        fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
      >
        Lead Processing Pipeline
      </text>
      <Badge x={270} y={16} label="Processing 847 leads" color={colors.blue} fontSize={9} />

      {/* ── Row 1 connectors ── */}
      {/* Node1 → Node2 */}
      <BezierConnector
        x1={n1x + nW}
        y1={midY(r1y)}
        x2={n2x}
        y2={midY(r1y)}
        color={colors.pink}
        executionDot={true}
      />
      {/* Node2 → Node3 */}
      <BezierConnector
        x1={n2x + nW}
        y1={midY(r1y)}
        x2={n3x}
        y2={midY(r1y)}
        color={colors.blue}
        executionDot={true}
      />

      {/* ── Row-to-row connector: Node2 down to Node4 ── */}
      <BezierConnector
        x1={n2x + nW / 2}
        y1={r1y + nH}
        x2={n4x + nW / 2}
        y2={r2y}
        color={colors.slate300}
        executionDot={false}
      />
      {/* Node3 → Node5 */}
      <BezierConnector
        x1={n3x + nW / 2}
        y1={r1y + nH}
        x2={n5x + nW / 2}
        y2={r2y}
        color={colors.slate300}
        executionDot={false}
      />

      {/* ── Row 2 connector: Node4 → Node5 ── */}
      <BezierConnector
        x1={n4x + nW}
        y1={midY(r2y)}
        x2={n5x}
        y2={midY(r2y)}
        color={colors.amber}
        executionDot={true}
      />

      {/* ── Row 1 Nodes ── */}
      <N8nNode x={n1x} y={r1y} width={nW} height={nH} label="Webhook" sublabel="Trigger" nodeType="trigger" />
      <N8nNode x={n2x} y={r1y} width={nW} height={nH} label="AI Research" sublabel="Analyze lead" nodeType="ai" />
      <N8nNode x={n3x} y={r1y} width={nW} height={nH} label="Enrich Data" sublabel="Clearbit API" nodeType="http" />

      {/* ── Row 2 Nodes ── */}
      <N8nNode x={n4x} y={r2y} width={nW} height={nH} label="AI Compose" sublabel="Write email" nodeType="ai" />
      <N8nNode x={n5x} y={r2y} width={nW} height={nH} label="Send & Track" sublabel="Instantly.ai" nodeType="output" />

      {/* ── Execution status on completed nodes ── */}
      <StatusDot cx={n1x + nW - 8} cy={r1y + 8} r={4} status="success" />
      <StatusDot cx={n2x + nW - 8} cy={r1y + 8} r={4} status="success" />
      <StatusDot cx={n3x + nW - 8} cy={r1y + 8} r={4} status="success" />
      <StatusDot cx={n4x + nW - 8} cy={r2y + 8} r={4} status="success" />
      <StatusDot cx={n5x + nW - 8} cy={r2y + 8} r={4} status="warning" />

      {/* ── Floating data preview cards ── */}
      {/* Near Node 1 — incoming payload */}
      <Card x={14} y={110} width={110} height={40} shadow="sm" />
      <text x={22} y={123} fill={colors.slate400} fontSize="7" fontFamily="'SF Mono', 'Fira Code', monospace">
        {`{ "email": "j@co.io",`}
      </text>
      <text x={22} y={134} fill={colors.slate400} fontSize="7" fontFamily="'SF Mono', 'Fira Code', monospace">
        {`  "source": "web" }`}
      </text>

      {/* Near Node 3 — enriched data */}
      <Card x={284} y={110} width={106} height={40} shadow="sm" />
      <text x={292} y={123} fill={colors.slate400} fontSize="7" fontFamily="'SF Mono', 'Fira Code', monospace">
        company: Acme
      </text>
      <text x={292} y={134} fill={colors.slate400} fontSize="7" fontFamily="'SF Mono', 'Fira Code', monospace">
        revenue: $4.2M
      </text>

      {/* ── Stats footer ── */}
      <rect x={10} y={222} width={380} height={1} fill={colors.slate200} />

      <CheckIcon x={18} y={232} size={12} color={colors.emerald} />
      <text x={34} y={242} fill={colors.slate700} fontSize="9" fontFamily="Inter, system-ui, sans-serif">632 completed</text>

      <StatusDot cx={124} cy={239} r={3} status="warning" />
      <text x={132} y={242} fill={colors.slate700} fontSize="9" fontFamily="Inter, system-ui, sans-serif">215 in queue</text>

      <StatusDot cx={214} cy={239} r={3} status="info" />
      <text x={222} y={242} fill={colors.slate700} fontSize="9" fontFamily="Inter, system-ui, sans-serif">avg 1.2s/lead</text>

      <text x={318} y={242} fill={colors.emerald} fontSize="9" fontWeight="700" fontFamily="Inter, system-ui, sans-serif">74.6% done</text>

      {/* Progress bar */}
      <rect x={18} y={252} width={364} height={6} rx={3} fill={colors.slate200} />
      <rect x={18} y={252} width={272} height={6} rx={3} fill={colors.emerald} />

      {/* Batch label */}
      <text x={18} y={272} fill={colors.slate400} fontSize="8" fontFamily="Inter, system-ui, sans-serif">Batch #44 · Started 3m ago</text>
      <text x={320} y={272} fill={colors.slate400} fontSize="8" fontFamily="Inter, system-ui, sans-serif">ETA: 1m 12s</text>
    </svg>
  );
}
