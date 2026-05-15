'use client';

import { useState, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 1min default staleTime — short enough that mutations don't
            // serve very stale data, long enough to avoid refetch on every
            // navigation. Hooks override per-domain (see useStudents,
            // useClasses, useFinancial, etc.).
            staleTime: 60 * 1000,
            // Keep cached data in memory for 10 minutes after last use so
            // route changes don't drop fresh-fetched data.
            gcTime: 10 * 60 * 1000,
            // On Capacitor webview, focus events fire on every keyboard
            // open/close — refetch on focus would cause UI jitter.
            refetchOnWindowFocus: false,
            // Retry once on failure
            retry: 1,
          },
          mutations: {
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
