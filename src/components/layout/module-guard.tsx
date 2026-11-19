'use client';

import type { ReactNode } from 'react';
import { MessageBox } from '@/components/ui/panel';
import { useMe } from '@/lib/session';
import type { Module } from '@/shared';
import { PageBody, PageHeader } from './page-header';

/**
 * Screen-level mirror of the API rule: a module Hidden for every role the person holds shows no
 * screen (ROLE-9). The API refuses every call regardless; this only avoids a page of errors.
 */
export function ModuleGuard({ module, children }: { module: Module; children: ReactNode }) {
  const me = useMe().data;
  if (!me) return null;
  if (me.access.modules[module].length === 0) {
    return (
      <PageBody>
        <PageHeader title="No access" />
        <MessageBox tone="warn" role="alert">
          You do not have access to this.
        </MessageBox>
      </PageBody>
    );
  }
  return <>{children}</>;
}
