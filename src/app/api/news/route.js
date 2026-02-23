import Parser from 'rss-parser'

const MAX_ITEMS = 12
const NEWSAPI_KEY = process.env.NEWSAPI_KEY

// MedlinePlus + Google News fallback (no images)
const MEDLINEPLUS_FEEDS = [
  'https://medlineplus.gov/feeds/topics/crohnsdisease.xml',
  'https://medlineplus.gov/feeds/topics/ulcerativecolitis.xml'
]
const GOOGLE_FEED = 'https://news.google.com/rss/search?q=%22Crohn%27s+disease%22+OR+%22ulcerative+colitis%22+OR+%22inflammatory+bowel+disease%22&hl=en-US&gl=US&ceid=US:en'

export const revalidate = 3600 // 1 hour

async function fetchNewsAPI() {
  if (!NEWSAPI_KEY) return null
  try {
    const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const q = encodeURIComponent('"Crohn\'s disease" OR "ulcerative colitis" OR "inflammatory bowel disease"')
    const res = await fetch(
      `https://newsapi.org/v2/everything?q=${q}&language=en&sortBy=publishedAt&pageSize=25&from=${from}&apiKey=${NEWSAPI_KEY}`
    )
    const data = await res.json()
    if (data.status !== 'ok' || !data.articles?.length) return null

    const exclude = (text, source) => {
      const t = (text || '').toLowerCase()
      const s = (source || '').toLowerCase()
      const ibdRelated = t.includes('crohn') || t.includes('colitis') || t.includes('inflammatory')
      return (
        s.includes('investors business') ||
        t.includes('investors business daily') ||
        ((t.includes('stock market') || t.includes('stock price')) && !ibdRelated)
      )
    }

    const filtered = data.articles.filter(
      (a) => !exclude(a.title, a.source?.name) && !exclude(a.description, null)
    )

    // Prefer articles with images
    const withImages = filtered.filter((a) => a.urlToImage)
    const withoutImages = filtered.filter((a) => !a.urlToImage)
    const articles = [...withImages, ...withoutImages].slice(0, MAX_ITEMS)

    return articles.map((a) => ({
      headline: a.title,
      source: a.source?.name || null,
      link: a.url,
      pubDate: a.publishedAt,
      imageUrl: a.urlToImage || null
    }))
  } catch (_) {
    return null
  }
}

async function fetchMedlinePlus(parser) {
  const seen = new Set()
  const items = []

  for (const url of MEDLINEPLUS_FEEDS) {
    try {
      const feed = await parser.parseURL(url)
      if (!feed?.items?.length) continue

      for (const item of feed.items) {
        const link = item.link || item.guid
        if (!link || seen.has(link)) continue
        seen.add(link)

        const title = item.title || 'Untitled'
        const lastDash = title.lastIndexOf(' - ')
        const headline = lastDash > 0 ? title.slice(0, lastDash).trim() : title
        const source = lastDash > 0 ? title.slice(lastDash + 3).trim() : 'MedlinePlus'

        items.push({
          headline,
          source,
          link,
          pubDate: item.pubDate || item.isoDate || null,
          imageUrl: null
        })
      }
    } catch (_) {
      // Continue with other feeds
    }
  }

  return items
}

async function fetchGoogleNews(parser, seenUrls) {
  const items = []

  try {
    const feed = await parser.parseURL(GOOGLE_FEED)
    if (!feed?.items?.length) return items

    for (const item of feed.items) {
      const link = item.link || item.guid
      if (!link || seenUrls.has(link)) continue

      const title = item.title || 'Untitled'
      const t = title.toLowerCase()
      // Exclude Investors Business Daily and unrelated finance
      if (t.includes('investors business daily')) continue

      seenUrls.add(link)

      const lastDash = title.lastIndexOf(' - ')
      const headline = lastDash > 0 ? title.slice(0, lastDash).trim() : title
      const source = lastDash > 0 ? title.slice(lastDash + 3).trim() : null

      items.push({
        headline,
        source,
        link,
        pubDate: item.pubDate || item.isoDate || null,
        imageUrl: null
      })
    }
  } catch (_) {}

  return items
}

export async function GET() {
  try {
    // 1. NewsAPI first - has real article images, filters out Investors Business Daily
    const newsApiItems = await fetchNewsAPI()
    if (newsApiItems?.length > 0) {
      return Response.json({ items: newsApiItems })
    }

    // 2. Fallback: MedlinePlus + Google News (curated, no images)
    const parser = new Parser()
    const medlineItems = await fetchMedlinePlus(parser)
    const seen = new Set(medlineItems.map((i) => i.link))

    let all = [...medlineItems]
    if (all.length < MAX_ITEMS) {
      const googleItems = await fetchGoogleNews(parser, seen)
      all = [...all, ...googleItems]
    }

    all.sort((a, b) => {
      const da = a.pubDate ? new Date(a.pubDate).getTime() : 0
      const db = b.pubDate ? new Date(b.pubDate).getTime() : 0
      return db - da
    })

    return Response.json({ items: all.slice(0, MAX_ITEMS) })
  } catch (error) {
    console.error('News API error:', error)
    return Response.json({ items: [], error: 'Failed to fetch news' }, { status: 500 })
  }
}
