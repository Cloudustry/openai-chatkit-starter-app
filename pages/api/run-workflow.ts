import type { NextApiRequest, NextApiResponse } from "next";

interface ChatKitResponse {
  output_text?: string;
  output?: { content?: { text?: string }[] }[];
  response?: {
    output_text?: string;
    output?: { content?: { text?: string }[] }[];
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { message } = req.body as { message?: string };
    const apiKey = process.env.OPENAI_API_KEY;
    const workflowId = process.env.NEXT_PUBLIC_CHATKIT_WORKFLOW_ID; // wf_...

    if (!apiKey || !workflowId) return res.status(400).json({ error: "Missing env variables" });
    if (!message) return res.status(400).json({ error: "Missing message" });

    // 1️⃣ Créer une session ChatKit
    const userId =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);

    const sessionRes = await fetch("https://api.openai.com/v1/chatkit/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "chatkit_beta=v1",
      },
      body: JSON.stringify({
        workflow: { id: workflowId },
        user: userId,
      }),
    });

    const sessionJson = await sessionRes.json();
    if (!sessionRes.ok) return res.status(sessionRes.status).json(sessionJson);

    const sessionId = sessionJson.id as string;

    // 2️⃣ Envoyer le message à ton workflow via ChatKit
    const responseRes = await fetch("https://api.openai.com/v1/chatkit/responses", {
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

    const dataText = await responseRes.text();
    let data: ChatKitResponse | null = null;
    try {
      data = JSON.parse(dataText) as ChatKitResponse;
    } catch {
      console.warn("Réponse non JSON :", dataText.slice(0, 200));
    }

    if (!responseRes.ok) {
      return res.status(responseRes.status).json({
        error: "Upstream error",
        payload: data ?? dataText,
      });
    }

    // 🔹 Extraction sécurisée du texte
    const reply =
      data?.output_text ??
      data?.output?.[0]?.content?.[0]?.text ??
      data?.response?.output_text ??
      data?.response?.output?.[0]?.content?.[0]?.text ??
      dataText;

    return res.status(200).json({ reply });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error in /api/run-workflow:", error.message);
      return res.status(500).json({ error: error.message });
    }
    console.error("Unknown error in /api/run-workflow:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}