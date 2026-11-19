'use client';

import { DateInput } from '@/components/ui/date-input';
import { Field, SelectInput, TextArea, TextInput } from '@/components/ui/field';
import { YesNo } from '@/components/ui/segmented';
import type { FieldDef } from '@/shared';

const NUMERIC_MODE: Partial<Record<FieldDef['kind'], 'decimal' | 'numeric'>> = {
  mt: 'decimal',
  percent: 'decimal',
  hours: 'decimal',
  rupees: 'decimal',
  litres: 'decimal',
  units: 'decimal',
  ratio: 'decimal',
  count: 'numeric',
  minutes: 'numeric',
};

/** Unit after the label, as in the mockup: “Opening stock (MT)”. */
export function labelOf(def: FieldDef) {
  const unit = def.unit && def.unit !== 'min' && def.unit !== 'cyl' ? def.unit : null;
  return (
    <>
      {def.label}
      {unit && <span className="font-medium text-muted"> ({unit})</span>}
    </>
  );
}

/**
 * One typed field of a report form, driven by its definition (kind, placeholder, decimals,
 * options, max length). Values are kept as typed text; the shared schema parses them on save.
 */
export function FieldInput({
  def,
  value,
  onChange,
  error,
  disabled,
  wide,
  required,
  onDateText,
}: {
  def: FieldDef;
  value: string;
  onChange: (v: string) => void;
  error?: string | undefined;
  disabled?: boolean;
  wide?: boolean;
  /** Required now (e.g. 43 when 42 = Yes), on top of the definition. */
  required?: boolean;
  /** Date fields: whether the typed text is a real date yet. */
  onDateText?: (state: 'ok' | 'invalid') => void;
}) {
  return (
    <Field
      label={labelOf(def)}
      n={def.no}
      required={required ?? def.required}
      error={error}
      className={wide ? 'sm:col-span-2' : undefined}
    >
      {({ id, describedBy, invalid }) => {
        const common = {
          id,
          disabled,
          'aria-describedby': describedBy,
          'aria-invalid': invalid || undefined,
        };
        if (def.kind === 'yesno') {
          return (
            <div id={id} className="flex h-input items-center">
              <YesNo
                label={def.label}
                value={value === 'YES' || value === 'NO' ? value : null}
                disabled={disabled}
                onChange={onChange}
              />
            </div>
          );
        }
        if (def.kind === 'date') {
          return (
            <DateInput
              {...common}
              value={value}
              onChange={(v) => {
                // While the text is not a real date the value is kept and the form is told.
                onDateText?.(v === null ? 'invalid' : 'ok');
                if (v !== null) onChange(v);
              }}
            />
          );
        }
        if (def.kind === 'select') {
          return (
            <SelectInput
              {...common}
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
              }}
            >
              <option value="">{def.placeholder}</option>
              {def.options?.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </SelectInput>
          );
        }
        if (def.kind === 'text' && (def.maxLength ?? 0) > 500) {
          return (
            <TextArea
              {...common}
              placeholder={def.placeholder}
              maxLength={def.maxLength}
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
              }}
            />
          );
        }
        return (
          <TextInput
            {...common}
            type="text"
            inputMode={NUMERIC_MODE[def.kind]}
            placeholder={def.placeholder}
            maxLength={def.kind === 'time' ? 5 : def.maxLength}
            className={NUMERIC_MODE[def.kind] ? 'num' : undefined}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
            }}
          />
        );
      }}
    </Field>
  );
}
