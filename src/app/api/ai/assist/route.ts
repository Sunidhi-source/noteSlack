import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const PROMPTS: Record<string, string> = {
  improve:
    "Improve the writing quality of the following text. Keep the same meaning but make it clearer, more professional and concise. Return ONLY the improved text with no preamble:\n\n",
  summarize:
    "Summarize the following text in 2-3 sentences. Return ONLY the summary:\n\n",
  continue:
    "Continue writing the following text naturally, adding 2-3 more sentences in the same style. Return ONLY the continuation (not the original):\n\n",
};

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const body: { text: string; action: string; targetLang?: string } =
      await req.json();
    if (!body.text?.trim())
      return new NextResponse("text is required", { status: 400 });

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey)
      return new NextResponse("GROQ_API_KEY not configured", { status: 500 });

    // Build prompt based on action
    const prompt =
      body.action === "translate"
        ? `Translate the following text to ${body.targetLang ?? "Spanish"}. Return ONLY the translated text with no explanation or preamble:\n\n${body.text}`
        : (PROMPTS[body.action] ?? PROMPTS.improve) + body.text;

    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 512,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      let errorMessage = "Unknown error";
      try {
        const err = await response.json();
        console.error("Groq API Error:", err);
        errorMessage = err.error?.message || errorMessage;
      } catch {
        const text = await response.text();
        console.error("Groq Raw Error:", text);
        errorMessage = text;
      }
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status },
      );
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content ?? "";
    return NextResponse.json({ result });
  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
