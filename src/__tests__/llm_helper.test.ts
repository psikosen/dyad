import { describe, it, expect, vi, beforeEach } from "vitest";
import { callLlm } from "../multi_agent/llm_helper";

vi.mock("ollama-ai-provider", () => ({
  createOllama: vi.fn(() => vi.fn()),
}));

vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

describe("callLlm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.OPENAI_API_KEY;
  });

  it("falls back to Ollama when no OpenAI key", async () => {
    const { createOllama } = await import("ollama-ai-provider");
    const { generateText } = await import("ai");

    const mockModel = {};
    (createOllama as any).mockReturnValue(() => mockModel);
    (generateText as any).mockResolvedValue({ text: "ollama-response" });

    const result = await callLlm("hello");

    expect(createOllama).toHaveBeenCalledWith({
      baseURL: process.env.OLLAMA_HOST,
    });
    expect(generateText).toHaveBeenCalledWith({
      model: mockModel,
      prompt: "hello",
    });
    expect(result).toBe("ollama-response");
  });
});
