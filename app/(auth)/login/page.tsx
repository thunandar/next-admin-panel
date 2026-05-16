'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import { I } from '@/components/ui/Icons';
import { getApiErrorMessage } from '@/lib/utils';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  height: 44,
  padding: '0 14px',
  borderRadius: 10,
  border: '1px solid var(--line-2)',
  background: 'var(--bg-elev)',
  color: 'var(--ink)',
  fontSize: 15,
  outline: 'none',
};

function isTwoFactorRequired(err: unknown): boolean {
  return (
    (err as { response?: { data?: { twoFactorRequired?: boolean } } })?.response?.data
      ?.twoFactorRequired === true
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorStep, setTwoFactorStep] = useState<{ email: string; password: string } | null>(
    null,
  );
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [verifying, setVerifying] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
  });

  const onSubmit = async (data: FormData) => {
    try {
      await login(data.email, data.password);
      toast.success('Welcome back.');
    } catch (err: unknown) {
      if (isTwoFactorRequired(err)) {
        setTwoFactorStep({ email: data.email, password: data.password });
        return;
      }
      toast.error(getApiErrorMessage(err, 'Invalid credentials'));
    }
  };

  const onSubmit2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorStep) return;
    const code = twoFactorToken.replace(/\s+/g, '');
    if (code.length < 6) {
      toast.error('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setVerifying(true);
    try {
      await login(twoFactorStep.email, twoFactorStep.password, code);
      toast.success('Welcome back.');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Invalid two-factor code'));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2.5 mb-10">
        <div
          className="flex items-center justify-center"
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'var(--ink)',
            color: 'var(--bg)',
            fontFamily: 'var(--serif)',
            fontStyle: 'italic',
            fontSize: 20,
          }}
        >
          n
        </div>
        <span style={{ fontSize: 15, fontWeight: 500 }}>Nexus Admin</span>
      </div>

      <div
        style={{
          fontFamily: 'var(--serif)',
          fontSize: 40,
          lineHeight: 1.05,
          color: 'var(--ink)',
          letterSpacing: -0.5,
        }}
      >
        {twoFactorStep ? (
          <>
            Two-factor
            <br />
            <span style={{ fontStyle: 'italic', color: 'var(--ink-3)' }}>
              authentication.
            </span>
          </>
        ) : (
          <>
            Welcome back.
            <br />
            <span style={{ fontStyle: 'italic', color: 'var(--ink-3)' }}>
              Sign in to your store.
            </span>
          </>
        )}
      </div>

      {twoFactorStep ? (
        <form onSubmit={onSubmit2FA} className="flex flex-col gap-3 mt-10">
          <p style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 4 }}>
            Enter the 6-digit code from your authenticator app for{' '}
            <strong style={{ color: 'var(--ink)' }}>{twoFactorStep.email}</strong>.
          </p>
          <Field label="Authentication code">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              placeholder="123 456"
              value={twoFactorToken}
              onChange={(e) => setTwoFactorToken(e.target.value)}
              maxLength={7}
              style={{
                ...INPUT_STYLE,
                letterSpacing: 4,
                fontFamily: 'var(--serif)',
                fontSize: 20,
                textAlign: 'center',
              }}
            />
          </Field>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            full
            loading={verifying}
            style={{ marginTop: 8 }}
          >
            Verify and sign in
          </Button>
          <button
            type="button"
            onClick={() => {
              setTwoFactorStep(null);
              setTwoFactorToken('');
            }}
            style={{
              marginTop: 4,
              background: 'transparent',
              border: 0,
              color: 'var(--ink-3)',
              fontSize: 13.5,
              cursor: 'pointer',
              padding: 8,
            }}
          >
            ← Use a different account
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3 mt-10">
          <Field label="Email" error={errors.email?.message}>
            <input
              type="email"
              placeholder="you@nexus.shop"
              {...register('email')}
              style={INPUT_STYLE}
            />
          </Field>
          <Field label="Password" error={errors.password?.message}>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                {...register('password')}
                style={{ ...INPUT_STYLE, paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  top: '50%',
                  right: 10,
                  transform: 'translateY(-50%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  border: 0,
                  background: 'transparent',
                  color: 'var(--ink-3)',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {showPassword ? <I.eye_off size={18} /> : <I.eye size={18} />}
              </button>
            </div>
          </Field>
          <label
            className="flex items-center gap-2 mt-1"
            style={{ fontSize: 13, color: 'var(--ink-2)' }}
          >
            <input
              type="checkbox"
              defaultChecked
              style={{ accentColor: 'var(--ink)' }}
            />
            Remember this device for 30 days
          </label>
          <Button type="submit" variant="primary" size="lg" full loading={isSubmitting} style={{ marginTop: 8 }}>
            Sign in
          </Button>
        </form>
      )}

    </div>
  );
}
