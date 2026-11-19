'use client';

import * as RD from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Modal dialog on Radix (focus trap, Esc, focus return, aria-modal). Restyled to the tokens: white
 * 14 px panel, navy overlay; full-width sheet on phones.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      <RD.Portal>
        <RD.Overlay className="fixed inset-0 z-40 bg-[rgba(13,43,69,0.45)]" />
        <RD.Content
          className={cn(
            'fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col',
            'rounded-card border border-line bg-surface shadow-[0_16px_40px_rgba(11,39,66,0.18)]',
            wide ? 'max-w-[960px]' : 'max-w-[560px]',
          )}
        >
          <div className="flex items-start justify-between gap-3 border-b border-[#EDF2F6] px-5 py-4">
            <div className="min-w-0">
              <RD.Title className="font-heading text-[17px] font-bold text-navy">{title}</RD.Title>
              {description ? (
                <RD.Description className="m-0 mt-0.5 text-[12.5px] text-[#5B6576]">
                  {description}
                </RD.Description>
              ) : (
                <RD.Description className="sr-only">{title}</RD.Description>
              )}
            </div>
            <RD.Close
              className="-mt-1 -mr-2 flex size-touch flex-none cursor-pointer items-center justify-center rounded-[10px] text-muted hover:bg-[#F1F4F8]"
              aria-label="Close"
            >
              <X aria-hidden="true" className="size-5" />
            </RD.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && (
            <div className="flex flex-wrap justify-end gap-2.5 border-t border-line px-5 py-3.5">
              {footer}
            </div>
          )}
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}
