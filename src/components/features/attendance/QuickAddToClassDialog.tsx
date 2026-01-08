'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  TextField,
  InputAdornment,
  Avatar,
  IconButton,
  CircularProgress,
  Chip,
} from '@mui/material';
import { Search, X, UserPlus, Check } from 'lucide-react';
import { Student, Class, BeltColor, KidsBeltColor } from '@/types';

// Belt colors for display
const BELT_COLORS: Record<BeltColor | KidsBeltColor, string> = {
  white: '#f5f5f5',
  blue: '#1E40AF',
  purple: '#7C3AED',
  brown: '#78350F',
  black: '#171717',
  grey: '#6B7280',
  'grey-white': '#6B7280',
  'grey-black': '#6B7280',
  yellow: '#EAB308',
  'yellow-white': '#EAB308',
  'yellow-black': '#EAB308',
  orange: '#EA580C',
  'orange-white': '#EA580C',
  'orange-black': '#EA580C',
  green: '#16A34A',
  'green-white': '#16A34A',
  'green-black': '#16A34A',
};

interface QuickAddToClassDialogProps {
  open: boolean;
  onClose: () => void;
  selectedClass: Class | null;
  allStudents: Student[];
  enrolledStudentIds: string[];
  onAddAndMarkPresent: (student: Student) => Promise<void>;
  isAdding: boolean;
}

export function QuickAddToClassDialog({
  open,
  onClose,
  selectedClass,
  allStudents,
  enrolledStudentIds,
  onAddAndMarkPresent,
  isAdding,
}: QuickAddToClassDialogProps) {
  const [search, setSearch] = useState('');
  const [addingStudentId, setAddingStudentId] = useState<string | null>(null);

  // Filter students not in the class
  const availableStudents = useMemo(() => {
    if (!selectedClass) return [];

    // Get students not enrolled in this class
    let notEnrolled = allStudents.filter(
      (s) => !enrolledStudentIds.includes(s.id) && s.status === 'active'
    );

    // For adult classes, show all students (kids can join adult classes)
    // For kids classes, only show kids students
    if (selectedClass.category === 'kids') {
      notEnrolled = notEnrolled.filter((s) => s.category === 'kids');
    }

    // Apply search filter
    if (search.trim()) {
      const term = search.toLowerCase().trim();
      notEnrolled = notEnrolled.filter(
        (s) =>
          s.fullName.toLowerCase().includes(term) ||
          s.nickname?.toLowerCase().includes(term)
      );
    }

    // Sort alphabetically
    return notEnrolled.sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [allStudents, enrolledStudentIds, selectedClass, search]);

  const handleAddStudent = async (student: Student) => {
    setAddingStudentId(student.id);
    try {
      await onAddAndMarkPresent(student);
      // Don't close dialog - allow adding multiple students
    } finally {
      setAddingStudentId(null);
    }
  };

  const handleClose = () => {
    setSearch('');
    onClose();
  };

  if (!selectedClass) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: '80vh',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: 'success.100',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <UserPlus size={20} style={{ color: '#16a34a' }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={600}>
              Adicionar a {selectedClass.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              O aluno sera adicionado a turma e marcado presente
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <X size={20} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 2 }}>
        {/* Search */}
        <TextField
          fullWidth
          placeholder="Buscar aluno..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          autoFocus
          sx={{ mb: 2 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} />
                </InputAdornment>
              ),
              endAdornment: search && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearch('')}>
                    <X size={16} />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />

        {/* Students List */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {availableStudents.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                {search
                  ? 'Nenhum aluno encontrado'
                  : 'Todos os alunos ja estao na turma'}
              </Typography>
            </Box>
          ) : (
            availableStudents.map((student) => {
              const isAddingThis = addingStudentId === student.id;
              const beltColor =
                BELT_COLORS[student.currentBelt as BeltColor | KidsBeltColor] ||
                '#6B7280';

              return (
                <Box
                  key={student.id}
                  onClick={() => !isAdding && handleAddStudent(student)}
                  sx={{
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    borderRadius: 2,
                    cursor: isAdding ? 'not-allowed' : 'pointer',
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    opacity: isAdding && !isAddingThis ? 0.5 : 1,
                    transition: 'all 0.15s ease',
                    '&:hover': !isAdding
                      ? {
                          bgcolor: 'success.50',
                          borderColor: 'success.main',
                          transform: 'scale(1.01)',
                        }
                      : {},
                    '&:active': !isAdding
                      ? {
                          transform: 'scale(0.99)',
                        }
                      : {},
                  }}
                >
                  {/* Avatar */}
                  <Avatar
                    src={student.photoUrl}
                    sx={{
                      width: 44,
                      height: 44,
                      bgcolor: 'grey.300',
                      fontSize: '1rem',
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
                      }}
                    >
                      {student.nickname || student.fullName.split(' ')[0]}
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

                  {/* Category chip for kids in adult class */}
                  {selectedClass.category === 'adult' &&
                    student.category === 'kids' && (
                      <Chip
                        label="Kids"
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.65rem',
                          bgcolor: 'warning.100',
                          color: 'warning.800',
                        }}
                      />
                    )}

                  {/* Belt */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      flexShrink: 0,
                    }}
                  >
                    <Box
                      sx={{
                        width: 6,
                        height: 24,
                        borderRadius: 1,
                        bgcolor: beltColor,
                        border:
                          student.currentBelt === 'white'
                            ? '1px solid #e5e5e5'
                            : 'none',
                      }}
                    />
                    {student.currentStripes > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        {student.currentStripes}
                      </Typography>
                    )}
                  </Box>

                  {/* Add indicator */}
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: isAddingThis ? 'success.main' : 'grey.100',
                      color: isAddingThis ? 'white' : 'grey.500',
                      flexShrink: 0,
                    }}
                  >
                    {isAddingThis ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      <Check size={18} />
                    )}
                  </Box>
                </Box>
              );
            })
          )}
        </Box>

        {/* Count */}
        {availableStudents.length > 0 && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mt: 2, textAlign: 'center' }}
          >
            {availableStudents.length} aluno
            {availableStudents.length !== 1 ? 's' : ''} disponive
            {availableStudents.length !== 1 ? 'is' : 'l'}
          </Typography>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default QuickAddToClassDialog;
