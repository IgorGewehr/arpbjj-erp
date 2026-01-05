'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Box, Paper, Typography, useTheme } from '@mui/material';
import { Users, DollarSign, AlertTriangle } from 'lucide-react';

// ============================================
// Types
// ============================================
interface StatItem {
  id: string;
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

interface MobileStatsCarouselProps {
  activeStudents: number;
  totalStudents: number;
  monthlyRevenue: number;
  paidCount: number;
  pendingCount: number;
  overdueCount: number;
}

// ============================================
// MobileStatsCarousel Component
// ============================================
export function MobileStatsCarousel({
  activeStudents,
  totalStudents,
  monthlyRevenue,
  paidCount,
  pendingCount,
  overdueCount,
}: MobileStatsCarouselProps) {
  const theme = useTheme();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Stats data
  const stats: StatItem[] = [
    {
      id: 'students',
      title: 'Alunos Ativos',
      value: activeStudents,
      subtitle: `de ${totalStudents} total`,
      icon: Users,
      color: theme.palette.mode === 'dark' ? '#fff' : '#1a1a1a',
      bgColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#f5f5f5',
    },
    {
      id: 'revenue',
      title: 'Receita do Mes',
      value: `R$ ${monthlyRevenue.toLocaleString('pt-BR')}`,
      subtitle: `${paidCount} pagamentos`,
      icon: DollarSign,
      color: theme.palette.success.main,
      bgColor: theme.palette.mode === 'dark' ? 'rgba(76, 175, 80, 0.15)' : 'rgba(76, 175, 80, 0.1)',
    },
    {
      id: 'pending',
      title: 'Pendencias',
      value: pendingCount + overdueCount,
      subtitle: `${overdueCount} vencidas`,
      icon: AlertTriangle,
      color: overdueCount > 0 ? theme.palette.error.main : theme.palette.warning.main,
      bgColor: overdueCount > 0
        ? (theme.palette.mode === 'dark' ? 'rgba(244, 67, 54, 0.15)' : 'rgba(244, 67, 54, 0.1)')
        : (theme.palette.mode === 'dark' ? 'rgba(255, 152, 0, 0.15)' : 'rgba(255, 152, 0, 0.1)'),
    },
  ];

  // Handle scroll to update active index
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const scrollLeft = container.scrollLeft;
    const cardWidth = container.offsetWidth * 0.85 + 12; // card width + gap
    const newIndex = Math.round(scrollLeft / cardWidth);

    if (newIndex !== activeIndex && newIndex >= 0 && newIndex < stats.length) {
      setActiveIndex(newIndex);
    }
  }, [activeIndex, stats.length]);

  // Scroll to specific index
  const scrollToIndex = useCallback((index: number) => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const cardWidth = container.offsetWidth * 0.85 + 12;
    container.scrollTo({
      left: cardWidth * index,
      behavior: 'smooth',
    });
  }, []);

  return (
    <Box sx={{ mb: 2 }}>
      {/* Carousel Container */}
      <Box
        ref={scrollContainerRef}
        onScroll={handleScroll}
        sx={{
          display: 'flex',
          gap: 1.5,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollBehavior: 'smooth',
          px: 0,
          pb: 1,
          // Hide scrollbar
          '&::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Paper
              key={stat.id}
              elevation={0}
              sx={{
                flex: '0 0 85%',
                minWidth: '85%',
                scrollSnapAlign: 'start',
                p: 2.5,
                borderRadius: 3,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.1s',
                '&:active': {
                  transform: 'scale(0.98)',
                },
              }}
            >
              {/* Icon */}
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  bgcolor: stat.bgColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2,
                }}
              >
                <Icon size={24} color={stat.color} />
              </Box>

              {/* Title */}
              <Typography
                variant="body2"
                color="text.secondary"
                fontWeight={500}
                sx={{ mb: 0.5 }}
              >
                {stat.title}
              </Typography>

              {/* Value */}
              <Typography
                variant="h4"
                fontWeight={700}
                sx={{
                  color: 'text.primary',
                  fontSize: '2rem',
                  lineHeight: 1.2,
                  mb: 0.5,
                }}
              >
                {stat.value}
              </Typography>

              {/* Subtitle */}
              <Typography
                variant="caption"
                color="text.secondary"
              >
                {stat.subtitle}
              </Typography>
            </Paper>
          );
        })}
      </Box>

      {/* Pagination Dots */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          gap: 0.75,
          mt: 1.5,
        }}
      >
        {stats.map((stat, index) => (
          <Box
            key={stat.id}
            onClick={() => scrollToIndex(index)}
            sx={{
              width: index === activeIndex ? 20 : 8,
              height: 8,
              borderRadius: 4,
              bgcolor: index === activeIndex ? 'primary.main' : 'action.disabled',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          />
        ))}
      </Box>
    </Box>
  );
}

export default MobileStatsCarousel;
