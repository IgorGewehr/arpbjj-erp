'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Card,
  CardActionArea,
  Box,
  Typography,
  Avatar,
  Chip,
  IconButton,
  Menu,
  MenuItem as MuiMenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import { Phone, AlertCircle, ChevronRight, Target, MoreVertical, Zap } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Student, StudentStatus, getStudentPrimarySport, getStudentGrade } from '@/types';
import { SportId } from '@/lib/constants/sports';
import { getBeltChipColor } from '@/lib/theme';
import { GradeDisplay } from '@/components/shared/GradeDisplay';

// ============================================
// Props Interface
// ============================================
interface StudentCardProps {
  student: Student;
  displaySport?: SportId;
  onClick?: (student: Student) => void;
  onWhatsApp?: (student: Student) => void;
  onStatusChange?: (student: Student, newStatus: StudentStatus) => void;
  compact?: boolean;
  /**
   * Optional eligibility snapshot. When provided, the card renders a small
   * progress bar (current/required) and a "Elegível" badge once the student
   * has reached the threshold. Pass undefined to hide the graduation block.
   */
  eligibility?: {
    eligible: boolean;
    currentClasses: number;
    requiredClasses: number;
    missingClasses: number;
    weighted: boolean;
  };
}

// ============================================
// Eligibility block — progress bar + "Elegível" badge
// ============================================
function EligibilityBlock({
  eligibility,
  compact = false,
}: {
  eligibility: NonNullable<StudentCardProps['eligibility']>;
  compact?: boolean;
}) {
  const { eligible, currentClasses, requiredClasses, missingClasses, weighted } = eligibility;
  if (requiredClasses <= 0) return null;
  const progress = Math.min(100, (currentClasses / requiredClasses) * 100);
  const unit = weighted ? 'pts' : 'aulas';

  const tooltip = eligible
    ? `Pronto para graduar (${currentClasses}/${requiredClasses} ${unit})`
    : `Faltam ${missingClasses} ${unit} para a próxima graduação`;

  return (
    <Tooltip title={tooltip} placement="top" arrow>
      <Box
        sx={{
          mt: compact ? 0.5 : 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          minWidth: 0,
        }}
      >
        <AnimatePresence initial={false}>
          {eligible && (
            <motion.div
              key="eligible-badge"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2, ease: [0.0, 0.0, 0.2, 1] }}
              style={{ display: 'inline-flex' }}
            >
              <Chip
                icon={<Zap size={compact ? 10 : 12} />}
                label="Elegível"
                size="small"
                sx={{
                  fontSize: compact ? '0.6rem' : '0.65rem',
                  fontWeight: 700,
                  height: compact ? 18 : 22,
                  bgcolor: '#FEF3C7',
                  color: '#92400E',
                  '& .MuiChip-icon': { color: '#D97706', ml: 0.5 },
                  '& .MuiChip-label': { px: compact ? 0.5 : 0.75 },
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
        <Box sx={{ flex: 1, minWidth: 60 }}>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 4,
              borderRadius: 999,
              backgroundColor: '#F3F4F6',
              '& .MuiLinearProgress-bar': {
                backgroundColor: eligible ? '#D97706' : '#3B82F6',
                borderRadius: 999,
              },
            }}
          />
        </Box>
        <Typography
          variant="caption"
          sx={{
            fontSize: compact ? '0.6rem' : '0.65rem',
            color: 'text.secondary',
            fontVariantNumeric: 'tabular-nums',
            flexShrink: 0,
          }}
        >
          {currentClasses}/{requiredClasses}
        </Typography>
      </Box>
    </Tooltip>
  );
}

// ============================================
// Attendance Count Display (Target icon)
// ============================================
function AttendanceCountBadge({ count, size = 'normal' }: { count: number; size?: 'small' | 'normal' }) {
  const isSmall = size === 'small';
  return (
    <Chip
      icon={<Target size={isSmall ? 10 : 12} />}
      label={count}
      size="small"
      sx={{
        fontSize: isSmall ? '0.6rem' : '0.65rem',
        fontWeight: 700,
        height: isSmall ? 18 : 22,
        bgcolor: '#DCFCE7',
        color: '#15803D',
        '& .MuiChip-icon': { color: '#22C55E', ml: 0.5 },
        '& .MuiChip-label': { px: isSmall ? 0.5 : 0.75 },
      }}
    />
  );
}

