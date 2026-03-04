import {
  ShadowDefs,
  Card,
  Badge,
  N8nNode,
  BezierConnector,
  StatusDot,
  colors,
} from "../shared";

interface WorkflowCanvasProps {
  className?: string;
}

export function WorkflowCanvas({ className }: WorkflowCanvasProps) {
  // Node layout — scattered across canvas realistically
  const nodes = {
    schedule: { x: 22, y: 60, nodeType: "trigger" as const, label: "Schedule", sublabel: "Every hour" },
    http: { x: 160, y: 42, nodeType: "http" as const, label: "HTTP Request", sublabel: "Clearbit API" },
    code: { x: 160, y: 132, nodeType: "code" as const, label: "Code", sublabel: "Transform data" },
    ai: { x: 286, y: 88, nodeType: "ai" as const, label: "AI Agent", sublabel: "GPT-4o" },
    postgres: { x: 22, y: 168, nodeType: "database" as const, label: "Postgres", sublabel: "Save results" },
    email: { x: 286, y: 178, nodeType: "output" as const, label: "Send Email", sublabel: "Via SendGrid" },
  };

  const nW = 112;
  const nH = 44;

  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Full n8n workflow canvas with six nodes and connectors"
    >
      <ShadowDefs />

      {/* Background */}
      <rect width="400" height="300" fill={colors.slate100} rx="12" />

      {/* Outer frame */}
      <Card x={10} y={10} width={380} height={280} shadow="lg" />

      {/* Toolbar strip at top */}
      <rect x={10} y={10} width={380} height={28} rx="8" fill={colors.white} stroke={colors.slate200} strokeWidth="1" />
      <rect x={10} y={28} width={380} height={10} fill={colors.white} />

      {/* Toolbar controls — zoom buttons */}
      <rect x={18} y={16} width={20} height={16} rx="3" fill={colors.slate100} stroke={colors.slate200} strokeWidth="1" />
      <text x={28} y={27} textAnchor="middle" fill={colors.slate700} fontSize="10" fontFamily="Inter, system-ui, sans-serif">−</text>
      <rect x={42} y={16} width={20} height={16} rx="3" fill={colors.slate100} stroke={colors.slate200} strokeWidth="1" />
      <text x={52} y={27} textAnchor="middle" fill={colors.slate700} fontSize="10" fontFamily="Inter, system-ui, sans-serif">+</text>
      <rect x={66} y={16} width={30} height={16} rx="3" fill={colors.slate100} stroke={colors.slate200} strokeWidth="1" />
      <text x={81} y={27} textAnchor="middle" fill={colors.slate700} fontSize="8" fontFamily="Inter, system-ui, sans-serif">100%</text>
      <rect x={100} y={16} width={28} height={16} rx="3" fill={colors.slate100} stroke={colors.slate200} strokeWidth="1" />
      <text x={114} y={27} textAnchor="middle" fill={colors.slate700} fontSize="8" fontFamily="Inter, system-ui, sans-serif">Fit</text>

      {/* Workflow name */}
      <text x={200} y={27} textAnchor="middle" fill={colors.slate900} fontSize="10" fontWeight="600" fontFamily="Inter, system-ui, sans-serif">
        Lead Gen Pipeline
      </text>

      {/* Active badge top-right */}
      <Badge x={308} y={13} label="Workflow Active" color={colors.emerald} fontSize={9} />

      {/* Canvas area with dot grid */}
      <rect x={10} y={38} width={380} height={252} fill={colors.white} />
      {Array.from({ length: 11 }, (_, row) =>
        Array.from({ length: 19 }, (_, col) => (
          <circle
            key={`${row}-${col}`}
            cx={20 + col * 20}
            cy={48 + row * 22}
            r={1}
            fill={colors.slate200}
          />
        ))
      )}

      {/* ── Connectors ── */}
      {/* Schedule → HTTP */}
      <BezierConnector
        x1={nodes.schedule.x + nW}
        y1={nodes.schedule.y + nH / 2}
        x2={nodes.http.x}
        y2={nodes.http.y + nH / 2}
        color={colors.pink}
        executionDot={true}
      />
      {/* Schedule → Code */}
      <BezierConnector
        x1={nodes.schedule.x + nW}
        y1={nodes.schedule.y + nH / 2}
        x2={nodes.code.x}
        y2={nodes.code.y + nH / 2}
        color={colors.slate300}
        executionDot={false}
      />
      {/* HTTP → AI */}
      <BezierConnector
        x1={nodes.http.x + nW}
        y1={nodes.http.y + nH / 2}
        x2={nodes.ai.x}
        y2={nodes.ai.y + nH / 2}
        color={colors.purple}
        executionDot={true}
      />
      {/* Code → Postgres */}
      <BezierConnector
        x1={nodes.code.x}
        y1={nodes.code.y + nH / 2}
        x2={nodes.postgres.x + nW}
        y2={nodes.postgres.y + nH / 2}
        color={colors.emerald}
        executionDot={true}
      />
      {/* AI → Email */}
      <BezierConnector
        x1={nodes.ai.x + nW}
        y1={nodes.ai.y + nH / 2}
        x2={nodes.email.x}
        y2={nodes.email.y + nH / 2}
        color={colors.amber}
        executionDot={true}
      />
      {/* Code → AI (branch) */}
      <BezierConnector
        x1={nodes.code.x + nW}
        y1={nodes.code.y + nH / 2}
        x2={nodes.ai.x}
        y2={nodes.ai.y + nH / 2}
        color={colors.slate300}
        executionDot={false}
      />

      {/* ── Nodes ── */}
      <N8nNode {...nodes.schedule} width={nW} height={nH} />
      <N8nNode {...nodes.http} width={nW} height={nH} />
      <N8nNode {...nodes.code} width={nW} height={nH} />
      <N8nNode {...nodes.ai} width={nW} height={nH} />
      <N8nNode {...nodes.postgres} width={nW} height={nH} />
      <N8nNode {...nodes.email} width={nW} height={nH} />

      {/* Execution status dots on nodes */}
      <StatusDot cx={nodes.schedule.x + nW - 8} cy={nodes.schedule.y + 8} r={4} status="success" />
      <StatusDot cx={nodes.http.x + nW - 8} cy={nodes.http.y + 8} r={4} status="success" />
      <StatusDot cx={nodes.code.x + nW - 8} cy={nodes.code.y + 8} r={4} status="success" />
      <StatusDot cx={nodes.ai.x + nW - 8} cy={nodes.ai.y + 8} r={4} status="success" />
      <StatusDot cx={nodes.postgres.x + nW - 8} cy={nodes.postgres.y + 8} r={4} status="warning" />
      <StatusDot cx={nodes.email.x + nW - 8} cy={nodes.email.y + 8} r={4} status="warning" />

      {/* Extra green execution flow dots along connectors (static) */}
      <circle cx={120} cy={68} r={4} fill={colors.emerald} />
      <circle cx={248} cy={64} r={4} fill={colors.emerald} />
      <circle cx={248} cy={152} r={4} fill={colors.emerald} />

      {/* Mini context label on canvas bottom */}
      <rect x={10} y={272} width={380} height={18} fill={colors.slate100} rx="0" />
      <rect x={10} y={272} width={380} height={18} rx="8" fill={colors.slate100} />
      <text x={20} y={284} fill={colors.slate400} fontSize="8" fontFamily="Inter, system-ui, sans-serif">6 nodes · 5 connections · Last executed 4 min ago</text>
      <StatusDot cx={360} cy={281} r={4} status="success" />
      <text x={366} y={284} fill={colors.emerald} fontSize="8" fontWeight="600" fontFamily="Inter, system-ui, sans-serif">Live</text>
    </svg>
  );
}
