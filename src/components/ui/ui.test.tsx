// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ColumnDef } from '@tanstack/react-table';
import { initials } from '../layout/top-bar';
import { DataTable } from '../data/data-table';
import { KpiCard } from '../data/kpi-card';
import { Field, TextInput } from './field';
import { Pill } from './pill';
import { Segmented, YesNo } from './segmented';

afterEach(() => {
  cleanup();
});

describe('Pill', () => {
  it('carries the word, not just a colour (WCAG 1.4.1)', () => {
    render(<Pill tone="pending">Pending</Pill>);
    expect(screen.getByText('Pending').className).toContain('bg-pending-bg');
  });
});

describe('Field', () => {
  it('links the label, and announces the error under the field', () => {
    render(
      <Field label="Email" required error="Enter your email.">
        {({ id, describedBy, invalid }) => (
          <TextInput id={id} aria-describedby={describedBy} aria-invalid={invalid} />
        )}
      </Field>,
    );
    const input = screen.getByLabelText(/Email/);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert').textContent).toBe('Enter your email.');
    expect(input.getAttribute('aria-describedby')).toBe(screen.getByRole('alert').id);
  });
});

describe('Segmented / YesNo', () => {
  it('is a radio group moved with the arrow keys', async () => {
    const onChange = vi.fn();
    render(
      <Segmented
        label="Daily MIS setting"
        value="SEARCH"
        onChange={onChange}
        options={[
          { value: 'SEARCH', label: 'Search' },
          { value: 'HIDDEN', label: 'Hidden' },
        ]}
      />,
    );
    const search = screen.getByRole('radio', { name: 'Search' });
    expect(search.getAttribute('aria-checked')).toBe('true');
    search.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith('HIDDEN');
  });

  it('shows Yes in amber when chosen', () => {
    render(<YesNo label="Return" value="YES" onChange={() => undefined} />);
    expect(screen.getByRole('radio', { name: 'Yes' }).className).toContain('bg-warning');
  });
});

describe('DataTable', () => {
  const columns: ColumnDef<{ id: string; name: string }>[] = [
    { id: 'name', header: 'Employee name', cell: ({ row }) => row.original.name },
  ];

  it('keeps the headers and says “No rows” when empty', () => {
    render(<DataTable caption="People" columns={columns} rows={[]} getRowId={(r) => r.id} />);
    expect(screen.getByRole('columnheader', { name: 'Employee name' })).toBeTruthy();
    expect(screen.getByText('No rows')).toBeTruthy();
  });

  it('renders rows', () => {
    render(
      <DataTable
        caption="People"
        columns={columns}
        rows={[{ id: '1', name: 'Asha Nair' }]}
        getRowId={(r) => r.id}
      />,
    );
    expect(screen.getByRole('cell', { name: 'Asha Nair' })).toBeTruthy();
  });
});

describe('KpiCard', () => {
  it('formats the count in en-IN and works as a toggle button', async () => {
    const onSelect = vi.fn();
    render(
      <KpiCard
        label="Working"
        value={1234567}
        tone="teal"
        icon={null}
        onSelect={onSelect}
        selected
      />,
    );
    const card = screen.getByRole('button', { name: /Working/ });
    expect(card.textContent).toContain('12,34,567');
    expect(card.getAttribute('aria-pressed')).toBe('true');
    await userEvent.click(card);
    expect(onSelect).toHaveBeenCalledOnce();
  });
});

describe('initials', () => {
  it.each([
    ['Anita Sharma', 'AS'],
    ['S. Karthik', 'SK'],
    ['Gopal', 'G'],
  ])('%s → %s', (name, out) => {
    expect(initials(name)).toBe(out);
  });
});
