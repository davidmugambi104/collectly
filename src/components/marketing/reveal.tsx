'use client';

import { LazyMotion, domAnimation, m, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Entrance animation for content scrolled into view.
 *
 * framer-motion has been a dependency since the beginning and was used
 * nowhere on the marketing site — every section simply appeared. This is the
 * smallest thing that fixes that without turning the page into a showreel.
 *
 * Deliberately restrained: 10px of travel and a fade, once, on a curve that
 * decelerates. No scale, no blur, no spring overshoot, no horizontal
 * movement. The site's whole argument is that it does not oversell, and a
 * pricing card that bounces into view is arguing the opposite.
 *
 * `once: true` matters beyond taste — re-animating on every scroll past is
 * what makes a long page feel unstable, and this page is 18,000px on a phone.
 *
 * REDUCED MOTION: one element, one initial state, on the server and on the
 * client. Only the distance and the duration change.
 *
 * Two earlier attempts got this wrong in the same way. Branching to a plain
 * <div> when `reduce` is true, and then overriding with an explicit style
 * prop, both left the content INVISIBLE for exactly the people the branch was
 * meant to help. useReducedMotion() returns null during SSR, so the server
 * always emitted style="opacity:0;transform:translateY(10px)", and React does
 * not patch DOM attributes during hydration — it trusts the server markup. On
 * /pricing under prefers-reduced-motion: reduce, the pricing card measured
 * opacity 0 permanently.
 *
 * Keeping the markup identical in both cases removes the mismatch. A
 * reduced-motion visitor still gets the element revealed by whileInView, with
 * no travel and no duration, so it simply appears.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  /** Seconds. Use `index * 0.06` for a stagger down a list. */
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    // LazyMotion + `m` instead of the full `motion` export. The whole
    // framer-motion bundle is ~100kB and importing `motion` anywhere pulls all
    // of it: with it on the homepage, First Load JS was 246kB. domAnimation
    // carries what this actually uses — opacity and transform — and loads the
    // rest never.
    <LazyMotion features={domAnimation} strict>
    <m.div
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -80px 0px' }}
      transition={reduce ? { duration: 0 } : { duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </m.div>
    </LazyMotion>
  );
}
