'use client';

import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import { Spinner } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { useSearch } from '@/lib/insights';
import { INSIGHT_MESSAGES, type SearchHit } from '@/shared';

const KIND_LABEL: Record<SearchHit['kind'], string> = {
  PLANT: 'Plants',
  DAILY_MIS: 'Daily MIS',
  MONTHLY_MIS: 'Monthly MIS',
  EXCEPTION: 'Daily Exceptions',
  LICENCE: 'Licences',
  AUDIT: 'Audit observations',
};

/** Typed text settles for 200 ms before it is searched. */
function useDebounced(value: string, ms = 200): string {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => {
      setV(value);
    }, ms);
    return () => {
      clearTimeout(t);
    };
  }, [value, ms]);
  return v;
}

const isMac = (): boolean =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

/**
 * Header search pill and command palette (BUILD_PROMPT TopBar): ⌘K / Ctrl+K opens it; it finds
 * plants, reports, exceptions, licences and audit observations on the login's own plants (the API
 * applies module access and row-level security). Arrow keys move, Enter opens, Esc closes.
 */
export function CommandPalette() {
  const router = useRouter();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [active, setActive] = useState(0);
  const term = useDebounced(text);
  const q = useSearch(term);
  const hits = term.trim().length >= 2 ? (q.data ?? []) : [];

  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent): void {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  function close(): void {
    setOpen(false);
    setText('');
    setActive(0);
  }

  function go(hit: SearchHit | undefined): void {
    if (!hit) return;
    close();
    router.push(hit.href);
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (hits.length === 0) return;
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((a) => (a + step + hits.length) % hits.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(hits[active]);
    }
  }

  const shortcut = isMac() ? '⌘K' : 'Ctrl K';
  const optionId = (i: number): string => `${listId}-o${String(i)}`;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
        className="flex h-touch min-w-0 flex-[0_1_560px] cursor-pointer items-center gap-3 rounded-[12px] border border-[#DCE5EC] bg-[#F4F8FB] px-3 text-left text-[#5B6B7C] hover:border-[#C5D3DE] nav:h-[46px] nav:px-4"
      >
        <Search aria-hidden="true" className="size-5 flex-none" strokeWidth={1.8} />
        {/* WCAG 2.5.3: the visible text is the button's name (screen readers hear it on phones too). */}
        <span className="sr-only min-w-0 flex-1 truncate text-[14.5px] text-[#5B6576] min-[640px]:not-sr-only min-[640px]:inline">
          Search anything… (e.g. Plant, Report, Exception)
        </span>
        <kbd className="hidden flex-none rounded-[6px] border border-[#DCE5EC] bg-white px-1.5 py-0.5 font-sans text-[11.5px] text-[#4A5B6E] min-[640px]:inline">
          {shortcut}
        </kbd>
      </button>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (o) setOpen(true);
          else close();
        }}
        title="Search"
        description="Plants, Daily and Monthly MIS, Daily Exceptions, licences and audit observations on your plants. Type a name, a date (dd-mm-yyyy), a highlight or an OB code."
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 rounded-[10px] border border-[#CBD5E1] px-3 focus-within:outline-2 focus-within:outline-teal">
            <Search aria-hidden="true" className="size-[18px] flex-none text-[#5B6B7C]" />
            <input
              autoFocus
              role="combobox"
              aria-label="Search"
              aria-expanded={hits.length > 0}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={hits[active] ? optionId(active) : undefined}
              placeholder="e.g. Yediyur, 16-10-2026, CCTV, OB-0142"
              maxLength={60}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKey}
              className="h-touch min-w-0 flex-1 border-0 bg-transparent text-[14.5px] text-navy outline-none"
            />
            {q.isFetching && <Spinner />}
          </div>
          <p className="sr-only" aria-live="polite">
            {term.trim().length >= 2 && !q.isFetching ? `${String(hits.length)} results` : ''}
          </p>
          {text.trim().length > 0 && text.trim().length < 2 && (
            <p className="m-0 text-[13px] text-muted">{INSIGHT_MESSAGES.searchTooShort}</p>
          )}
          {term.trim().length >= 2 && !q.isFetching && hits.length === 0 && (
            <p className="m-0 py-4 text-center text-[13px] text-muted">No results</p>
          )}
          <ul
            id={listId}
            role="listbox"
            aria-label="Results"
            className="m-0 flex max-h-[50vh] list-none flex-col overflow-y-auto p-0"
          >
            {hits.map((h, i) => {
              const head = i === 0 || hits[i - 1]?.kind !== h.kind;
              return (
                <li
                  key={`${h.kind}-${h.id}`}
                  id={optionId(i)}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => {
                    setActive(i);
                  }}
                  onClick={() => {
                    go(h);
                  }}
                  className="cursor-pointer"
                >
                  {head && (
                    <span className="block px-2 pt-2 pb-1 text-[11.5px] font-bold tracking-[0.06em] text-[#4A5B6E] uppercase">
                      {KIND_LABEL[h.kind]}
                    </span>
                  )}
                  <span
                    className={
                      i === active
                        ? 'block rounded-[8px] bg-teal-light px-2 py-2'
                        : 'block rounded-[8px] px-2 py-2'
                    }
                  >
                    <b className="block text-[14px] text-navy">{h.title}</b>
                    <small className="block truncate text-[12.5px] text-[#4A5B6E]">
                      {h.subtitle}
                    </small>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </Dialog>
    </>
  );
}
