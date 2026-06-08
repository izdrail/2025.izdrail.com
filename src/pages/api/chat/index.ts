import type { APIRoute } from "astro";

const AI_URL = import.meta.env.AI_URL || "https://ai.izdrail.com";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { messages, model = "mistral:7b" } = body;

    const response = await fetch(`${AI_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      return new Response(`{"error": "AI API error: ${response.status}"}`, {
        status: response.status,
        headers: {
          "Content-Type": "application/x-ndjson",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      `{"error": "Failed to connect to AI: ${(error as Error).message}"}`,
      {
        status: 500,
        headers: {
          "Content-Type": "application/x-ndjson",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
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
