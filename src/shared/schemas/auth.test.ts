import {
  AUTH_MESSAGES,
  changePasswordSchema,
  isAllowedEmail,
  isCommonPassword,
  loginSchema,
  passwordProblem,
} from './index';

describe('login input (UXV-1)', () => {
  it('requires email and password with the spec messages', () => {
    const r = loginSchema.safeParse({ email: '', password: '' });
    expect(r.success).toBe(false);
    const messages = r.success ? [] : r.error.issues.map((i) => i.message);
    expect(messages).toContain(AUTH_MESSAGES.emailRequired);
    expect(messages).toContain(AUTH_MESSAGES.passwordRequired);
  });

  it('normalises the email to lower case', () => {
    const r = loginSchema.parse({ email: '  Anita.Sharma@MakeenEnergy.com ', password: 'x' });
    expect(r.email).toBe('anita.sharma@makeenenergy.com');
  });

  it('accepts only the MAKEEN domain (exact match, no subdomains)', () => {
    expect(isAllowedEmail('a@makeenenergy.com', ['makeenenergy.com'])).toBe(true);
    expect(isAllowedEmail('a@MAKEENENERGY.COM', ['makeenenergy.com'])).toBe(true);
    expect(isAllowedEmail('a@evil.makeenenergy.com', ['makeenenergy.com'])).toBe(false);
    expect(isAllowedEmail('a@gmail.com', ['makeenenergy.com'])).toBe(false);
  });
});

describe('password policy (UXV-5, SEC-1)', () => {
  const email = 'anita.sharma@makeenenergy.com';
  it('needs 8+ characters', () => {
    expect(passwordProblem('Ab1!x', email)).toBe(AUTH_MESSAGES.newPasswordShort);
  });
  it('rejects common passwords and simple variants', () => {
    expect(isCommonPassword('Password123!')).toBe(true);
    expect(isCommonPassword('qwerty123')).toBe(true);
    expect(isCommonPassword('11111111')).toBe(true);
    expect(passwordProblem('makeen123', email)).toBe(AUTH_MESSAGES.passwordCommon);
  });
  it('rejects the email name inside the password', () => {
    expect(passwordProblem('Sharma-Plant-2026', email)).toBe(AUTH_MESSAGES.passwordHasEmail);
    expect(passwordProblem('My-anita.sharma-pw', email)).toBe(AUTH_MESSAGES.passwordHasEmail);
  });
  it('accepts a reasonable password', () => {
    expect(passwordProblem('Tumakuru-Carousel-7', email)).toBeNull();
  });
});

describe('change password input (spec “Change password” fields 4–6)', () => {
  const base = {
    email: 'anita.sharma@makeenenergy.com',
    otp: '012345',
    newPassword: 'Tumakuru-Carousel-7',
    confirmPassword: 'Tumakuru-Carousel-7',
  };
  it('accepts a valid request (OTP keeps its leading zero)', () => {
    expect(changePasswordSchema.parse(base).otp).toBe('012345');
  });
  it('requires a 6-digit OTP, 8+ characters and a matching confirmation', () => {
    const r = changePasswordSchema.safeParse({
      ...base,
      otp: '12ab',
      newPassword: 'short',
      confirmPassword: 'other',
    });
    expect(r.success).toBe(false);
    const byPath = r.success
      ? {}
      : Object.fromEntries(r.error.issues.map((i) => [i.path.join('.'), i.message]));
    expect(byPath).toMatchObject({
      otp: AUTH_MESSAGES.otpRequired,
      newPassword: AUTH_MESSAGES.newPasswordShort,
      confirmPassword: AUTH_MESSAGES.confirmMismatch,
    });
  });
});
