'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Button,
  useTheme,
} from '@mui/material';
import { Search, X, CheckCircle, Circle, Filter, CheckCheck, XCircle } from 'lucide-react';
import { Student, BeltColor, KidsBeltColor } from '@/types';

// ============================================
// Belt Colors
// ============================================
const BELT_COLORS: Record<BeltColor | KidsBeltColor, string> = {
  white: '#f5f5f5',
  blue: '#1E40AF',
  purple: '#7C3AED',
  brown: '#78350F',
  black: '#171717',
  grey: '#6B7280',
  yellow: '#EAB308',
  orange: '#EA580C',
  green: '#16A34A',
};

// ============================================
// Types
// ============================================
interface MobileAttendanceListProps {
  students: Student[];
  isStudentPresent: (studentId: string) => boolean;
  onToggle: (student: Student) => void;
  onMarkAll?: () => void;
  onUnmarkAll?: () => void;
  isLoading?: boolean;
}

type FilterMode = 'all' | 'present' | 'absent';

// ============================================
// Mobile Attendance Row
// ============================================
interface AttendanceRowProps {
  student: Student;
  isPresent: boolean;
  onToggle: () => void;
}

function AttendanceRow({ student, isPresent, onToggle }: AttendanceRowProps) {
  const theme = useTheme();
  const beltColor = BELT_COLORS[student.currentBelt as BeltColor | KidsBeltColor] || '#6B7280';
  const displayName = student.nickname || student.fullName.split(' ')[0];

  return (
    <Paper
      elevation={0}
      onClick={onToggle}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: 1.5,
        borderRadius: 2.5,
        cursor: 'pointer',
        bgcolor: isPresent ? 'success.50' : 'background.paper',
        border: '2px solid',
        borderColor: isPresent ? 'success.main' : 'divider',
        transition: 'all 0.15s ease',
        '&:active': {
          transform: 'scale(0.98)',
          bgcolor: isPresent ? 'success.100' : 'action.hover',
        },
      }}
    >
      {/* Status Toggle */}
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: isPresent ? 'success.main' : 'grey.200',
          color: isPresent ? 'white' : 'grey.400',
          flexShrink: 0,
          transition: 'all 0.15s ease',
        }}
      >
        {isPresent ? (
          <CheckCircle size={26} strokeWidth={2.5} />
        ) : (
          <Circle size={26} strokeWidth={2} />
        )}
      </Box>

      {/* Avatar */}
      <Avatar
        src={student.photoUrl}
        sx={{
          width: 44,
          height: 44,
          bgcolor: 'grey.300',
          fontSize: '1rem',
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {student.fullName[0]}
      </Avatar>

      {/* Info */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body1"
          fontWeight={600}
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: isPresent ? 'success.dark' : 'text.primary',
          }}
        >
          {displayName}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'block',
          }}
        >
          {student.fullName}
        </Typography>
      </Box>

      {/* Belt Indicator */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
        <Box
          sx={{
            width: 6,
            height: 28,
            borderRadius: 1,
            bgcolor: beltColor,
            border: student.currentBelt === 'white' ? '1px solid #e5e5e5' : 'none',
          }}
        />
        {student.currentStripes > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
            {Array.from({ length: Math.min(student.currentStripes, 4) }).map((_, i) => (
              <Box
                key={i}
                sx={{
                  width: 8,
                  height: 3,
                  bgcolor: 'grey.400',
                  borderRadius: 0.5,
                }}
              />
            ))}
          </Box>
        )}
      </Box>
    </Paper>
  );
}

