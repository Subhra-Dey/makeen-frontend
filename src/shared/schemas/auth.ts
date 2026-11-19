// MAKEEN domain contract — identical copy in api/src/shared and web/src/shared.
// Edit both copies together; CI (contract.yml) fails if they differ. See DECISIONS D-49.

import { z } from 'zod';
import { OTP_CHANNELS } from '../enums';
import { isCommonPassword } from './common-passwords';

/** Default allow-list; the API enforces its configured ALLOWED_EMAIL_DOMAINS (D-09). */
export const DEFAULT_EMAIL_DOMAINS = ['makeenenergy.com'] as const;

/** Exact messages (spec “UX validations” 1–5; error texts shown under the fields). */
export const AUTH_MESSAGES = {
  emailRequired: 'Enter your email.',
  emailInvalid: 'Enter a valid email address.',
  emailNotMakeen: 'Use your MAKEEN email (name@makeenenergy.com).',
  passwordRequired: 'Enter your password.',
  /** UXV-2 — never reveals which part is wrong. */
  wrongCredentials: 'Email or password is wrong.',
  /** UXV-3 */
  inactive: 'Login is inactive.',
  passwordChangeRequired: 'Set a new password with Change password before signing in.',
  channelRequired: 'Choose where to receive the OTP.',
  otpRequired: 'Enter the 6-digit OTP.',
  otpInvalid: 'OTP is wrong or has expired. Send a new OTP.',
  newPasswordShort: 'Minimum 8 characters',
  confirmMismatch: 'Passwords do not match.',
  passwordCommon: 'This password is too common. Choose another.',
  passwordHasEmail: 'The password must not contain your email name.',
  otpWait: 'Please wait a minute before requesting another OTP.',
  otpHourly: 'Too many OTP requests. Try again in an hour.',
  tooManyAttempts: 'Too many attempts. Please wait and try again.',
} as const;

/** Exact-domain match, case-insensitive (no subdomains). */
export function isAllowedEmail(email: string, domains: readonly string[]): boolean {
  const at = email.lastIndexOf('@');
  if (at <= 0) return false;
  const domain = email.slice(at + 1).toLowerCase();
  return domains.some((d) => d.toLowerCase() === domain);
}

export const emailSchema = z
  .string({ error: AUTH_MESSAGES.emailRequired })
  .trim()
  .min(1, AUTH_MESSAGES.emailRequired)
  .max(254, AUTH_MESSAGES.emailInvalid)
  .pipe(z.email({ error: AUTH_MESSAGES.emailInvalid }))
  .transform((v) => v.toLowerCase());

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({ error: AUTH_MESSAGES.passwordRequired })
    .min(1, AUTH_MESSAGES.passwordRequired)
    .max(256),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const otpChannelSchema = z.enum(OTP_CHANNELS, { error: AUTH_MESSAGES.channelRequired });

export const otpOptionsSchema = z.object({ email: emailSchema });
export type OtpOptionsInput = z.infer<typeof otpOptionsSchema>;

export const otpSendSchema = z.object({ email: emailSchema, channel: otpChannelSchema });
export type OtpSendInput = z.infer<typeof otpSendSchema>;

/**
 * Password policy (SEC-1): at least 8 characters (spec), not a common password, and not
 * containing the email's local part. Returns the first problem, or null.
 */
export function passwordProblem(password: string, email: string): string | null {
  if (password.length < 8) return AUTH_MESSAGES.newPasswordShort;
  if (isCommonPassword(password)) return AUTH_MESSAGES.passwordCommon;
  const local = email.slice(0, Math.max(0, email.indexOf('@'))).toLowerCase();
  const lower = password.toLowerCase();
  const parts = [local, ...local.split(/[._-]+/)].filter((p) => p.length >= 3);
  if (parts.some((p) => lower.includes(p))) return AUTH_MESSAGES.passwordHasEmail;
  return null;
}

export const changePasswordSchema = z
  .object({
    email: emailSchema,
    otp: z
      .string({ error: AUTH_MESSAGES.otpRequired })
      .trim()
      .regex(/^\d{6}$/, AUTH_MESSAGES.otpRequired),
    newPassword: z
      .string({ error: AUTH_MESSAGES.newPasswordShort })
      .min(8, AUTH_MESSAGES.newPasswordShort)
      .max(128),
    confirmPassword: z.string({ error: AUTH_MESSAGES.confirmMismatch }),
  })
  .superRefine((v, ctx) => {
    if (v.newPassword !== v.confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        path: ['confirmPassword'],
        message: AUTH_MESSAGES.confirmMismatch,
      });
    }
    const problem = passwordProblem(v.newPassword, v.email);
    if (problem !== null && problem !== AUTH_MESSAGES.newPasswordShort) {
      ctx.addIssue({ code: 'custom', path: ['newPassword'], message: problem });
    }
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
