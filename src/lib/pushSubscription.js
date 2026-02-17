'use client'

/**
 * Web Push subscription: register service worker, subscribe with VAPID public key, save to Supabase.
 * Requires NEXT_PUBLIC_VAPID_PUBLIC_KEY in env (generate with: npx web-push generate-vapid-keys)
 */

const SW_URL = '/sw.js'

export async function isPushSupported() {
  return typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window
}

export function getNotificationPermission() {
  return typeof Notification !== 'undefined' ? Notification.permission : 'default'
}

/** Register the push service worker. Returns the registration or null. */
export async function registerPushSW() {
  if (!isPushSupported()) return null
  try {
    const reg = await navigator.serviceWorker.register(SW_URL, { scope: '/' })
    await reg.update()
    return reg
  } catch (e) {
    console.error('Push SW registration failed:', e)
    return null
  }
}

/** Subscribe for push (prompts permission if needed). Returns PushSubscription or null. */
export async function subscribeForPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!publicKey) {
    console.warn('NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set')
    return null
  }
  const reg = await registerPushSW()
  if (!reg) return null
  try {
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    })
    return sub
  } catch (e) {
    if (e.name === 'NotAllowedError') return null
    console.error('Push subscribe failed:', e)
    return null
  }
}

/** Convert subscription to a JSON-serializable object for storing in DB. */
export function subscriptionToPayload(subscription) {
  const json = subscription.toJSON()
  const p256dh = json.keys?.p256dh
  const auth = json.keys?.auth
  return {
    endpoint: json.endpoint,
    p256dh_key: typeof p256dh === 'string' ? p256dh : arrayBufferToBase64(p256dh),
    auth_key: typeof auth === 'string' ? auth : arrayBufferToBase64(auth)
  }
}

function arrayBufferToBase64(buffer) {
  if (!buffer) return ''
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return typeof btoa !== 'undefined' ? btoa(binary) : Buffer.from(binary).toString('base64')
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = typeof atob !== 'undefined' ? atob(base64) : Buffer.from(base64, 'base64').toString('binary')
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i)
  return output
}

/** Unsubscribe current device (removes from PushManager; caller should delete from Supabase by endpoint). */
export async function unsubscribePush() {
  if (!isPushSupported()) return
  const reg = await navigator.serviceWorker.getRegistration(SW_URL)
  if (reg?.pushManager) {
    const sub = await reg.pushManager.getSubscription()
    if (sub) await sub.unsubscribe()
  }
}
