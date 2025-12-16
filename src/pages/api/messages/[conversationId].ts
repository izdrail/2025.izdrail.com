import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ params, locals }) => {
    const { conversationId } = params;

    if (!conversationId) {
        return new Response(JSON.stringify({ error: "Conversation ID required" }), { status: 400 });
    }

    try {
        const env = locals.runtime.env;
        const result = await env.DB
            .prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC")
            .bind(conversationId)
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
    } catch (error) {
        return new Response(JSON.stringify({ error: "Failed to fetch messages" }), { status: 500 });
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
