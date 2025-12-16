import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ locals }) => {
    try {
        const env = locals.runtime.env;
        const result = await env.DB
            .prepare("SELECT * FROM conversations ORDER BY timestamp DESC")
            .all();

        return new Response(JSON.stringify(result.results), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
            },
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: (e as any).message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};

export const POST: APIRoute = async ({ request, locals }) => {
    try {
        const env = locals.runtime.env;
        const body = await request.json();
        const { id, title, preview, timestamp } = body as any;

        if (!id || !title) {
            return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
        }

        await env.DB
            .prepare(
                `INSERT OR REPLACE INTO conversations (id, title, preview, timestamp)
           VALUES (?, ?, ?, ?)`
            )
            .bind(id, title, preview, timestamp)
            .run();

        return new Response(JSON.stringify({ ok: true, id }), {
            status: 201,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
            },
        });
    } catch (error) {
        console.error("Error creating conversation:", error);
        return new Response(JSON.stringify({ error: "Failed to create conversation", details: (error as any).message }), {
            status: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
            },
        });
    }
};

export const OPTIONS: APIRoute = async () => {
    return new Response(null, {
        status: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
    });
};
