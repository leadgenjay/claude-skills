// Simplified brand logo icons for use inside SVG illustrations
// Each logo is a <g> element sized ~24x24, scalable via transform

interface LogoProps {
  x?: number;
  y?: number;
  size?: number;
  color?: string;
}

function logoTransform(x: number, y: number, size: number) {
  const scale = size / 24;
  return `translate(${x}, ${y}) scale(${scale})`;
}

// ─── AI & Dev Tools ──────────────────────────────────────────────

export function ClaudeLogo({ x = 0, y = 0, size = 24 }: LogoProps) {
  return (
    <g transform={logoTransform(x, y, size)}>
      <image href="/logos/claude.webp" width="24" height="24" />
    </g>
  );
}

export function OpenAILogo({ x = 0, y = 0, size = 24 }: LogoProps) {
  return (
    <g transform={logoTransform(x, y, size)}>
      <image href="/logos/openai.webp" width="24" height="24" />
    </g>
  );
}

export function GitHubLogo({ x = 0, y = 0, size = 24, color = "#24292f" }: LogoProps) {
  return (
    <g transform={logoTransform(x, y, size)}>
      {/* Simplified GitHub octocat mark */}
      <path
        d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.337-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.268 2.75 1.026A9.564 9.564 0 0112 6.844a9.59 9.59 0 012.504.337c1.909-1.294 2.747-1.026 2.747-1.026.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"
        fill={color}
      />
    </g>
  );
}

export function VSCodeLogo({ x = 0, y = 0, size = 24, color = "#007ACC" }: LogoProps) {
  return (
    <g transform={logoTransform(x, y, size)}>
      {/* Simplified VS Code shield */}
      <path
        d="M17.5 2L7 11l-4-3.5V16l4-3.5L17.5 22 22 20V4L17.5 2z"
        fill={color}
        opacity="0.85"
      />
      <path
        d="M17.5 2L7 11l-4-3.5"
        fill="none"
        stroke="white"
        strokeWidth="0.5"
        opacity="0.4"
      />
    </g>
  );
}

export function CursorLogo({ x = 0, y = 0, size = 24, color = "#000000" }: LogoProps) {
  return (
    <g transform={logoTransform(x, y, size)}>
      {/* Simplified Cursor app icon — code brackets with cursor */}
      <rect x="3" y="3" width="18" height="18" rx="4" fill={color} opacity="0.08" />
      <path
        d="M8 8L5 12l3 4M16 8l3 4-3 4"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="11" y="7" width="2" height="10" rx="1" fill={color} opacity="0.5" />
    </g>
  );
}

export function VercelLogo({ x = 0, y = 0, size = 24, color = "#000000" }: LogoProps) {
  return (
    <g transform={logoTransform(x, y, size)}>
      {/* Vercel triangle */}
      <path d="M12 3L22 21H2L12 3z" fill={color} />
    </g>
  );
}

export function SupabaseLogo({ x = 0, y = 0, size = 24, color = "#3ECF8E" }: LogoProps) {
  return (
    <g transform={logoTransform(x, y, size)}>
      {/* Simplified Supabase shield/bolt */}
      <path
        d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"
        fill={color}
      />
    </g>
  );
}

// ─── Automation & Outreach ───────────────────────────────────────

export function N8NLogo({ x = 0, y = 0, size = 24, color = "#EA4B71" }: LogoProps) {
  return (
    <g transform={logoTransform(x, y, size)}>
      {/* n8n connected nodes */}
      <circle cx="6" cy="12" r="4" fill={color} />
      <circle cx="18" cy="6" r="4" fill={color} opacity="0.7" />
      <circle cx="18" cy="18" r="4" fill={color} opacity="0.7" />
      <line x1="9" y1="10.5" x2="15" y2="7" stroke={color} strokeWidth="1.5" />
      <line x1="9" y1="13.5" x2="15" y2="17" stroke={color} strokeWidth="1.5" />
    </g>
  );
}

export function ZapierLogo({ x = 0, y = 0, size = 24 }: LogoProps) {
  return (
    <g transform={logoTransform(x, y, size)}>
      <image href="/logos/zapier.webp" width="24" height="24" />
    </g>
  );
}

export function MakeLogo({ x = 0, y = 0, size = 24 }: LogoProps) {
  return (
    <g transform={logoTransform(x, y, size)}>
      <image href="/logos/make.webp" width="24" height="24" />
    </g>
  );
}

export function GmailLogo({ x = 0, y = 0, size = 24 }: LogoProps) {
  return (
    <g transform={logoTransform(x, y, size)}>
      <image href="/logos/gmail.webp" width="24" height="24" />
    </g>
  );
}

export function OutlookLogo({ x = 0, y = 0, size = 24 }: LogoProps) {
  return (
    <g transform={logoTransform(x, y, size)}>
      <image href="/logos/outlook.webp" width="24" height="24" />
    </g>
  );
}

