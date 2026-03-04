import {
  ShadowDefs,
  Card,
  Badge,
  ProgressBar,
  CheckIcon,
  LockIcon,
  TextLine,
  colors,
} from "../shared";

interface CourseModulesProps {
  className?: string;
}

const modules = [
  {
    num: "01",
    title: "Getting Started",
    progress: 1,
    pct: "100%",
    status: "complete",
    barColor: colors.emerald,
  },
  {
    num: "02",
    title: "Lead Research",
    progress: 0.75,
    pct: "75%",
    status: "active",
    barColor: colors.blue,
  },
  {
    num: "03",
    title: "Email Sequences",
    progress: 0.3,
    pct: "30%",
    status: "active",
    barColor: colors.blue,
  },
  {
    num: "04",
    title: "Advanced Tactics",
    progress: 0,
    pct: "Locked",
    status: "locked",
    barColor: colors.slate300,
  },
];

export function CourseModules({ className }: CourseModulesProps) {
  const cardH = 50;
  const cardGap = 6;
  const startY = 64;

  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Course modules showing progress: Getting Started complete, Lead Research 75%, Email Sequences 30%, Advanced Tactics locked"
    >
      <ShadowDefs />

      {/* Background */}
      <rect width={400} height={300} rx={16} fill={colors.slate100} />

      {/* Header */}
      <text
        x={28}
        y={44}
        fontSize="13"
        fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.slate900}
      >
        Course Modules
      </text>

      {/* 4 of 6 Complete badge */}
      <Badge
        x={264}
        y={26}
        label="4 of 6 Complete"
        color={colors.emerald}
        shadow="sm"
        fontSize={9}
      />

      {modules.map((mod, i) => {
        const y = startY + i * (cardH + cardGap);
        const isLocked = mod.status === "locked";
        const isComplete = mod.status === "complete";

        return (
          <g key={mod.num}>
            <Card x={20} y={y} width={360} height={cardH} rx={10} shadow="sm" />

            {/* Left accent bar */}
            <rect
              x={20}
              y={y + 8}
              width={3}
              height={cardH - 16}
              rx={1.5}
              fill={isLocked ? colors.slate300 : isComplete ? colors.emerald : colors.blue}
            />

            {/* Module number circle */}
            <circle
              cx={48}
              cy={y + cardH / 2}
              r={14}
              fill={isLocked ? colors.slate100 : isComplete ? colors.emerald : colors.blue}
              opacity={isLocked ? 1 : 0.12}
            />
            <text
              x={48}
              y={y + cardH / 2 + 4}
              textAnchor="middle"
              fontSize="10"
              fontWeight="800"
              fontFamily="Inter, system-ui, sans-serif"
              fill={isLocked ? colors.slate300 : isComplete ? colors.emerald : colors.blue}
            >
              {mod.num}
            </text>

            {/* Title */}
            <text
              x={72}
              y={y + 20}
              fontSize="11"
              fontWeight="700"
              fontFamily="Inter, system-ui, sans-serif"
              fill={isLocked ? colors.slate300 : colors.slate900}
            >
              {mod.title}
            </text>

            {/* Sub text line */}
            <TextLine
              x={72}
              y={y + 26}
              width={isLocked ? 90 : 120}
              height={6}
              color={colors.slate200}
            />

            {/* Progress bar */}
            {!isLocked && (
              <ProgressBar
                x={72}
                y={y + 36}
                width={210}
                height={5}
                progress={mod.progress}
                color={mod.barColor}
                bgColor={colors.slate100}
              />
            )}

            {/* Pct label */}
            <text
              x={290}
              y={y + 41}
              fontSize="9"
              fontWeight="600"
              fontFamily="Inter, system-ui, sans-serif"
              fill={isLocked ? colors.slate300 : isComplete ? colors.emerald : colors.blue}
            >
              {mod.pct}
            </text>

            {/* Status icon */}
            {isComplete && (
              <CheckIcon x={336} y={y + cardH / 2 - 7} size={14} color={colors.emerald} />
            )}
            {isLocked && (
              <LockIcon x={336} y={y + cardH / 2 - 8} size={16} color={colors.slate300} />
            )}
            {!isComplete && !isLocked && (
              <circle
                cx={343}
                cy={y + cardH / 2}
                r={6}
                fill={colors.blue}
                opacity="0.15"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