// ============================================
// Belt Labels
// ============================================
const beltLabels: Record<string, string> = {
  white: 'Branca',
  blue: 'Azul',
  purple: 'Roxa',
  brown: 'Marrom',
  black: 'Preta',
  grey: 'Cinza',
  'grey-white': 'Cinza/Branca',
  'grey-black': 'Cinza/Preta',
  yellow: 'Amarela',
  'yellow-white': 'Amarela/Branca',
  'yellow-black': 'Amarela/Preta',
  orange: 'Laranja',
  'orange-white': 'Laranja/Branca',
  'orange-black': 'Laranja/Preta',
  green: 'Verde',
  'green-white': 'Verde/Branca',
  'green-black': 'Verde/Preta',
};

// ============================================
// Status Config
// ============================================
const statusConfig: Record<Student['status'], { label: string; color: 'success' | 'warning' | 'error' | 'default' }> = {
  active: { label: 'Ativo', color: 'success' },
  injured: { label: 'Lesionado', color: 'warning' },
  inactive: { label: 'Inativo', color: 'default' },
  suspended: { label: 'Suspenso', color: 'error' },
};

// ============================================
// StudentCard Component
// ============================================
export function StudentCard({
  student,
  displaySport,
  onClick,
  onWhatsApp,
  onStatusChange,
  compact = false,
  eligibility,
}: StudentCardProps) {
  // Calculate total attendance count
  const totalAttendance = (student.attendanceCount || 0) + (student.initialAttendanceCount || 0);
  const beltColor = getBeltChipColor(student.currentBelt);

  // Compute effective sport for grade display
  const effectiveSport: SportId = displaySport || getStudentPrimarySport(student);
  const gradeInfo = getStudentGrade(student, effectiveSport);

  // Optimistic status — updates immediately on click, syncs back when prop changes
  const [optimisticStatus, setOptimisticStatus] = useState<StudentStatus | null>(null);
  const displayStatus = optimisticStatus ?? student.status;
  const status = statusConfig[displayStatus];

  useEffect(() => {
    setOptimisticStatus(null);
  }, [student.status]);

  // Navigating state — shows overlay spinner immediately on click
  const [isNavigating, setIsNavigating] = useState(false);

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(menuAnchor);

  const handleClick = useCallback(() => {
    if (!onClick) return;
    setIsNavigating(true);
    onClick(student);
  }, [onClick, student]);

  const handleWhatsApp = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onWhatsApp) {
      onWhatsApp(student);
    } else if (student.phone) {
      const phone = student.phone.replace(/\D/g, '');
      window.open(`https://wa.me/55${phone}`, '_blank');
    }
  }, [onWhatsApp, student]);

  const handleMenuOpen = useCallback((e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setMenuAnchor(null);
  }, []);

  const handleStatusSelect = useCallback((newStatus: StudentStatus) => {
    setOptimisticStatus(newStatus);
    onStatusChange?.(student, newStatus);
    setMenuAnchor(null);
  }, [onStatusChange, student]);

  const statusMenuItems = (Object.entries(statusConfig) as [StudentStatus, { label: string; color: 'success' | 'warning' | 'error' | 'default' }][])
    .filter(([key]) => key !== displayStatus);

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (compact) {
    return (
      <Card
        sx={{
          borderRadius: 2,
          opacity: displayStatus === 'inactive' ? 0.6 : isNavigating ? 0.7 : 1,
          position: 'relative',
          transition: 'opacity 0.15s ease',
          pointerEvents: isNavigating ? 'none' : 'auto',
        }}
      >
        {/* Navigation overlay — shows immediately on click */}
        {isNavigating && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              pr: 2,
              zIndex: 2,
              bgcolor: 'rgba(255,255,255,0.3)',
              borderRadius: 2,
            }}
          >
            <CircularProgress size={20} thickness={4} />
          </Box>
        )}
        <CardActionArea onClick={handleClick} sx={{ p: 2, pr: 12 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Avatar */}
            <Avatar
              src={student.photoUrl}
              sx={{
                width: 48,
                height: 48,
                bgcolor: beltColor.bg,
                color: beltColor.text,
                fontSize: '1rem',
                fontWeight: 600,
              }}
            >
              {getInitials(student.fullName)}
            </Avatar>

            {/* Main Info */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography
                  variant="body1"
                  fontWeight={600}
                  sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {student.nickname || student.fullName.split(' ')[0]}
                </Typography>
                {displayStatus === 'injured' && (
                  <AlertCircle size={14} style={{ color: '#f59e0b' }} />
                )}
              </Box>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mb: 1 }}
              >
                {student.fullName}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                {gradeInfo && (
                  <GradeDisplay
                    sportId={effectiveSport}
                    grade={gradeInfo.currentGrade}
                    stripes={gradeInfo.currentStripes}
                    size="small"
                  />
                )}
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={displayStatus}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.15, ease: [0.0, 0.0, 0.2, 1] }}
                    style={{ display: 'inline-flex' }}
                  >
                    <Chip
                      label={status.label}
                      size="small"
                      color={status.color}
                      variant="outlined"
                      sx={{ fontSize: '0.6rem', height: 18 }}
                    />
                  </motion.div>
                </AnimatePresence>
                <Chip
                  label={student.category === 'kids' ? 'Kids' : 'Adulto'}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.6rem', height: 18 }}
                />
                {/* Attendance Count - next to tags */}
                <AttendanceCountBadge count={totalAttendance} size="small" />
              </Box>
              {eligibility && <EligibilityBlock eligibility={eligibility} compact />}
            </Box>

            {/* Phone Info - Desktop only */}
            <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1, minWidth: 140 }}>
              <Phone size={14} style={{ color: '#9ca3af' }} />
              <Typography variant="body2" color="text.secondary">
                {student.phone}
              </Typography>
            </Box>
          </Box>
        </CardActionArea>

        {/* Actions - Desktop only (phone button, kebab menu and arrow) */}
        <Box
          sx={{
            position: 'absolute',
            right: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            gap: 1,
            zIndex: 1,
          }}
        >
          <IconButton
            size="small"
            onClick={handleWhatsApp}
            sx={{
              bgcolor: 'action.hover',
              '&:hover': { bgcolor: 'success.light' },
            }}
          >
            <Phone size={18} />
          </IconButton>
          {onStatusChange && (
            <IconButton
              size="small"
              onClick={handleMenuOpen}
              sx={{
                bgcolor: 'action.hover',
                '&:hover': { bgcolor: 'action.selected' },
              }}
            >
              <MoreVertical size={18} />
            </IconButton>
          )}
          <ChevronRight size={18} style={{ color: '#9ca3af' }} />
        </Box>

        {/* Status Menu */}
        <Menu
          anchorEl={menuAnchor}
          open={menuOpen}
          onClose={handleMenuClose}
          onClick={(e) => e.stopPropagation()}
        >
          {statusMenuItems.map(([key, cfg]) => (
            <MuiMenuItem key={key} onClick={() => handleStatusSelect(key)}>
              <ListItemIcon>
                <Chip
                  size="small"
                  color={cfg.color}
                  sx={{ width: 12, height: 12, minWidth: 12, '& .MuiChip-label': { display: 'none' } }}
                />
              </ListItemIcon>
              <ListItemText>{cfg.label}</ListItemText>
            </MuiMenuItem>
          ))}
        </Menu>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        borderRadius: 3,
        opacity: displayStatus === 'inactive' ? 0.6 : isNavigating ? 0.7 : 1,
        position: 'relative',
        height: { xs: 145, sm: 165 },
        display: 'flex',
        flexDirection: 'column',
        transition: 'opacity 0.15s ease',
        pointerEvents: isNavigating ? 'none' : 'auto',
      }}
    >
      {/* Navigation overlay — shows immediately on click */}
      {isNavigating && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2,
            bgcolor: 'rgba(255,255,255,0.45)',
            borderRadius: 3,
          }}
        >
          <CircularProgress size={28} thickness={4} />
        </Box>
      )}
      <CardActionArea onClick={handleClick} sx={{ p: { xs: 1.5, sm: 2.5 }, pr: { xs: 5, sm: 6 }, height: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: { xs: 1.5, sm: 2 }, height: '100%' }}>
          {/* Avatar */}
          <Avatar
            src={student.photoUrl}
            sx={{
              width: { xs: 48, sm: 64 },
              height: { xs: 48, sm: 64 },
              bgcolor: beltColor.bg,
              color: beltColor.text,
              fontSize: { xs: '1rem', sm: '1.25rem' },
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {getInitials(student.fullName)}
          </Avatar>

          {/* Info */}
          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: { xs: 0.5, sm: 0.75 } }}>
            {/* Apelido */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography
                fontWeight={600}
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: { xs: '0.95rem', sm: '1.1rem' },
                  lineHeight: 1.2,
                }}
              >
                {student.nickname || student.fullName.split(' ')[0]}
              </Typography>
              {displayStatus === 'injured' && (
                <AlertCircle size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />
              )}
            </Box>

            {/* Nome completo */}
            <Typography
              color="text.secondary"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: { xs: '0.75rem', sm: '0.85rem' },
                lineHeight: 1.2,
              }}
            >
              {student.fullName}
            </Typography>

            {/* Faixa / Graduação */}
            {gradeInfo && (
              <Box sx={{ mt: { xs: 0.25, sm: 0.5 } }}>
                <GradeDisplay
                  sportId={effectiveSport}
                  grade={gradeInfo.currentGrade}
                  stripes={gradeInfo.currentStripes}
                  size="small"
                />
              </Box>
            )}

            {/* Tags + Attendance Count */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={displayStatus}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.15, ease: [0.0, 0.0, 0.2, 1] }}
                  style={{ display: 'inline-flex' }}
                >
                  <Chip
                    label={status.label}
                    size="small"
                    color={status.color}
                    variant="outlined"
                    sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' }, height: { xs: 18, sm: 22 } }}
                  />
                </motion.div>
              </AnimatePresence>
              <Chip
                label={student.category === 'kids' ? 'Kids' : 'Adulto'}
                size="small"
                variant="outlined"
                sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' }, height: { xs: 18, sm: 22 } }}
              />
              <AttendanceCountBadge count={totalAttendance} />
            </Box>
            {eligibility && <EligibilityBlock eligibility={eligibility} />}
          </Box>
        </Box>
      </CardActionArea>

      {/* Actions - positioned outside CardActionArea to avoid nested buttons */}
      {onStatusChange && (
        <Box
          sx={{
            position: 'absolute',
            right: { xs: 8, sm: 12 },
            top: { xs: 8, sm: 12 },
            zIndex: 1,
          }}
        >
          <IconButton
            size="small"
            onClick={handleMenuOpen}
            sx={{
              bgcolor: 'action.hover',
              '&:hover': { bgcolor: 'action.selected' },
              width: { xs: 32, sm: 36 },
              height: { xs: 32, sm: 36 },
            }}
          >
            <MoreVertical size={16} />
          </IconButton>
        </Box>
      )}

      {/* Status Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={menuOpen}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()}
      >
        {statusMenuItems.map(([key, cfg]) => (
          <MuiMenuItem key={key} onClick={() => handleStatusSelect(key)}>
            <ListItemIcon>
              <Chip
                size="small"
                color={cfg.color}
                sx={{ width: 12, height: 12, minWidth: 12, '& .MuiChip-label': { display: 'none' } }}
              />
            </ListItemIcon>
            <ListItemText>{cfg.label}</ListItemText>
          </MuiMenuItem>
        ))}
      </Menu>
    </Card>
  );
}

export default StudentCard;
