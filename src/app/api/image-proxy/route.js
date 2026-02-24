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

  const pathname = new URL(url).pathname || ''
  const looksLikeImageUrl = /\.(jpe?g|png|gif|webp|avif)(\?|$)/i.test(pathname)

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'image/webp,image/apng,image/*,*/*;q=0.8'
      },
      redirect: 'follow',
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    if (!res.ok) {
      return new Response(null, { status: res.status })
    }
    const ct = (res.headers.get('content-type') || '').toLowerCase().split(';')[0].trim()
    const isImage = ct.startsWith('image/')
    const isOctetStream = ct.includes('octet-stream')
    const acceptAsImage = isImage || isOctetStream || looksLikeImageUrl
    if (!acceptAsImage) {
      return new Response(null, { status: 502 })
    }
    let outContentType = ct
    if (!outContentType || (!outContentType.startsWith('image/') && !outContentType.includes('octet-stream'))) {
      if (/\.webp(\?|$)/i.test(pathname)) outContentType = 'image/webp'
      else if (/\.png(\?|$)/i.test(pathname)) outContentType = 'image/png'
      else if (/\.gif(\?|$)/i.test(pathname)) outContentType = 'image/gif'
      else outContentType = 'image/jpeg'
    }
    return new Response(res.body, {
      headers: {
        'Content-Type': outContentType,
        'Cache-Control': 'public, max-age=86400'
      }
    })
  } catch (err) {
    console.error('[image-proxy]', err.message)
    return new Response(null, { status: 502 })
  }
}
