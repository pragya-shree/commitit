import React, { useEffect, useRef } from "react";
import type { ChatMessage } from "@/services/api/aiApi";
import { ChatMessageItem } from "./ChatMessageItem";
import { WelcomeOnboarding } from "./WelcomeOnboarding";
import type { ToolStep } from "./ToolTimeline";

interface ChatMessageListProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingMessageContent: string;
  streamingToolSteps: ToolStep[];
  thinkingThought?: string;
  onSelectPrompt: (prompt: string) => void;
  onSelectFollowup: (followup: string) => void;
  onSelectFile?: (filePath: string) => void;
  onSelectSymbol?: (symbolName: string) => void;
  repositoryName?: string;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  isStreaming,
  streamingMessageContent,
  streamingToolSteps,
  thinkingThought,
  onSelectPrompt,
  onSelectFollowup,
  onSelectFile,
  onSelectSymbol,
  repositoryName,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom during streaming or new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessageContent, isStreaming, streamingToolSteps]);

  if (messages.length === 0 && !isStreaming) {
    return (
      <WelcomeOnboarding
        onSelectPrompt={onSelectPrompt}
        repositoryName={repositoryName}
      />
    );
  }

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto px-4 py-6">
      {messages.map((msg, idx) => (
        <ChatMessageItem
          key={msg.id || idx}
          message={msg}
          onSelectFollowup={onSelectFollowup}
          onSelectFile={onSelectFile}
          onSelectSymbol={onSelectSymbol}
        />
      ))}

      {/* Streaming transient assistant message turn */}
      {isStreaming && (
        <ChatMessageItem
          message={{
            id: "streaming-temp",
            session_id: "temp",
            role: "assistant",
            content: streamingMessageContent,
            created_at: new Date().toISOString(),
          }}
          isStreaming={true}
          toolSteps={streamingToolSteps}
          thinkingThought={thinkingThought}
        />
      )}

      <div ref={bottomRef} />
    </div>
  );
};
