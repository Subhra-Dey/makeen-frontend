'use client';

import { ArrowLeft, ArrowRight, KeyRound, Lock, Mail, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type SyntheticEvent } from 'react';
import { toast } from 'sonner';
import { AuthInput } from '@/components/forms/auth-input';
import { Button } from '@/components/ui/button';
import { MessageBox } from '@/components/ui/panel';
import { api } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { cn } from '@/lib/cn';
import {
  AUTH_MESSAGES,
  DEFAULT_EMAIL_DOMAINS,
  changePasswordSchema,
  emailSchema,
  isAllowedEmail,
  type MeResponse,
  type OtpChannelOption,
  type OtpSent,
} from '@/shared';

type Channel = OtpChannelOption['channel'];

const CHANNEL_LABEL: Record<Channel, string> = { SMS: 'Mobile number OTP', EMAIL: 'Email OTP' };

/**
 * Change password (spec Change password 1–7): one screen sets a first password, changes it and
 * recovers after an Admin reset. Contacts come from KEKA, masked; the OTP goes only to the chosen
 * method; a new Send / Resend cancels the earlier OTP (enforced by the API).
 */
export function ChangePasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [options, setOptions] = useState<OtpChannelOption[] | null>(null);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [sent, setSent] = useState<OtpSent | null>(null);
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState<'options' | 'send' | 'update' | null>(null);

  // Opened from the signed-in name: the email is already known (spec field 1).
  useEffect(() => {
    const ctrl = new AbortController();
    api<MeResponse>('/api/me', { noRefresh: true, signal: ctrl.signal })
      .then((me) => {
        setEmail((e) => e || me.user.email);
      })
      .catch(() => undefined);
    return () => {
      ctrl.abort();
    };
  }, []);

  function checkEmail(): string | null {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setEmailError(parsed.error.issues[0]?.message ?? AUTH_MESSAGES.emailInvalid);
      return null;
    }
    if (!isAllowedEmail(parsed.data, DEFAULT_EMAIL_DOMAINS)) {
      setEmailError(AUTH_MESSAGES.emailNotMakeen);
      return null;
    }
    setEmailError(undefined);
    return parsed.data;
  }

  async function loadOptions(): Promise<void> {
    const value = checkEmail();
    if (value === null) return;
    setBusy('options');
    setFailure(null);
    try {
      const res = await api<{ channels: OtpChannelOption[] }>('/api/auth/password/options', {
        method: 'POST',
        body: { email: value },
      });
      setOptions(res.channels);
      setChannel((c) => c ?? res.channels[0]?.channel ?? null);
      setSent(null);
    } catch (e: unknown) {
      setOptions(null);
      setFailure(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  async function sendOtp(to: Channel | null = channel): Promise<void> {
    const value = checkEmail();
    if (value === null) return;
    if (to === null) {
      setFieldErrors({ channel: AUTH_MESSAGES.channelRequired });
      return;
    }
    setBusy('send');
    setFailure(null);
    setFieldErrors({});
    try {
      const res = await api<OtpSent>('/api/auth/password/otp', {
        method: 'POST',
        body: { email: value, channel: to },
      });
      setChannel(to);
      setSent(res);
      setOtp('');
    } catch (e: unknown) {
      if (e instanceof ApiError && e.code === 'VALIDATION_FAILED') setFieldErrors(e.fieldErrors());
      else
        setFailure(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  async function update(e: SyntheticEvent): Promise<void> {
    e.preventDefault();
    if (!sent) {
      await sendOtp();
      return;
    }
    const parsed = changePasswordSchema.safeParse({
      email,
      otp,
      newPassword: password,
      confirmPassword: confirm,
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) {
        const k = String(i.path[0] ?? '');
        errs[k] ??= i.message;
      }
      setFieldErrors(errs);
      return;
    }
    setBusy('update');
    setFailure(null);
    setFieldErrors({});
    try {
      await api('/api/auth/password', { method: 'POST', body: parsed.data });
      toast.success('Password updated. Sign in with your email and the new password.');
      router.replace('/login');
    } catch (err: unknown) {
      if (err instanceof ApiError && err.code === 'VALIDATION_FAILED')
        setFieldErrors(err.fieldErrors());
      else
        setFailure(
          err instanceof ApiError ? err.message : 'Something went wrong. Please try again.',
        );
    } finally {
      setBusy(null);
    }
  }

  const other = options?.find((o) => o.channel !== channel) ?? null;

  return (
    <form className="flex flex-col gap-5" onSubmit={(e) => void update(e)} noValidate>
      <div>
        <Link
          href="/login"
          className="inline-flex min-h-touch items-center gap-1.5 text-[14px] text-muted"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to sign in
        </Link>
        <h1 className="mt-2 text-[32px] font-bold tracking-[-0.02em] text-navy nav:text-[42px]">
          Change password
        </h1>
        <p className="mt-2 mb-1.5 text-[16px] text-muted">
          Set a first password, change it, or recover after an Admin reset.
        </p>
      </div>

      <AuthInput
        label="Email"
        type="email"
        autoComplete="username"
        placeholder="name@makeenenergy.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setOptions(null);
          setSent(null);
        }}
        onBlur={() => {
          if (email && options === null) void loadOptions();
        }}
        icon={<Mail className="size-5" strokeWidth={1.8} />}
        error={emailError}
      />

      {options === null ? (
        <Button variant="outline" busy={busy === 'options'} onClick={() => void loadOptions()}>
          Continue
        </Button>
      ) : (
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="text-[12.5px] font-semibold text-[#2A3E52]">
            Receive OTP by{' '}
            <span className="text-danger" aria-hidden="true">
              *
            </span>
          </legend>
          <div
            className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-2.5"
            role="radiogroup"
          >
            {options.map((o) => {
              const on = o.channel === channel;
              return (
                <button
                  key={o.channel}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => {
                    setChannel(o.channel);
                  }}
                  className={cn(
                    'flex min-h-[62px] cursor-pointer items-center gap-3 rounded-[12px] border bg-surface px-3.5 py-3 text-left text-navy',
                    on ? 'border-2 border-teal bg-[#EEF8F8]' : 'border-input-border',
                  )}
                >
                  {o.channel === 'SMS' ? (
                    <Smartphone aria-hidden="true" className="size-5 flex-none" strokeWidth={1.8} />
                  ) : (
                    <Mail aria-hidden="true" className="size-5 flex-none" strokeWidth={1.8} />
                  )}
                  <span>
                    <b className="block">{CHANNEL_LABEL[o.channel]}</b>
                    <small className="block text-[12.5px] text-muted">
                      {o.destination}
                      {o.channel === 'SMS' ? ' · from KEKA' : ''}
                    </small>
                  </span>
                </button>
              );
            })}
          </div>
          {options.length === 0 && (
            <MessageBox tone="warn">
              No OTP method is available for this login. Ask Admin.
            </MessageBox>
          )}
          {fieldErrors['channel'] && (
            <span role="alert" className="text-[12px] font-medium text-danger-text">
              {fieldErrors['channel']}
            </span>
          )}
        </fieldset>
      )}

      {sent ? (
        <>
          <MessageBox tone="success" role="status">
            OTP sent to {sent.channel === 'SMS' ? 'mobile' : 'email'} {sent.sentTo} · expires{' '}
            {sent.expiresAtIst}
          </MessageBox>
          <div className="-mt-2 flex gap-[18px] text-[13px]">
            <button
              type="button"
              className="min-h-touch cursor-pointer text-teal-ink underline-offset-2 hover:underline"
              disabled={busy !== null}
              onClick={() => void sendOtp(channel)}
            >
              Resend
            </button>
            {other && (
              <button
                type="button"
                className="min-h-touch cursor-pointer text-teal-ink underline-offset-2 hover:underline"
                disabled={busy !== null}
                onClick={() => void sendOtp(other.channel)}
              >
                Use the other method
              </button>
            )}
          </div>
          <AuthInput
            label="OTP"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="6-digit OTP"
            value={otp}
            onChange={(e) => {
              setOtp(e.target.value.replace(/\D/g, ''));
            }}
            icon={<KeyRound className="size-5" strokeWidth={1.8} />}
            error={fieldErrors['otp']}
          />
          <AuthInput
            label="New password"
            type="password"
            autoComplete="new-password"
            placeholder="Minimum 8 characters"
            reveal
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
            }}
            icon={<Lock className="size-5" strokeWidth={1.8} />}
            error={fieldErrors['newPassword']}
          />
          <AuthInput
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter new password"
            reveal
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
            }}
            icon={<Lock className="size-5" strokeWidth={1.8} />}
            error={fieldErrors['confirmPassword']}
          />
        </>
      ) : null}

      {failure && (
        <MessageBox tone="error" role="alert">
          {failure}
        </MessageBox>
      )}

      {options !== null && options.length > 0 && (
        <Button type="submit" variant="dark" size="big" busy={busy === 'send' || busy === 'update'}>
          {sent ? 'Update password' : 'Send OTP'}
          {busy === null && <ArrowRight aria-hidden="true" className="size-[18px]" />}
        </Button>
      )}
    </form>
  );
}
