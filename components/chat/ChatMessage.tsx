import type { ChatCitation } from "@/lib/types";
import Icon from "@/components/ui/Icon";

interface ChatMessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  citations?: ChatCitation[];
}

export default function ChatMessageBubble({
  role,
  content,
  citations,
}: ChatMessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? "bg-surface-container-high text-on-surface-variant"
            : "bg-primary text-on-primary"
        }`}
      >
        <Icon
          name={isUser ? "person" : "smart_toy"}
          className="text-base"
          filled={!isUser}
        />
      </div>
      <div
        className={`max-w-[85%] space-y-2 ${isUser ? "items-end" : "items-start"}`}
      >
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-primary text-on-primary"
              : "border border-outline-variant bg-surface-container-lowest text-on-surface"
          }`}
        >
          {content.split("\n").map((paragraph, index) => (
            <p key={index} className={index > 0 ? "mt-2" : ""}>
              {paragraph}
            </p>
          ))}
        </div>
        {!isUser && citations && citations.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {citations.map((citation) => (
              <span
                key={citation.label}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary"
              >
                <Icon name="tag" className="text-xs" />
                {citation.label}
                {citation.count != null && ` · ${citation.count}`}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
