import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Missing message" });

    const workflowId = process.env.NEXT_PUBLIC_CHATKIT_WORKFLOW_ID!;
    const session = await client.chat.sessions.create({ model: workflowId });
    const response = await client.chat.responses.create({
      model: workflowId,
      messages: [{ role: "user", content: message }],
      session_id: session.id,
    });

    const reply = response.output?.[0]?.content?.[0]?.text ?? "Le workflow n'a renvoyé aucune réponse.";
    res.status(200).json({ reply });
  } catch (error: any) {
    console.error("Error in /api/ask-workflow:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}