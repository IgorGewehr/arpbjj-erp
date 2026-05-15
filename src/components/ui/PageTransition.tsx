'use client';

// ============================================
// PageTransition
// ============================================
// Wraps page content with a subtle fade + slide transition between routes.
// Designed for use inside client layout shells (e.g., AppLayout, PortalLayout).
// Next.js App Router server layouts cannot use AnimatePresence directly.
//
// Implementation notes:
// - Imports only `motion` and `AnimatePresence` from framer-motion (tree-shaken).
// - Uses `mode="wait"` so the exit animation completes before the next page enters.
// - Key derived from `usePathname()` so AnimatePresence can detect route changes.
// - Short 0.18s ease-out keeps navigation feeling snappy, not laggy.
// ============================================

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

interface PageTransitionProps {
  children: ReactNode;
}

const variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const transition = {
  duration: 0.18,
  ease: [0.0, 0.0, 0.2, 1] as const, // ease-out cubic-bezier
};

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={variants}
        transition={transition}
        style={{ width: '100%', minHeight: '100%' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export default PageTransition;
