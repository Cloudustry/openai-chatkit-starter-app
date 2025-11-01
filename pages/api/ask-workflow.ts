import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { message } = req.body;
    if (!message) {
      res.status(400).json({ error: "Missing message" });
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const workflowId = process.env.NEXT_PUBLIC_CHATKIT_WORKFLOW_ID;

    // 🔹 Étape 1 : Créer une session sur ton workflow ChatKit
    const sessionRes = await fetch("https://api.openai.com/v1/chat/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "chatgpt-omni-preview", // requis pour workflows
      },
      body: JSON.stringify({
        model: workflowId,
      }),
    });

    const sessionData = await sessionRes.json();
    const sessionId = sessionData.id;

    // 🔹 Étape 2 : Envoyer le message utilisateur
    const responseRes = await fetch("https://api.openai.com/v1/chat/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "chatgpt-omni-preview",
      },
      body: JSON.stringify({
        model: workflowId,
        messages: [{ role: "user", content: message }],
        session_id: sessionId,
      }),
    });

    const data = await responseRes.json();
    const reply =
      data.output?.[0]?.content?.[0]?.text ??
      data.output_text ??
      "Le workflow n'a renvoyé aucune réponse.";

    res.status(200).json({ reply });
  } catch (error: unknown) {
    console.error("Error in /api/ask-workflow:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}