// ============================================
// MobileAttendanceList Component
// ============================================
export function MobileAttendanceList({
  students,
  isStudentPresent,
  onToggle,
  onMarkAll,
  onUnmarkAll,
  isLoading,
}: MobileAttendanceListProps) {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  // Filter students
  const filteredStudents = useMemo(() => {
    let result = students;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (student) =>
          student.fullName.toLowerCase().includes(query) ||
          student.nickname?.toLowerCase().includes(query)
      );
    }

    // Apply presence filter
    if (filterMode === 'present') {
      result = result.filter((s) => isStudentPresent(s.id));
    } else if (filterMode === 'absent') {
      result = result.filter((s) => !isStudentPresent(s.id));
    }

    return result;
  }, [students, searchQuery, filterMode, isStudentPresent]);

  // Stats
  const presentCount = students.filter((s) => isStudentPresent(s.id)).length;
  const absentCount = students.length - presentCount;

  const handleFilterChange = (mode: FilterMode) => {
    setFilterMode(filterMode === mode ? 'all' : mode);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Paper
            key={i}
            sx={{
              height: 72,
              borderRadius: 2.5,
              bgcolor: 'action.hover',
            }}
          />
        ))}
      </Box>
    );
  }

  return (
    <Box>
      {/* Search and Filter Bar */}
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          placeholder="Buscar aluno..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          sx={{
            mb: 1.5,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2.5,
              bgcolor: 'background.paper',
            },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} color={theme.palette.text.secondary} />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchQuery('')}>
                    <X size={16} />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />

        {/* Quick Filter Chips */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label={`Todos (${students.length})`}
            size="small"
            onClick={() => setFilterMode('all')}
            sx={{
              bgcolor: filterMode === 'all' ? 'primary.main' : 'action.hover',
              color: filterMode === 'all' ? 'white' : 'text.primary',
              fontWeight: 500,
              '&:hover': {
                bgcolor: filterMode === 'all' ? 'primary.dark' : 'action.selected',
              },
            }}
          />
          <Chip
            icon={<CheckCircle size={14} />}
            label={`Presentes (${presentCount})`}
            size="small"
            onClick={() => handleFilterChange('present')}
            sx={{
              bgcolor: filterMode === 'present' ? 'success.main' : 'action.hover',
              color: filterMode === 'present' ? 'white' : 'text.primary',
              fontWeight: 500,
              '& .MuiChip-icon': {
                color: filterMode === 'present' ? 'white' : 'success.main',
              },
              '&:hover': {
                bgcolor: filterMode === 'present' ? 'success.dark' : 'action.selected',
              },
            }}
          />
          <Chip
            icon={<Circle size={14} />}
            label={`Ausentes (${absentCount})`}
            size="small"
            onClick={() => handleFilterChange('absent')}
            sx={{
              bgcolor: filterMode === 'absent' ? 'grey.700' : 'action.hover',
              color: filterMode === 'absent' ? 'white' : 'text.primary',
              fontWeight: 500,
              '& .MuiChip-icon': {
                color: filterMode === 'absent' ? 'white' : 'grey.500',
              },
              '&:hover': {
                bgcolor: filterMode === 'absent' ? 'grey.800' : 'action.selected',
              },
            }}
          />
        </Box>

        {/* Mark All / Unmark All Buttons */}
        {(onMarkAll || onUnmarkAll) && (
          <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
            {onMarkAll && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<CheckCheck size={16} />}
                onClick={onMarkAll}
                sx={{
                  flex: 1,
                  borderRadius: 2,
                  borderColor: 'success.main',
                  color: 'success.main',
                  fontSize: '0.75rem',
                  py: 0.75,
                  '&:hover': {
                    borderColor: 'success.dark',
                    bgcolor: 'success.50',
                  },
                }}
              >
                Marcar Todos
              </Button>
            )}
            {onUnmarkAll && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<XCircle size={16} />}
                onClick={onUnmarkAll}
                sx={{
                  flex: 1,
                  borderRadius: 2,
                  borderColor: 'grey.400',
                  color: 'grey.600',
                  fontSize: '0.75rem',
                  py: 0.75,
                  '&:hover': {
                    borderColor: 'grey.600',
                    bgcolor: 'grey.100',
                  },
                }}
              >
                Desmarcar Todos
              </Button>
            )}
          </Box>
        )}
      </Box>

      {/* Students List */}
      {filteredStudents.length === 0 ? (
        <Paper
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 3,
          }}
        >
          <Typography color="text.secondary">
            {searchQuery ? 'Nenhum aluno encontrado' : 'Nenhum aluno nesta turma'}
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {filteredStudents.map((student) => (
            <AttendanceRow
              key={student.id}
              student={student}
              isPresent={isStudentPresent(student.id)}
              onToggle={() => onToggle(student)}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}

export default MobileAttendanceList;
