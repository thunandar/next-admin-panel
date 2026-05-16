'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { journalApi, type JournalPost } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/utils'
import JournalPostForm from '@/components/admin/JournalPostForm'
import { PageLoader } from '@/components/ui/Spinner'

export default function EditJournalPostPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = Number(params?.id)
  const [post, setPost] = useState<JournalPost | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let active = true
    journalApi.getById(id)
      .then((p) => { if (active) setPost(p) })
      .catch((err) => {
        toast.error(getApiErrorMessage(err, 'Failed to load post'))
        router.push('/admin/journal')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id, router])

  if (loading || !post) return <PageLoader />

  return <JournalPostForm mode="edit" initial={post} />
}
