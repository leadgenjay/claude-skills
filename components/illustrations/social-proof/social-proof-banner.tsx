import { ShadowDefs, Card, Badge, StarRating, colors } from "../shared";

interface SocialProofBannerProps {
  className?: string;
}

// ── Layout constants ────────────────────────────────────────────
const CARD_X = 22;
const CARD_Y = 42;
const CARD_W = 356;
const CARD_H = 216;

// Header strip inside card
const HEADER_H = 44;
const HEADER_BOTTOM = CARD_Y + HEADER_H;

// 5 stat columns — evenly spaced inside card
const STAT_COUNT = 5;
const STAT_COL_W = CARD_W / STAT_COUNT; // 71.2 each
function statCX(i: number): number {
  return CARD_X + STAT_COL_W * i + STAT_COL_W / 2;
}

// Rows inside stat area
const STAT_AREA_TOP = HEADER_BOTTOM; // y=86
const STAT_AREA_H = CARD_H - HEADER_H; // 172
const ICON_CY = STAT_AREA_TOP + STAT_AREA_H * 0.32; // ~141
const VALUE_Y = STAT_AREA_TOP + STAT_AREA_H * 0.62; // ~173
const LABEL_Y = STAT_AREA_TOP + STAT_AREA_H * 0.82; // ~197

const DIVIDER_Y = CARD_Y + HEADER_H;

const stats: {
  value: string;
  label: string;
  iconColor: string;
  iconSymbol: string;
}[] = [
  { value: "#1",        label: "Agency",      iconColor: colors.pink,    iconSymbol: "★" },
  { value: "2,400+",    label: "Clients",     iconColor: colors.blue,    iconSymbol: "◆" },
  { value: "Since '19", label: "Established", iconColor: colors.emerald, iconSymbol: "◉" },
  { value: "4.9",       label: "Rating",      iconColor: colors.amber,   iconSymbol: "★" },
  { value: "12M+",      label: "Emails Sent", iconColor: colors.pink,    iconSymbol: "▶" },
];

export function SocialProofBanner({ className }: SocialProofBannerProps) {
  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Social proof bar: #1 Agency, 2400+ Clients, Since 2019, 4.9 Rating, 12M+ Emails Sent"
    >
      <ShadowDefs />

      {/* Subtle dot-grid background */}
      {Array.from({ length: 8 }, (_, row) =>
        Array.from({ length: 14 }, (_, col) => (
          <circle
            key={`${row}-${col}`}
            cx={16 + col * 27}
            cy={16 + row * 38}
            r={1.2}
            fill={colors.slate300}
            opacity="0.35"
          />
        ))
      )}

      {/* ── Main card wrapper ── */}
      <Card x={CARD_X} y={CARD_Y} width={CARD_W} height={CARD_H} rx={12} shadow="lg" />

      {/* ── Header strip ── */}
      {/* Soft slate-100 fill */}
      <rect
        x={CARD_X + 1}
        y={CARD_Y + 1}
        width={CARD_W - 2}
        height={HEADER_H - 1}
        rx={11}
        fill={colors.slate100}
      />
      {/* Clip bottom corners of header fill so it sits flush above divider */}
      <rect
        x={CARD_X + 1}
        y={CARD_Y + HEADER_H - 12}
        width={CARD_W - 2}
        height={12}
        fill={colors.slate100}
      />

      {/* Header content: pink accent dot + "Lead Gen Jay" wordmark + "#1 Rated Agency" badge */}
      <circle cx={CARD_X + 20} cy={CARD_Y + HEADER_H / 2} r={5} fill={colors.pink} />
      <text
        x={CARD_X + 32}
        y={CARD_Y + HEADER_H / 2 + 4.5}
        fontSize="12"
        fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
        fill={colors.slate900}
      >
        Lead Gen Jay
      </text>

      {/* Badge: #1 Rated */}
      <Badge
        x={CARD_X + CARD_W - 110}
        y={CARD_Y + HEADER_H / 2 - 11}
        label="✦  #1 Rated Agency"
        color={colors.pink}
        textColor={colors.white}
        fontSize={9.5}
        shadow="sm"
      />

      {/* ── Divider ── */}
      <line
        x1={CARD_X + 1}
        y1={DIVIDER_Y}
        x2={CARD_X + CARD_W - 1}
        y2={DIVIDER_Y}
        stroke={colors.slate200}
        strokeWidth="1"
      />

      {/* ── 5 stat columns ── */}
      {stats.map((stat, i) => {
        const cx = statCX(i);

        // Vertical separator between columns (skip after last)
        const sepX = CARD_X + STAT_COL_W * (i + 1);
        const showSep = i < STAT_COUNT - 1;

        return (
          <g key={stat.label}>
            {/* Column separator */}
            {showSep && (
              <line
                x1={sepX}
                y1={STAT_AREA_TOP + 16}
                x2={sepX}
                y2={CARD_Y + CARD_H - 16}
                stroke={colors.slate200}
                strokeWidth="1"
              />
            )}

            {/* Icon circle */}
            <circle cx={cx} cy={ICON_CY} r={18} fill={stat.iconColor} opacity="0.12" />
            <circle cx={cx} cy={ICON_CY} r={11} fill={stat.iconColor} opacity="0.22" />

            {/* Icon glyph — rating column gets star SVG, others get text glyph */}
            {i === 3 ? (
              // Star rating column: draw 5 small stars centered
              <g transform={`translate(${cx - 30}, ${ICON_CY - 7})`}>
                <StarRating x={6} y={7} rating={5} maxStars={5} size={9} />
              </g>
            ) : (
              <text
                x={cx}
                y={ICON_CY + 5}
                textAnchor="middle"
                fontSize="13"
                fontFamily="Inter, system-ui, sans-serif"
                fill={stat.iconColor}
                fontWeight="700"
              >
                {stat.iconSymbol}
              </text>
            )}

            {/* Stat value */}
            <text
              x={cx}
              y={VALUE_Y}
              textAnchor="middle"
              fontSize={stat.value.length > 5 ? "13" : "15"}
              fontWeight="800"
              fontFamily="Inter, system-ui, sans-serif"
              fill={colors.slate900}
            >
              {stat.value}
            </text>

            {/* Stat label */}
            <text
              x={cx}
              y={LABEL_Y}
              textAnchor="middle"
              fontSize="9"
              fontWeight="500"
              fontFamily="Inter, system-ui, sans-serif"
              fill={colors.slate500}
              letterSpacing="0.3"
            >
              {stat.label.toUpperCase()}
            </text>
          </g>
        );
      })}

      {/* ── Bottom trust strip (thin pink accent line at card bottom) ── */}
      <rect
        x={CARD_X + 1}
        y={CARD_Y + CARD_H - 4}
        width={CARD_W - 2}
        height={3}
        rx={2}
        fill={colors.pink}
        opacity="0.18"
      />
    </svg>
  );
}
