import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

const SITE = "https://izdrail.com";

export const GET: APIRoute = async () => {
  const posts = await getCollection("blog", ({ data }) => !data.draft);

  const staticRoutes = [
    { loc: "/", priority: "1.0" },
    { loc: "/blog", priority: "0.7" },
    { loc: "/chat", priority: "0.6" },
    { loc: "/privacy", priority: "0.2" },
    { loc: "/terms", priority: "0.2" },
  ];

  const postRoutes = posts.map((post) => ({
    loc: `/blog/${post.slug}`,
    lastmod: post.data.pubDate.toISOString().slice(0, 10),
    priority: "0.6",
  }));

  const urlEntries = [
    ...staticRoutes.map(
      (r) => `  <url>
    <loc>${SITE}${r.loc}</loc>
    <priority>${r.priority}</priority>
  </url>`,
    ),
    ...postRoutes.map(
      (r) => `  <url>
    <loc>${SITE}${r.loc}</loc>
    <lastmod>${r.lastmod}</lastmod>
    <priority>${r.priority}</priority>
  </url>`,
    ),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries.join("\n")}
</urlset>`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
