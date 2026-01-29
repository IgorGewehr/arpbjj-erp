import { useState, useEffect, useCallback } from 'react';
import { createSettingsService, AcademySettings } from '@/services/settingsService';
import { useAcademy } from '@/contexts/AcademyContext';

export function useAcademySettings() {
  const { academyId } = useAcademy();
  const [settings, setSettings] = useState<AcademySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    if (!academyId) {
      // Don't set isLoading to false - wait for academyId to become available
      return;
    }
    setIsLoading(true);
    try {
      const settingsService = createSettingsService(academyId);
      const data = await settingsService.getAcademySettings();
      setSettings(data);
    } catch (err) {
      setError('Erro ao carregar configuracoes da academia');
      console.error('Error loading academy settings:', err);
    } finally {
      setIsLoading(false);
    }
  }, [academyId]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateSettings = useCallback(async (newSettings: Partial<AcademySettings>) => {
    if (!academyId) return;
    setIsUpdating(true);
    setError(null);
    try {
      const settingsService = createSettingsService(academyId);
      const updatedSettings = {
        ...settings,
        ...newSettings,
        name: newSettings.name || settings?.name || 'Academia',
      } as AcademySettings;

      await settingsService.saveAcademySettings(updatedSettings);
      await loadSettings();
    } catch (err) {
      setError('Erro ao salvar configuracoes');
      console.error('Error saving academy settings:', err);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [academyId, settings, loadSettings]);

  return {
    settings,
    isLoading,
    isUpdating,
    error,
    academyName: settings?.name || 'Academia',
    updateSettings,
    refetch: loadSettings,
  };
}

export default useAcademySettings;
