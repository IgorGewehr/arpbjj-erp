'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Avatar,
  Chip,
  Button,
  IconButton,
  Tabs,
  Tab,
  Divider,
  Skeleton,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Alert,
} from '@mui/material';
import {
  ArrowLeft,
  Phone,
  Mail,
  Calendar,
  MapPin,
  ClipboardCheck,
  Edit,
  AlertCircle,
  User,
  Heart,
  Clock,
} from 'lucide-react';
import { BeltDisplay } from '@/components/shared/BeltDisplay';
import { useStudent } from '@/hooks';
import { useIsMonitor } from '@/hooks';
import { getBeltChipColor } from '@/lib/theme';
import { format, differenceInMonths, differenceInYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createAttendanceService } from '@/services';
import { useAcademy } from '@/contexts/AcademyContext';
import { Attendance } from '@/types';

// ============================================
// Status Config
// ============================================
const statusConfig: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'default' }> = {
  active: { label: 'Ativo', color: 'success' },
  injured: { label: 'Lesionado', color: 'warning' },
  inactive: { label: 'Inativo', color: 'default' },
  suspended: { label: 'Suspenso', color: 'error' },
};

// ============================================
// Tab Panel Component
// ============================================
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

// ============================================
// Info Row Component
// ============================================
function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, py: 1.5 }}>
      <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'action.hover', display: 'flex' }}>
        <Icon size={18} style={{ color: '#6b7280' }} />
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary" display="block">
          {label}
        </Typography>
        <Typography variant="body2" fontWeight={500}>
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

