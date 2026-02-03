'use client';

import { ReactNode } from 'react';
import { QueryProvider } from './QueryProvider';
import { ThemeProvider } from './ThemeProvider';
import { AuthProvider } from './AuthProvider';
import { FeedbackProvider } from './FeedbackProvider';
import { ConfirmDialogProvider } from './ConfirmDialogProvider';
import { PermissionProvider } from './PermissionProvider';
import { AcademyProvider } from '@/contexts/AcademyContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { useFCM } from '@/hooks/useFCM';

function FCMInitializer() {
  useFCM();
  return null;
}

interface ClientProvidersProps {
  children: ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <QueryProvider>
      <ThemeProvider>
        <AuthProvider>
          <AcademyProvider>
            <NotificationProvider>
              <PermissionProvider>
                <FCMInitializer />
                <FeedbackProvider>
                  <ConfirmDialogProvider>
                    {children}
                  </ConfirmDialogProvider>
                </FeedbackProvider>
              </PermissionProvider>
            </NotificationProvider>
          </AcademyProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}
