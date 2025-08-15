import { CoderAgent } from "../multi_agent/CoderAgent";
import { ReviewerAgent } from "../multi_agent/ReviewerAgent";
import { Orchestrator } from "../multi_agent/Orchestrator";

describe("Multi-Agent System", () => {
  it("CoderAgent should return code", async () => {
    const coder = new CoderAgent();
    const code = await coder.execute("Create a function to add two numbers");
    expect(code).toContain("function add(a: number, b: number): number");
  });

  it("ReviewerAgent should return feedback", async () => {
    const reviewer = new ReviewerAgent();
    const feedback = await reviewer.execute("Some code");
    expect(feedback).toContain("The code looks good");
  });

  it("Orchestrator should run the workflow", async () => {
    const orchestrator = new Orchestrator();
    const finalCode = await orchestrator.run(
      "Create a function to add two numbers",
    );
    // For now, we just check that it returns something.
    // A more sophisticated test would check the final output.
    expect(finalCode).toBeDefined();
    expect(finalCode).toContain("function add");
  });
});
