// Google News sitemap: articles published in the last 48 hours.
// https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

const SITE = "https://izdrail.com";
const PUBLICATION_NAME = "Stefan's Blog";
const PUBLICATION_LANGUAGE = "en";
const WINDOW_MS = 48 * 60 * 60 * 1000;

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const GET: APIRoute = async () => {
  const cutoff = Date.now() - WINDOW_MS;
  const posts = (
    await getCollection("blog", ({ data }) => !data.draft)
  )
    .filter((post) => post.data.pubDate.valueOf() >= cutoff)
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

  const urls = posts
    .map(
      (post) => `  <url>
    <loc>${SITE}/blog/${post.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>${escapeXml(PUBLICATION_NAME)}</news:name>
        <news:language>${PUBLICATION_LANGUAGE}</news:language>
      </news:publication>
      <news:publication_date>${post.data.pubDate.toISOString()}</news:publication_date>
      <news:title>${escapeXml(post.data.title)}</news:title>
    </news:news>
  </url>`,
    )
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
