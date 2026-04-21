import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const PROMPTS: Record<string, string> = {
  improve:
    "Improve the writing quality of the following text. Keep the same meaning but make it clearer, more professional and concise. Return ONLY the improved text with no preamble:\n\n",
  summarize:
    "Summarize the following text in 2-3 sentences. Return ONLY the summary:\n\n",
  continue:
    "Continue writing the following text naturally, adding 2-3 more sentences in the same style. Return ONLY the continuation (not the original):\n\n",
  translate:
    "Translate the following text to English if it's in another language, or to Spanish if it's in English. Return ONLY the translation:\n\n",
};

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const body: { text: string; action: string } = await req.json();
  if (!body.text?.trim())
    return new NextResponse("text is required", { status: 400 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey)
    return new NextResponse("GEMINI_API_KEY not configured", { status: 500 });

  const prompt = (PROMPTS[body.action] ?? PROMPTS.improve) + body.text;

  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return new NextResponse(`Gemini error: ${err}`, { status: 500 });
  }

  const data = await response.json();
  const result = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  return NextResponse.json({ result });
}
