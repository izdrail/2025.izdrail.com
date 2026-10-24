/// <reference path="../.astro/types.d.ts" />
/// <reference types="@astrojs/cloudflare" />

type D1Database = import("@cloudflare/workers-types").D1Database;

interface Env {
    DB: D1Database;
    LLM_API_KEY?: string;
}

type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

declare namespace App {
    interface Locals extends Runtime { }
}

// Third-party analytics snippets in Layout.astro (gtag, Hotjar, TikTok)
// attach these to window at runtime.
interface Window {
    dataLayer: unknown[];
    hj: any;
    _hjSettings: { hjid: number; hjsv: number };
    TiktokAnalyticsObject: string;
}
declare const dataLayer: Window["dataLayer"];