export default function MonitorStudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;
  const isMonitor = useIsMonitor();
  const { academyId } = useAcademy();

  const { student, isLoading } = useStudent(studentId);
  const [activeTab, setActiveTab] = useState(0);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loadingAttendances, setLoadingAttendances] = useState(false);

  // Load attendances when tab changes
  useEffect(() => {
    if (activeTab === 1 && studentId && academyId) {
      setLoadingAttendances(true);
      const attendanceService = createAttendanceService(academyId);
      attendanceService.getByStudent(studentId)
        .then(setAttendances)
        .catch(console.error)
        .finally(() => setLoadingAttendances(false));
    }
  }, [activeTab, studentId, academyId]);

  const handleBack = useCallback(() => {
    router.push('/portal/alunos');
  }, [router]);

  const handleEdit = useCallback(() => {
    router.push(`/portal/alunos/${studentId}/editar`);
  }, [router, studentId]);

  // Calculate time training
  const trainingTime = useMemo(() => {
    if (!student?.startDate) return null;
    const startDate = new Date(student.jiujitsuStartDate || student.startDate);
    const years = differenceInYears(new Date(), startDate);
    const months = differenceInMonths(new Date(), startDate) % 12;
    if (years > 0) return `${years} ano${years > 1 ? 's' : ''}${months > 0 ? ` e ${months} mes${months > 1 ? 'es' : ''}` : ''}`;
    return `${months} mes${months !== 1 ? 'es' : ''}`;
  }, [student]);

  // Total attendance
  const totalAttendance = useMemo(() => {
    if (!student) return 0;
    return (student.attendanceCount || 0) + (student.initialAttendanceCount || 0);
  }, [student]);

  if (!isMonitor) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          Voce nao tem permissao para acessar esta pagina.
        </Alert>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Skeleton variant="circular" width={40} height={40} />
          <Skeleton variant="text" width={200} height={32} />
        </Box>
        <Skeleton variant="rounded" height={200} sx={{ borderRadius: 3, mb: 2 }} />
        <Skeleton variant="rounded" height={300} sx={{ borderRadius: 3 }} />
      </Box>
    );
  }

  if (!student) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          Aluno nao encontrado.
        </Alert>
        <Button startIcon={<ArrowLeft size={18} />} onClick={handleBack} sx={{ mt: 2 }}>
          Voltar
        </Button>
      </Box>
    );
  }

  const beltColor = getBeltChipColor(student.currentBelt);
  const status = statusConfig[student.status] || statusConfig.active;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={handleBack} sx={{ bgcolor: 'action.hover' }}>
          <ArrowLeft size={20} />
        </IconButton>
        <Typography variant="h6" fontWeight={700} sx={{ flex: 1 }}>
          Detalhes do Aluno
        </Typography>
        <Button variant="outlined" startIcon={<Edit size={16} />} onClick={handleEdit} size="small">
          Editar
        </Button>
      </Box>

      {/* Student Card */}
      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
          <Avatar
            src={student.photoUrl}
            sx={{
              width: 80,
              height: 80,
              bgcolor: beltColor.bg,
              color: beltColor.text,
              fontSize: '1.5rem',
              fontWeight: 600,
            }}
          >
            {student.fullName.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" fontWeight={700}>
              {student.nickname || student.fullName.split(' ')[0]}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {student.fullName}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <BeltDisplay belt={student.currentBelt} stripes={student.currentStripes} size="medium" />
              <Chip label={status.label} color={status.color} size="small" />
              <Chip label={student.category === 'kids' ? 'Kids' : 'Adulto'} variant="outlined" size="small" />
            </Box>
          </Box>
        </Box>

        {/* Quick Stats */}
        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid size={{ xs: 6 }}>
            <Card sx={{ bgcolor: 'success.50', border: 'none' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="h4" fontWeight={700} color="success.main">
                  {totalAttendance}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Presencas
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <Card sx={{ bgcolor: 'primary.50', border: 'none' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="h4" fontWeight={700} color="primary.main">
                  {trainingTime || '-'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Tempo de treino
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 3 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Informacoes" />
          <Tab label="Presencas" />
        </Tabs>

        {/* Tab: Informacoes */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
              Contato
            </Typography>
            <InfoRow icon={Phone} label="Telefone" value={student.phone} />
            <InfoRow icon={Mail} label="Email" value={student.email} />

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
              Informacoes Pessoais
            </Typography>
            <InfoRow
              icon={Calendar}
              label="Data de Nascimento"
              value={student.birthDate ? format(new Date(student.birthDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : null}
            />
            <InfoRow
              icon={Clock}
              label="Inicio no Jiu-Jitsu"
              value={student.jiujitsuStartDate ? format(new Date(student.jiujitsuStartDate), "dd/MM/yyyy", { locale: ptBR }) : null}
            />
            <InfoRow
              icon={Calendar}
              label="Inicio na Academia"
              value={student.startDate ? format(new Date(student.startDate), "dd/MM/yyyy", { locale: ptBR }) : null}
            />

            {student.address && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                  Endereco
                </Typography>
                <InfoRow
                  icon={MapPin}
                  label="Endereco"
                  value={`${student.address.street}, ${student.address.number}${student.address.complement ? ` - ${student.address.complement}` : ''}, ${student.address.neighborhood}, ${student.address.city} - ${student.address.state}`}
                />
              </>
            )}

            {student.guardian && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                  Responsavel
                </Typography>
                <InfoRow icon={User} label="Nome" value={student.guardian.name} />
                <InfoRow icon={Phone} label="Telefone" value={student.guardian.phone} />
                <InfoRow icon={Mail} label="Email" value={student.guardian.email} />
              </>
            )}

            {(student.healthNotes || student.bloodType || (student.allergies && student.allergies.length > 0)) && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                  Informacoes Medicas
                </Typography>
                <InfoRow icon={Heart} label="Tipo Sanguineo" value={student.bloodType} />
                {student.allergies && student.allergies.length > 0 && (
                  <InfoRow icon={AlertCircle} label="Alergias" value={student.allergies.join(', ')} />
                )}
                <InfoRow icon={Heart} label="Observacoes" value={student.healthNotes} />
              </>
            )}
          </Box>
        </TabPanel>

        {/* Tab: Presencas */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ p: 2 }}>
            {loadingAttendances ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <Skeleton variant="rounded" height={200} width="100%" />
              </Box>
            ) : attendances.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <ClipboardCheck size={48} style={{ color: '#9ca3af', marginBottom: 16 }} />
                <Typography variant="body2" color="text.secondary">
                  Nenhuma presenca registrada
                </Typography>
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {attendances.slice(0, 20).map((attendance) => (
                  <ListItem key={attendance.id} sx={{ px: 0, borderBottom: 1, borderColor: 'divider' }}>
                    <ListItemText
                      primary={format(new Date(attendance.date), "dd/MM/yyyy - EEEE", { locale: ptBR })}
                      secondary={attendance.className || 'Treino'}
                      primaryTypographyProps={{ fontWeight: 500 }}
                    />
                  </ListItem>
                ))}
                {attendances.length > 20 && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                    Mostrando as 20 presencas mais recentes de {attendances.length} total
                  </Typography>
                )}
              </List>
            )}
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  );
}
