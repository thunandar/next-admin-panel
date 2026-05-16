'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { profileApi } from '@/lib/api';
import { getPushState, subscribeToPush, unsubscribeFromPush, type PushState } from '@/lib/push';
import { useAuth } from '@/context/AuthContext';
import { getApiErrorMessage } from '@/lib/utils';
import Card from '@/components/ui/Card';
import SectionHead from '@/components/ui/SectionHead';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Switch from '@/components/ui/Switch';
import Avatar from '@/components/ui/Avatar';
import Divider from '@/components/ui/Divider';
import Field from '@/components/ui/Field';
import Modal from '@/components/ui/Modal';
import { I } from '@/components/ui/Icons';
import type { User, NotificationChannel } from '@/types';

const passwordSchema = z
  .object({
    current: z.string().min(1, 'Current password is required'),
    newPass: z.string().min(8, 'New password must be at least 8 characters'),
    confirm: z.string(),
  })
  .refine((d) => d.newPass === d.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  });

type PasswordForm = z.infer<typeof passwordSchema>;

const NOTIFICATION_ITEMS: Array<{ key: keyof Pick<User, 'notifyNewOrders' | 'notifyLowStock' | 'notifyDailySummary' | 'notifyRefundRequests'>; label: string; hint: string }> = [
  { key: 'notifyNewOrders', label: 'New orders', hint: 'When a customer places an order' },
  { key: 'notifyLowStock', label: 'Low stock alerts', hint: 'When a variant drops below threshold' },
  { key: 'notifyDailySummary', label: 'Daily summary', hint: 'Sales recap each morning' },
  { key: 'notifyRefundRequests', label: 'Refund requests', hint: 'When a customer requests a refund' },
];

