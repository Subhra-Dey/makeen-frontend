'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Lock, Mail } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { AuthInput } from '@/components/forms/auth-input';
import { Button } from '@/components/ui/button';
import { MessageBox } from '@/components/ui/panel';
import { api } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { safeNext } from '@/lib/navigation';
import {
  AUTH_MESSAGES,
  DEFAULT_EMAIL_DOMAINS,
  isAllowedEmail,
  loginSchema,
  type SignInResponse,
} from '@/shared';

/** UXV-1: both fields required and a MAKEEN email (the API checks its configured domains too). */
const schema = loginSchema.superRefine((v, ctx) => {
  if (!isAllowedEmail(v.email, DEFAULT_EMAIL_DOMAINS)) {
    ctx.addIssue({ code: 'custom', path: ['email'], message: AUTH_MESSAGES.emailNotMakeen });
  }
});
type Values = { email: string; password: string };

/** What to tell the person for each sign-in answer (UXV-2, UXV-3; D-63). */
function messageFor(e: unknown): { text: string; changePassword?: boolean } {
  if (!(e instanceof ApiError)) return { text: 'Something went wrong. Please try again.' };
  switch (e.code) {
    case 'INVALID_CREDENTIALS':
      return { text: AUTH_MESSAGES.wrongCredentials };
    case 'LOGIN_INACTIVE':
      return { text: AUTH_MESSAGES.inactive };
    case 'PASSWORD_CHANGE_REQUIRED':
      return { text: AUTH_MESSAGES.passwordChangeRequired, changePassword: true };
    default:
      return { text: e.message };
  }
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const [failure, setFailure] = useState<{ text: string; changePassword?: boolean } | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: Values): Promise<void> {
    setFailure(null);
    try {
      await api<SignInResponse>('/api/auth/login', { method: 'POST', body: values });
      qc.clear();
      router.replace(safeNext(params.get('next')));
    } catch (e: unknown) {
      if (e instanceof ApiError && e.code === 'VALIDATION_FAILED') {
        for (const [path, message] of Object.entries(e.fieldErrors())) {
          if (path === 'email' || path === 'password') setError(path, { message });
        }
        return;
      }
      setFailure(messageFor(e));
    }
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => void handleSubmit(onSubmit)(e)}
      noValidate
    >
      <div>
        <h1 className="text-[32px] font-bold tracking-[-0.02em] text-navy nav:text-[42px]">
          Welcome Back
        </h1>
        <p className="mt-2 mb-1.5 text-[16px] text-muted">
          Sign in to continue to MAKEEN Energy India — Facility Management
        </p>
      </div>
      <AuthInput
        label="Email"
        type="email"
        autoComplete="username"
        placeholder="name@makeenenergy.com"
        icon={<Mail className="size-5" strokeWidth={1.8} />}
        error={errors.email?.message}
        {...register('email')}
      />
      <AuthInput
        label="Password"
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        reveal
        icon={<Lock className="size-5" strokeWidth={1.8} />}
        error={errors.password?.message}
        {...register('password')}
      />
      {failure && (
        <MessageBox tone="error" role="alert">
          {failure.text}
          {failure.changePassword && (
            <>
              {' '}
              <Link href="/change-password" className="font-semibold underline">
                Change password
              </Link>
            </>
          )}
        </MessageBox>
      )}
      <div className="flex items-center justify-between text-[14px]">
        <span className="text-muted">MAKEEN email only</span>
        <Link href="/change-password" className="text-teal-ink">
          Change password?
        </Link>
      </div>
      <Button type="submit" variant="dark" size="big" busy={isSubmitting}>
        Sign In
        {!isSubmitting && <ArrowRight aria-hidden="true" className="size-[18px]" />}
      </Button>
      <p className="m-0 text-center text-[14px]">
        First time, or reset by Admin? Use{' '}
        <Link href="/change-password" className="text-teal-ink">
          Change password
        </Link>{' '}
        to set your password with an OTP.
      </p>
    </form>
  );
}
