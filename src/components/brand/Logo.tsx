/**
 * The single place the MAKEEN logo is drawn. Swap the official logo here only.
 * Mark = docs/brand/logo-placeholder.svg; wordmark = “MAKEEN / ENERGY” as in the mockup.
 * Spec AUTH-1: if the logo file is missing, the words alone are still shown.
 */
interface LogoProps {
  /** `full` = mark + wordmark; `mark` = icon only (collapsed rail). */
  variant?: 'full' | 'mark';
  /** `dark` for navy backgrounds (sidebar), `light` for white backgrounds. */
  tone?: 'dark' | 'light';
  /** `lg` = sign-in screens (58 px mark), `md` = menu (40 px). */
  size?: 'md' | 'lg';
  className?: string;
}

function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={(size * 32) / 40}
      viewBox="0 0 50 40"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M2 3 L22 14 L22 26 L2 37 L9 20 Z" fill="#2BB3B1" />
      <path d="M48 3 L28 14 L28 26 L48 37 L41 20 Z" fill="#1B9AA0" />
      <path d="M2 3 L22 14 L15 18 Z" fill="#7FE0D9" opacity=".55" />
      <path d="M48 37 L28 26 L35 22 Z" fill="#0E7E82" opacity=".6" />
    </svg>
  );
}

export function Logo({ variant = 'full', tone = 'light', size = 'md', className = '' }: LogoProps) {
  const px = size === 'lg' ? 58 : 40;
  if (variant === 'mark') {
    return (
      <span className={className} role="img" aria-label="MAKEEN Energy">
        <LogoMark size={px} />
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-2.5 ${className}`}
      aria-label="MAKEEN Energy"
      role="img"
      data-logo=""
    >
      <LogoMark size={px} />
      <span className="flex flex-col leading-none" aria-hidden="true">
        <b
          className={`font-heading text-[21px] font-bold tracking-[0.01em] ${tone === 'dark' ? 'text-white' : 'text-navy'}`}
        >
          MAKEEN
        </b>
        <small className="mt-[3px] text-[12px] font-semibold tracking-[0.22em] text-logo-energy">
          ENERGY
        </small>
      </span>
    </span>
  );
}
