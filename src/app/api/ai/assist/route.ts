import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const body: {
    text: string;
    action: "improve" | "summarize" | "continue" | "translate";
  } = await req.json();

  if (!body.text?.trim()) {
    return new NextResponse("text is required", { status: 400 });
  }

  const prompts: Record<string, string> = {
    improve:
      "Improve the writing quality of the following text. Keep the same meaning but make it clearer, more professional and concise. Return ONLY the improved text with no preamble:\n\n",
    summarize:
      "Summarize the following text in 2-3 sentences. Return ONLY the summary:\n\n",
    continue:
      "Continue writing the following text naturally, adding 2-3 more sentences in the same style. Return ONLY the continuation (not the original):\n\n",
    translate:
      "Translate the following text to English if it's in another language, or to Spanish if it's in English. Return ONLY the translation:\n\n",
  };

  const prompt = (prompts[body.action] ?? prompts.improve) + body.text;

  const client = new Anthropic();
  const message = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const result =
    message.content[0].type === "text" ? message.content[0].text : "";

  return NextResponse.json({ result });
}
