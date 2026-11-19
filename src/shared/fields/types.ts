// MAKEEN domain contract — identical copy in api/src/shared and web/src/shared.
// Edit both copies together; CI (contract.yml) fails if they differ. See DECISIONS D-49.

/** Kinds of field. Each kind fixes the storage type, decimals and default placeholder. */
export type FieldKind =
  | 'plant'
  | 'date'
  | 'month'
  | 'mt' // metric tonnes, Decimal(14,3)
  | 'count' // whole number
  | 'minutes' // whole minutes
  | 'percent' // Decimal(5,2), 0–100
  | 'hours' // Decimal(8,2)
  | 'rupees' // Decimal(14,2)
  | 'litres' // Decimal(14,2)
  | 'units' // kW / kVA / kg etc., Decimal(14,2)
  | 'ratio' // power factor, Decimal(4,3)
  | 'text'
  | 'time' // hh:mm
  | 'yesno'
  | 'select'
  | 'shown'; // displayed by the system, never typed

export const KIND_DECIMALS: Readonly<Record<FieldKind, number>> = {
  plant: 0,
  date: 0,
  month: 0,
  mt: 3,
  count: 0,
  minutes: 0,
  percent: 2,
  hours: 2,
  rupees: 2,
  litres: 2,
  units: 2,
  ratio: 3,
  text: 0,
  time: 0,
  yesno: 0,
  select: 0,
  shown: 0,
};

/** Spec placeholders: MT “0.000”, counts/minutes “0”, % “0.00”, text “Enter …”, dates, time. */
export const KIND_PLACEHOLDER: Readonly<Record<FieldKind, string>> = {
  plant: 'Select plant',
  date: 'dd-mm-yyyy',
  month: 'Month yyyy',
  mt: '0.000',
  count: '0',
  minutes: '0',
  percent: '0.00',
  hours: '0.00',
  rupees: '0.00',
  litres: '0.00',
  units: '0.00',
  ratio: '0.000',
  text: 'Enter …',
  time: 'hh:mm',
  yesno: '',
  select: 'Select',
  shown: '',
};

export interface FieldDef<K extends string = string> {
  /** Spec field number. */
  readonly no: number;
  /** Property name in the API, the database (camelCase → snake_case column) and the form. */
  readonly key: K;
  readonly label: string;
  readonly section: string;
  readonly kind: FieldKind;
  /** Unit shown next to the label, e.g. “MT”, “min”, “%”. */
  readonly unit?: string;
  readonly placeholder: string;
  readonly decimals: number;
  /** Required on Submit for approval (Save draft never requires). */
  readonly required?: boolean;
  /** System-shown or system-computed: never accepted from a client (UXV-11, SEC-14). */
  readonly readOnly?: boolean;
  /** Human-readable formula for system sums, e.g. “Σ 21–26”. */
  readonly formula?: string;
  readonly options?: readonly string[];
  /** Text fields: the column length (validation and the input's maxlength). */
  readonly maxLength?: number;
  /** Decimal / whole-number upper bound when tighter than the kind's (e.g. OT hours ≤ 24). */
  readonly maxValue?: number;
}

/** Build a field definition with the kind's default decimals and placeholder. */
export function field<K extends string>(
  no: number,
  key: K,
  label: string,
  section: string,
  kind: FieldKind,
  extra: Partial<Omit<FieldDef<K>, 'no' | 'key' | 'label' | 'section' | 'kind'>> = {},
): FieldDef<K> {
  return {
    no,
    key,
    label,
    section,
    kind,
    placeholder: extra.placeholder ?? KIND_PLACEHOLDER[kind],
    decimals: extra.decimals ?? KIND_DECIMALS[kind],
    ...extra,
  };
}
