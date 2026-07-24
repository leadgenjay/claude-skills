# Mounting REAL app components inside Remotion

The whole point: reuse production components so the video matches the app exactly.
With the config below this works with **zero shims** for most presentational UI.

## 1. Path alias + Tailwind (remotion.config.ts)

Remotion bundles with its own webpack, so it does not inherit your app's path aliases
or CSS pipeline. Re-declare them:

```ts
import path from 'node:path';
import { Config } from '@remotion/cli/config';
import { enableTailwind } from '@remotion/tailwind-v4';   // or @remotion/tailwind for v3

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
Config.setEntryPoint('./remotion/index.ts');

const repoRoot = path.resolve(process.cwd());
Config.overrideWebpackConfig((current) => {
  const withTailwind = enableTailwind(current);
  return {
    ...withTailwind,
    resolve: {
      ...withTailwind.resolve,
      // mirror every alias in your tsconfig "paths" — e.g. "@/*": ["./*"]
      alias: { ...(withTailwind.resolve?.alias ?? {}), '@': repoRoot },
    },
  };
});
```

`enableTailwind` wires `@tailwindcss/webpack` + `style-loader` + `css-loader` for `.css`.
An unresolved alias shows up as `Module not found: Can't resolve '@/components/...'` on
the first bundle — that is the #1 first-run failure.

## 2. Tailwind layer + design tokens (remotion/styles.css)

```css
@import "../app/styles/globals.css";   /* your app's Tailwind layer + tokens + resets */
```

Import `./styles.css` from `Root.tsx` (and any composition). Tailwind v4 auto-scans the
bundled TSX, so the utility classes used by real components compile. If your tokens live
in a CSS-in-JS theme provider instead, wrap the adapter in that provider.

## 3. Fonts — replacing framework font loaders

`next/font` (and similar build-time font loaders) do not run under Remotion. Load the
same families with `@remotion/google-fonts` and set the CSS variables your app expects,
gated with `delayRender`/`continueRender` so every frame has the real fonts:

```tsx
import { continueRender, delayRender } from 'remotion';
import { loadFont as loadBody } from '@remotion/google-fonts/DMSans';

const handle = delayRender('fonts');
const { waitUntilDone } = loadBody();
waitUntilDone().then(() => {
  const style = document.createElement('style');
  style.textContent = `:root { --font-body: 'DM Sans', sans-serif; }`;
  document.head.appendChild(style);
  continueRender(handle);
});
```

Set the root wrapper `style={{ fontFamily: 'var(--font-body)' }}`. Skipping
`delayRender` produces the classic bug: the first N frames render in a fallback font.

## 4. Which components are SAFE to mount

**Safe — leaf presentational (props in → UI out):**

- Design-system primitives: buttons, tables, checkboxes, badges, avatars, inputs
  (pass `readOnly` + `value` to drive per frame), switches (pass a no-op handler).
- Result tables / list rows that receive `data` as a prop and delegate to a generic
  table component.
- Chips, tabs, collapsible filter sections, selection banners, empty-state presenters,
  detail sidecards.
- Any exported formatter the app uses for counts — **use it**, so magnitudes and
  approximate markers (`~`, `K`, `M`) match production exactly.

**Safe-but-restate — real component, internal state:** a filter block that holds its
input value in `useState` can't be reached by a frame-driven typewriter. Reproduce just
that block from the leaves it already uses (filter section + input + badge + button) —
same components, state inverted to props. Don't rebuild the whole rail for one input.

**Unsafe — do NOT mount (fetch / URL-state / server):**

- Container/`*Search`/`*Provider` components that call data hooks (React Query, SWR),
  URL-state libraries (`nuqs`), or auth/session hooks.
- Anything importing a database/client SDK, toast singletons, router hooks
  (`next/navigation`), or a server component.

**Rule of thumb:** read the component. If its callbacks default to no-ops and it takes
its data as props, it's safe. If it calls a hook that fetches or reads the URL, wrap the
data in an **adapter** instead: the adapter reproduces the page layout with the safe
leaves and receives every dynamic value as a prop, which the composition drives per frame.

## 5. If a stray framework-only import breaks the bundle

Alias it to a stub in `remotion.config.ts`:

```ts
resolve.alias = {
  ...,
  'server-only': false,                                  // or a path to an empty module
  'next/navigation': path.resolve('remotion/shims/next-navigation.ts'),
};
```

Prefer a thinner leaf component over a big shim. Keep shims in `remotion/shims/`.

## 6. Determinism inside reused components

App components often carry `animate-pulse`, CSS transitions, or framer-motion mount
animations — all time-based, therefore nondeterministic under a frame renderer.
Neutralize them from the adapter with a scoped style block, and drive all motion
yourself:

```tsx
<div data-video-root>
  <style>{`
    [data-video-root] *, [data-video-root] *::before, [data-video-root] *::after {
      animation: none !important;
      transition: none !important;
    }
  `}</style>
  {/* real components here */}
</div>
```

Also pass any `disableMotion`/`disableAnimation` prop the design system supports.
