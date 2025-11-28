import type { APIRoute } from 'astro';

// In-memory storage for development (replace with your D1 database in production)
let conversations: Array<{
    id: string;
    title: string;
    preview: string;
    timestamp: string;
}> = [
    {
        id: "1",
        title: "Welcome Chat",
        preview: "Hello! I'm your AI assistant.",
        timestamp: "Just now",
    },
];

let messages: Record<string, Array<{
    id: string;
    conversation_id: string;
    role: string;
    name: string;
    avatarFallback: string;
    content: string;
    markdown: boolean;
    attachments: string | null;
    created_at: string;
}>> = {
    "1": [
        {
            id: "1",
            conversation_id: "1",
            role: "assistant",
            name: "Ollama",
            avatarFallback: "OL",
            content: "Hello! I'm running on your private Ollama instance. Ask me anything!",
            markdown: true,
            attachments: null,
            created_at: new Date().toISOString(),
        },
    ],
};

export const GET: APIRoute = async () => {
    return new Response(JSON.stringify(conversations), {
        status: 200,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
    });
};

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const { id, title, preview, timestamp } = body;

        if (!id || !title) {
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

        // Add or update conversation
        const existingIndex = conversations.findIndex(conv => conv.id === id);
        if (existingIndex >= 0) {
            conversations[existingIndex] = {
                id,
                title,
                preview: preview || "New conversation",
                timestamp: timestamp || new Date().toISOString(),
            };
        } else {
            conversations.unshift({
                id,
                title,
                preview: preview || "New conversation",
                timestamp: timestamp || new Date().toISOString(),
            });
        }

        // Initialize messages array for this conversation if it doesn't exist
        if (!messages[id]) {
            messages[id] = [];
        }

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
        return new Response(JSON.stringify({ error: "Failed to create conversation" }), {
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