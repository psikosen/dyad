import { ipcHost } from "../ipc_host";
import { Orchestrator } from "../../multi_agent/Orchestrator";

export function registerMultiAgentHandlers() {
  ipcHost.handle("run-multi-agent", async (_, task: string) => {
    try {
      const orchestrator = new Orchestrator();
      const result = await orchestrator.run(task);
      return { success: true, output: result };
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, error: error.message };
      }
      return { success: false, error: "An unknown error occurred" };
    }
  });
}
