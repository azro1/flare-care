export const dynamic = 'force-dynamic'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')
  if (!url) return new Response('Missing url', { status: 400 })

  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) return new Response('Invalid url', { status: 400 })
    if (['localhost', '127.0.0.1'].includes(parsed.hostname)) return new Response('Invalid url', { status: 400 })
  } catch {
    return new Response('Invalid url', { status: 400 })
  }

  try {
    console.log('[image-proxy] Fetching:', url.slice(0, 100))
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FlareCare/1.0)',
        Accept: 'image/*'
      },
      redirect: 'follow'
    })
    const host = new URL(url).hostname
    if (!res.ok) {
      console.log('[image-proxy] FAILED', res.status, host, url.slice(0, 80))
      return new Response(null, { status: res.status })
    }
    const ct = (res.headers.get('content-type') || '').toLowerCase()
    const cl = parseInt(res.headers.get('content-length') || '0', 10)
    const isImage = ct.startsWith('image/')
    const minSize = 1000
    if (!isImage || (cl > 0 && cl < minSize)) {
      console.log('[image-proxy] REJECTED not valid image', host, 'Content-Type:', ct?.slice(0, 40), 'Content-Length:', cl)
      return new Response(null, { status: 502 })
    }
    return new Response(res.body, {
      headers: {
        'Content-Type': ct || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400'
      }
    })
  } catch (err) {
    console.error('[image-proxy]', err.message)
    return new Response(null, { status: 502 })
  }
}
