import {
  ShadowDefs,
  Card,
  Badge,
  AvatarDot,
  Divider,
  colors,
  getAvatarColor,
} from "../shared";

interface BookedMeetingsProps {
  className?: string;
}

const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const meetings = [
  { day: 0, slot: 0, name: "Sarah M.", time: "9:00 AM", color: colors.blue, initials: "SM" },
  { day: 1, slot: 1, name: "Jake R.", time: "11:00 AM", color: colors.pink, initials: "JR" },
  { day: 2, slot: 0, name: "Priya K.", time: "9:00 AM", color: colors.emerald, initials: "PK" },
  { day: 2, slot: 2, name: "Tom H.", time: "2:00 PM", color: colors.amber, initials: "TH" },
  { day: 4, slot: 1, name: "Dana L.", time: "11:00 AM", color: colors.blue, initials: "DL" },
];

const slotLabels = ["9:00", "11:00", "2:00", "4:00"];

export function BookedMeetings({ className }: BookedMeetingsProps) {
  const calX = 14;
  const calY = 62;
  const colWidth = 54;
  const rowHeight = 48;
  const headerH = 24;

  // Main card: x=8, width=302 → right edge at 310, leaving room for sidebar
  const cardX = 8;
  const cardWidth = 302;

  // MTD sidebar: x=318, width=74 → right edge at 392 (8px from viewBox edge)
  const sideX = 318;
  const sideCx = sideX + 37; // center x of sidebar card

  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Weekly calendar showing 5 booked sales meetings with 3 new this week"
    >
      <ShadowDefs />

      {/* Background */}
      <rect width={400} height={300} fill={colors.slate100} rx={12} />

      {/* Background depth card */}
      <g transform="rotate(-1.2, 200, 150)">
        <rect
          x={12}
          y={12}
          width={350}
          height={280}
          rx={10}
          fill={colors.white}
          stroke={colors.slate200}
          strokeWidth={1}
          opacity={0.5}
        />
      </g>

      {/* Main card */}
      <Card x={cardX} y={10} width={cardWidth} height={276} rx={10} shadow="lg">

        {/* Card header */}
        <text
          x={22}
          y={34}
          fill={colors.slate900}
          fontSize={13}
          fontWeight="700"
          fontFamily="Inter, system-ui, sans-serif"
        >
          This Week
        </text>

        {/* Month label */}
        <text
          x={22}
          y={50}
          fill={colors.slate400}
          fontSize={9.5}
          fontFamily="Inter, system-ui, sans-serif"
        >
          March 3-7, 2026
        </text>

        {/* Nav arrows mock */}
        <text x={262} y={34} fill={colors.slate400} fontSize={14} fontFamily="Inter, system-ui, sans-serif">&#8249;</text>
        <text x={282} y={34} fill={colors.slate700} fontSize={14} fontFamily="Inter, system-ui, sans-serif">&#8250;</text>

        {/* Time labels column */}
        {slotLabels.map((label, i) => (
          <text
            key={label}
            x={calX}
            y={calY + headerH + i * rowHeight + rowHeight / 2 + 4}
            fill={colors.slate400}
            fontSize={8}
            fontFamily="Inter, system-ui, sans-serif"
          >
            {label}
          </text>
        ))}

        {/* Day columns */}
        {days.map((day, di) => {
          const colX = calX + 34 + di * colWidth;
          const isToday = di === 2;

          return (
            <g key={day}>
              {/* Today highlight */}
              {isToday && (
                <rect
                  x={colX}
                  y={calY}
                  width={colWidth - 4}
                  height={headerH + slotLabels.length * rowHeight}
                  rx={6}
                  fill={colors.blue}
                  opacity={0.05}
                />
              )}

              {/* Day header */}
              <text
                x={colX + (colWidth - 4) / 2}
                y={calY + 16}
                textAnchor="middle"
                fill={isToday ? colors.blue : colors.slate700}
                fontSize={10}
                fontWeight={isToday ? "700" : "500"}
                fontFamily="Inter, system-ui, sans-serif"
              >
                {day}
              </text>

              {/* Today dot */}
              {isToday && (
                <circle
                  cx={colX + (colWidth - 4) / 2}
                  cy={calY + 22}
                  r={2.5}
                  fill={colors.blue}
                />
              )}

              {/* Slot grid cells */}
              {slotLabels.map((_, si) => (
                <rect
                  key={si}
                  x={colX}
                  y={calY + headerH + si * rowHeight}
                  width={colWidth - 4}
                  height={rowHeight - 2}
                  rx={4}
                  fill={colors.slate100}
                  opacity={0.6}
                />
              ))}

              {/* Vertical divider between columns */}
              {di < days.length - 1 && (
                <line
                  x1={colX + colWidth - 2}
                  y1={calY}
                  x2={colX + colWidth - 2}
                  y2={calY + headerH + slotLabels.length * rowHeight}
                  stroke={colors.slate200}
                  strokeWidth={1}
                />
              )}
            </g>
          );
        })}

        {/* Horizontal dividers for rows */}
        {slotLabels.map((_, si) => (
          <Divider
            key={si}
            x={calX + 34}
            y={calY + headerH + si * rowHeight}
            width={days.length * colWidth - 4}
          />
        ))}

        {/* Meeting blocks */}
        {meetings.map((meeting) => {
          const colX = calX + 34 + meeting.day * colWidth + 2;
          const blockY = calY + headerH + meeting.slot * rowHeight + 3;
          return (
            <g key={`${meeting.day}-${meeting.slot}`}>
              <rect
                x={colX}
                y={blockY}
                width={colWidth - 8}
                height={rowHeight - 8}
                rx={5}
                fill={meeting.color}
                opacity={0.15}
              />
              <rect
                x={colX}
                y={blockY}
                width={3}
                height={rowHeight - 8}
                rx={1.5}
                fill={meeting.color}
              />
              <AvatarDot
                cx={colX + 12}
                cy={blockY + (rowHeight - 8) / 2}
                r={7}
                initials={meeting.initials}
                color={meeting.color}
              />
              <text
                x={colX + 22}
                y={blockY + 14}
                fill={colors.slate900}
                fontSize={7.5}
                fontWeight="600"
                fontFamily="Inter, system-ui, sans-serif"
              >
                {meeting.name}
              </text>
              <text
                x={colX + 22}
                y={blockY + 25}
                fill={colors.slate500}
                fontSize={7}
                fontFamily="Inter, system-ui, sans-serif"
              >
                {meeting.time}
              </text>
            </g>
          );
        })}
      </Card>

      {/* Floating badge */}
      <Badge x={230} y={24} label="3 new this week" color={colors.pink} fontSize={9} shadow="md" />

      {/* MTD stats sidebar card — fully within viewBox (318 to 392) */}
      <Card x={sideX} y={90} width={74} height={116} rx={8} shadow="sm">
        <text
          x={sideCx}
          y={110}
          textAnchor="middle"
          fill={colors.slate400}
          fontSize={7.5}
          fontFamily="Inter, system-ui, sans-serif"
        >
          MTD
        </text>
        <text
          x={sideCx}
          y={128}
          textAnchor="middle"
          fill={colors.slate900}
          fontSize={14}
          fontWeight="700"
          fontFamily="Inter, system-ui, sans-serif"
        >
          14
        </text>
        <text
          x={sideCx}
          y={141}
          textAnchor="middle"
          fill={colors.slate400}
          fontSize={7.5}
          fontFamily="Inter, system-ui, sans-serif"
        >
          mtgs
        </text>
        <line x1={sideX + 8} y1={148} x2={sideX + 66} y2={148} stroke={colors.slate200} strokeWidth={1} />
        <text
          x={sideCx}
          y={162}
          textAnchor="middle"
          fill={colors.emerald}
          fontSize={9.5}
          fontWeight="700"
          fontFamily="Inter, system-ui, sans-serif"
        >
          +28%
        </text>
        <text
          x={sideCx}
          y={175}
          textAnchor="middle"
          fill={colors.slate400}
          fontSize={7.5}
          fontFamily="Inter, system-ui, sans-serif"
        >
          vs last mo
        </text>
      </Card>
    </svg>
  );
}