const CHANNEL_OPTIONS: Array<{ value: NotificationChannel; label: string }> = [
  { value: 'off', label: 'Off' },
  { value: 'email', label: 'Email only' },
  { value: 'push', label: 'Push only' },
  { value: 'email+push', label: 'Email + push' },
];

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  height: 38,
  padding: '0 12px',
  borderRadius: 8,
  border: '1px solid var(--line-2)',
  background: 'var(--bg-elev)',
  color: 'var(--ink)',
  fontSize: 14,
  fontFamily: 'var(--sans)',
  outline: 'none',
};

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
  });
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [notifications, setNotifications] = useState<Record<string, NotificationChannel>>({
    notifyNewOrders: 'email+push',
    notifyLowStock: 'email',
    notifyDailySummary: 'email',
    notifyRefundRequests: 'push',
  });
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [pushState, setPushState] = useState<PushState>('not-subscribed');
  const [pushBusy, setPushBusy] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 2FA setup state
  const [twoFAModal, setTwoFAModal] = useState<'setup' | 'disable' | null>(null);
  const [twoFASetup, setTwoFASetup] = useState<{ secret: string; qrDataUrl: string } | null>(null);
  const [twoFAToken, setTwoFAToken] = useState('');
  const [twoFAPassword, setTwoFAPassword] = useState('');
  const [twoFABusy, setTwoFABusy] = useState(false);

  const pwHook = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  const hydrate = (p: User) => {
    setProfile(p);
    setForm({
      name: p.name,
      email: p.email,
    });
    setLoginAlerts(p.loginAlerts !== false);
    setNotifications({
      notifyNewOrders: p.notifyNewOrders ?? 'email+push',
      notifyLowStock: p.notifyLowStock ?? 'email',
      notifyDailySummary: p.notifyDailySummary ?? 'email',
      notifyRefundRequests: p.notifyRefundRequests ?? 'push',
    });
  };

  useEffect(() => {
    profileApi.get()
      .then(hydrate)
      .catch(() => toast.error('Failed to load profile'));
    getPushState().then(setPushState).catch(() => {});
  }, []);

  const togglePush = async (next: boolean) => {
    setPushBusy(true);
    try {
      const state = next ? await subscribeToPush() : await unsubscribeFromPush();
      setPushState(state);
      if (next && state === 'subscribed') toast.success('Browser notifications enabled');
      else if (next && state === 'denied') toast.error('Notifications blocked. Allow them in your browser settings.');
      else if (!next) toast.success('Browser notifications disabled');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update notifications');
    } finally {
      setPushBusy(false);
    }
  };

  const twoFactorEnabled = !!profile?.twoFactorEnabled;

  const saveProfile = async () => {
    try {
      const updated = await profileApi.update({
        name: form.name,
        email: form.email,
        loginAlerts,
      });
      hydrate(updated);
      await refreshUser(updated);
      toast.success('Profile saved');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save'));
    }
  };

  const changePassword = async (data: PasswordForm) => {
    setChangingPassword(true);
    try {
      await profileApi.changePassword(data.current, data.newPass);
      toast.success('Password changed');
      pwHook.reset();
      setPwOpen(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to change password'));
    } finally {
      setChangingPassword(false);
    }
  };

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.error('Image must be under 3 MB');
      e.target.value = '';
      return;
    }
    setUploadingAvatar(true);
    try {
      const updated = await profileApi.uploadAvatar(file);
      hydrate(updated);
      await refreshUser(updated);
      toast.success('Avatar updated');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to upload avatar'));
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const updateNotification = (key: string, value: NotificationChannel) => {
    setNotifications((prev) => ({ ...prev, [key]: value }));
  };

  const saveNotifications = async () => {
    setSavingNotifications(true);
    try {
      const updated = await profileApi.update(notifications as Partial<User>);
      hydrate(updated);
      toast.success('Notification preferences saved');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save'));
    } finally {
      setSavingNotifications(false);
    }
  };

  const onTwoFactorToggle = async (next: boolean) => {
    if (next) {
      setTwoFABusy(true);
      try {
        const setup = await profileApi.setup2FA();
        setTwoFASetup(setup);
        setTwoFAToken('');
        setTwoFAModal('setup');
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Failed to start 2FA setup'));
      } finally {
        setTwoFABusy(false);
      }
    } else {
      setTwoFAPassword('');
      setTwoFAModal('disable');
    }
  };

  const verifyTwoFactor = async () => {
    if (!twoFAToken.trim()) {
      toast.error('Enter the 6-digit code');
      return;
    }
    setTwoFABusy(true);
    try {
      const updated = await profileApi.verify2FA(twoFAToken.trim());
      hydrate(updated);
      toast.success('Two-factor authentication enabled');
      setTwoFAModal(null);
      setTwoFASetup(null);
      setTwoFAToken('');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Invalid code'));
    } finally {
      setTwoFABusy(false);
    }
  };

  const disableTwoFactor = async () => {
    if (!twoFAPassword) {
      toast.error('Password is required');
      return;
    }
    setTwoFABusy(true);
    try {
      const updated = await profileApi.disable2FA(twoFAPassword);
      hydrate(updated);
      toast.success('Two-factor authentication disabled');
      setTwoFAModal(null);
      setTwoFAPassword('');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to disable 2FA'));
    } finally {
      setTwoFABusy(false);
    }
  };

  if (!user) return null;

  return (
    <div style={{ padding: '28px 32px', maxWidth: 920, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHead title="Profile" sub="Your personal admin account." />

      <Card padding={28}>
        <div className="flex items-center gap-5" style={{ marginBottom: 24 }}>
          <Avatar name={profile?.name || user.name} src={profile?.avatarUrl ?? undefined} size={72} />
          <div className="flex-1">
            <div style={{ fontFamily: 'var(--serif)', fontSize: 28, color: 'var(--ink)' }}>
              {profile?.name || user.name}
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>
              {user.role === 'super_admin' ? 'Owner' : user.role === 'admin' ? 'Admin' : 'Member'}{' '}
              · joined{' '}
              {new Date(profile?.createdAt ?? user.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                year: 'numeric',
              })}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            style={{ display: 'none' }}
            onChange={handleAvatarFile}
          />
          <Button
            variant="secondary"
            size="sm"
            icon={<I.upload />}
            loading={uploadingAvatar}
            onClick={() => fileInputRef.current?.click()}
          >
            Change photo
          </Button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Full name">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={INPUT_STYLE}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              style={INPUT_STYLE}
            />
          </Field>
        </div>
        <div className="flex justify-end mt-4">
          <Button variant="primary" size="sm" icon={<I.check />} onClick={saveProfile}>
            Save changes
          </Button>
        </div>
      </Card>

      <Card padding={28}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="t-h4">Security</div>
            <div className="t-small">Protect your account.</div>
          </div>
          <Badge tone={twoFactorEnabled ? 'success' : 'warn'} dot>
            {twoFactorEnabled ? 'Strong' : 'Review'}
          </Badge>
        </div>

        <div
          className="flex items-center justify-between"
          style={{ padding: '14px 0' }}
        >
          <div>
            <div style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 500 }}>
              Password
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>
              Keep it strong and unique.
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setPwOpen((v) => !v)}>
            {pwOpen ? 'Cancel' : 'Change'}
          </Button>
        </div>

        {pwOpen && (
          <form
            onSubmit={pwHook.handleSubmit(changePassword)}
            className="flex flex-col gap-3"
            style={{ paddingBottom: 12 }}
          >
            <Field label="Current password" error={pwHook.formState.errors.current?.message}>
              <input
                type="password"
                {...pwHook.register('current')}
                style={INPUT_STYLE}
              />
            </Field>
            <Field label="New password" error={pwHook.formState.errors.newPass?.message}>
              <input
                type="password"
                {...pwHook.register('newPass')}
                style={INPUT_STYLE}
              />
            </Field>
            <Field label="Confirm new password" error={pwHook.formState.errors.confirm?.message}>
              <input
                type="password"
                {...pwHook.register('confirm')}
                style={INPUT_STYLE}
              />
            </Field>
            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={changingPassword}
                icon={<I.check />}
              >
                Update password
              </Button>
            </div>
          </form>
        )}

        <Divider />

        <div
          className="flex items-center justify-between"
          style={{ padding: '14px 0' }}
        >
          <div>
            <div style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 500 }}>
              Two-factor authentication
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>
              {twoFactorEnabled ? 'Authenticator app — enabled' : 'Use an authenticator app'}
            </div>
          </div>
          <Switch checked={twoFactorEnabled} onChange={onTwoFactorToggle} disabled={twoFABusy} />
        </div>

        <Divider />

        <div
          className="flex items-center justify-between"
          style={{ padding: '14px 0' }}
        >
          <div>
            <div style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 500 }}>
              Login alerts
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>
              Email me on new device login
            </div>
          </div>
          <Switch checked={loginAlerts} onChange={setLoginAlerts} />
        </div>
      </Card>

      <Card padding={28}>
        <div className="t-h4" style={{ marginBottom: 4 }}>
          Notifications
        </div>
        <div className="t-small" style={{ marginBottom: 16 }}>
          How and when we contact you.
        </div>
        <div
          className="flex items-center justify-between gap-4"
          style={{ padding: '14px 0', borderBottom: '1px solid var(--line)' }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 500 }}>Browser notifications</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>
              {pushState === 'unsupported'
                ? "This browser doesn't support push notifications."
                : pushState === 'denied'
                ? 'Blocked. Allow notifications in your browser settings to enable.'
                : pushState === 'subscribed'
                ? 'You’ll get OS-level alerts on this device for events set to push.'
                : 'Enable to receive OS-level alerts on this device for events set to push.'}
            </div>
          </div>
          <Switch
            checked={pushState === 'subscribed'}
            onChange={togglePush}
            disabled={pushBusy || pushState === 'unsupported' || pushState === 'denied'}
          />
        </div>
        {NOTIFICATION_ITEMS.map((item, i) => (
          <div
            key={item.key}
            className="flex items-center justify-between gap-4"
            style={{
              padding: '14px 0',
              borderTop: i > 0 ? '1px solid var(--line)' : 'none',
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 500 }}>{item.label}</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>{item.hint}</div>
            </div>
            <select
              value={notifications[item.key] ?? 'off'}
              onChange={(e) => updateNotification(item.key, e.target.value as NotificationChannel)}
              style={{ ...INPUT_STYLE, width: 160 }}
            >
              {CHANNEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        ))}
        <div className="flex justify-end mt-4">
          <Button variant="primary" size="sm" icon={<I.check />} loading={savingNotifications} onClick={saveNotifications}>
            Save preferences
          </Button>
        </div>
      </Card>

      <Modal
        open={twoFAModal === 'setup'}
        title="Enable two-factor authentication"
        description="Scan the QR code with an authenticator app, then enter the 6-digit code to confirm."
        onClose={() => { setTwoFAModal(null); setTwoFASetup(null); setTwoFAToken(''); }}
      >
        {twoFASetup && (
          <div className="flex flex-col gap-4">
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={twoFASetup.qrDataUrl} alt="2FA QR code" style={{ width: 200, height: 200, borderRadius: 8, border: '1px solid var(--line)' }} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', textAlign: 'center' }}>
              Or enter manually: <code style={{ background: 'var(--bg-elev)', padding: '2px 6px', borderRadius: 4, fontFamily: 'var(--mono, monospace)', fontSize: 11 }}>{twoFASetup.secret}</code>
            </div>
            <Field label="6-digit code">
              <input
                value={twoFAToken}
                onChange={(e) => setTwoFAToken(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                style={INPUT_STYLE}
              />
            </Field>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" size="sm" onClick={() => { setTwoFAModal(null); setTwoFASetup(null); setTwoFAToken(''); }} disabled={twoFABusy}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" icon={<I.check />} loading={twoFABusy} onClick={verifyTwoFactor}>
                Verify & enable
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={twoFAModal === 'disable'}
        title="Disable two-factor authentication"
        description="Confirm your password to turn off 2FA on this account."
        onClose={() => { setTwoFAModal(null); setTwoFAPassword(''); }}
      >
        <div className="flex flex-col gap-4">
          <Field label="Password">
            <input
              type="password"
              value={twoFAPassword}
              onChange={(e) => setTwoFAPassword(e.target.value)}
              autoComplete="current-password"
              style={INPUT_STYLE}
            />
          </Field>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" size="sm" onClick={() => { setTwoFAModal(null); setTwoFAPassword(''); }} disabled={twoFABusy}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" loading={twoFABusy} onClick={disableTwoFactor}>
              Disable 2FA
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
