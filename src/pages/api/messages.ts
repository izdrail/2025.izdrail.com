import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request, locals }) => {
    // Handling dynamic route in a static-style file structure for now.
    // Ideally this should be [id].ts directly, but Chatbot.tsx calls /api/messages/[id]
    // Note: Astro file-based routing usually requires [id].ts for parameters.
    // However, the previous worker handled all messages routes.
    // If the frontend calls /api/messages/123, we need a catch-all or specific file.
    // The previous structure was messages.json.ts which wouldn't catch /messages/123 easily without dynamic params.
    // Let's assume we are moving to [conversationId].ts for the GET part, OR we use a catch-all if we want to mimic strict worker behavior.
    // BUT, simpler approach: create a directory `api/messages` and put `[conversationId].ts` in there for GET,
    // and `index.ts` for POST.

    // Changing approach: The prompt implies a straight rename, but `messages.json.ts` likely wasn't handling `GET /api/messages/123` correctly in Astro static mode anyway.
    // For specific messages by conversation, we need `src/pages/api/messages/[conversationId].ts`.

    // I will write the POST handler here (for /api/messages).
    // I will create a SEPARATE file for the GET handler [conversationId].ts.

    return new Response(JSON.stringify({ error: "Method not allowed, use /api/messages/[conversationId] for fetching" }), { status: 405 });
};

export const POST: APIRoute = async ({ request, locals }) => {
    try {

        const env = locals.runtime.env;
        const body = await request.json();
        const { id, conversation_id, role, name, avatarFallback, content, markdown, attachments } = body as any;

        if (!id || !conversation_id || !role || !content) {
            return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
        }

        await env.DB
            .prepare(
                `INSERT INTO messages (id, conversation_id, role, name, avatarFallback, content, markdown, attachments)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .bind(id, conversation_id, role, name, avatarFallback, content, markdown ? 1 : 0, attachments ? JSON.stringify(attachments) : null)
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
        console.error("Error creating message:", error);
        return new Response(JSON.stringify({ error: "Failed to create message", details: (error as any).message }), {
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
