'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  InputAdornment,
  Button,
  IconButton,
  CircularProgress,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  Search,
  X,
  UserCheck,
  Clock,
  Check,
  SortAsc,
  SortDesc,
  UserPlus,
} from 'lucide-react';
import { Checkin, Class, Student } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type SortOption = 'name-asc' | 'name-desc' | 'time';

interface CheckinConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  selectedClass: Class | null;
  checkins: Checkin[];
  allStudents: Student[];
  onRemoveCheckin: (checkinId: string) => Promise<void>;
  onAddManualCheckin: (student: Student) => Promise<void>;
  onConfirmCheckins: (checkinIds: string[]) => Promise<void>;
  isConfirming: boolean;
  isRemoving: boolean;
  isAdding: boolean;
}

export function CheckinConfirmDialog({
  open,
  onClose,
  selectedClass,
  checkins,
  allStudents,
  onRemoveCheckin,
  onAddManualCheckin,
  onConfirmCheckins,
  isConfirming,
  isRemoving,
  isAdding,
}: CheckinConfirmDialogProps) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('time');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [addingStudentId, setAddingStudentId] = useState<string | null>(null);
  const [showAddStudent, setShowAddStudent] = useState(false);

  // Filter and sort checkins
  const filteredCheckins = useMemo(() => {
    let result = [...checkins];

    // Apply search filter
    if (search.trim()) {
      const term = search.toLowerCase().trim();
      result = result.filter(c => c.studentName.toLowerCase().includes(term));
    }

    // Apply sort
    switch (sortBy) {
      case 'name-asc':
        result.sort((a, b) => a.studentName.localeCompare(b.studentName));
        break;
      case 'name-desc':
        result.sort((a, b) => b.studentName.localeCompare(a.studentName));
        break;
      case 'time':
      default:
        result.sort((a, b) => a.checkinTime.getTime() - b.checkinTime.getTime());
        break;
    }

    return result;
  }, [checkins, search, sortBy]);

  // Get students who haven't checked in yet (for manual add)
  const studentsWithoutCheckin = useMemo(() => {
    if (!selectedClass) return [];

    const checkinStudentIds = new Set(checkins.map(c => c.studentId));

    // Get enrolled students who haven't checked in
    const eligible = allStudents.filter(s =>
      selectedClass.studentIds?.includes(s.id) &&
      !checkinStudentIds.has(s.id) &&
      s.status === 'active'
    );

    // Apply search if in add mode
    if (showAddStudent && search.trim()) {
      const term = search.toLowerCase().trim();
      return eligible.filter(s =>
        s.fullName.toLowerCase().includes(term) ||
        s.nickname?.toLowerCase().includes(term)
      );
    }

    return eligible.sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [allStudents, selectedClass, checkins, showAddStudent, search]);

  const handleRemoveCheckin = async (checkinId: string) => {
    setRemovingId(checkinId);
    try {
      await onRemoveCheckin(checkinId);
    } finally {
      setRemovingId(null);
    }
  };

  const handleAddManualCheckin = async (student: Student) => {
    setAddingStudentId(student.id);
    try {
      await onAddManualCheckin(student);
    } finally {
      setAddingStudentId(null);
    }
  };

  const handleConfirm = async () => {
    const checkinIds = filteredCheckins.map(c => c.id);
    await onConfirmCheckins(checkinIds);
    handleClose();
  };

  const handleClose = () => {
    setSearch('');
    setShowAddStudent(false);
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
          maxHeight: '85vh',
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
              bgcolor: '#DCFCE7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <UserCheck size={20} style={{ color: '#16a34a' }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={600}>
              Check-ins - {selectedClass.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {checkins.length} aluno{checkins.length !== 1 ? 's' : ''} fez{checkins.length !== 1 ? 'eram' : ''} check-in
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <X size={20} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 2 }}>
        {/* Search and Sort Controls */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <TextField
            placeholder={showAddStudent ? 'Buscar aluno para adicionar...' : 'Buscar aluno...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{ flex: 1, minWidth: 180 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={16} />
                  </InputAdornment>
                ),
                endAdornment: search && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearch('')}>
                      <X size={14} />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          {!showAddStudent && (
            <ToggleButtonGroup
              value={sortBy}
              exclusive
              onChange={(_, value) => value && setSortBy(value)}
              size="small"
            >
              <ToggleButton value="name-asc" title="Nome A-Z">
                <SortAsc size={16} />
                <Typography variant="caption" sx={{ ml: 0.5 }}>A-Z</Typography>
              </ToggleButton>
              <ToggleButton value="name-desc" title="Nome Z-A">
                <SortDesc size={16} />
                <Typography variant="caption" sx={{ ml: 0.5 }}>Z-A</Typography>
              </ToggleButton>
              <ToggleButton value="time" title="Horario">
                <Clock size={16} />
              </ToggleButton>
            </ToggleButtonGroup>
          )}
        </Box>

        {/* Toggle Add Mode */}
        {!showAddStudent ? (
          <>
            {/* Check-in List */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
              {filteredCheckins.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    {search ? 'Nenhum check-in encontrado' : 'Nenhum check-in pendente'}
                  </Typography>
                </Box>
              ) : (
                filteredCheckins.map((checkin) => {
                  const isRemovingThis = removingId === checkin.id;

                  return (
                    <Box
                      key={checkin.id}
                      sx={{
                        p: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        borderRadius: 2,
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                        opacity: isRemoving && !isRemovingThis ? 0.5 : 1,
                      }}
                    >
                      {/* Check icon */}
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          bgcolor: '#DCFCE7',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Check size={16} style={{ color: '#16a34a' }} />
                      </Box>

                      {/* Info */}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {checkin.studentName}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Clock size={12} color="#666" />
                          <Typography variant="caption" color="text.secondary">
                            {format(checkin.checkinTime, 'HH:mm', { locale: ptBR })}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Remove button */}
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveCheckin(checkin.id)}
                        disabled={isRemoving}
                        sx={{
                          color: 'error.main',
                          '&:hover': { bgcolor: 'error.50' },
                        }}
                      >
                        {isRemovingThis ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : (
                          <X size={16} />
                        )}
                      </IconButton>
                    </Box>
                  );
                })
              )}
            </Box>

            {/* Add Student Button */}
            {studentsWithoutCheckin.length > 0 && (
              <Button
                startIcon={<UserPlus size={16} />}
                onClick={() => setShowAddStudent(true)}
                sx={{
                  textTransform: 'none',
                  color: 'text.secondary',
                  '&:hover': { bgcolor: 'grey.100' },
                }}
              >
                Adicionar aluno
              </Button>
            )}
          </>
        ) : (
          <>
            {/* Add Student Mode */}
            <Box sx={{ mb: 2 }}>
              <Button
                size="small"
                onClick={() => {
                  setShowAddStudent(false);
                  setSearch('');
                }}
                sx={{ mb: 1, textTransform: 'none' }}
              >
                Voltar para lista de check-ins
              </Button>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Selecione um aluno para adicionar manualmente ao check-in
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {studentsWithoutCheckin.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      {search ? 'Nenhum aluno encontrado' : 'Todos os alunos ja fizeram check-in'}
                    </Typography>
                  </Box>
                ) : (
                  studentsWithoutCheckin.map((student) => {
                    const isAddingThis = addingStudentId === student.id;

                    return (
                      <Box
                        key={student.id}
                        onClick={() => !isAdding && handleAddManualCheckin(student)}
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
                              }
                            : {},
                        }}
                      >
                        {/* Info */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="body2"
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

                        {/* Add indicator */}
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
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
                            <CircularProgress size={16} color="inherit" />
                          ) : (
                            <UserPlus size={16} />
                          )}
                        </Box>
                      </Box>
                    );
                  })
                )}
              </Box>
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button onClick={handleClose} color="inherit">
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={isConfirming || filteredCheckins.length === 0}
          startIcon={isConfirming ? <CircularProgress size={16} color="inherit" /> : <Check size={16} />}
          sx={{
            bgcolor: '#16A34A',
            '&:hover': { bgcolor: '#15803D' },
            textTransform: 'none',
          }}
        >
          {isConfirming ? 'Confirmando...' : `Confirmar Lista (${filteredCheckins.length})`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default CheckinConfirmDialog;
