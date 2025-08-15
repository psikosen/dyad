import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { IpcClient } from "../ipc/ipc_client";

export function MultiAgentView() {
  const [task, setTask] = useState("");
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRun = async () => {
    if (!task) return;
    setIsLoading(true);
    setOutput("");

    const result = await IpcClient.getInstance().runMultiAgent(task);

    if (result.success) {
      setOutput(result.output || "");
    } else {
      setOutput(`Error: ${result.error}`);
    }

    setIsLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Multi-Agent Code Generation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Input
            placeholder="Enter your request..."
            value={task}
            onChange={(e) => setTask(e.target.value)}
          />
          <Button onClick={handleRun} disabled={isLoading}>
            {isLoading ? "Running..." : "Run"}
          </Button>
          {output && (
            <pre className="p-4 bg-gray-100 rounded-md">
              <code>{output}</code>
            </pre>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
