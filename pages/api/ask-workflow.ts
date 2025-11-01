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

    const response = await fetch("https://api.openai.com/v1/workflows/runs", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "workflows=v1",
      },
      body: JSON.stringify({
        workflow_id: workflowId,
        inputs: { message },
      }),
    });

    const status = response.status;
    const headers = Object.fromEntries(response.headers.entries());
    const rawText = await response.text();

    console.log("🧩 DEBUG /ask-workflow");
    console.log("Status:", status);
    console.log("Headers:", headers);
    console.log("Raw body (first 500 chars):", rawText.slice(0, 500));

    return res.status(200).json({
      debug: {
        status,
        headers,
        rawText: rawText.slice(0, 1000),
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error in /api/ask-workflow:", error.message, error.stack);
      return res.status(500).json({ error: error.message });
    } else {
      console.error("Unknown error in /api/ask-workflow:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
}