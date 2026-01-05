'use client';

import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Type assertion to work around React 19 type incompatibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MotionDiv = motion.div as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MotionSpan = motion.span as any;

// Type for animation variants
type MotionVariants = {
  hidden: { opacity: number; y?: number; scale?: number };
  visible: { opacity: number; y?: number; scale?: number; transition?: { duration: number; ease?: string } };
};

// ============================================
// Page Transition Wrapper
// ============================================
interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  return (
    <MotionDiv
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </MotionDiv>
  );
}

// ============================================
// Fade In Animation
// ============================================
interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
}

export function FadeIn({ children, delay = 0, duration = 0.3 }: FadeInProps) {
  return (
    <MotionDiv
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration, delay, ease: 'easeOut' }}
    >
      {children}
    </MotionDiv>
  );
}

// ============================================
// Slide In Animation
// ============================================
interface SlideInProps {
  children: ReactNode;
  direction?: 'left' | 'right' | 'up' | 'down';
  delay?: number;
  duration?: number;
}

export function SlideIn({ children, direction = 'up', delay = 0, duration = 0.3 }: SlideInProps) {
  const directions = {
    left: { x: -20, y: 0 },
    right: { x: 20, y: 0 },
    up: { x: 0, y: 20 },
    down: { x: 0, y: -20 },
  };

  const { x, y } = directions[direction];

  return (
    <MotionDiv
      initial={{ opacity: 0, x, y }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration, delay, ease: 'easeOut' }}
    >
      {children}
    </MotionDiv>
  );
}

// ============================================
// List Item Animation (for staggered lists)
// ============================================
interface ListItemAnimationProps {
  children: ReactNode;
  index?: number;
  delay?: number;
}

export function ListItemAnimation({ children, index = 0, delay = 0.05 }: ListItemAnimationProps) {
  return (
    <MotionDiv
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.2,
        delay: index * delay,
        ease: 'easeOut',
      }}
    >
      {children}
    </MotionDiv>
  );
}

// ============================================
// Stagger Container (for animating children in sequence)
// ============================================
interface StaggerContainerProps {
  children: ReactNode;
  staggerDelay?: number;
}

export function StaggerContainer({ children, staggerDelay = 0.05 }: StaggerContainerProps) {
  return (
    <MotionDiv
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {children}
    </MotionDiv>
  );
}

// Variants for stagger children
export const staggerItemVariants: MotionVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: 'easeOut' }
  },
};

// ============================================
// Animated Card (with hover effects)
// ============================================
interface AnimatedCardProps {
  children: ReactNode;
  onClick?: () => void;
  hoverScale?: number;
  hoverY?: number;
}

export function AnimatedCard({
  children,
  onClick,
  hoverScale = 1.02,
  hoverY = -4
}: AnimatedCardProps) {
  return (
    <MotionDiv
      whileHover={{
        y: hoverY,
        scale: hoverScale,
        boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {children}
    </MotionDiv>
  );
}

// ============================================
// Scale Animation (for buttons and interactive elements)
// ============================================
interface ScaleOnTapProps {
  children: ReactNode;
  scale?: number;
}

export function ScaleOnTap({ children, scale = 0.95 }: ScaleOnTapProps) {
  return (
    <MotionDiv
      whileTap={{ scale }}
      transition={{ duration: 0.1 }}
    >
      {children}
    </MotionDiv>
  );
}

// ============================================
// Presence Animation (for conditional rendering with animation)
// ============================================
interface PresenceAnimationProps {
  children: ReactNode;
  isVisible: boolean;
  mode?: 'wait' | 'sync' | 'popLayout';
}

export function PresenceAnimation({ children, isVisible, mode = 'wait' }: PresenceAnimationProps) {
  return (
    <AnimatePresence mode={mode}>
      {isVisible && (
        <MotionDiv
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
        >
          {children}
        </MotionDiv>
      )}
    </AnimatePresence>
  );
}

// ============================================
// Pulse Animation (for notifications/badges)
// ============================================
interface PulseProps {
  children: ReactNode;
  duration?: number;
}

export function Pulse({ children, duration = 2 }: PulseProps) {
  return (
    <MotionDiv
      animate={{
        scale: [1, 1.05, 1],
        opacity: [1, 0.8, 1],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {children}
    </MotionDiv>
  );
}

// ============================================
// Number Counter Animation
// ============================================
interface AnimatedCounterProps {
  value: number;
  duration?: number;
}

export function AnimatedCounter({ value, duration = 0.5 }: AnimatedCounterProps) {
  return (
    <MotionSpan
      key={value}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration }}
    >
      {value}
    </MotionSpan>
  );
}

// ============================================
// Expand/Collapse Animation
// ============================================
interface ExpandCollapseProps {
  children: ReactNode;
  isExpanded: boolean;
}

export function ExpandCollapse({ children, isExpanded }: ExpandCollapseProps) {
  return (
    <AnimatePresence>
      {isExpanded && (
        <MotionDiv
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          style={{ overflow: 'hidden' }}
        >
          {children}
        </MotionDiv>
      )}
    </AnimatePresence>
  );
}

// ============================================
// Motion variants for reuse
// ============================================
export const fadeInVariants: MotionVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
};

export const slideUpVariants: MotionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export const scaleVariants: MotionVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
};
