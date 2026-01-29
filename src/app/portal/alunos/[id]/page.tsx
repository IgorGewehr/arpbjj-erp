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
  alpha,
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
  Globe,
  Award,
  Trophy,
  Building2,
  Lock,
} from 'lucide-react';
import { BeltDisplay } from '@/components/shared/BeltDisplay';
import { useStudent } from '@/hooks';
import { useIsMonitor } from '@/hooks';
import { getBeltChipColor } from '@/lib/theme';
import { format, differenceInMonths, differenceInYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createAttendanceService } from '@/services';
import { crossAcademyService, CrossAcademyStudentHistory } from '@/services/crossAcademyService';
import { useAcademy } from '@/contexts/AcademyContext';
import { Attendance } from '@/types';

// ============================================
// Belt Labels
// ============================================
const BELT_LABELS: Record<string, string> = {
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
// Position Config
// ============================================
const positionConfig = {
  gold: { label: 'Ouro', color: '#FFD700', icon: '🥇' },
  silver: { label: 'Prata', color: '#C0C0C0', icon: '🥈' },
  bronze: { label: 'Bronze', color: '#CD7F32', icon: '🥉' },
  participant: { label: 'Participante', color: '#666', icon: '🎖️' },
};

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

// ============================================
// Academy Badge Component
// ============================================
function AcademyBadge({ academyName }: { academyName: string }) {
  return (
    <Chip
      icon={<Building2 size={12} />}
      label={academyName}
      size="small"
      sx={{
        bgcolor: alpha('#6366F1', 0.1),
        color: '#6366F1',
        fontWeight: 500,
        fontSize: '0.7rem',
        height: 22,
        '& .MuiChip-icon': {
          color: '#6366F1',
        },
      }}
    />
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
  const [globalHistory, setGlobalHistory] = useState<CrossAcademyStudentHistory | null>(null);
  const [loadingGlobalHistory, setLoadingGlobalHistory] = useState(false);

  // Load attendances when tab changes to attendance tab
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

  // Load global history when tab changes to global history tab
  useEffect(() => {
    if (activeTab === 2 && student?.linkedUserId && academyId) {
      setLoadingGlobalHistory(true);
      crossAcademyService.getStudentGlobalHistory(student.linkedUserId, academyId)
        .then(setGlobalHistory)
        .catch(console.error)
        .finally(() => setLoadingGlobalHistory(false));
    }
  }, [activeTab, student?.linkedUserId, academyId]);

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

  // Check if student has a linked user (can show global history)
  const hasLinkedUser = !!student?.linkedUserId;

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
          {hasLinkedUser && (
            <Tab
              label="Historico Global"
              icon={<Globe size={14} />}
              iconPosition="start"
              sx={{ minHeight: 48 }}
            />
          )}
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

        {/* Tab: Historico Global */}
        {hasLinkedUser && (
          <TabPanel value={activeTab} index={2}>
            <Box sx={{ p: 2 }}>
              {loadingGlobalHistory ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Skeleton variant="rounded" height={100} />
                  <Skeleton variant="rounded" height={150} />
                  <Skeleton variant="rounded" height={150} />
                </Box>
              ) : !globalHistory ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Globe size={48} style={{ color: '#9ca3af', marginBottom: 16 }} />
                  <Typography variant="body2" color="text.secondary">
                    Nao foi possivel carregar o historico global
                  </Typography>
                </Box>
              ) : (
                <>
                  {/* Privacy Notice */}
                  {!globalHistory.isProfilePublic && (
                    <Alert
                      severity="info"
                      icon={<Lock size={18} />}
                      sx={{ mb: 3, borderRadius: 2 }}
                    >
                      O perfil deste aluno e privado. Apenas informacoes basicas sao exibidas.
                    </Alert>
                  )}

                  {/* Academies Overview */}
                  {globalHistory.academies.length > 1 && (
                    <>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Building2 size={16} />
                        Academias Vinculadas ({globalHistory.academies.length})
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
                        {globalHistory.academies.map((academy) => (
                          <Box
                            key={academy.academyId}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 2,
                              p: 1.5,
                              bgcolor: academy.academyId === academyId ? alpha('#10B981', 0.1) : 'action.hover',
                              borderRadius: 2,
                              border: academy.academyId === academyId ? '1px solid' : 'none',
                              borderColor: academy.academyId === academyId ? alpha('#10B981', 0.3) : 'transparent',
                            }}
                          >
                            <BeltDisplay belt={academy.currentBelt} stripes={academy.currentStripes} size="small" />
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" fontWeight={500}>
                                {academy.academyName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {BELT_LABELS[academy.currentBelt] || academy.currentBelt} - {academy.currentStripes} grau{academy.currentStripes !== 1 ? 's' : ''}
                              </Typography>
                            </Box>
                            {academy.academyId === academyId && (
                              <Chip label="Atual" size="small" color="success" sx={{ height: 20, fontSize: '0.65rem' }} />
                            )}
                          </Box>
                        ))}
                      </Box>
                      <Divider sx={{ my: 2 }} />
                    </>
                  )}

                  {/* Global Attendance Stats */}
                  {globalHistory.attendanceStats.length > 1 && (
                    <>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ClipboardCheck size={16} />
                        Presencas por Academia
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 1.5, mb: 3 }}>
                        {globalHistory.attendanceStats.map((stat) => (
                          <Card
                            key={stat.academyId}
                            sx={{
                              bgcolor: stat.academyId === academyId ? 'success.50' : 'action.hover',
                              border: 'none',
                            }}
                          >
                            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                              <Typography variant="h5" fontWeight={700} color={stat.academyId === academyId ? 'success.main' : 'text.primary'}>
                                {stat.totalCount}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
                                {stat.academyName}
                              </Typography>
                            </CardContent>
                          </Card>
                        ))}
                        <Card sx={{ bgcolor: 'primary.50', border: 'none' }}>
                          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                            <Typography variant="h5" fontWeight={700} color="primary.main">
                              {globalHistory.totalAttendance}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
                              Total Global
                            </Typography>
                          </CardContent>
                        </Card>
                      </Box>
                      <Divider sx={{ my: 2 }} />
                    </>
                  )}

                  {/* Belt Progressions from Other Academies */}
                  {globalHistory.beltProgressions.length > 0 && (
                    <>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Award size={16} />
                        Graduacoes em Outras Academias
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
                        {globalHistory.beltProgressions.slice(0, 10).map((progression) => (
                          <Box
                            key={progression.id}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 2,
                              p: 2,
                              bgcolor: '#fff',
                              borderRadius: 2,
                              border: '1px solid',
                              borderColor: 'grey.200',
                            }}
                          >
                            <Box
                              sx={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                bgcolor: '#EDE9FE',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Award size={20} color="#7C3AED" />
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                <Typography variant="body2" fontWeight={600}>
                                  {progression.newStripes > (progression.previousStripes || 0)
                                    ? `${progression.newStripes}º grau - ${BELT_LABELS[progression.newBelt] || progression.newBelt}`
                                    : `Faixa ${BELT_LABELS[progression.newBelt] || progression.newBelt}`}
                                </Typography>
                                <AcademyBadge academyName={progression.academyName} />
                              </Box>
                              <Typography variant="caption" color="text.secondary">
                                {format(new Date(progression.promotionDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                              </Typography>
                            </Box>
                            <BeltDisplay belt={progression.newBelt} stripes={progression.newStripes} size="small" />
                          </Box>
                        ))}
                      </Box>
                      <Divider sx={{ my: 2 }} />
                    </>
                  )}

                  {/* Competition Results from Other Academies */}
                  {globalHistory.competitionResults.length > 0 && (
                    <>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Trophy size={16} />
                        Competicoes em Outras Academias
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
                        {globalHistory.competitionResults.slice(0, 10).map((result) => {
                          const position = positionConfig[result.position as keyof typeof positionConfig] || positionConfig.participant;
                          return (
                            <Box
                              key={result.id}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                p: 2,
                                bgcolor: '#fff',
                                borderRadius: 2,
                                border: '1px solid',
                                borderColor: 'grey.200',
                              }}
                            >
                              <Typography sx={{ fontSize: '1.5rem' }}>{position.icon}</Typography>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                  <Typography variant="body2" fontWeight={600}>
                                    {result.competitionName}
                                  </Typography>
                                  <Chip
                                    label={`Lutou por ${result.academyName}`}
                                    size="small"
                                    sx={{
                                      bgcolor: alpha('#F59E0B', 0.1),
                                      color: '#B45309',
                                      fontWeight: 500,
                                      fontSize: '0.65rem',
                                      height: 20,
                                    }}
                                  />
                                </Box>
                                <Typography variant="caption" color="text.secondary">
                                  {format(new Date(result.date), "dd/MM/yyyy", { locale: ptBR })} - {position.label}
                                </Typography>
                              </Box>
                            </Box>
                          );
                        })}
                      </Box>
                    </>
                  )}

                  {/* Global Medal Count */}
                  {globalHistory.medalCount.total > 0 && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Trophy size={16} />
                        Total de Medalhas (Todas Academias)
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1.5 }}>
                        <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
                          <Typography sx={{ fontSize: '1.5rem' }}>🥇</Typography>
                          <Typography variant="h6" fontWeight={700} sx={{ color: '#FFD700' }}>
                            {globalHistory.medalCount.gold}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">Ouros</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
                          <Typography sx={{ fontSize: '1.5rem' }}>🥈</Typography>
                          <Typography variant="h6" fontWeight={700} sx={{ color: '#C0C0C0' }}>
                            {globalHistory.medalCount.silver}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">Pratas</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
                          <Typography sx={{ fontSize: '1.5rem' }}>🥉</Typography>
                          <Typography variant="h6" fontWeight={700} sx={{ color: '#CD7F32' }}>
                            {globalHistory.medalCount.bronze}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">Bronzes</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: 'primary.50', borderRadius: 2 }}>
                          <Typography sx={{ fontSize: '1.5rem' }}>🏆</Typography>
                          <Typography variant="h6" fontWeight={700} color="primary.main">
                            {globalHistory.medalCount.total}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">Total</Typography>
                        </Box>
                      </Box>
                    </>
                  )}

                  {/* Empty State */}
                  {globalHistory.beltProgressions.length === 0 && globalHistory.competitionResults.length === 0 && globalHistory.academies.length <= 1 && (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Globe size={48} style={{ color: '#9ca3af', marginBottom: 16 }} />
                      <Typography variant="body2" color="text.secondary">
                        Este aluno nao possui historico em outras academias
                      </Typography>
                    </Box>
                  )}
                </>
              )}
            </Box>
          </TabPanel>
        )}
      </Paper>
    </Box>
  );
}
