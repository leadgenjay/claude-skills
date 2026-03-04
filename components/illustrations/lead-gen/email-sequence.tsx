import {
  ShadowDefs,
  Card,
  Badge,
  StatusDot,
  BezierConnector,
  Divider,
  colors,
} from "../shared";

interface EmailSequenceProps {
  className?: string;
}

export function EmailSequence({ className }: EmailSequenceProps) {
  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="3-step email drip sequence with Day 1, Day 3, and Day 7 emails achieving 43% reply rate"
    >
      <ShadowDefs />

      {/* Background */}
      <rect width={400} height={300} fill={colors.slate100} rx={12} />

      {/* Connector lines between cards */}
      <BezierConnector
        x1={116}
        y1={90}
        x2={144}
        y2={152}
        color={colors.emerald}
        strokeWidth={2}
        showDots={true}
        executionDot={true}
      />

      <BezierConnector
        x1={258}
        y1={152}
        x2={286}
        y2={214}
        color={colors.emerald}
        strokeWidth={2}
        showDots={true}
        executionDot={true}
      />

      {/* Step 1 card — top left */}
      <Card x={18} y={28} width={220} height={112} rx={10} shadow="lg">
        <rect x={18} y={28} width={220} height={28} rx={10} fill={colors.pink} opacity={0.08} />
        <rect x={18} y={44} width={220} height={12} fill={colors.pink} opacity={0.08} />

        {/* Email icon */}
        <rect x={28} y={33} width={20} height={15} rx={3} fill={colors.pink} opacity={0.2} />
        <path d="M28 36 l10 7 10-7" stroke={colors.pink} strokeWidth={1.5} fill="none" strokeLinecap="round" />

        <text
          x={56}
          y={43}
          fill={colors.pink}
          fontSize={10}
          fontWeight="700"
          fontFamily="Inter, system-ui, sans-serif"
        >
          Step 1 · Day 1
        </text>

        <text
          x={28}
          y={70}
          fill={colors.slate900}
          fontSize={10.5}
          fontWeight="600"
          fontFamily="Inter, system-ui, sans-serif"
        >
          Quick intro — worth a look?
        </text>

        <Divider x={28} y={82} width={200} />

        <text x={28} y={97} fill={colors.slate400} fontSize={8.5} fontFamily="Inter, system-ui, sans-serif">Sent</text>
        <text x={28} y={109} fill={colors.slate900} fontSize={10} fontWeight="700" fontFamily="Inter, system-ui, sans-serif">1,240</text>

        <text x={100} y={97} fill={colors.slate400} fontSize={8.5} fontFamily="Inter, system-ui, sans-serif">Opened</text>
        <text x={100} y={109} fill={colors.blue} fontSize={10} fontWeight="700" fontFamily="Inter, system-ui, sans-serif">847</text>
        <text x={130} y={109} fill={colors.slate400} fontSize={8} fontFamily="Inter, system-ui, sans-serif">68%</text>

        <text x={176} y={97} fill={colors.slate400} fontSize={8.5} fontFamily="Inter, system-ui, sans-serif">Replied</text>
        <text x={176} y={109} fill={colors.emerald} fontSize={10} fontWeight="700" fontFamily="Inter, system-ui, sans-serif">62</text>
        <text x={196} y={109} fill={colors.slate400} fontSize={8} fontFamily="Inter, system-ui, sans-serif">5%</text>
      </Card>

      {/* Step 2 card — center */}
      <Card x={144} y={116} width={220} height={112} rx={10} shadow="lg">
        <rect x={144} y={116} width={220} height={28} rx={10} fill={colors.blue} opacity={0.08} />
        <rect x={144} y={132} width={220} height={12} fill={colors.blue} opacity={0.08} />

        {/* Email icon */}
        <rect x={154} y={121} width={20} height={15} rx={3} fill={colors.blue} opacity={0.2} />
        <path d="M154 124 l10 7 10-7" stroke={colors.blue} strokeWidth={1.5} fill="none" strokeLinecap="round" />

        <text
          x={182}
          y={131}
          fill={colors.blue}
          fontSize={10}
          fontWeight="700"
          fontFamily="Inter, system-ui, sans-serif"
        >
          Step 2 · Day 3
        </text>

        <text
          x={154}
          y={158}
          fill={colors.slate900}
          fontSize={10.5}
          fontWeight="600"
          fontFamily="Inter, system-ui, sans-serif"
        >
          Still thinking it over?
        </text>

        <Divider x={154} y={170} width={200} />

        <text x={154} y={185} fill={colors.slate400} fontSize={8.5} fontFamily="Inter, system-ui, sans-serif">Sent</text>
        <text x={154} y={197} fill={colors.slate900} fontSize={10} fontWeight="700" fontFamily="Inter, system-ui, sans-serif">1,178</text>

        <text x={226} y={185} fill={colors.slate400} fontSize={8.5} fontFamily="Inter, system-ui, sans-serif">Opened</text>
        <text x={226} y={197} fill={colors.blue} fontSize={10} fontWeight="700" fontFamily="Inter, system-ui, sans-serif">634</text>
        <text x={254} y={197} fill={colors.slate400} fontSize={8} fontFamily="Inter, system-ui, sans-serif">54%</text>

        <text x={300} y={185} fill={colors.slate400} fontSize={8.5} fontFamily="Inter, system-ui, sans-serif">Replied</text>
        <text x={300} y={197} fill={colors.emerald} fontSize={10} fontWeight="700" fontFamily="Inter, system-ui, sans-serif">98</text>
        <text x={318} y={197} fill={colors.slate400} fontSize={8} fontFamily="Inter, system-ui, sans-serif">8%</text>
      </Card>

      {/* Step 3 card — bottom right */}
      <Card x={18} y={178} width={250} height={112} rx={10} shadow="lg">
        <rect x={18} y={178} width={250} height={28} rx={10} fill={colors.emerald} opacity={0.08} />
        <rect x={18} y={194} width={250} height={12} fill={colors.emerald} opacity={0.08} />

        {/* Email icon */}
        <rect x={28} y={183} width={20} height={15} rx={3} fill={colors.emerald} opacity={0.2} />
        <path d="M28 186 l10 7 10-7" stroke={colors.emerald} strokeWidth={1.5} fill="none" strokeLinecap="round" />

        <text
          x={56}
          y={193}
          fill={colors.emerald}
          fontSize={10}
          fontWeight="700"
          fontFamily="Inter, system-ui, sans-serif"
        >
          Step 3 · Day 7
        </text>

        <text
          x={28}
          y={220}
          fill={colors.slate900}
          fontSize={10.5}
          fontWeight="600"
          fontFamily="Inter, system-ui, sans-serif"
        >
          Last chance — closing the loop
        </text>

        <Divider x={28} y={232} width={230} />

        <text x={28} y={248} fill={colors.slate400} fontSize={8.5} fontFamily="Inter, system-ui, sans-serif">Sent</text>
        <text x={28} y={260} fill={colors.slate900} fontSize={10} fontWeight="700" fontFamily="Inter, system-ui, sans-serif">1,080</text>

        <text x={106} y={248} fill={colors.slate400} fontSize={8.5} fontFamily="Inter, system-ui, sans-serif">Opened</text>
        <text x={106} y={260} fill={colors.blue} fontSize={10} fontWeight="700" fontFamily="Inter, system-ui, sans-serif">421</text>
        <text x={130} y={260} fill={colors.slate400} fontSize={8} fontFamily="Inter, system-ui, sans-serif">39%</text>

        <text x={188} y={248} fill={colors.slate400} fontSize={8.5} fontFamily="Inter, system-ui, sans-serif">Replied</text>
        <text x={188} y={260} fill={colors.emerald} fontSize={10} fontWeight="700" fontFamily="Inter, system-ui, sans-serif">312</text>
        <text x={214} y={260} fill={colors.slate400} fontSize={8} fontFamily="Inter, system-ui, sans-serif">29%</text>
      </Card>

      {/* Floating result badge */}
      <Badge x={286} y={234} label="43% reply rate" color={colors.pink} fontSize={9} shadow="md" />

      {/* Execution status dots */}
      <StatusDot cx={388} cy={60} r={5} status="success" />
      <StatusDot cx={380} cy={74} r={3} status="success" />
      <StatusDot cx={390} cy={82} r={3} status="info" />
    </svg>
  );
}
