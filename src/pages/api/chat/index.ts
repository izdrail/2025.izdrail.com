import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { messages, model = "llama3.2:1b" } = body;

    const response = await fetch("https://ai.izdrail.com/api/chat", {
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
      return new Response(`{"error": "Ollama API error: ${response.status}"}`, {
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
      `{"error": "Failed to connect to Ollama: ${(error as Error).message}"}`,
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
