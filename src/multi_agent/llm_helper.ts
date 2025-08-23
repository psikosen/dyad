import { IpcClient } from "../ipc/ipc_client";
import { Message } from "../ipc/ipc_types";
import OpenAI from "openai";
import { createOllama } from "ollama-ai-provider";
import { generateText } from "ai";

export async function callLlm(prompt: string): Promise<string> {
  // When running outside of the renderer (e.g. via a Node script),
  // `window` and the IPC layer are unavailable. In that case, fall back to
  // calling the OpenAI API directly using the `openai` package.
  if (typeof window === "undefined" || !(window as any).electron) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      const client = new OpenAI({ apiKey });
      const response = await client.responses.create({
        model: "gpt-4.1-mini",
        input: prompt,
      });
      return response.output_text ?? "";
    }

    const message = "OPENAI_API_KEY not set, using Ollama";
    console.log(
      JSON.stringify({
        filename: "src/multi_agent/llm_helper.ts",
        timestamp: new Date().toISOString(),
        classname: "LlmHelper",
        function: "callLlm",
        system_section: "llm",
        line_num: 0,
        error: null,
        db_phase: "none",
        method: "POST",
        message,
      }),
    );
    console.log(`[The 17 Commandments of Quality Code] ${message}`);

    const ollama = createOllama({ baseURL: process.env.OLLAMA_HOST });
    const model = ollama("llama3.2");
    const response = await generateText({ model, prompt });
    return response.text;
  }

  return new Promise((resolve, reject) => {
    // TODO: Figure out how to get a real chatId
    const chatId = 1;

    let fullResponse = "";

    IpcClient.getInstance().streamMessage(prompt, {
      chatId,
      selectedComponent: null,
      onUpdate: (messages: Message[]) => {
        // The last message is the one being streamed
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.role === "assistant") {
          fullResponse = lastMessage.content;
        }
      },
      onEnd: () => {
        resolve(fullResponse);
      },
      onError: (error: string) => {
        reject(new Error(error));
      },
    });
  });
}
