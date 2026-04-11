import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { prompt, documentTitle, documentContent } = await req.json();

  if (!prompt?.trim()) {
    return new NextResponse("Prompt is required", { status: 400 });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-6",
        max_tokens: 1024,
        system: `You are an intelligent writing assistant integrated into a collaborative document editor called NoteSlack. 
You help users improve, expand, summarize, and work with their documents.
Be concise and practical. Return just the requested content without preambles like "Sure!" or "Here's...".
The document you're working with is titled: "${documentTitle || "Untitled"}".`,
        messages: [
          {
            role: "user",
            content: documentContent
              ? `Document content:\n\n${documentContent}\n\n---\n\nUser request: ${prompt}`
              : prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic API error:", err);
      return new NextResponse("AI service error", { status: 500 });
    }

    const data = await response.json();
    const content = data.content?.[0]?.text ?? "";

    return NextResponse.json({ content });
  } catch (err) {
    console.error("AI assist error:", err);
    return new NextResponse("Internal server error", { status: 500 });
  }
}