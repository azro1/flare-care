import Parser from 'rss-parser'

const MAX_ITEMS = 12

// IBD-focused RSS feeds – Crohn's, colitis, digestive health (no API key needed)
const IBD_RSS_FEEDS = [
  { url: 'https://medlineplus.gov/feeds/topics/crohnsdisease.xml', source: 'MedlinePlus' },
  { url: 'https://medlineplus.gov/feeds/topics/ulcerativecolitis.xml', source: 'MedlinePlus' },
  { url: 'https://www.sciencedaily.com/rss/health_medicine/crohns_disease.xml', source: 'ScienceDaily' },
  { url: 'https://www.sciencedaily.com/rss/health_medicine/colitis.xml', source: 'ScienceDaily' },
  { url: 'https://medicalxpress.com/rss-feed/gastroenterology-news/', source: 'Medical Xpress' },
  { url: 'https://medicalxpress.com/rss-feed/digestive-health-news/', source: 'Medical Xpress' },
  { url: 'https://www.sciencedaily.com/rss/health_medicine/gastrointestinal_problems.xml', source: 'ScienceDaily' }
]

export const revalidate = 3600 // 1 hour

async function fetchOgImage(articleUrl) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(articleUrl, {
      headers: { 'User-Agent': 'FlareCare/1.0 (IBD news)' },
      signal: controller.signal
    })
    clearTimeout(timeout)
    if (!res.ok) return null
    const html = await res.text()
    const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']|content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
    return match ? (match[1] || match[2]).trim() : null
  } catch {
    return null
  }
}

function extractImageUrl(item) {
  const content = item.content || item['content:encoded'] || item.contentSnippet || item.description || ''
  const html = String(content)
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i)
  if (imgMatch) return imgMatch[1]
  if (item.enclosure?.url && (item.enclosure.type || '').startsWith('image/')) return item.enclosure.url
  return null
}

function mentionsIBD(text) {
  if (!text) return false
  const t = String(text).toLowerCase()
  return t.includes('crohn') || t.includes('colitis') || t.includes('inflammatory bowel') || t.includes('ibd') || t.includes('digestive')
}

async function fetchRssFeed(parser, feedConfig, seenUrls) {
  const items = []
  try {
    const feed = await parser.parseURL(feedConfig.url)
    if (!feed?.items?.length) return items

    for (const item of feed.items) {
      const link = item.link || item.guid
      if (!link || seenUrls.has(link)) continue

      const title = item.title || 'Untitled'
      const headline = title.replace(/\s*-\s*(?:MedlinePlus|ScienceDaily|Medical Xpress).*$/i, '').trim()
      const desc = item.contentSnippet || item.content || item.description || ''

      // For Medical Xpress / ScienceDaily broad feeds, filter to IBD-relevant
      if (feedConfig.source !== 'MedlinePlus' && !mentionsIBD(title) && !mentionsIBD(desc)) continue

      seenUrls.add(link)
      const imageUrl = extractImageUrl(item)

      items.push({
        headline: headline.slice(0, 200),
        source: feedConfig.source,
        link,
        pubDate: item.pubDate || item.isoDate || null,
        imageUrl
      })
    }
  } catch (_) {}
  return items
}

export async function GET() {
  try {
    const parser = new Parser({
      timeout: 10000,
      headers: { 'User-Agent': 'FlareCare/1.0 (IBD news aggregator)' }
    })

    const seen = new Set()
    const all = []

    for (const feed of IBD_RSS_FEEDS) {
      const items = await fetchRssFeed(parser, feed, seen)
      all.push(...items)
    }

    all.sort((a, b) => {
      const da = a.pubDate ? new Date(a.pubDate).getTime() : 0
      const db = b.pubDate ? new Date(b.pubDate).getTime() : 0
      return db - da
    })

    // Prefer items with images, then fill with rest
    const withImages = all.filter((i) => i.imageUrl)
    const withoutImages = all.filter((i) => !i.imageUrl)
    let combined = [...withImages, ...withoutImages].slice(0, MAX_ITEMS)

    // Fetch og:image from article pages for items missing images
    const toFetch = combined.filter((i) => !i.imageUrl).slice(0, MAX_ITEMS)
    const results = await Promise.all(toFetch.map((item) => fetchOgImage(item.link)))
    const combinedMap = new Map(combined.map((i) => [i.link, { ...i }]))
    toFetch.forEach((item, idx) => {
      const img = results[idx]
      if (img) combinedMap.get(item.link).imageUrl = img
    })
    combined = Array.from(combinedMap.values())

    return Response.json({ items: combined })
  } catch (error) {
    console.error('News API error:', error)
    return Response.json({ items: [], error: 'Failed to fetch news' }, { status: 500 })
  }
}
