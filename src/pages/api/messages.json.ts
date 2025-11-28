import type { APIRoute } from 'astro';

// Import the shared messages storage from conversations
import { messages } from './conversations.json';

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const { id, conversation_id, role, content, attachments, name, avatarFallback, markdown } = body;

        if (!id || !conversation_id || !role || !content) {
            return new Response(JSON.stringify({ error: "Missing required fields" }), {
                status: 400,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization",
                },
            });
        }

        // Initialize messages array for this conversation if it doesn't exist
        if (!messages[conversation_id]) {
            messages[conversation_id] = [];
        }

        // Add the message
        messages[conversation_id].push({
            id,
            conversation_id,
            role,
            name: name || (role === 'user' ? 'You' : 'Ollama'),
            avatarFallback: avatarFallback || (role === 'user' ? 'YO' : 'OL'),
            content,
            markdown: markdown ?? (role === 'assistant'),
            attachments: attachments ? JSON.stringify(attachments) : null,
            created_at: new Date().toISOString(),
        });

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
        return new Response(JSON.stringify({ error: "Failed to create message" }), {
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