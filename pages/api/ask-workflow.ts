import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

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

    const workflowId = process.env.NEXT_PUBLIC_CHATKIT_WORKFLOW_ID;
    const session = await client.chat.sessions.create({ model: workflowId! });
    const response = await client.chat.responses.create({
      model: workflowId!,
      messages: [{ role: "user", content: message }],
      session_id: session.id,
    });

    const reply =
      response.output?.[0]?.content?.[0]?.text ??
      "Le workflow n'a renvoyé aucune réponse.";

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