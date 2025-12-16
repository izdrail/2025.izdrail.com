/// <reference path="../.astro/types.d.ts" />
/// <reference types="@astrojs/cloudflare" />

type D1Database = import("@cloudflare/workers-types").D1Database;

interface Env {
    DB: D1Database;
}

declare namespace App {
    interface Locals extends import("@astrojs/cloudflare").CloudflareLocals<Env> { }
}
