import { useState, useEffect, useCallback } from 'react';
import { settingsService, AcademySettings } from '@/services/settingsService';

export function useAcademySettings() {
  const [settings, setSettings] = useState<AcademySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      const data = await settingsService.getAcademySettings();
      setSettings(data);
    } catch (err) {
      setError('Erro ao carregar configuracoes da academia');
      console.error('Error loading academy settings:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateSettings = useCallback(async (newSettings: Partial<AcademySettings>) => {
    setIsUpdating(true);
    setError(null);
    try {
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
  }, [settings, loadSettings]);

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
