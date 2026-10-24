import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

const SITE = "https://izdrail.com";
const FEED_TITLE = "Software Developer - Blog";
const FEED_DESCRIPTION =
  "Occasional notes and a funny take on the tech news of the day.";

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export const GET: APIRoute = async () => {
  const posts = (
    await getCollection("blog", ({ data }) => !data.draft)
  ).sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

  const items = posts
    .map(
      (post) => `    <item>
      <title>${escapeXml(post.data.title)}</title>
      <link>${SITE}/blog/${post.slug}</link>
      <guid isPermaLink="true">${SITE}/blog/${post.slug}</guid>
      <description>${escapeXml(post.data.description)}</description>
      <pubDate>${post.data.pubDate.toUTCString()}</pubDate>
    </item>`,
    )
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(FEED_TITLE)}</title>
    <link>${SITE}/blog</link>
    <description>${escapeXml(FEED_DESCRIPTION)}</description>
    <language>en-gb</language>
${items}
  </channel>
</rss>`;

  return new Response(body, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
};
