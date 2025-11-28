export interface Env {
    DB: D1Database;
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);

        // ------------------------------
        // LIST CONVERSATIONS
        // ------------------------------
        if (url.pathname === "/api/conversations" && request.method === "GET") {
            const result = await env.DB
                .prepare("SELECT * FROM conversations ORDER BY timestamp DESC")
                .all();

            return json(result.results);
        }

        // ------------------------------
        // CREATE / UPDATE CONVERSATION
        // ------------------------------
        if (url.pathname === "/api/conversations" && request.method === "POST") {
            const body = await request.json();
            const { id, title, preview, timestamp } = body;

            await env.DB
                .prepare(
                    `INSERT OR REPLACE INTO conversations (id, title, preview, timestamp)
           VALUES (?, ?, ?, ?)`
                )
                .bind(id, title, preview, timestamp)
                .run();

            return json({ ok: true });
        }

        // ------------------------------
        // GET MESSAGES FOR ONE CONVERSATION
        // ------------------------------
        if (url.pathname.startsWith("/api/messages/") && request.method === "GET") {
            const conversationId = url.pathname.split("/").pop();

            const result = await env.DB
                .prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC")
                .bind(conversationId)
                .all();

            return json(result.results);
        }

        // ------------------------------
        // ADD NEW MESSAGE
        // ------------------------------
        if (url.pathname === "/api/messages" && request.method === "POST") {
            const body = await request.json();
            const { id, conversation_id, role, content, attachments } = body;

            await env.DB
                .prepare(
                    `INSERT INTO messages (id, conversation_id, role, content, attachments)
           VALUES (?, ?, ?, ?, ?)`
                )
                .bind(id, conversation_id, role, content, attachments ? JSON.stringify(attachments) : null)
                .run();

            return json({ ok: true });
        }

        return new Response("Not found", { status: 404 });
    }
};

function json(data: any, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" }
    });
}
