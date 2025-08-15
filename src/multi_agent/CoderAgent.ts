import { Agent } from "./Agent";

export class CoderAgent extends Agent {
  constructor() {
    super(
      "Coder",
      "You are a world-class software engineer who writes clean, efficient, and well-documented code.",
    );
  }

  async execute(task: string): Promise<string> {
    console.log("CoderAgent executing task:", task);
    // In a real implementation, this would call an LLM to generate code.
    // For now, we'll just return a placeholder.
    const code = `
/**
 * A function that adds two numbers.
 * @param a The first number.
 * @param b The second number.
 * @returns The sum of the two numbers.
 */
function add(a: number, b: number): number {
  return a + b;
}
`;
    return Promise.resolve(code);
  }
}
