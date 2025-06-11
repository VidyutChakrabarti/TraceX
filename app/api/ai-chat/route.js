import { NextResponse } from "next/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

export async function POST(req) {
  try {
    // Parse incoming JSON: expect a { message: string }
    const { message } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "No valid 'message' provided." },
        { status: 400 }
      );
    }

    // Define a system prompt that limits the domain
    const systemPrompt =
      "You are a legal assistant specialized in crimes and the Indian Penal Code (IPC) with deep knowledge of blockchain technology as it applies to forensic investigations. " +
      "You answer questions related to criminal offenses, legal consequences, and punishments under the IPC, as well as blockchain concepts such as hash addresses, data integrity, and digital evidence verification. " +
      "If a query is outside these combined domains, respond with 'I can only provide legal and blockchain forensic information related to crimes under the IPC'";

    // Build the final prompt by combining the system prompt and the user query
    const prompt = `${systemPrompt}\nUser: ${message}\nAssistant:`;

    // Initialize the ChatGoogleGenerativeAI instance using Gemini 1.5 Pro
    const llm = new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash",
      temperature: 0.5,
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
    });

    // Invoke the model with the combined prompt
    const response = await llm.invoke([{ role: "user", content: prompt }]);
    if (!response.content) {
      throw new Error("AI response is empty.");
    }

    return NextResponse.json({ reply: response.content }, { status: 200 });
  } catch (error) {
    console.error("Error in AI Chat route:", error);
    return NextResponse.json(
      { error: error.message || "Something went wrong." },
      { status: 500 }
    );
  }
}
