import { NextResponse } from 'next/server';
import { youtubeId } from '@/lib/url';

// Cache resolved songs in memory so repeated play clicks are immediate
const cache = new Map<string, { videoId: string; title?: string }>();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const trackUrl = searchParams.get('url') || '';
  const queryTitle = searchParams.get('title') || '';
  const queryArtist = searchParams.get('artist') || '';

  const cacheKey = `${trackUrl}::${queryTitle}::${queryArtist}`;
  if (cache.has(cacheKey)) {
    return NextResponse.json(cache.get(cacheKey));
  }

  // If already a YouTube link
  if (trackUrl && (/youtu\.be/i.test(trackUrl) || /youtube\.com/i.test(trackUrl))) {
    const id = youtubeId(trackUrl);
    if (id) {
      const data = { videoId: id };
      cache.set(cacheKey, data);
      return NextResponse.json(data);
    }
  }

  let searchQuery = '';
  if (queryTitle && queryArtist && queryArtist !== 'Spotify') {
    searchQuery = `${queryTitle} ${queryArtist} official audio`;
  } else if (queryTitle && queryTitle !== 'Listen on Spotify') {
    searchQuery = `${queryTitle} song`;
  }

  // If we only have the Spotify URL or title was generic, fetch Spotify track meta
  if (trackUrl && /open\.spotify\.com\/track\//i.test(trackUrl)) {
    try {
      const res = await fetch(trackUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(4000),
      });
      const html = await res.text();
      const ogTitle = html.match(/<meta property="og:title" content="([^"]+)"/)?.[1];
      const ogDesc = html.match(/<meta property="og:description" content="([^"]+)"/)?.[1];
      const artist = ogDesc?.split('·')?.[0]?.trim();
      if (ogTitle && artist) {
        searchQuery = `${ogTitle} ${artist} official audio`;
      } else if (ogTitle) {
        searchQuery = `${ogTitle} song`;
      }
    } catch {}
  }

  if (!searchQuery) {
    return NextResponse.json({ error: 'No track query provided' }, { status: 400 });
  }

  try {
    const ytRes = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(5000),
    });
    const ytHtml = await ytRes.text();
    const m = ytHtml.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/);
    if (m && m[1]) {
      const data = { videoId: m[1] };
      cache.set(cacheKey, data);
      return NextResponse.json(data);
    }
  } catch (err) {
    console.error('Failed to resolve music from YouTube:', err);
  }

  return NextResponse.json({ error: 'Track not found' }, { status: 404 });
}
