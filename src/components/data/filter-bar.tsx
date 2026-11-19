import type { ReactNode, SyntheticEvent } from 'react';
import { Panel } from '../ui/panel';

/**
 * Search toolbar (mockup `.toolbar`): filter fields, then the page buttons (Search, Submit,
 * Download) side by side (spec “What the three-page buttons do”). Enter in any field searches.
 */
export function FilterBar({
  children,
  actions,
  onSearch,
}: {
  children: ReactNode;
  actions?: ReactNode;
  onSearch: () => void;
}) {
  function submit(e: SyntheticEvent): void {
    e.preventDefault();
    onSearch();
  }
  return (
    <Panel>
      <form
        role="search"
        onSubmit={submit}
        className="flex flex-wrap items-end gap-3 px-[18px] py-4"
      >
        {children}
        <span className="flex-[1_1_20px]" aria-hidden="true" />
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </form>
    </Panel>
  );
}
