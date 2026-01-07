'use client';

import { useState, useRef, useCallback, useEffect, ReactNode } from 'react';
import { Box, Paper, Typography, IconButton, useTheme } from '@mui/material';
import { X, ChevronDown } from 'lucide-react';

// ============================================
// PullToRefresh Component
// ============================================
interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  disabled?: boolean;
  pullThreshold?: number;
}

export function PullToRefresh({
  children,
  onRefresh,
  disabled = false,
  pullThreshold = 80,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;

    // Only activate if at top of scroll
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || disabled || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    if (diff > 0) {
      // Apply resistance - pull distance decreases as you pull more
      const resistance = Math.min(diff * 0.4, pullThreshold * 1.5);
      setPullDistance(resistance);
    }
  }, [isPulling, disabled, isRefreshing, pullThreshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || disabled) return;

    setIsPulling(false);

    if (pullDistance >= pullThreshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(pullThreshold * 0.6); // Keep some pull distance during refresh

      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [isPulling, disabled, pullDistance, pullThreshold, isRefreshing, onRefresh]);

  const progress = Math.min(pullDistance / pullThreshold, 1);

  return (
    <Box
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      sx={{
        position: 'relative',
        overflow: 'auto',
        height: '100%',
      }}
    >
      {/* Pull Indicator */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: pullDistance,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          transition: isPulling ? 'none' : 'height 0.2s ease',
        }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '2px solid',
            borderColor: progress >= 1 ? 'primary.main' : 'grey.300',
            borderTopColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `rotate(${progress * 360}deg)`,
            transition: isPulling ? 'none' : 'transform 0.2s ease',
            animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
            '@keyframes spin': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(360deg)' },
            },
          }}
        >
          {!isRefreshing && (
            <ChevronDown
              size={16}
              style={{
                transform: `rotate(${progress >= 1 ? 180 : 0}deg)`,
                transition: 'transform 0.2s ease',
              }}
            />
          )}
        </Box>
      </Box>

      {/* Content */}
      <Box
        sx={{
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling ? 'none' : 'transform 0.2s ease',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

// ============================================
// BottomSheet Component
// ============================================
interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  height?: 'auto' | 'half' | 'full';
  showHandle?: boolean;
}

export function BottomSheet({
  open,
  onClose,
  children,
  title,
  height = 'auto',
  showHandle = true,
}: BottomSheetProps) {
  const theme = useTheme();
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  const heightMap = {
    auto: 'auto',
    half: '50vh',
    full: 'calc(100vh - 48px)',
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) {
      setDragY(diff);
    }
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    if (dragY > 100) {
      onClose();
    }
    setDragY(0);
  }, [dragY, onClose]);

  // Reset drag when closing
  useEffect(() => {
    if (!open) {
      setDragY(0);
    }
  }, [open]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <Box
        onClick={onClose}
        sx={{
          position: 'fixed',
          inset: 0,
          bgcolor: 'rgba(0, 0, 0, 0.5)',
          zIndex: theme.zIndex.modal,
          opacity: open ? 1 - dragY / 300 : 0,
          transition: isDragging ? 'none' : 'opacity 0.3s ease',
        }}
      />

      {/* Sheet */}
      <Paper
        ref={sheetRef}
        elevation={16}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: theme.zIndex.modal + 1,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          maxHeight: '90vh',
          height: heightMap[height],
          transform: `translateY(${open ? dragY : '100%'}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Handle - drag events only on handle area */}
        {showHandle && (
          <Box
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            sx={{
              display: 'flex',
              justifyContent: 'center',
              pt: 1.5,
              pb: 1,
              cursor: 'grab',
            }}
          >
            <Box
              sx={{
                width: 36,
                height: 4,
                borderRadius: 2,
                bgcolor: 'grey.300',
              }}
            />
          </Box>
        )}

        {/* Header */}
        {title && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              py: 1.5,
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="h6" fontWeight={600}>
              {title}
            </Typography>
            <IconButton size="small" onClick={onClose}>
              <X size={20} />
            </IconButton>
          </Box>
        )}

        {/* Content */}
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            p: 2,
          }}
        >
          {children}
        </Box>
      </Paper>
    </>
  );
}

// ============================================
// AnimatedList Component
// ============================================
interface AnimatedListProps {
  children: ReactNode[];
  staggerDelay?: number;
  animateOnMount?: boolean;
}

export function AnimatedList({
  children,
  staggerDelay = 50,
  animateOnMount = true,
}: AnimatedListProps) {
  const [mounted, setMounted] = useState(!animateOnMount);

  useEffect(() => {
    if (animateOnMount) {
      setMounted(true);
    }
  }, [animateOnMount]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {children.map((child, index) => (
        <Box
          key={index}
          sx={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateX(0)' : 'translateX(-20px)',
            transition: `all 0.3s ease ${index * staggerDelay}ms`,
          }}
        >
          {child}
        </Box>
      ))}
    </Box>
  );
}

// ============================================
// ScaleOnPress Component
// ============================================
interface ScaleOnPressProps {
  children: ReactNode;
  scale?: number;
  disabled?: boolean;
}

export function ScaleOnPress({ children, scale = 0.97, disabled = false }: ScaleOnPressProps) {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <Box
      onTouchStart={() => !disabled && setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onTouchCancel={() => setIsPressed(false)}
      onMouseDown={() => !disabled && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      sx={{
        transform: isPressed ? `scale(${scale})` : 'scale(1)',
        transition: 'transform 0.1s ease',
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {children}
    </Box>
  );
}

// ============================================
// FadeInView Component
// ============================================
interface FadeInViewProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
}

export function FadeInView({
  children,
  delay = 0,
  duration = 300,
  direction = 'up',
}: FadeInViewProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const getTransform = () => {
    if (!isVisible) {
      switch (direction) {
        case 'up': return 'translateY(20px)';
        case 'down': return 'translateY(-20px)';
        case 'left': return 'translateX(20px)';
        case 'right': return 'translateX(-20px)';
        default: return 'none';
      }
    }
    return 'none';
  };

  return (
    <Box
      sx={{
        opacity: isVisible ? 1 : 0,
        transform: getTransform(),
        transition: `all ${duration}ms ease`,
      }}
    >
      {children}
    </Box>
  );
}

// ============================================
// Exports
// ============================================
export default {
  PullToRefresh,
  BottomSheet,
  AnimatedList,
  ScaleOnPress,
  FadeInView,
};
