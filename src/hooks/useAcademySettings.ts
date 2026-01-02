import { useState, useEffect } from 'react';
import { settingsService, AcademySettings } from '@/services/settingsService';

export function useAcademySettings() {
  const [settings, setSettings] = useState<AcademySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await settingsService.getAcademySettings();
        setSettings(data);
      } catch (err) {
        setError('Erro ao carregar configuracoes da academia');
        console.error('Error loading academy settings:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  return {
    settings,
    isLoading,
    error,
    academyName: settings?.name || 'Academia',
  };
}

export default useAcademySettings;
