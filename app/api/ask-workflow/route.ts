// app/api/ask-workflow/route.ts
import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request): Promise<Response> {
  try {
    const { message } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: "Missing message" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ✅ On utilise ton workflow_id (wf_...), pas un agent_id
    const workflowId = process.env.NEXT_PUBLIC_CHATKIT_WORKFLOW_ID;

    // 1️⃣ Créer une session pour le workflow
    const session = await client.chat.sessions.create({
      model: workflowId!,
    });

    // 2️⃣ Envoyer le message au workflow
    const response = await client.chat.responses.create({
      model: workflowId!,
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
      session_id: session.id,
    });

    // 3️⃣ Extraire la réponse textuelle
    const reply =
      response.output?.[0]?.content?.[0]?.text ??
      "Le workflow n'a renvoyé aucune réponse.";

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in /api/ask-workflow:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal Server Error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}