// Service worker for Web Push (medication/appointment reminders when app is closed)
self.addEventListener('push', (event) => {
  if (!event.data) return
  let payload = { title: 'Reminder', body: '', tag: 'flarecare-reminder' }
  try {
    payload = event.data.json()
  } catch (_) {
    payload.body = event.data.text()
  }
  const title = payload.title || 'FlareCare'
  const options = {
    body: payload.body || 'Reminder',
    tag: payload.tag || 'flarecare-reminder',
    icon: '/icons/seagull.svg',
    badge: '/icons/seagull.svg',
    requireInteraction: true,
    silent: false,
    vibrate: [200, 100, 200],
    data: payload.data || {}
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length) {
        const client = clientList.find(c => c.url.includes(self.location.origin))
        if (client) {
          client.focus()
          if (url !== '/') client.navigate(url)
        } else clientList[0].navigate(url)
      } else if (clients.openWindow) {
        clients.openWindow(url)
      }
    })
  )
})
