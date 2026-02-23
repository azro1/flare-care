export async function POST(request) {
  try {
    const body = await request.json()
    console.log('[News] IMAGE FAILED TO LOAD – article excluded:', JSON.stringify(body, null, 2))
    return Response.json({ ok: true })
  } catch {
    return Response.json({ ok: false }, { status: 400 })
  }
}
