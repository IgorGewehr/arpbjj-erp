'use client';

import { useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Skeleton,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import { CheckCircle, Calendar, TrendingUp, Clock } from 'lucide-react';
import { usePermissions } from '@/components/providers';
import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '@/services/attendanceService';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ============================================
// Main Component
// ============================================
export default function PortalPresencaPage() {
  const { linkedStudentIds } = usePermissions();
  const studentId = linkedStudentIds[0];

  // Fetch attendance records
  const { data: attendanceRecords = [], isLoading } = useQuery({
    queryKey: ['studentAttendance', studentId],
    queryFn: () => attendanceService.getByStudent(studentId, 100),
    enabled: !!studentId,
  });

  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = attendanceRecords.filter((a) => {
      const date = new Date(a.date);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });

    const lastMonth = attendanceRecords.filter((a) => {
      const date = new Date(a.date);
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return date.getMonth() === lastMonthDate.getMonth() && date.getFullYear() === lastMonthDate.getFullYear();
    });

    return {
      total: attendanceRecords.length,
      thisMonth: thisMonth.length,
      lastMonth: lastMonth.length,
      trend: thisMonth.length - lastMonth.length,
    };
  }, [attendanceRecords]);

  // Calendar data for current month
  const calendarDays = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    const days = eachDayOfInterval({ start, end });

    return days.map((day) => ({
      date: day,
      hasAttendance: attendanceRecords.some((a) => isSameDay(new Date(a.date), day)),
    }));
  }, [attendanceRecords]);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          Minhas Presencas
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Acompanhe seu historico de presencas
        </Typography>
      </Box>

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'primary.50' }}>
                  <CheckCircle size={24} color="#2563EB" />
                </Box>
                <Box>
                  {isLoading ? (
                    <Skeleton variant="text" width={60} height={32} />
                  ) : (
                    <Typography variant="h4" fontWeight={700}>
                      {stats.total}
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary">
                    Total de Presencas
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'success.50' }}>
                  <Calendar size={24} color="#16A34A" />
                </Box>
                <Box>
                  {isLoading ? (
                    <Skeleton variant="text" width={60} height={32} />
                  ) : (
                    <Typography variant="h4" fontWeight={700}>
                      {stats.thisMonth}
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary">
                    Este Mes
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: stats.trend >= 0 ? 'success.50' : 'error.50' }}>
                  <TrendingUp size={24} color={stats.trend >= 0 ? '#16A34A' : '#DC2626'} />
                </Box>
                <Box>
                  {isLoading ? (
                    <Skeleton variant="text" width={60} height={32} />
                  ) : (
                    <Typography variant="h4" fontWeight={700} color={stats.trend >= 0 ? 'success.main' : 'error.main'}>
                      {stats.trend >= 0 ? '+' : ''}{stats.trend}
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary">
                    vs Mes Anterior
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Calendar View */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          {format(new Date(), 'MMMM yyyy', { locale: ptBR })}
        </Typography>
        <Grid container spacing={1}>
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map((day) => (
            <Grid key={day} size={{ xs: 12 / 7 }}>
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block' }}>
                {day}
              </Typography>
            </Grid>
          ))}
          {/* Empty cells for days before month starts */}
          {Array.from({ length: calendarDays[0]?.date.getDay() || 0 }).map((_, i) => (
            <Grid key={`empty-${i}`} size={{ xs: 12 / 7 }} />
          ))}
          {calendarDays.map(({ date, hasAttendance }) => (
            <Grid key={date.toISOString()} size={{ xs: 12 / 7 }}>
              <Box
                sx={{
                  p: 1,
                  textAlign: 'center',
                  borderRadius: 1,
                  bgcolor: hasAttendance ? 'success.main' : 'transparent',
                  color: hasAttendance ? 'white' : 'text.primary',
                  border: isSameDay(date, new Date()) ? '2px solid' : 'none',
                  borderColor: 'primary.main',
                }}
              >
                <Typography variant="body2" fontWeight={hasAttendance ? 600 : 400}>
                  {format(date, 'd')}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Recent Attendance Table */}
      <Paper sx={{ borderRadius: 2 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" fontWeight={600}>
            Historico Recente
          </Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Data</TableCell>
                <TableCell>Turma</TableCell>
                <TableCell>Horario</TableCell>
                <TableCell align="right">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton variant="text" /></TableCell>
                    <TableCell><Skeleton variant="text" /></TableCell>
                    <TableCell><Skeleton variant="text" /></TableCell>
                    <TableCell align="right"><Skeleton variant="text" width={80} /></TableCell>
                  </TableRow>
                ))
              ) : attendanceRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      Nenhuma presenca registrada ainda
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                attendanceRecords.slice(0, 20).map((record) => (
                  <TableRow key={record.id} hover>
                    <TableCell>
                      {format(new Date(record.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>{record.className || 'Treino'}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Clock size={14} />
                        {format(new Date(record.date), 'HH:mm')}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        icon={<CheckCircle size={14} />}
                        label="Presente"
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
