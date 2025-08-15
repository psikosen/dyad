import { CoderAgent } from "./CoderAgent";
import { ReviewerAgent } from "./ReviewerAgent";

export class Orchestrator {
  private coder: CoderAgent;
  private reviewer: ReviewerAgent;

  constructor() {
    this.coder = new CoderAgent();
    this.reviewer = new ReviewerAgent();
  }

  async run(initialTask: string): Promise<string> {
    let task = initialTask;
    let code = "";
    const maxTurns = 2; // Let's do 2 turns for now

    console.log(`Orchestrator starting with task: ${initialTask}`);

    for (let i = 0; i < maxTurns; i++) {
      console.log(`--- Turn ${i + 1} ---`);

      // Coder's turn
      console.log(`Task for coder: ${task}`);
      code = await this.coder.execute(task);
      console.log(`Coder produced code:\n${code}`);

      // Reviewer's turn
      const reviewTask = `Please review the following code:\n${code}`;
      const feedback = await this.reviewer.execute(reviewTask);
      console.log(`Reviewer provided feedback: ${feedback}`);

      // Prepare for next turn
      task = `The user's initial request was: "${initialTask}". The previous code you wrote was:\n${code}\n\nThe reviewer's feedback is: "${feedback}". Please rewrite the code to incorporate the feedback.`;
    }

    console.log("Orchestrator finished.");
    return code;
  }
}
