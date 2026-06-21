"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchChatReply } from "@/lib/chat-client";
import { CHAT_ASSISTANT_NAME } from "@/lib/chat-prompt";
import type { AnalysisContext, ChatCitation, ChatMessage } from "@/lib/types";
import Icon from "@/components/ui/Icon";
import ChatMessageBubble from "./ChatMessage";
import SuggestedQuestions from "./SuggestedQuestions";

interface DisplayMessage extends ChatMessage {
  citations?: ChatCitation[];
}

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
  context: AnalysisContext;
  onMockUsed?: () => void;
}

export default function ChatPanel({
  open,
  onClose,
  context,
  onMockUsed,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      setError(null);
      const userMessage: ChatMessage = { role: "user", content: trimmed };
      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);
      setInput("");
      setIsLoading(true);

      try {
        const { response, mock } = await fetchChatReply(nextMessages, context);
        if (mock) onMockUsed?.();
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: response.reply,
            citations: response.citations,
          },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to get a reply.");
        setMessages((prev) => prev.slice(0, -1));
        setInput(trimmed);
      } finally {
        setIsLoading(false);
      }
    },
    [context, isLoading, messages, onMockUsed],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close chat"
        className="absolute inset-0 bg-on-background/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-md flex-col border-l border-outline-variant bg-surface-container-lowest shadow-2xl animate-fade-in-up">
        <header className="flex items-center justify-between border-b border-outline-variant px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-on-primary">
              <Icon name="forum" filled />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-on-surface">
                {CHAT_ASSISTANT_NAME}
              </h2>
              <p className="text-xs text-on-surface-variant">
                {context.totalReviews} reviews in context
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
            aria-label="Close"
          >
            <Icon name="close" />
          </button>
        </header>

        <div
          ref={scrollRef}
          className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-4"
        >
          {messages.length === 0 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
                <p className="text-sm leading-relaxed text-on-surface-variant">
                  Ask about themes, barriers, segments, sources, or discovery
                  problems from your analyzed reviews only. I cannot use outside
                  data — if nothing in this dataset is relevant, I&apos;ll let you
                  know.
                </p>
              </div>
              <SuggestedQuestions
                onSelect={(q) => void sendMessage(q)}
                disabled={isLoading}
              />
            </div>
          )}

          {messages.map((message, index) => (
            <ChatMessageBubble
              key={`${message.role}-${index}`}
              role={message.role}
              content={message.content}
              citations={message.citations}
            />
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-on-surface-variant">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
              Thinking…
            </div>
          )}
        </div>

        {messages.length > 0 && (
          <div className="border-t border-outline-variant px-4 py-3">
            <SuggestedQuestions
              onSelect={(q) => void sendMessage(q)}
              disabled={isLoading}
            />
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mx-4 mb-2 rounded-lg border border-error-container bg-error-container px-3 py-2 text-xs text-on-error-container"
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="border-t border-outline-variant p-4"
        >
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about discovery problems, barriers, segments…"
              rows={2}
              disabled={isLoading}
              className="custom-scrollbar min-h-[44px] flex-1 resize-none rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2 text-sm text-on-surface outline-none transition-colors placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center self-end rounded-xl bg-primary text-on-primary transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Send message"
            >
              <Icon name="send" className="text-lg" />
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
