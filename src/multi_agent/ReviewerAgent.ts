import { Agent } from "./Agent";

export class ReviewerAgent extends Agent {
  constructor() {
    super(
      "Reviewer",
      "You are a senior software engineer who meticulously reviews code for quality, correctness, and style.",
    );
  }

  async execute(task: string): Promise<string> {
    console.log("ReviewerAgent executing task:", task);
    // In a real implementation, this would call an LLM to review the code.
    // For now, we'll just return a placeholder.
    const feedback = `The code looks good, but it could be improved by adding a check for null or undefined inputs.`;
    return Promise.resolve(feedback);
  }
}
