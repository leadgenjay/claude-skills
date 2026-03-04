import {
  ShadowDefs,
  Card,
  Badge,
  N8nNode,
  BezierConnector,
  StatusDot,
  colors,
} from "../shared";

interface WorkflowDiagramProps {
  className?: string;
}

export function WorkflowDiagram({ className }: WorkflowDiagramProps) {
  // Node positions — horizontal flow with slight vertical stagger
  const triggerX = 22;
  const triggerY = 108;
  const processX = 150;
  const processY = 80;
  const aiX = 150;
  const aiY = 168;
  const outputX = 278;
  const outputY = 124;

  const nodeW = 112;
  const nodeH = 44;

  // Connector endpoints: right edge of source, left edge of target
  const triggerOutX = triggerX + nodeW;
  const triggerOutY = triggerY + nodeH / 2;

  const processInX = processX;
  const processInY = processY + nodeH / 2;
  const processOutX = processX + nodeW;
  const processOutY = processY + nodeH / 2;

  const aiInX = aiX;
  const aiInY = aiY + nodeH / 2;
  const aiOutX = aiX + nodeW;
  const aiOutY = aiY + nodeH / 2;

  const outputInX = outputX;
  const outputInY = outputY + nodeH / 2;

  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="n8n-style workflow diagram with four connected nodes"
    >
      <ShadowDefs />

      {/* Background */}
      <rect width="400" height="300" fill={colors.slate100} rx="12" />

      {/* Canvas card */}
      <Card x={12} y={12} width={376} height={240} shadow="md" />

      {/* Subtle dot-grid background inside canvas */}
      {Array.from({ length: 10 }, (_, row) =>
        Array.from({ length: 16 }, (_, col) => (
          <circle
            key={`${row}-${col}`}
            cx={24 + col * 24}
            cy={24 + row * 24}
            r={1}
            fill={colors.slate200}
          />
        ))
      )}

      {/* Connectors drawn first (behind nodes) */}
      {/* Trigger → Process */}
      <BezierConnector
        x1={triggerOutX}
        y1={triggerOutY}
        x2={processInX}
        y2={processInY}
        color={colors.pink}
        executionDot={true}
      />

      {/* Trigger → AI */}
      <BezierConnector
        x1={triggerOutX}
        y1={triggerOutY}
        x2={aiInX}
        y2={aiInY}
        color={colors.purple}
        executionDot={false}
      />

      {/* Process → Output */}
      <BezierConnector
        x1={processOutX}
        y1={processOutY}
        x2={outputInX}
        y2={outputInY}
        color={colors.slate300}
        executionDot={true}
      />

      {/* AI → Output */}
      <BezierConnector
        x1={aiOutX}
        y1={aiOutY}
        x2={outputInX}
        y2={outputInY}
        color={colors.purple}
        executionDot={true}
      />

      {/* Nodes */}
      <N8nNode
        x={triggerX}
        y={triggerY}
        width={nodeW}
        height={nodeH}
        label="Webhook"
        sublabel="Trigger event"
        nodeType="trigger"
      />

      <N8nNode
        x={processX}
        y={processY}
        width={nodeW}
        height={nodeH}
        label="Code"
        sublabel="Parse & validate"
        nodeType="code"
      />

      <N8nNode
        x={aiX}
        y={aiY}
        width={nodeW}
        height={nodeH}
        label="AI Agent"
        sublabel="Enrich data"
        nodeType="ai"
      />

      <N8nNode
        x={outputX}
        y={outputY}
        width={nodeW}
        height={nodeH}
        label="Send Email"
        sublabel="Notify team"
        nodeType="output"
      />

      {/* Execution status indicators on nodes */}
      {/* Green dot on Trigger — executed */}
      <StatusDot cx={triggerX + nodeW - 8} cy={triggerY + 8} r={4} status="success" />
      {/* Green dot on Process */}
      <StatusDot cx={processX + nodeW - 8} cy={processY + 8} r={4} status="success" />
      {/* Green dot on AI */}
      <StatusDot cx={aiX + nodeW - 8} cy={aiY + 8} r={4} status="success" />
      {/* Amber on Output — in progress */}
      <StatusDot cx={outputX + nodeW - 8} cy={outputY + 8} r={4} status="warning" />

      {/* Floating "Automated" badge top-right of canvas */}
      <Badge x={296} y={20} label="Automated" color={colors.emerald} />

      {/* Stats row at bottom */}
      <Card x={12} y={260} width={376} height={32} shadow="sm" />

      <StatusDot cx={32} cy={276} r={4} status="success" />
      <text
        x={42}
        y={279}
        fill={colors.slate700}
        fontSize="9"
        fontWeight="600"
        fontFamily="Inter, system-ui, sans-serif"
      >
        Active
      </text>

      <text
        x={96}
        y={279}
        fill={colors.slate400}
        fontSize="9"
        fontFamily="Inter, system-ui, sans-serif"
      >
        4 nodes
      </text>

      <text
        x={152}
        y={279}
        fill={colors.slate400}
        fontSize="9"
        fontFamily="Inter, system-ui, sans-serif"
      >
        Last run: 2m ago
      </text>

      <text
        x={268}
        y={279}
        fill={colors.emerald}
        fontSize="9"
        fontWeight="600"
        fontFamily="Inter, system-ui, sans-serif"
      >
        847 executions
      </text>
    </svg>
  );
}
