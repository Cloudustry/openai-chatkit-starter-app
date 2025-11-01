import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message } = req.body;
    const apiKey = process.env.OPENAI_API_KEY;
    const workflowId = process.env.NEXT_PUBLIC_CHATKIT_WORKFLOW_ID;

    if (!apiKey || !workflowId) {
      return res.status(400).json({ error: "Missing env variables" });
    }

    // 🔹 Générer un identifiant utilisateur unique (UUID ou random)
    const userId =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2);

    // 🔹 Étape 1 : Créer la session ChatKit
    const sessionRes = await fetch("https://api.openai.com/v1/chatkit/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "chatkit_beta=v1",
      },
      body: JSON.stringify({
        workflow: { id: workflowId },
        user: userId, // ✅ obligatoire
      }),
    });

    const sessionJson = await sessionRes.json();
    if (!sessionRes.ok) {
      console.error("ChatKit session error:", sessionJson);
      return res.status(sessionRes.status).json(sessionJson);
    }

    const sessionId = sessionJson.id;

    // 🔹 Étape 2 : Envoyer le message utilisateur à ton workflow ChatKit
    const msgRes = await fetch("https://api.openai.com/v1/chatkit/messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "chatkit_beta=v1",
      },
      body: JSON.stringify({
        session_id: sessionId,
        messages: [{ role: "user", content: message }],
      }),
    });

    const msgJson = await msgRes.json();
    if (!msgRes.ok) {
      console.error("ChatKit message error:", msgJson);
      return res.status(msgRes.status).json(msgJson);
    }

    const reply =
      msgJson.output?.[0]?.content?.[0]?.text ??
      msgJson.output_text ??
      "Le workflow n’a renvoyé aucune réponse.";

    res.status(200).json({ reply });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error in /api/ask-workflow:", error.message);
      res.status(500).json({ error: error.message });
    } else {
      console.error("Unknown error in /api/ask-workflow:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
}