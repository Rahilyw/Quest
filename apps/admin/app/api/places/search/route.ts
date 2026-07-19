import { NextRequest, NextResponse } from 'next/server'

/** Victoria, BC viewbox: left,top,right,bottom (lng/lat) for Nominatim */
const VICTORIA_VIEWBOX = '-123.45,48.52,-123.28,48.38'

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim()
  if (q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const params = new URLSearchParams({
    q,
    format: 'json',
    addressdetails: '0',
    limit: '10',
    viewbox: VICTORIA_VIEWBOX,
    bounded: '1',
  })

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: {
        'User-Agent': 'QuestAdmin/1.0 (victoria-quest-admin; local-dev)',
        Accept: 'application/json',
      },
      next: { revalidate: 0 },
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `Nominatim error ${res.status}`, results: [] },
        { status: 502 }
      )
    }

    const data = (await res.json()) as Array<{
      place_id: number
      display_name: string
      lat: string
      lon: string
      type?: string
      class?: string
    }>

    const results = data.map((row) => ({
      id: String(row.place_id),
      name: row.display_name.split(',')[0]?.trim() || row.display_name,
      displayName: row.display_name,
      lat: parseFloat(row.lat),
      lng: parseFloat(row.lon),
      type: row.type ?? row.class ?? 'place',
    }))

    return NextResponse.json({ results })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Search failed', results: [] },
      { status: 500 }
    )
  }
}
