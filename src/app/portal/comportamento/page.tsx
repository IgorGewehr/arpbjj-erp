'use client';

import { useMemo } from 'react';
import { Box, Typography, Skeleton, Card, CardContent, Chip, List, ListItem, Divider } from '@mui/material';
import { Star, Calendar, TrendingUp } from 'lucide-react';
import { usePermissions } from '@/components/providers';
import { useStudentAssessment } from '@/hooks';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const assessmentCategories = [
  { key: 'respeito' as const, label: 'Respeito' },
  { key: 'disciplina' as const, label: 'Disciplina' },
  { key: 'pontualidade' as const, label: 'Pontualidade' },
  { key: 'tecnica' as const, label: 'Tecnica' },
  { key: 'esforco' as const, label: 'Esforco' },
];

export default function PortalComportamentoPage() {
  const { linkedStudentIds } = usePermissions();
  const studentId = linkedStudentIds[0];

  const { assessments, isLoading, calculateOverallScore, getPerformanceLevel } = useStudentAssessment(studentId);

  // Get latest assessment
  const latestAssessment = useMemo(() => {
    if (!assessments || assessments.length === 0) return null;
    return assessments[0];
  }, [assessments]);

  // Calculate average of all assessments
  const averageScore = useMemo(() => {
    if (!assessments || assessments.length === 0) return null;
    const total = assessments.reduce((acc, a) => acc + calculateOverallScore(a.scores), 0);
    return total / assessments.length;
  }, [assessments, calculateOverallScore]);

  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="text" width="60%" height={28} sx={{ mb: 0.5 }} />
        <Skeleton variant="text" width="40%" height={18} sx={{ mb: 3 }} />
        <Skeleton variant="rounded" height={150} sx={{ borderRadius: 2, mb: 3 }} />
        <Skeleton variant="rounded" height={200} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h6"
          fontWeight={600}
          color="text.primary"
          sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
        >
          Meu Comportamento
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
        >
          Acompanhe suas avaliacoes de comportamento
        </Typography>
      </Box>

      {/* Latest Assessment Card */}
      {latestAssessment ? (
        <Card sx={{ mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'grey.200' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Star size={20} fill="#EAB308" color="#EAB308" />
                <Typography variant="subtitle1" fontWeight={600}>
                  Ultima Avaliacao
                </Typography>
              </Box>
              {(() => {
                const score = calculateOverallScore(latestAssessment.scores);
                const performance = getPerformanceLevel(score);
                return (
                  <Chip
                    label={performance.label}
                    size="small"
                    sx={{
                      bgcolor: performance.color,
                      color: 'white',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                    }}
                  />
                );
              })()}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Calendar size={14} color="#666" />
              <Typography variant="caption" color="text.secondary">
                {format(new Date(latestAssessment.date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </Typography>
            </Box>

            {/* Scores Grid */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1, mb: 2 }}>
              {assessmentCategories.map((cat) => (
                <Box
                  key={cat.key}
                  sx={{
                    textAlign: 'center',
                    p: 1,
                    bgcolor: 'grey.50',
                    borderRadius: 1,
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.25, mb: 0.5 }}>
                    <Star size={14} fill="#EAB308" color="#EAB308" />
                    <Typography variant="body2" fontWeight={700}>
                      {latestAssessment.scores[cat.key]}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                    {cat.label}
                  </Typography>
                </Box>
              ))}
            </Box>

            {latestAssessment.notes && (
              <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  &quot;{latestAssessment.notes}&quot;
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card sx={{ mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'grey.200' }}>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Star size={40} style={{ color: '#9ca3af', marginBottom: 8 }} />
            <Typography variant="body2" color="text.secondary">
              Nenhuma avaliacao registrada ainda
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {averageScore !== null && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: { xs: 1.5, sm: 2 },
            mb: 3,
          }}
        >
          <Box
            sx={{
              p: { xs: 2, sm: 2.5 },
              bgcolor: '#fff',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'grey.200',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <TrendingUp size={16} color="#1976d2" />
              <Typography variant="caption" color="text.secondary">
                Media Geral
              </Typography>
            </Box>
            <Typography
              variant="h4"
              fontWeight={700}
              sx={{
                color: averageScore >= 4 ? 'success.main' : averageScore >= 3 ? 'warning.main' : 'error.main',
                fontSize: { xs: '1.5rem', sm: '2rem' },
              }}
            >
              {averageScore.toFixed(1)}
            </Typography>
          </Box>
          <Box
            sx={{
              p: { xs: 2, sm: 2.5 },
              bgcolor: '#fff',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'grey.200',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Star size={16} color="#EAB308" />
              <Typography variant="caption" color="text.secondary">
                Avaliacoes
              </Typography>
            </Box>
            <Typography
              variant="h4"
              fontWeight={700}
              color="text.primary"
              sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}
            >
              {assessments.length}
            </Typography>
          </Box>
        </Box>
      )}

      {/* History */}
      {assessments.length > 0 && (
        <Box>
          <Typography
            variant="body2"
            fontWeight={600}
            color="text.secondary"
            sx={{
              mb: 1.5,
              fontSize: { xs: '0.75rem', sm: '0.8rem' },
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            Historico de Avaliacoes
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {assessments.map((assessment, index) => {
              const score = calculateOverallScore(assessment.scores);
              const performance = getPerformanceLevel(score);

              return (
                <Box
                  key={assessment.id}
                  sx={{
                    p: { xs: 1.5, sm: 2 },
                    borderRadius: 2,
                    bgcolor: '#fff',
                    border: '1px solid',
                    borderColor: 'grey.200',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Calendar size={14} color="#666" />
                      <Typography variant="body2" fontWeight={500} sx={{ fontSize: { xs: '0.85rem', sm: '0.9rem' } }}>
                        {format(new Date(assessment.date), "d 'de' MMMM", { locale: ptBR })}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Star size={14} fill="#EAB308" color="#EAB308" />
                        <Typography variant="body2" fontWeight={700}>
                          {score.toFixed(1)}
                        </Typography>
                      </Box>
                      <Chip
                        label={performance.label}
                        size="small"
                        sx={{
                          bgcolor: performance.color,
                          color: 'white',
                          fontWeight: 600,
                          fontSize: '0.6rem',
                          height: 20,
                        }}
                      />
                    </Box>
                  </Box>

                  {/* Mini scores */}
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {assessmentCategories.map((cat) => (
                      <Typography key={cat.key} variant="caption" color="text.secondary">
                        {cat.label}: <strong>{assessment.scores[cat.key]}</strong>
                      </Typography>
                    ))}
                  </Box>

                  {assessment.notes && (
                    <>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        &quot;{assessment.notes}&quot;
                      </Typography>
                    </>
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
}
