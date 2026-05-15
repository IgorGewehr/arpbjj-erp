'use client';

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createAcademyEventService } from '@/services/academyEventService';
import { useFeedback } from '@/components/providers';
import { useAcademy } from '@/contexts/AcademyContext';
import { AcademyEvent } from '@/types';

const QUERY_KEY = 'events';

export function useEvents(opts: { onlyPublished?: boolean } = {}) {
  const { academyId } = useAcademy();
  const eventService = useMemo(
    () => createAcademyEventService(academyId || 'default'),
    [academyId]
  );

  const {
    data: events = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, academyId, opts.onlyPublished ?? false],
    queryFn: () => eventService.list({ onlyPublished: opts.onlyPublished }),
    enabled: !!academyId,
    staleTime: 1000 * 60 * 5,
  });

  return {
    events,
    isLoading,
    error,
    refresh: refetch,
  };
}

export function useEventItem(id: string | null) {
  const { academyId } = useAcademy();
  const eventService = useMemo(
    () => createAcademyEventService(academyId || 'default'),
    [academyId]
  );

  const {
    data: item,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, academyId, id],
    queryFn: () => (id ? eventService.getById(id) : null),
    enabled: !!id && !!academyId,
    staleTime: 1000 * 60 * 5,
  });

  return {
    event: item ?? null,
    isLoading,
    error,
    refresh: refetch,
  };
}

export function useCreateEvent() {
  const { academyId } = useAcademy();
  const { success, error: showError } = useFeedback();
  const queryClient = useQueryClient();
  const eventService = useMemo(
    () => createAcademyEventService(academyId || 'default'),
    [academyId]
  );

  return useMutation({
    mutationFn: async (
      data: Omit<AcademyEvent, 'id' | 'academyId' | 'createdAt' | 'updatedAt'>
    ) => eventService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, academyId] });
      success('Evento criado com sucesso!');
    },
    onError: () => {
      showError('Erro ao criar evento');
    },
  });
}

export function useUpdateEvent() {
  const { academyId } = useAcademy();
  const { success, error: showError } = useFeedback();
  const queryClient = useQueryClient();
  const eventService = useMemo(
    () => createAcademyEventService(academyId || 'default'),
    [academyId]
  );

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AcademyEvent> }) =>
      eventService.update(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, academyId] });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY, academyId, updated.id],
      });
      success('Evento atualizado com sucesso!');
    },
    onError: () => {
      showError('Erro ao atualizar evento');
    },
  });
}

export function useDeleteEvent() {
  const { academyId } = useAcademy();
  const { success, error: showError } = useFeedback();
  const queryClient = useQueryClient();
  const eventService = useMemo(
    () => createAcademyEventService(academyId || 'default'),
    [academyId]
  );

  return useMutation({
    mutationFn: async (id: string) => {
      await eventService.remove(id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, academyId] });
      success('Evento excluido');
    },
    onError: () => {
      showError('Erro ao excluir evento');
    },
  });
}

export function usePublishEvent() {
  const { academyId } = useAcademy();
  const { success, error: showError } = useFeedback();
  const queryClient = useQueryClient();
  const eventService = useMemo(
    () => createAcademyEventService(academyId || 'default'),
    [academyId]
  );

  return useMutation({
    mutationFn: async ({
      id,
      publish,
    }: {
      id: string;
      publish: boolean;
    }) => (publish ? eventService.publish(id) : eventService.unpublish(id)),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, academyId] });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY, academyId, updated.id],
      });
      success(updated.isPublished ? 'Evento publicado' : 'Evento despublicado');
    },
    onError: () => {
      showError('Erro ao alterar status de publicacao');
    },
  });
}
