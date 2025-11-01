import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message } = req.body as { message?: string };
    const apiKey = process.env.OPENAI_API_KEY;
    const workflowId = process.env.NEXT_PUBLIC_CHATKIT_WORKFLOW_ID; // ex: wf_xxxxx

    if (!apiKey || !workflowId) {
      return res.status(400).json({ error: "Missing env variables" });
    }
    if (!message) {
      return res.status(400).json({ error: "Missing message" });
    }

    // 🔹 Appel direct à l’API Responses d’OpenAI
    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: workflowId, // ton ID de workflow : wf_XXXXXXXX
        input: message,
      }),
    });

    const text = await upstream.text();

    // On essaie de parser la réponse JSON, sans utiliser `any`
    let json: Record<string, unknown> | null = null;
    try {
      json = JSON.parse(text) as Record<string, unknown>;
    } catch {
      console.error("Réponse non JSON :", text);
    }

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: "Upstream error",
        status: upstream.status,
        payload: json ?? text,
      });
    }

    // 🔹 Extraction souple du texte selon la structure possible
    let reply = text;
    if (json) {
      const maybeResponse = json as {
        output_text?: string;
        output?: { content?: { text?: string }[] }[];
        response?: {
          output_text?: string;
          output?: { content?: { text?: string }[] }[];
        };
      };

      reply =
        maybeResponse.output_text ??
        maybeResponse.output?.[0]?.content?.[0]?.text ??
        maybeResponse.response?.output_text ??
        maybeResponse.response?.output?.[0]?.content?.[0]?.text ??
        text;
    }

    return res.status(200).json({ reply });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error in /api/ask-workflow:", error.message);
      return res.status(500).json({ error: error.message });
    }
    console.error("Unknown error in /api/ask-workflow:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}