'use client';

import { ReactNode } from 'react';
import { QueryProvider } from './QueryProvider';
import { ThemeProvider } from './ThemeProvider';
import { AuthProvider } from './AuthProvider';
import { FeedbackProvider } from './FeedbackProvider';
import { ConfirmDialogProvider } from './ConfirmDialogProvider';
import { PermissionProvider } from './PermissionProvider';

interface ClientProvidersProps {
  children: ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <QueryProvider>
      <ThemeProvider>
        <AuthProvider>
          <PermissionProvider>
            <FeedbackProvider>
              <ConfirmDialogProvider>
                {children}
              </ConfirmDialogProvider>
            </FeedbackProvider>
          </PermissionProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}
