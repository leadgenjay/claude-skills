import {
  ShadowDefs,
  Card,
  Badge,
  OutlineBadge,
  colors,
} from "../shared";

interface CodeTerminalProps {
  className?: string;
}

export function CodeTerminal({ className }: CodeTerminalProps) {
  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Terminal window showing deployment commands and output"
    >
      <ShadowDefs />

      {/* Background */}
      <rect width="400" height="300" fill={colors.slate100} rx="12" />

      {/* ── Terminal outer card — dark bg ── */}
      <Card x={14} y={14} width={290} height={244} shadow="lg" />

      {/* Dark terminal background */}
      <rect x={14} y={14} width={290} height={244} rx="8" fill={colors.slate900} />

      {/* Title bar */}
      <rect x={14} y={14} width={290} height={32} rx="8" fill="#1e293b" />
      <rect x={14} y={36} width={290} height={10} fill="#1e293b" />

      {/* Traffic-light dots */}
      <circle cx={32} cy={30} r={5} fill="#ef4444" />
      <circle cx={48} cy={30} r={5} fill={colors.amber} />
      <circle cx={64} cy={30} r={5} fill={colors.emerald} />

      {/* "Terminal" badge in title bar */}
      <Badge x={118} y={18} label="Terminal" color="#334155" textColor={colors.slate400} fontSize={9} shadow="sm" />

      {/* Shell name */}
      <text x={200} y={32} fill={colors.slate400} fontSize="8" fontFamily="'SF Mono', 'Fira Code', monospace">zsh</text>

      {/* ── Terminal content lines ── */}

      {/* Line 1: prompt + command */}
      <text x={24} y={64} fill={colors.emerald} fontSize="9" fontFamily="'SF Mono', 'Fira Code', monospace">$ </text>
      <text x={38} y={64} fill={colors.white} fontSize="9" fontFamily="'SF Mono', 'Fira Code', monospace">git push origin main</text>

      {/* Line 2: output */}
      <text x={24} y={80} fill={colors.slate400} fontSize="9" fontFamily="'SF Mono', 'Fira Code', monospace">Pushing to github.com/...</text>

      {/* Line 3 */}
      <text x={24} y={96} fill={colors.emerald} fontSize="9" fontFamily="'SF Mono', 'Fira Code', monospace">✓ </text>
      <text x={38} y={96} fill={colors.slate300} fontSize="9" fontFamily="'SF Mono', 'Fira Code', monospace">Branch main pushed (3 commits)</text>

      {/* Separator */}
      <text x={24} y={112} fill="#334155" fontSize="9" fontFamily="'SF Mono', 'Fira Code', monospace">─────────────────────────────</text>

      {/* Line 4: deploy command */}
      <text x={24} y={128} fill={colors.emerald} fontSize="9" fontFamily="'SF Mono', 'Fira Code', monospace">$ </text>
      <text x={38} y={128} fill={colors.white} fontSize="9" fontFamily="'SF Mono', 'Fira Code', monospace">npm run deploy</text>

      {/* Line 5: building */}
      <text x={24} y={144} fill={colors.slate400} fontSize="9" fontFamily="'SF Mono', 'Fira Code', monospace">▸ Building...</text>

      {/* Line 6: type check */}
      <text x={24} y={160} fill={colors.amber} fontSize="9" fontFamily="'SF Mono', 'Fira Code', monospace">⚠ </text>
      <text x={38} y={160} fill={colors.amber} fontSize="9" fontFamily="'SF Mono', 'Fira Code', monospace">1 warning in layout.tsx</text>

      {/* Line 7: compiled */}
      <text x={24} y={176} fill={colors.emerald} fontSize="9" fontFamily="'SF Mono', 'Fira Code', monospace">✓ </text>
      <text x={38} y={176} fill={colors.slate300} fontSize="9" fontFamily="'SF Mono', 'Fira Code', monospace">Compiled 147 modules</text>

      {/* Line 8: deploying */}
      <text x={24} y={192} fill={colors.slate400} fontSize="9" fontFamily="'SF Mono', 'Fira Code', monospace">▸ Deploying to Vercel...</text>

      {/* Line 9: success */}
      <text x={24} y={208} fill={colors.emerald} fontSize="9" fontFamily="'SF Mono', 'Fira Code', monospace">✓ </text>
      <text x={38} y={208} fill={colors.emerald} fontSize="9" fontWeight="600" fontFamily="'SF Mono', 'Fira Code', monospace">Deployed to production</text>

      {/* Line 10: URL — pink */}
      <text x={24} y={224} fill={colors.pink} fontSize="9" fontFamily="'SF Mono', 'Fira Code', monospace">→ </text>
      <text x={38} y={224} fill={colors.pink} fontSize="9" fontFamily="'SF Mono', 'Fira Code', monospace">https://web.leadgenjay.com</text>

      {/* Line 11: next prompt + cursor */}
      <text x={24} y={244} fill={colors.emerald} fontSize="9" fontFamily="'SF Mono', 'Fira Code', monospace">$ </text>
      {/* Blinking cursor (static rect) */}
      <rect x={38} y={234} width={7} height={12} rx="1" fill={colors.slate400} opacity="0.8" />

      {/* ── Right panel: Deploy info card ── */}
      <Card x={316} y={14} width={72} height={148} shadow="md" />

      <text x={324} y={30} fill={colors.slate900} fontSize="8" fontWeight="700" fontFamily="Inter, system-ui, sans-serif">Deploy Info</text>

      <rect x={316} y={34} width={72} height={1} fill={colors.slate200} />

      <text x={324} y={46} fill={colors.slate400} fontSize="7" fontFamily="Inter, system-ui, sans-serif">Project</text>
      <text x={324} y={57} fill={colors.slate900} fontSize="7" fontWeight="600" fontFamily="Inter, system-ui, sans-serif">web-designer</text>

      <text x={324} y={69} fill={colors.slate400} fontSize="7" fontFamily="Inter, system-ui, sans-serif">Branch</text>
      <text x={324} y={80} fill={colors.blue} fontSize="7" fontWeight="600" fontFamily="'SF Mono', 'Fira Code', monospace">main</text>

      <text x={324} y={92} fill={colors.slate400} fontSize="7" fontFamily="Inter, system-ui, sans-serif">Build</text>
      <text x={324} y={103} fill={colors.emerald} fontSize="7" fontWeight="600" fontFamily="Inter, system-ui, sans-serif">Ready</text>

      <text x={324} y={115} fill={colors.slate400} fontSize="7" fontFamily="Inter, system-ui, sans-serif">Duration</text>
      <text x={324} y={126} fill={colors.slate700} fontSize="7" fontFamily="Inter, system-ui, sans-serif">42s</text>

      <text x={324} y={138} fill={colors.slate400} fontSize="7" fontFamily="Inter, system-ui, sans-serif">Commit</text>
      <text x={324} y={149} fill={colors.slate500} fontSize="7" fontFamily="'SF Mono', 'Fira Code', monospace">38daec1</text>

      {/* ── Build steps card ── */}
      <Card x={316} y={172} width={72} height={86} shadow="md" />
      <text x={324} y={186} fill={colors.slate900} fontSize="7" fontWeight="700" fontFamily="Inter, system-ui, sans-serif">Build Steps</text>

      {[
        { step: "Install", done: true },
        { step: "Compile", done: true },
        { step: "Type check", done: true },
        { step: "Deploy", done: true },
      ].map(({ step, done }, i) => (
        <g key={step}>
          <circle
            cx={322}
            cy={199 + i * 13}
            r={4}
            fill={done ? colors.emerald : colors.slate200}
          />
          <text
            x={330}
            y={202 + i * 13}
            fill={done ? colors.slate700 : colors.slate400}
            fontSize="7"
            fontFamily="Inter, system-ui, sans-serif"
          >
            {step}
          </text>
        </g>
      ))}

      {/* ── Floating "Deploy Complete" badge ── */}
      <Badge x={88} y={268} label="Deploy Complete" color={colors.emerald} shadow="md" />

      {/* ── Extra context badges ── */}
      <OutlineBadge x={14} y={268} label="Vercel" color={colors.slate700} fontSize={9} />
    </svg>
  );
}
