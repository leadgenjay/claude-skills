import {
  ShadowDefs,
  Card,
  Badge,
  AvatarDot,
  StatusDot,
  Divider,
  colors,
  getAvatarColor,
} from "../shared";

interface EmailInboxProps {
  className?: string;
}

const emails = [
  { initials: "JK", sender: "Jake Kowalski", subject: "Re: Partnership inquiry", time: "9:41 AM", replied: true, unread: false },
  { initials: "ML", sender: "Maya Liu", subject: "Interested in your services", time: "8:15 AM", replied: false, unread: true },
  { initials: "RT", sender: "Ryan Torres", subject: "Quick question about pricing", time: "Yesterday", replied: true, unread: false },
  { initials: "AB", sender: "Ava Brooks", subject: "Can we hop on a call?", time: "Yesterday", replied: false, unread: true },
  { initials: "CM", sender: "Chris Maddox", subject: "Following up on our chat", time: "Mon", replied: false, unread: false },
];

export function EmailInbox({ className }: EmailInboxProps) {
  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Email inbox showing 68% open rate and 12 replies from outreach campaign"
    >
      <ShadowDefs />

      {/* Background */}
      <rect width={400} height={300} fill={colors.slate100} rx={12} />

      {/* Background card for depth */}
      <g transform="rotate(-1.5, 200, 150)">
        <rect
          x={26}
          y={28}
          width={310}
          height={248}
          rx={10}
          fill={colors.white}
          stroke={colors.slate200}
          strokeWidth={1}
          opacity={0.6}
        />
      </g>

      {/* Main inbox card */}
      <Card x={18} y={20} width={304} height={258} rx={10} shadow="lg">

        {/* Header */}
        <rect x={18} y={20} width={304} height={38} rx={10} fill={colors.slate900} />
        <rect x={18} y={44} width={304} height={14} fill={colors.slate900} />

        <text
          x={36}
          y={43}
          fill={colors.white}
          fontSize={13}
          fontWeight="700"
          fontFamily="Inter, system-ui, sans-serif"
        >
          Inbox
        </text>

        {/* Unread count badge */}
        <circle cx={88} cy={38} r={9} fill={colors.pink} />
        <text
          x={88}
          y={42}
          textAnchor="middle"
          fill={colors.white}
          fontSize={9}
          fontWeight="700"
          fontFamily="Inter, system-ui, sans-serif"
        >
          2
        </text>

        {/* Search bar mock */}
        <rect x={112} y={29} width={188} height={18} rx={9} fill="white" opacity={0.12} />
        <text
          x={130}
          y={41}
          fill="white"
          fontSize={9}
          fontFamily="Inter, system-ui, sans-serif"
          opacity={0.5}
        >
          Search emails...
        </text>

        {/* Email rows */}
        {emails.map((email, i) => {
          const rowY = 66 + i * 43;
          return (
            <g key={email.sender}>
              {/* Unread highlight */}
              {email.unread && (
                <rect x={18} y={rowY - 4} width={304} height={43} fill={colors.blue} opacity={0.04} />
              )}

              {/* Avatar */}
              <AvatarDot
                cx={42}
                cy={rowY + 14}
                r={14}
                initials={email.initials}
                color={getAvatarColor(i)}
              />

              {/* Unread dot indicator */}
              {email.unread && (
                <circle cx={22} cy={rowY + 14} r={3.5} fill={colors.blue} />
              )}

              {/* Sender name */}
              <text
                x={62}
                y={rowY + 10}
                fill={email.unread ? colors.slate900 : colors.slate700}
                fontSize={11}
                fontWeight={email.unread ? "700" : "500"}
                fontFamily="Inter, system-ui, sans-serif"
              >
                {email.sender}
              </text>

              {/* Time */}
              <text
                x={304}
                y={rowY + 10}
                textAnchor="end"
                fill={colors.slate400}
                fontSize={9}
                fontFamily="Inter, system-ui, sans-serif"
              >
                {email.time}
              </text>

              {/* Subject */}
              <text
                x={62}
                y={rowY + 24}
                fill={colors.slate400}
                fontSize={9.5}
                fontFamily="Inter, system-ui, sans-serif"
              >
                {email.subject}
              </text>

              {/* Replied indicator */}
              {email.replied && (
                <g>
                  <rect x={232} y={rowY + 16} width={42} height={12} rx={6} fill={colors.emerald} opacity={0.12} />
                  <text
                    x={253}
                    y={rowY + 25}
                    textAnchor="middle"
                    fill={colors.emerald}
                    fontSize={8}
                    fontWeight="600"
                    fontFamily="Inter, system-ui, sans-serif"
                  >
                    Replied
                  </text>
                </g>
              )}

              {/* Row divider */}
              {i < emails.length - 1 && (
                <Divider x={18} y={rowY + 38} width={304} />
              )}
            </g>
          );
        })}
      </Card>

      {/* Floating stat badges */}
      <Badge x={298} y={48} label="68% open rate" color={colors.blue} fontSize={9} shadow="md" />
      <Badge x={298} y={78} label="12 replies" color={colors.pink} fontSize={9} shadow="md" />

      {/* Additional decorative elements */}
      <StatusDot cx={376} cy={120} r={5} status="success" />
      <StatusDot cx={368} cy={135} r={3} status="info" />

      {/* Mini analytics card */}
      <Card x={306} y={148} width={82} height={112} rx={8} shadow="md">
        <text
          x={316}
          y={166}
          fill={colors.slate700}
          fontSize={8}
          fontWeight="600"
          fontFamily="Inter, system-ui, sans-serif"
        >
          STATS
        </text>

        <text x={316} y={184} fill={colors.slate900} fontSize={11} fontWeight="700" fontFamily="Inter, system-ui, sans-serif">
          68%
        </text>
        <text x={316} y={195} fill={colors.slate400} fontSize={8} fontFamily="Inter, system-ui, sans-serif">
          open rate
        </text>

        <line x1={316} y1={202} x2={378} y2={202} stroke={colors.slate200} strokeWidth={1} />

        <text x={316} y={218} fill={colors.slate900} fontSize={11} fontWeight="700" fontFamily="Inter, system-ui, sans-serif">
          43%
        </text>
        <text x={316} y={229} fill={colors.slate400} fontSize={8} fontFamily="Inter, system-ui, sans-serif">
          reply rate
        </text>

        <line x1={316} y1={236} x2={378} y2={236} stroke={colors.slate200} strokeWidth={1} />

        <text x={316} y={252} fill={colors.slate900} fontSize={11} fontWeight="700" fontFamily="Inter, system-ui, sans-serif">
          12
        </text>
        <text x={316} y={263} fill={colors.slate400} fontSize={8} fontFamily="Inter, system-ui, sans-serif">
          hot leads
        </text>
      </Card>
    </svg>
  );
}