export function LinkedInLogo({ x = 0, y = 0, size = 24, color = "#0A66C2" }: LogoProps) {
  return (
    <g transform={logoTransform(x, y, size)}>
      {/* LinkedIn "in" mark */}
      <rect x="2" y="2" width="20" height="20" rx="4" fill={color} />
      <text x="12" y="17" textAnchor="middle" fill="white" fontSize="11" fontWeight="700" fontFamily="Inter, system-ui, sans-serif">in</text>
    </g>
  );
}

export function InstagramLogo({ x = 0, y = 0, size = 24, color = "#E4405F" }: LogoProps) {
  return (
    <g transform={logoTransform(x, y, size)}>
      {/* Instagram camera icon */}
      <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke={color} strokeWidth="2" />
      <circle cx="12" cy="12" r="4" fill="none" stroke={color} strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1.5" fill={color} />
    </g>
  );
}

export function SlackLogo({ x = 0, y = 0, size = 24 }: LogoProps) {
  return (
    <g transform={logoTransform(x, y, size)}>
      <image href="/logos/slack.webp" width="24" height="24" />
    </g>
  );
}

// ─── Cold Email & Outreach Tools ────────────────────────────────

export function InstantlyLogo({ x = 0, y = 0, size = 24 }: LogoProps) {
  return (
    <g transform={logoTransform(x, y, size)}>
      <image href="/logos/instantly.webp" width="24" height="24" />
    </g>
  );
}

export function ApolloLogo({ x = 0, y = 0, size = 24 }: LogoProps) {
  return (
    <g transform={logoTransform(x, y, size)}>
      <image href="/logos/apollo.webp" width="24" height="24" />
    </g>
  );
}

export function AimfoxLogo({ x = 0, y = 0, size = 24 }: LogoProps) {
  return (
    <g transform={logoTransform(x, y, size)}>
      <image href="/logos/aimfox.webp" width="24" height="24" />
    </g>
  );
}

export function PhantomBusterLogo({ x = 0, y = 0, size = 24 }: LogoProps) {
  return (
    <g transform={logoTransform(x, y, size)}>
      <image href="/logos/phantombuster.webp" width="24" height="24" />
    </g>
  );
}

// ─── Data & Enrichment ──────────────────────────────────────────

export function ApifyLogo({ x = 0, y = 0, size = 24 }: LogoProps) {
  return (
    <g transform={logoTransform(x, y, size)}>
      <image href="/logos/apify.webp" width="24" height="24" />
    </g>
  );
}

export function ClayLogo({ x = 0, y = 0, size = 24 }: LogoProps) {
  return (
    <g transform={logoTransform(x, y, size)}>
      <image href="/logos/clay.webp" width="24" height="24" />
    </g>
  );
}

export function HyrosLogo({ x = 0, y = 0, size = 24 }: LogoProps) {
  return (
    <g transform={logoTransform(x, y, size)}>
      <image href="/logos/hyros.webp" width="24" height="24" />
    </g>
  );
}

export function EmailBisonLogo({ x = 0, y = 0, size = 24 }: LogoProps) {
  return (
    <g transform={logoTransform(x, y, size)}>
      <image href="/logos/emailbison.webp" width="24" height="24" />
    </g>
  );
}

// ─── CRM & Marketing Platforms ──────────────────────────────────

export function HighLevelLogo({ x = 0, y = 0, size = 24 }: LogoProps) {
  return (
    <g transform={logoTransform(x, y, size)}>
      <image href="/logos/ghl.webp" width="24" height="24" />
    </g>
  );
}

export function ConsultiLogo({ x = 0, y = 0, size = 24 }: LogoProps) {
  return (
    <g transform={logoTransform(x, y, size)}>
      <image href="/logos/consulti.webp" width="24" height="24" />
    </g>
  );
}

// ─── Domains & Infrastructure ───────────────────────────────────

export function DynadotLogo({ x = 0, y = 0, size = 24 }: LogoProps) {
  return (
    <g transform={logoTransform(x, y, size)}>
      <image href="/logos/dynadot.webp" width="24" height="24" />
    </g>
  );
}

// ─── Payments & Commerce ────────────────────────────────────────

export function StripeLogo({ x = 0, y = 0, size = 24 }: LogoProps) {
  return (
    <g transform={logoTransform(x, y, size)}>
      <image href="/logos/stripe.webp" width="24" height="24" />
    </g>
  );
}

export function PayPalLogo({ x = 0, y = 0, size = 24 }: LogoProps) {
  return (
    <g transform={logoTransform(x, y, size)}>
      <image href="/logos/paypal.webp" width="24" height="24" />
    </g>
  );
}

export function WhopLogo({ x = 0, y = 0, size = 24 }: LogoProps) {
  return (
    <g transform={logoTransform(x, y, size)}>
      <image href="/logos/whop.webp" width="24" height="24" />
    </g>
  );
}

export function ZoomLogo({ x = 0, y = 0, size = 24 }: LogoProps) {
  return (
    <g transform={logoTransform(x, y, size)}>
      <image href="/logos/zoom.webp" width="24" height="24" />
    </g>
  );
}
