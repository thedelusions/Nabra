import fetch from 'node-fetch';
import cheerio from 'cheerio';

export async function getAnghamiMeta(url) {
  const res = await fetch(url);
  const html = await res.text();
  const $ = cheerio.load(html);

  const title = $('meta[property="og:title"]').attr('content') || $('title').text();
  const artist = $('meta[property="og:description"]').attr('content')?.split('·')[0]?.trim() || 'Unknown Artist';
  
  return { title, artist };
}