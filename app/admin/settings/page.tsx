'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  settingsApi,
  TRUST_ICON_KEYS,
  type SiteSettings,
  type PromoBannerSetting,
  type HeroSetting,
  type BrandSetting,
  type TrustSetting,
  type TrustIconKey,
} from '@/lib/api';
import { getApiErrorMessage } from '@/lib/utils';
import Card from '@/components/ui/Card';
import SectionHead from '@/components/ui/SectionHead';
import Button from '@/components/ui/Button';
import Switch from '@/components/ui/Switch';
import Field from '@/components/ui/Field';
import Tabs from '@/components/ui/Tabs';
import { I } from '@/components/ui/Icons';

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

const TEXTAREA_STYLE: React.CSSProperties = {
  ...INPUT_STYLE,
  height: 'auto',
  minHeight: 80,
  padding: '10px 12px',
  resize: 'vertical',
  lineHeight: 1.5,
};

type TabKey = 'storefront' | 'hero' | 'brand' | 'trust';

const TABS = [
  { value: 'storefront' as const, label: 'Storefront' },
  { value: 'hero' as const, label: 'Hero' },
  { value: 'brand' as const, label: 'Brand' },
  { value: 'trust' as const, label: 'Trust' },
];

const SELECT_STYLE: React.CSSProperties = {
  width: '100%',
  height: 38,
  padding: '0 10px',
  borderRadius: 8,
  border: '1px solid var(--line-2)',
  background: 'var(--bg-elev)',
  color: 'var(--ink)',
  fontSize: 14,
  fontFamily: 'var(--sans)',
  outline: 'none',
};

