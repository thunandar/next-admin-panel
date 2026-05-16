'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { vendorsApi } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/utils'
import VendorForm from '@/components/admin/VendorForm'
import type { Vendor } from '@/types'

export default function EditVendorPage() {
  const params = useParams()
  const router = useRouter()
  const id = Number(params?.id)
  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    vendorsApi
      .getById(id)
      .then((v) => setVendor(v))
      .catch((err) => {
        toast.error(getApiErrorMessage(err, 'Failed to load vendor'))
        router.push('/admin/vendors')
      })
      .finally(() => setLoading(false))
  }, [id, router])

  if (loading) {
    return (
      <div style={{ padding: '48px 32px', textAlign: 'center', color: 'var(--ink-4)' }}>
        Loading vendor…
      </div>
    )
  }
  if (!vendor) return null
  return <VendorForm mode="edit" vendor={vendor} />
}
