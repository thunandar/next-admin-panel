'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { reviewsApi, type AdminReview } from '@/lib/api';
import Button, { IconBtn } from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import SectionHead from '@/components/ui/SectionHead';
import Tabs from '@/components/ui/Tabs';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { I } from '@/components/ui/Icons';

type Tab = 'all' | '5' | '4' | '3' | '2' | '1';

const PAGE_SIZE = 50;

const TH_STYLE: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 16px',
  fontSize: 11.5,
  fontWeight: 500,
  color: 'var(--ink-3)',
  textTransform: 'uppercase',
  letterSpacing: 0.04,
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          style={{
            color: i < rating ? 'var(--terracotta, #C26A47)' : 'var(--line-2)',
            display: 'inline-flex',
          }}
        >
          <I.star_f size={13} />
        </span>
      ))}
    </span>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [totalReviews, setTotalReviews] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<AdminReview | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reviewsApi.list({
        page: currentPage,
        limit: PAGE_SIZE,
        rating: tab === 'all' ? undefined : Number(tab),
        search: search.trim() || undefined,
      });
      setReviews(res.reviews);
      setTotalReviews(res.totalReviews);
      setTotalPages(res.totalPages || 1);
      setAvgRating(res.avgRating);
    } catch {
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [currentPage, tab, search]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [tab, search]);

  const ratingCounts = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      counts[r.rating] = (counts[r.rating] || 0) + 1;
    });
    return counts;
  }, [reviews]);

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await reviewsApi.remove(confirmDelete.id);
      toast.success('Review deleted');
      setConfirmDelete(null);
      fetch();
    } catch {
      toast.error('Failed to delete review');
    } finally {
      setDeleting(false);
    }
  }

  async function togglePublished(review: AdminReview) {
    setTogglingId(review.id);
    const next = !review.published;
    setReviews((rs) => rs.map((r) => (r.id === review.id ? { ...r, published: next } : r)));
    try {
      await reviewsApi.setPublished(review.id, next);
      toast.success(next ? 'Review is now visible on the shop' : 'Review hidden from the shop');
    } catch {
      setReviews((rs) => rs.map((r) => (r.id === review.id ? { ...r, published: !next } : r)));
      toast.error('Failed to update review');
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHead
        title="Reviews"
        sub={`${totalReviews} ${totalReviews === 1 ? 'review' : 'reviews'} · avg ${avgRating != null ? avgRating.toFixed(1) : '—'}`}
      />

      <div className="flex items-center gap-2 flex-wrap">
        <Tabs<Tab>
          tabs={[
            { value: 'all', label: 'All', count: totalReviews },
            { value: '5', label: '5 stars', count: ratingCounts[5] },
            { value: '4', label: '4 stars', count: ratingCounts[4] },
            { value: '3', label: '3 stars', count: ratingCounts[3] },
            { value: '2', label: '2 stars', count: ratingCounts[2] },
            { value: '1', label: '1 star', count: ratingCounts[1] },
          ]}
          value={tab}
          onChange={setTab}
        />
        <div className="ml-auto">
          <Input
            inputSize="sm"
            icon={<I.search />}
            placeholder="Search by product"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            full={false}
            style={{ width: 280 }}
          />
        </div>
      </div>

      <Card padding={0}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-muted)' }}>
                {['Product', 'Rating', 'Reviewer', 'Comment', 'Date', 'Status', ''].map((h) => (
                  <th key={h} style={TH_STYLE}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'var(--ink-4)' }}>
                    Loading…
                  </td>
                </tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'var(--ink-4)' }}>
                    {search || tab !== 'all' ? 'No reviews match this filter.' : 'No reviews yet.'}
                  </td>
                </tr>
              ) : (
                reviews.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ color: 'var(--ink)', fontWeight: 500 }}>
                        {r.product?.name ?? `Product #${r.productId}`}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                        R-{String(r.id).padStart(4, '0')}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <Stars rating={r.rating} />
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ color: 'var(--ink-2)' }}>
                        {r.user?.name ?? 'Unknown'}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                        {r.user?.email ?? ''}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--ink-2)', maxWidth: 420 }}>
                      <div
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          lineHeight: 1.45,
                        }}
                        title={r.comment ?? ''}
                      >
                        {r.comment || <span style={{ color: 'var(--ink-4)' }}>—</span>}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--ink-3)' }} className="t-num">
                      {new Date(r.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '3px 9px',
                          borderRadius: 999,
                          fontSize: 11.5,
                          fontWeight: 500,
                          background: r.published ? 'var(--sage-soft, #E6EDE2)' : 'var(--bg-muted)',
                          color: r.published ? 'var(--sage-2, #56745A)' : 'var(--ink-3)',
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 999,
                            background: r.published ? 'var(--sage, #7A9F7E)' : 'var(--ink-4, #B5ADA1)',
                          }}
                        />
                        {r.published ? 'Visible' : 'Hidden'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <IconBtn
                        icon={r.published ? <I.eye_off /> : <I.eye />}
                        variant="ghost"
                        size={28}
                        aria-label={r.published ? 'Hide from shop' : 'Show on shop'}
                        title={r.published ? 'Hide from shop' : 'Show on shop'}
                        onClick={() => togglePublished(r)}
                        disabled={togglingId === r.id}
                      />
                      <IconBtn
                        icon={<I.trash />}
                        variant="ghost"
                        size={28}
                        aria-label="Delete review"
                        onClick={() => setConfirmDelete(r)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div
            className="flex items-center justify-between"
            style={{ padding: '12px 20px', borderTop: '1px solid var(--line)' }}
          >
            <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1 || loading}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages || loading}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Modal
        open={!!confirmDelete}
        title="Delete review?"
        description={
          confirmDelete
            ? `${confirmDelete.user?.name ?? 'Reviewer'}'s ${confirmDelete.rating}-star review of ${confirmDelete.product?.name ?? 'this product'} will be removed.`
            : undefined
        }
        onClose={() => !deleting && setConfirmDelete(null)}
      >
        <div className="flex justify-end gap-3 mt-2">
          <Button
            variant="secondary"
            onClick={() => setConfirmDelete(null)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button variant="primary" onClick={handleDelete} loading={deleting}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
