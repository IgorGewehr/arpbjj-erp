'use client';

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createNewsService } from '@/services/newsService';
import { useFeedback } from '@/components/providers';
import { useAcademy } from '@/contexts/AcademyContext';
import { News } from '@/types';

const QUERY_KEY = 'news';

export function useNews(opts: { onlyPublished?: boolean } = {}) {
  const { academyId } = useAcademy();
  const newsService = useMemo(
    () => createNewsService(academyId || 'default'),
    [academyId]
  );

  const {
    data: news = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, academyId, opts.onlyPublished ?? false],
    queryFn: () => newsService.list({ onlyPublished: opts.onlyPublished }),
    enabled: !!academyId,
    staleTime: 1000 * 60 * 5,
  });

  return {
    news,
    isLoading,
    error,
    refresh: refetch,
  };
}

export function useNewsItem(id: string | null) {
  const { academyId } = useAcademy();
  const newsService = useMemo(
    () => createNewsService(academyId || 'default'),
    [academyId]
  );

  const {
    data: item,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, academyId, id],
    queryFn: () => (id ? newsService.getById(id) : null),
    enabled: !!id && !!academyId,
    staleTime: 1000 * 60 * 5,
  });

  return {
    news: item ?? null,
    isLoading,
    error,
    refresh: refetch,
  };
}

export function useCreateNews() {
  const { academyId } = useAcademy();
  const { success, error: showError } = useFeedback();
  const queryClient = useQueryClient();
  const newsService = useMemo(
    () => createNewsService(academyId || 'default'),
    [academyId]
  );

  return useMutation({
    mutationFn: async (
      data: Omit<News, 'id' | 'academyId' | 'createdAt' | 'updatedAt'>
    ) => newsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, academyId] });
      success('Noticia criada com sucesso!');
    },
    onError: () => {
      showError('Erro ao criar noticia');
    },
  });
}

export function useUpdateNews() {
  const { academyId } = useAcademy();
  const { success, error: showError } = useFeedback();
  const queryClient = useQueryClient();
  const newsService = useMemo(
    () => createNewsService(academyId || 'default'),
    [academyId]
  );

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<News> }) =>
      newsService.update(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, academyId] });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY, academyId, updated.id],
      });
      success('Noticia atualizada com sucesso!');
    },
    onError: () => {
      showError('Erro ao atualizar noticia');
    },
  });
}

export function useDeleteNews() {
  const { academyId } = useAcademy();
  const { success, error: showError } = useFeedback();
  const queryClient = useQueryClient();
  const newsService = useMemo(
    () => createNewsService(academyId || 'default'),
    [academyId]
  );

  return useMutation({
    mutationFn: async (id: string) => {
      await newsService.remove(id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, academyId] });
      success('Noticia excluida');
    },
    onError: () => {
      showError('Erro ao excluir noticia');
    },
  });
}

export function usePublishNews() {
  const { academyId } = useAcademy();
  const { success, error: showError } = useFeedback();
  const queryClient = useQueryClient();
  const newsService = useMemo(
    () => createNewsService(academyId || 'default'),
    [academyId]
  );

  return useMutation({
    mutationFn: async ({
      id,
      publish,
    }: {
      id: string;
      publish: boolean;
    }) => (publish ? newsService.publish(id) : newsService.unpublish(id)),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, academyId] });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY, academyId, updated.id],
      });
      success(updated.isPublished ? 'Noticia publicada' : 'Noticia despublicada');
    },
    onError: () => {
      showError('Erro ao alterar status de publicacao');
    },
  });
}
