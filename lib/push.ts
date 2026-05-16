import { pushApi } from './api'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

export type PushState =
  | 'unsupported'
  | 'denied'
  | 'subscribed'
  | 'not-subscribed'

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const buffer = new ArrayBuffer(raw.length)
  const out = new Uint8Array(buffer)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register('/sw.js')
}

export async function getPushState(): Promise<PushState> {
  if (!isPushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const reg = await getRegistration()
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return 'not-subscribed'
  // Re-sync to backend in case the row was lost (e.g. db reset) while the
  // browser still holds the subscription.
  try { await pushApi.subscribe(sub.toJSON()) } catch {}
  return 'subscribed'
}

export async function subscribeToPush(): Promise<PushState> {
  if (!isPushSupported()) return 'unsupported'

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'not-subscribed'

  const publicKey = VAPID_PUBLIC_KEY || (await pushApi.vapidKey())
  if (!publicKey) throw new Error('Push not configured on server')

  const reg = await getRegistration()
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })
  }
  await pushApi.subscribe(sub.toJSON())
  return 'subscribed'
}

export async function unsubscribeFromPush(): Promise<PushState> {
  if (!isPushSupported()) return 'unsupported'
  const reg = await getRegistration()
  const sub = await reg.pushManager.getSubscription()
  if (sub) {
    await pushApi.unsubscribe(sub.endpoint)
    await sub.unsubscribe()
  }
  return 'not-subscribed'
}
