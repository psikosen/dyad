import React, { useEffect, useState } from "react";
import ChatMessage from "./chat/ChatMessage";
import { HomeChatInput } from "./chat/HomeChatInput";
import { Button } from "./ui/button";
import { useAtom } from "jotai";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { homeChatInputValueAtom } from "@/atoms/chatAtoms";
import { Message } from "@/ipc/ipc_types";
import { IpcClient } from "@/ipc/ipc_client";
import type { HomeSubmitOptions } from "@/pages/home";
import { ConversationTurn } from "../multi_agent/Orchestrator";

export function MultiAgentView() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [trainingStatus, setTrainingStatus] = useState("");
  const [selectedAppId] = useAtom(selectedAppIdAtom);
  const [inputValue, setInputValue] = useAtom(homeChatInputValueAtom);

  const appendAssistantMessages = (
    turns: ConversationTurn[],
    finalCode?: string,
  ) => {
    const startId = Date.now();
    const newMessages: Message[] = turns.map((turn, index) => ({
      id: startId + index + 1,
      role: "assistant",
      content: `**${turn.agentName}**\n\n**Thoughts**:\n${turn.thoughts}\n\n**Output**:\n${turn.output}`,
    }));
    if (finalCode) {
      newMessages.push({
        id: startId + turns.length + 1,
        role: "assistant",
        content: `**Final Code**:\n\`\`\`\n${finalCode}\n\`\`\``,
      });
    }
    setMessages((prev) => [...prev, ...newMessages]);
  };

  const handleSubmit = async (_options?: HomeSubmitOptions) => {
    if (!inputValue.trim() || !selectedAppId) return;
    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      content: inputValue,
    };
    setMessages((prev) => [...prev, userMessage]);
    const task = inputValue;
    setInputValue("");
    setIsLoading(true);
    setError("");
    const result = await IpcClient.getInstance().runMultiAgent(
      task,
      selectedAppId,
    );
    if (result.success) {
      appendAssistantMessages(
        result.conversationHistory || [],
        result.finalCode,
      );
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "assistant",
          content: result.error || "An unknown error occurred.",
        },
      ]);
      setError(result.error || "An unknown error occurred.");
    }
    setIsLoading(false);
  };

  const handleTrain = async () => {
    const result = await IpcClient.getInstance().trainAgent();
    if (result.success) {
      setTrainingStatus("Training started...");
    } else {
      setError(result.error || "Failed to start training.");
    }
  };

  useEffect(() => {
    IpcClient.getInstance().startPythonService();
    const interval = setInterval(async () => {
      const result = await IpcClient.getInstance().getTrainingStatus();
      if (result.success) {
        setTrainingStatus(result.data.status);
      }
    }, 5000);
    return () => {
      clearInterval(interval);
      IpcClient.getInstance().stopPythonService();
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <h1 className="text-lg font-semibold">Multi-Agent Chat</h1>
        <div className="flex items-center gap-2">
          <Button onClick={handleTrain} disabled={isLoading} size="sm">
            Train Agents
          </Button>
          {trainingStatus && (
            <span className="text-sm" data-testid="training-status">
              {trainingStatus}
            </span>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <ChatMessage
            key={message.id}
            message={message}
            isLastMessage={index === messages.length - 1}
          />
        ))}
        {error && <p className="text-red-500">{error}</p>}
      </div>
      <HomeChatInput onSubmit={handleSubmit} />
    </div>
  );
}
