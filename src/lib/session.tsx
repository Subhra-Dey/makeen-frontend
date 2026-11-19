'use client';

import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Toaster } from 'sonner';
import type { MeResponse } from '@/shared';
import { api, setSessionEndedHandler } from './api/client';
import { ApiError } from './api/errors';
import { loginUrl } from './navigation';

export const ME_KEY = ['me'] as const;

function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        // Never retry auth / permission / validation answers; retry network blips once.
        retry: (count, err) => !(err instanceof ApiError && err.status > 0) && count < 1,
      },
    },
  });
}

/** React Query + toasts + “session ended → Login” (spec Login: missing or expired token). */
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(makeClient);
  return (
    <QueryClientProvider client={client}>
      <SessionEndedRedirect />
      {children}
      <Toaster
        position="bottom-center"
        toastOptions={{
          classNames: {
            toast: 'rounded-[10px] border font-sans text-[14px] font-semibold',
            success: 'border-[#B7E3D9] bg-[#E9F7F4] text-[#0B6A5F]',
            error: 'border-[#F5C2BE] bg-[#FDECEC] text-danger-text',
          },
        }}
      />
    </QueryClientProvider>
  );
}

function SessionEndedRedirect() {
  const router = useRouter();
  const path = usePathname();
  const qc = useQueryClient();
  useEffect(() => {
    setSessionEndedHandler(() => {
      qc.clear();
      router.replace(loginUrl(path));
    });
    return () => {
      setSessionEndedHandler(null);
    };
  }, [qc, router, path]);
  return null;
}

/** The signed-in person (profile, menu access, plants). */
export function useMe() {
  return useQuery({
    queryKey: ME_KEY,
    queryFn: ({ signal }) => api<MeResponse>('/api/me', { signal }),
    staleTime: 60_000,
  });
}
