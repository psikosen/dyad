#!/usr/bin/env node
import { Orchestrator } from "../src/multi_agent/Orchestrator";

/**
 * Simple CLI entry point for running the multi-agent orchestrator.
 *
 * Usage:
 *   npm run start:multi-agent "Build a hello world app" 1
 */
async function main() {
  const [, , taskArg, appIdArg] = process.argv;
  const task = taskArg ?? "Create a hello world script";
  const appId = Number(appIdArg ?? "1");

  const orchestrator = new Orchestrator();
  const result = await orchestrator.run(task, appId);

  console.log("Final code:\n" + result.finalCode);
  console.log(
    "Conversation history:\n" +
      JSON.stringify(result.conversationHistory, null, 2),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