export default function SettingsPage() {
  const [tab, setTab] = useState<TabKey>('storefront');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [promoBanner, setPromoBanner] = useState<PromoBannerSetting | null>(null);
  const [hero, setHero] = useState<HeroSetting | null>(null);
  const [brand, setBrand] = useState<BrandSetting | null>(null);
  const [trust, setTrust] = useState<TrustSetting | null>(null);

  const hydrate = (s: SiteSettings) => {
    setPromoBanner(s.promoBanner);
    setHero(s.hero);
    setBrand(s.brand);
    setTrust(s.trust);
  };

  useEffect(() => {
    settingsApi
      .getPublic()
      .then(hydrate)
      .catch((err) => toast.error(getApiErrorMessage(err, 'Failed to load settings')))
      .finally(() => setLoading(false));
  }, []);

  const saveStorefront = async () => {
    if (!promoBanner) return;
    setSaving(true);
    try {
      const updated = await settingsApi.update({ promoBanner });
      hydrate(updated);
      toast.success('Storefront settings saved');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const saveHero = async () => {
    if (!hero) return;
    setSaving(true);
    try {
      const updated = await settingsApi.update({ hero });
      hydrate(updated);
      toast.success('Hero saved');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const saveBrand = async () => {
    if (!brand) return;
    setSaving(true);
    try {
      const updated = await settingsApi.update({ brand });
      hydrate(updated);
      toast.success('Brand saved');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const saveTrust = async () => {
    if (!trust) return;
    setSaving(true);
    try {
      const updated = await settingsApi.update({ trust });
      hydrate(updated);
      toast.success('Trust badges saved');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const updateTrustItem = (idx: number, patch: Partial<{ iconKey: TrustIconKey; title: string; sub: string }>) => {
    if (!trust) return;
    setTrust({
      ...trust,
      items: trust.items.map((item, i) => (i === idx ? { ...item, ...patch } : item)),
    });
  };

  const addTrustItem = () => {
    if (!trust) return;
    setTrust({
      ...trust,
      items: [...trust.items, { iconKey: 'truck', title: '', sub: '' }],
    });
  };

  const removeTrustItem = (idx: number) => {
    if (!trust) return;
    setTrust({ ...trust, items: trust.items.filter((_, i) => i !== idx) });
  };

  return (
    <div style={{ padding: '28px 32px', maxWidth: 920, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHead title="Settings" sub="Storefront-wide content and branding." />

      <Tabs tabs={TABS} value={tab} onChange={(v) => setTab(v as TabKey)} />

      {loading && (
        <Card padding={28}>
          <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Loading…</div>
        </Card>
      )}

      {!loading && tab === 'storefront' && promoBanner && (
        <Card padding={28}>
          <div className="t-h4" style={{ marginBottom: 4 }}>Promo banner</div>
          <div className="t-small" style={{ marginBottom: 20 }}>
            Slim ribbon shown above the storefront header.
          </div>

          <div className="flex items-center justify-between" style={{ padding: '8px 0 18px' }}>
            <div>
              <div style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 500 }}>Show banner</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>
                Toggle visibility on the storefront.
              </div>
            </div>
            <Switch
              checked={promoBanner.enabled}
              onChange={(v) => setPromoBanner({ ...promoBanner, enabled: v })}
            />
          </div>

          <Field label="Message" hint="One line — kept short for the ribbon.">
            <input
              value={promoBanner.message}
              onChange={(e) => setPromoBanner({ ...promoBanner, message: e.target.value })}
              style={INPUT_STYLE}
            />
          </Field>

          <div className="flex justify-end mt-4">
            <Button variant="primary" size="sm" icon={<I.check />} loading={saving} onClick={saveStorefront}>
              Save changes
            </Button>
          </div>
        </Card>
      )}

      {!loading && tab === 'hero' && hero && (
        <Card padding={28}>
          <div className="t-h4" style={{ marginBottom: 4 }}>Hero</div>
          <div className="t-small" style={{ marginBottom: 20 }}>
            The headline section at the top of the storefront home page.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Eyebrow">
              <input
                value={hero.eyebrow}
                onChange={(e) => setHero({ ...hero, eyebrow: e.target.value })}
                style={INPUT_STYLE}
              />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <Field label="Headline · lead">
                <input
                  value={hero.headlineLead}
                  onChange={(e) => setHero({ ...hero, headlineLead: e.target.value })}
                  style={INPUT_STYLE}
                />
              </Field>
              <Field label="Headline · accent" hint="Italic serif emphasis.">
                <input
                  value={hero.headlineAccent}
                  onChange={(e) => setHero({ ...hero, headlineAccent: e.target.value })}
                  style={INPUT_STYLE}
                />
              </Field>
              <Field label="Headline · trail">
                <input
                  value={hero.headlineTrail}
                  onChange={(e) => setHero({ ...hero, headlineTrail: e.target.value })}
                  style={INPUT_STYLE}
                />
              </Field>
            </div>

            <Field label="Body">
              <textarea
                value={hero.body}
                onChange={(e) => setHero({ ...hero, body: e.target.value })}
                style={TEXTAREA_STYLE}
                rows={3}
              />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Primary CTA · label">
                <input
                  value={hero.primaryCtaLabel}
                  onChange={(e) => setHero({ ...hero, primaryCtaLabel: e.target.value })}
                  style={INPUT_STYLE}
                />
              </Field>
              <Field label="Primary CTA · link">
                <input
                  value={hero.primaryCtaHref}
                  onChange={(e) => setHero({ ...hero, primaryCtaHref: e.target.value })}
                  style={INPUT_STYLE}
                />
              </Field>
              <Field label="Secondary CTA · label">
                <input
                  value={hero.secondaryCtaLabel}
                  onChange={(e) => setHero({ ...hero, secondaryCtaLabel: e.target.value })}
                  style={INPUT_STYLE}
                />
              </Field>
              <Field label="Secondary CTA · link">
                <input
                  value={hero.secondaryCtaHref}
                  onChange={(e) => setHero({ ...hero, secondaryCtaHref: e.target.value })}
                  style={INPUT_STYLE}
                />
              </Field>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button variant="primary" size="sm" icon={<I.check />} loading={saving} onClick={saveHero}>
              Save changes
            </Button>
          </div>
        </Card>
      )}

      {!loading && tab === 'brand' && brand && (
        <Card padding={28}>
          <div className="t-h4" style={{ marginBottom: 4 }}>Brand</div>
          <div className="t-small" style={{ marginBottom: 20 }}>
            Identity used across the storefront footer and meta.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Name">
              <input
                value={brand.name}
                onChange={(e) => setBrand({ ...brand, name: e.target.value })}
                style={INPUT_STYLE}
              />
            </Field>
            <Field label="Tagline">
              <textarea
                value={brand.tagline}
                onChange={(e) => setBrand({ ...brand, tagline: e.target.value })}
                style={TEXTAREA_STYLE}
                rows={2}
              />
            </Field>
            <Field label="Location">
              <input
                value={brand.location}
                onChange={(e) => setBrand({ ...brand, location: e.target.value })}
                style={INPUT_STYLE}
              />
            </Field>
          </div>

          <div className="flex justify-end mt-4">
            <Button variant="primary" size="sm" icon={<I.check />} loading={saving} onClick={saveBrand}>
              Save changes
            </Button>
          </div>
        </Card>
      )}

      {!loading && tab === 'trust' && trust && (
        <Card padding={28}>
          <div className="t-h4" style={{ marginBottom: 4 }}>Trust strip</div>
          <div className="t-small" style={{ marginBottom: 20 }}>
            Four-up badge row at the bottom of the storefront. The first two items also show on product pages.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {trust.items.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '140px 1fr 1fr 36px',
                  gap: 10,
                  alignItems: 'end',
                }}
              >
                <Field label={idx === 0 ? 'Icon' : ''}>
                  <select
                    value={item.iconKey}
                    onChange={(e) => updateTrustItem(idx, { iconKey: e.target.value as TrustIconKey })}
                    style={SELECT_STYLE}
                  >
                    {TRUST_ICON_KEYS.map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </Field>
                <Field label={idx === 0 ? 'Title' : ''}>
                  <input
                    value={item.title}
                    onChange={(e) => updateTrustItem(idx, { title: e.target.value })}
                    style={INPUT_STYLE}
                  />
                </Field>
                <Field label={idx === 0 ? 'Subtitle' : ''}>
                  <input
                    value={item.sub}
                    onChange={(e) => updateTrustItem(idx, { sub: e.target.value })}
                    style={INPUT_STYLE}
                  />
                </Field>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<I.trash />}
                  onClick={() => removeTrustItem(idx)}
                  aria-label="Remove badge"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center mt-4">
            <Button variant="ghost" size="sm" icon={<I.plus />} onClick={addTrustItem}>
              Add badge
            </Button>
            <Button variant="primary" size="sm" icon={<I.check />} loading={saving} onClick={saveTrust}>
              Save changes
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
