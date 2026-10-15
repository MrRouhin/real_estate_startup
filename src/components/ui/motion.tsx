'use client';
import { animate, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

/** Children fade and rise in, one after another. */
export function Stagger({ children, className, delay = 0, step = 0.06 }: { children: React.ReactNode; className?: string; delay?: number; step?: number }) {
  return (
    <motion.div className={className} initial="hidden" animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: step, delayChildren: delay } } }}>
      {children}
    </motion.div>
  );
}
export function Item({ children, className, as = 'div' }: { children: React.ReactNode; className?: string; as?: 'div' | 'li' | 'section' }) {
  const C = as === 'li' ? motion.li : as === 'section' ? motion.section : motion.div;
  return (
    <C className={className} variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 26 } } }}>
      {children}
    </C>
  );
}

/** Shows `value`; when it changes (live updates), counts from the old number to the new one. */
export function AnimatedNumber({ value, format = (n: number) => Math.round(n).toLocaleString('en-IN'), className }: { value: number; format?: (n: number) => string; className?: string }) {
  const reduce = useReducedMotion();
  const [text, setText] = useState(format(value));
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current === value) return;
    if (reduce) { setText(format(value)); prev.current = value; return; }
    const c = animate(prev.current, value, { duration: 0.9, ease: [0.2, 0.7, 0.2, 1], onUpdate: (v) => setText(format(v)) });
    prev.current = value;
    return () => c.stop();
  }, [value, reduce, format]);
  return <span className={className}>{text}</span>;
}

/** Card that tilts toward the pointer in 3D. Renders the same markup on server and client; reduced-motion users get no tilt. */
export function TiltCard({ children, className, max = 7 }: { children: React.ReactNode; className?: string; max?: number }) {
  const x = useMotionValue(0.5), y = useMotionValue(0.5);
  const rx = useSpring(useTransform(y, [0, 1], [max, -max]), { stiffness: 220, damping: 20 });
  const ry = useSpring(useTransform(x, [0, 1], [-max, max]), { stiffness: 220, damping: 20 });
  const glare = useTransform(x, (gx) => `radial-gradient(circle at ${Math.round(gx * 100)}% 30%, rgba(255,255,255,.16), transparent 55%)`);
  return (
    <motion.div className={'relative [transform-style:preserve-3d] ' + (className || '')} style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const r = e.currentTarget.getBoundingClientRect(); x.set((e.clientX - r.left) / r.width); y.set((e.clientY - r.top) / r.height);
      }}
      onPointerLeave={() => { x.set(0.5); y.set(0.5); }}>
      {children}
      <motion.div aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 motion-reduce:hidden [div:hover>&]:opacity-100"
        style={{ background: glare }} />
    </motion.div>
  );
}

/** Horizontal bar that fills when it comes into view. */
export function ProgressBar({ value, color = 'var(--accent)', className = 'h-2', track = 'var(--surface-2)' }: { value: number; color?: string; className?: string; track?: string }) {
  return (
    <div className={'w-full overflow-hidden rounded-full ' + className} style={{ background: track }}>
      <motion.div className="h-full rounded-full" style={{ background: color }}
        initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ duration: 1, ease: [0.2, 0.7, 0.2, 1] }} />
    </div>
  );
}

/** Circular progress with an animated stroke. */
export function ProgressRing({ value, size = 56, stroke = 6, color = 'var(--accent)', children }: { value: number; size?: number; stroke?: number; color?: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - Math.max(0, Math.min(100, value)) / 100) }} transition={{ duration: 1.1, ease: [0.2, 0.7, 0.2, 1] }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-[12px] font-semibold">{children ?? <span className="num">{Math.round(value)}%</span>}</div>
    </div>
  );
}
