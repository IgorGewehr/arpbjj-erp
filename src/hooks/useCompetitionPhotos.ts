'use client';

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createCompetitionPhotoService } from '@/services/competitionPhotoService';
import { useAuth, useFeedback } from '@/components/providers';
import { useAcademy } from '@/contexts/AcademyContext';
import { CompetitionPhoto } from '@/types';

// ============================================
// Query Keys
// ============================================
const QUERY_KEYS = {
  competitionPhotos: 'competitionPhotos',
  studentPhotos: 'studentPhotos',
  photoCount: 'photoCount',
  highlightPhotos: 'highlightPhotos',
};

// ============================================
// Hook Options
// ============================================
interface UseCompetitionPhotosOptions {
  competitionId?: string;
  studentId?: string;
  enabled?: boolean;
}

// ============================================
// useCompetitionPhotos Hook
// ============================================
export function useCompetitionPhotos(options: UseCompetitionPhotosOptions = {}) {
  const { competitionId, studentId, enabled = true } = options;

  const { user } = useAuth();
  const { academyId } = useAcademy();
  const { success, error: showError } = useFeedback();
  const queryClient = useQueryClient();

  const photoService = useMemo(
    () => createCompetitionPhotoService(academyId || 'default'),
    [academyId]
  );

  // ============================================
  // Fetch Photos by Competition
  // ============================================
  const {
    data: photos = [],
    isLoading: isLoadingPhotos,
    error: photosError,
  } = useQuery({
    queryKey: [QUERY_KEYS.competitionPhotos, academyId, competitionId],
    queryFn: () => photoService.getPhotosByCompetition(competitionId!),
    enabled: enabled && !!academyId && !!competitionId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: true,
  });

  // ============================================
  // Fetch Photos by Student
  // ============================================
  const {
    data: studentPhotos = [],
    isLoading: isLoadingStudentPhotos,
  } = useQuery({
    queryKey: [QUERY_KEYS.studentPhotos, academyId, studentId],
    queryFn: () => photoService.getPhotosByStudent(studentId!),
    enabled: enabled && !!academyId && !!studentId,
    staleTime: 1000 * 60 * 2,
  });

  // ============================================
  // Get Student Photo Count
  // ============================================
  const {
    data: photoCount = 0,
    isLoading: isLoadingCount,
  } = useQuery({
    queryKey: [QUERY_KEYS.photoCount, academyId, competitionId, studentId],
    queryFn: () => photoService.getStudentPhotoCount(competitionId!, studentId!),
    enabled: enabled && !!academyId && !!competitionId && !!studentId,
    staleTime: 1000 * 30, // 30 seconds
  });

  // ============================================
  // Get Highlight Photos
  // ============================================
  const {
    data: highlightPhotos = [],
    isLoading: isLoadingHighlights,
  } = useQuery({
    queryKey: [QUERY_KEYS.highlightPhotos, academyId, competitionId],
    queryFn: () => photoService.getHighlightPhotos(competitionId!),
    enabled: enabled && !!academyId && !!competitionId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // ============================================
  // Upload Photo Mutation
  // ============================================
  const uploadPhotoMutation = useMutation({
    mutationFn: async ({
      competitionId,
      competitionName,
      studentId,
      studentName,
      file,
      caption,
      medalType,
    }: {
      competitionId: string;
      competitionName: string;
      studentId: string;
      studentName: string;
      file: File;
      caption?: string;
      medalType?: string;
    }) => {
      if (!user?.uid) throw new Error('Usuário não autenticado');
      return photoService.uploadPhoto(
        competitionId,
        competitionName,
        studentId,
        studentName,
        file,
        caption,
        user.uid,
        medalType
      );
    },
    onSuccess: () => {
      // Invalidate all photo queries
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.competitionPhotos, academyId],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.studentPhotos, academyId],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.photoCount, academyId],
      });
      success('Foto adicionada com sucesso!');
    },
    onError: (error: Error) => {
      showError(error.message || 'Erro ao fazer upload da foto');
    },
  });

  // ============================================
  // Update Caption Mutation
  // ============================================
  const updateCaptionMutation = useMutation({
    mutationFn: async ({
      photoId,
      caption,
    }: {
      photoId: string;
      caption: string;
    }) => {
      return photoService.updatePhotoCaption(photoId, caption);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.competitionPhotos, academyId],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.studentPhotos, academyId],
      });
      success('Legenda atualizada!');
    },
    onError: (error: Error) => {
      showError(error.message || 'Erro ao atualizar legenda');
    },
  });

  // ============================================
  // Toggle Highlight Mutation
  // ============================================
  const toggleHighlightMutation = useMutation({
    mutationFn: async ({
      photoId,
      isHighlight,
    }: {
      photoId: string;
      isHighlight: boolean;
    }) => {
      return photoService.toggleHighlight(photoId, isHighlight);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.competitionPhotos, academyId],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.highlightPhotos, academyId],
      });
      success('Destaque atualizado!');
    },
    onError: (error: Error) => {
      showError(error.message || 'Erro ao atualizar destaque');
    },
  });

  // ============================================
  // Delete Photo Mutation
  // ============================================
  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: string) => {
      return photoService.deletePhoto(photoId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.competitionPhotos, academyId],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.studentPhotos, academyId],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.photoCount, academyId],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.highlightPhotos, academyId],
      });
      success('Foto removida com sucesso!');
    },
    onError: (error: Error) => {
      showError(error.message || 'Erro ao remover foto');
    },
  });

  // ============================================
  // Helper Functions
  // ============================================
  const canUploadMore = (currentCount: number, isAdmin: boolean): boolean => {
    return isAdmin || currentCount < 5;
  };

  const getRemainingUploads = (currentCount: number, isAdmin: boolean): number => {
    if (isAdmin) return Infinity;
    return Math.max(0, 5 - currentCount);
  };

  // ============================================
  // Return Hook API
  // ============================================
  return {
    // Data
    photos,
    studentPhotos,
    photoCount,
    highlightPhotos,

    // Loading states
    isLoadingPhotos,
    isLoadingStudentPhotos,
    isLoadingCount,
    isLoadingHighlights,
    isUploading: uploadPhotoMutation.isPending,
    isDeleting: deletePhotoMutation.isPending,
    isUpdating: updateCaptionMutation.isPending,

    // Error states
    photosError,
    uploadError: uploadPhotoMutation.error,
    deleteError: deletePhotoMutation.error,
    updateError: updateCaptionMutation.error,

    // Mutations
    uploadPhoto: uploadPhotoMutation.mutate,
    updateCaption: updateCaptionMutation.mutate,
    toggleHighlight: toggleHighlightMutation.mutate,
    deletePhoto: deletePhotoMutation.mutate,

    // Helpers
    canUploadMore,
    getRemainingUploads,
  };
}
