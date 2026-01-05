'use client';

import { useState, useRef, useCallback, ReactNode } from 'react';
import { Box, Paper, IconButton, Typography, useTheme } from '@mui/material';
import { Trash2, Edit, Check, MoreHorizontal } from 'lucide-react';

// ============================================
// SwipeAction Types
// ============================================
export interface SwipeAction {
  icon: React.ElementType;
  color: string;
  bgColor: string;
  label: string;
  onClick: () => void;
}

// ============================================
// MobileCard Component
// ============================================
interface MobileCardProps {
  children: ReactNode;
  onClick?: () => void;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  disabled?: boolean;
  elevation?: number;
}

export function MobileCard({
  children,
  onClick,
  leftActions = [],
  rightActions = [],
  disabled = false,
  elevation = 0,
}: MobileCardProps) {
  const theme = useTheme();
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);

  const ACTION_WIDTH = 72;
  const maxLeftSwipe = leftActions.length * ACTION_WIDTH;
  const maxRightSwipe = rightActions.length * ACTION_WIDTH;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isHorizontalSwipe.current = null;
    setIsSwiping(true);
  }, [disabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwiping || disabled) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - startX.current;
    const diffY = currentY - startY.current;

    // Determine swipe direction on first significant movement
    if (isHorizontalSwipe.current === null) {
      if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
        isHorizontalSwipe.current = Math.abs(diffX) > Math.abs(diffY);
      }
      return;
    }

    // Only handle horizontal swipes
    if (!isHorizontalSwipe.current) return;

    // Prevent vertical scroll during horizontal swipe
    e.preventDefault();

    // Calculate bounded swipe
    let newSwipeX = diffX;

    // Apply resistance at edges
    if (diffX > 0 && leftActions.length > 0) {
      // Swiping right (revealing left actions)
      newSwipeX = Math.min(diffX, maxLeftSwipe + 20);
      if (newSwipeX > maxLeftSwipe) {
        newSwipeX = maxLeftSwipe + (newSwipeX - maxLeftSwipe) * 0.3;
      }
    } else if (diffX < 0 && rightActions.length > 0) {
      // Swiping left (revealing right actions)
      newSwipeX = Math.max(diffX, -(maxRightSwipe + 20));
      if (newSwipeX < -maxRightSwipe) {
        newSwipeX = -maxRightSwipe + (newSwipeX + maxRightSwipe) * 0.3;
      }
    } else {
      // No actions in this direction
      newSwipeX = diffX * 0.2;
    }

    setSwipeX(newSwipeX);
  }, [isSwiping, disabled, leftActions.length, rightActions.length, maxLeftSwipe, maxRightSwipe]);

  const handleTouchEnd = useCallback(() => {
    setIsSwiping(false);
    isHorizontalSwipe.current = null;

    // Snap to action positions or back to center
    const threshold = ACTION_WIDTH * 0.5;

    if (swipeX > threshold && leftActions.length > 0) {
      setSwipeX(maxLeftSwipe);
    } else if (swipeX < -threshold && rightActions.length > 0) {
      setSwipeX(-maxRightSwipe);
    } else {
      setSwipeX(0);
    }
  }, [swipeX, leftActions.length, rightActions.length, maxLeftSwipe, maxRightSwipe]);

  const closeSwipe = useCallback(() => {
    setSwipeX(0);
  }, []);

  const handleActionClick = useCallback((action: SwipeAction) => {
    action.onClick();
    closeSwipe();
  }, [closeSwipe]);

  const handleCardClick = useCallback(() => {
    if (swipeX !== 0) {
      closeSwipe();
      return;
    }
    onClick?.();
  }, [swipeX, closeSwipe, onClick]);

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 3,
      }}
    >
      {/* Left Actions (revealed by swiping right) */}
      {leftActions.length > 0 && (
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'stretch',
          }}
        >
          {leftActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Box
                key={index}
                onClick={() => handleActionClick(action)}
                sx={{
                  width: ACTION_WIDTH,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: action.bgColor,
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                  opacity: swipeX > 0 ? 1 : 0,
                }}
              >
                <Icon size={22} color={action.color} />
                <Typography
                  variant="caption"
                  sx={{ color: action.color, fontSize: '0.65rem', mt: 0.5 }}
                >
                  {action.label}
                </Typography>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Right Actions (revealed by swiping left) */}
      {rightActions.length > 0 && (
        <Box
          sx={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'stretch',
          }}
        >
          {rightActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Box
                key={index}
                onClick={() => handleActionClick(action)}
                sx={{
                  width: ACTION_WIDTH,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: action.bgColor,
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                  opacity: swipeX < 0 ? 1 : 0,
                }}
              >
                <Icon size={22} color={action.color} />
                <Typography
                  variant="caption"
                  sx={{ color: action.color, fontSize: '0.65rem', mt: 0.5 }}
                >
                  {action.label}
                </Typography>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Main Card Content */}
      <Paper
        elevation={elevation}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleCardClick}
        sx={{
          position: 'relative',
          borderRadius: 3,
          bgcolor: '#fff',
          border: '1px solid',
          borderColor: 'grey.200',
          transform: `translateX(${swipeX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s ease',
          cursor: onClick ? 'pointer' : 'default',
          '&:active': onClick && !disabled ? { transform: `translateX(${swipeX}px) scale(0.98)` } : {},
        }}
      >
        {children}
      </Paper>
    </Box>
  );
}

// ============================================
// Common Action Presets
// ============================================
export const cardActions = {
  delete: (onClick: () => void): SwipeAction => ({
    icon: Trash2,
    color: '#fff',
    bgColor: '#EF4444',
    label: 'Excluir',
    onClick,
  }),
  edit: (onClick: () => void): SwipeAction => ({
    icon: Edit,
    color: '#fff',
    bgColor: '#3B82F6',
    label: 'Editar',
    onClick,
  }),
  confirm: (onClick: () => void): SwipeAction => ({
    icon: Check,
    color: '#fff',
    bgColor: '#10B981',
    label: 'Confirmar',
    onClick,
  }),
  more: (onClick: () => void): SwipeAction => ({
    icon: MoreHorizontal,
    color: '#fff',
    bgColor: '#6B7280',
    label: 'Mais',
    onClick,
  }),
};

// ============================================
// MobileCardContent Component
// ============================================
interface MobileCardContentProps {
  children: ReactNode;
  padding?: number;
}

export function MobileCardContent({ children, padding = 2 }: MobileCardContentProps) {
  return (
    <Box sx={{ p: padding }}>
      {children}
    </Box>
  );
}

// ============================================
// Exports
// ============================================
export default MobileCard;
