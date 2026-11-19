'use client';

import * as RD from '@radix-ui/react-dialog';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/button';
import { api } from '@/lib/api/client';
import { SessionEndedError } from '@/lib/api/errors';
import { buildNav } from '@/lib/nav';
import { loginUrl } from '@/lib/navigation';
import { useMe } from '@/lib/session';
import { RAIL_COOKIE } from '@/lib/ui-prefs';
import { Sidebar } from './sidebar';
import { TopBar } from './top-bar';

function saveRail(rail: boolean): void {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${RAIL_COOKIE}=${rail ? '1' : '0'}; Path=/; Max-Age=31536000; SameSite=Strict${secure}`;
}

/**
 * Portal frame (design rules: AppShell). The sidebar is 264 px or an 84 px rail (remembered in a
 * cookie, read on the server so there is no flash); below 900 px it becomes a drawer with a focus
 * trap and Esc. The page renders only for a signed-in person.
 */
export function AppShell({ initialRail, children }: { initialRail: boolean; children: ReactNode }) {
  const me = useMe();
  const router = useRouter();
  const path = usePathname();
  const qc = useQueryClient();
  const [rail, setRail] = useState(initialRail);
  const [drawer, setDrawer] = useState(false);
  const items = useMemo(() => (me.data ? buildNav(me.data) : []), [me.data]);

  useEffect(() => {
    if (me.error instanceof SessionEndedError) router.replace(loginUrl(path));
  }, [me.error, router, path]);

  async function logout(): Promise<void> {
    try {
      await api('/api/auth/logout', { method: 'POST', noRefresh: true });
    } catch {
      /* the session may already be gone; sign-out still completes locally */
    }
    qc.clear();
    router.replace('/login');
    toast.success('You are signed out.');
  }

  function toggleRail(): void {
    setRail((r) => {
      saveRail(!r);
      return !r;
    });
  }

  if (!me.data) {
    return (
      <div className="flex min-h-dvh items-center justify-center gap-3 text-muted" role="status">
        {me.error && !(me.error instanceof SessionEndedError) ? (
          <span>{me.error.message}</span>
        ) : (
          <>
            <Spinner />
            <span>Loading…</span>
          </>
        )}
      </div>
    );
  }

  const sidebar = (mobile: boolean) => (
    <Sidebar
      items={items}
      rail={mobile ? false : rail}
      onToggleRail={mobile ? undefined : toggleRail}
      onNavigate={
        mobile
          ? () => {
              setDrawer(false);
            }
          : undefined
      }
      onLogout={() => void logout()}
      isAdmin={me.data.isAdmin}
    />
  );

  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only z-50 rounded-[10px] bg-navy px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <aside
        className={
          'sticky top-0 z-20 hidden h-dvh flex-none transition-[width] duration-200 nav:block ' +
          (rail ? 'w-sidebar-rail' : 'w-sidebar')
        }
      >
        {sidebar(false)}
      </aside>
      <RD.Root open={drawer} onOpenChange={setDrawer}>
        <RD.Portal>
          <RD.Overlay className="fixed inset-0 z-40 bg-[rgba(13,43,69,0.45)] nav:hidden" />
          <RD.Content
            aria-label="Main menu"
            className="fixed inset-y-0 left-0 z-50 w-sidebar max-w-[85vw] shadow-[0_0_40px_rgba(0,0,0,0.3)] nav:hidden"
          >
            <RD.Title className="sr-only">Main menu</RD.Title>
            <RD.Description className="sr-only">Portal sections</RD.Description>
            {sidebar(true)}
          </RD.Content>
        </RD.Portal>
      </RD.Root>
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          me={me.data}
          onOpenMenu={() => {
            setDrawer(true);
          }}
          onLogout={() => void logout()}
        />
        <main
          id="main"
          tabIndex={-1}
          className="relative flex-1 bg-[linear-gradient(120deg,rgba(255,255,255,0)_52%,rgba(27,154,160,0.07)_52%,rgba(27,154,160,0.07)_60%,rgba(255,255,255,0)_60%,rgba(255,255,255,0)_66%,rgba(27,154,160,0.05)_66%,rgba(27,154,160,0.05)_74%,rgba(255,255,255,0)_74%),linear-gradient(180deg,#E9F2F6_0,var(--color-bg)_260px)] bg-size-[100%_260px,100%_100%] bg-top-right bg-no-repeat px-3.5 pt-[18px] pb-10 outline-none nav:px-8 nav:pt-7 nav:pb-12"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
