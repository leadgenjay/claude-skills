# Animation Designer Skill

I help you create smooth, professional animations for web applications using Framer Motion and CSS.

## What I Do

**UI Animations:**
- Page transitions
- Component enter/exit animations
- Hover effects, button interactions
- Loading animations

**Scroll Animations:**
- Parallax effects
- Scroll-triggered animations
- Progress indicators

**Micro-interactions:**
- Button press feedback
- Form field focus states
- Success/error animations
- Drag and drop feedback

## Framer Motion Basics

### Installation

```bash
npm install framer-motion
```

### Basic Animation

```typescript
import { motion } from 'framer-motion'

export function FadeIn({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {children}
    </motion.div>
  )
}
```

## Common Animation Patterns

### Pattern 1: Fade In on Mount

```typescript
import { motion } from 'framer-motion'

export function Card({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="p-6 bg-white rounded-lg shadow"
    >
      {children}
    </motion.div>
  )
}
```

### Pattern 2: Staggered List Animation

```typescript
import { motion } from 'framer-motion'

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}

export function List({ items }: { items: string[] }) {
  return (
    <motion.ul variants={container} initial="hidden" animate="show">
      {items.map((text, i) => (
        <motion.li key={i} variants={item}>{text}</motion.li>
      ))}
    </motion.ul>
  )
}
```

### Pattern 3: Button Hover Animation

```typescript
import { motion } from 'framer-motion'

export function AnimatedButton({ children, onClick }: {
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className="px-6 py-3 bg-blue-600 text-white rounded-lg"
    >
      {children}
    </motion.button>
  )
}
```

## Animation Best Practices

### 1. Performance
```typescript
// ✅ Good: Animate transform and opacity (GPU accelerated)
<motion.div animate={{ x: 100, opacity: 0.5 }} />

// ❌ Bad: Animate width, height (triggers layout)
<motion.div animate={{ width: '100%', height: '200px' }} />
```

### 2. Duration
- Too fast: < 100ms (feels abrupt)
- Too slow: > 500ms (feels sluggish)
- Sweet spot: 200-400ms for most UI animations

### 3. Accessibility
```typescript
import { useReducedMotion } from 'framer-motion'

export function AccessibleAnimation({ children }) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.4 }}
    >
      {children}
    </motion.div>
  )
}
```

## When to Use Me

**Perfect for:**
- Creating polished UI animations
- Building interactive components
- Adding scroll effects
- Designing loading states
- Improving user feedback
