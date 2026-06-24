import { LLM_API_KEY_ENV } from "@/lib/llm-config";
import Icon from "@/components/ui/Icon";

interface DemoModeAlertProps {
  compact?: boolean;
}

export default function DemoModeAlert({ compact = false }: DemoModeAlertProps) {
  return (
    <div
      role="status"
      className={`flex items-start gap-2 rounded-lg border border-warning-container bg-warning-container text-on-warning-container ${
        compact ? "px-2.5 py-2 text-[10px] leading-relaxed" : "px-4 py-3 text-sm"
      }`}
    >
      <Icon
        name="info"
        className={`shrink-0 ${compact ? "mt-0.5 text-sm" : "mt-0.5 text-base"}`}
      />
      <p>
        Demo mode — some results use rule-based generation. Set{" "}
        <code className="font-mono">USE_MOCK_CLASSIFIER=false</code> and add your
        LLM API key (<code className="font-mono">{LLM_API_KEY_ENV}</code>) for full AI
        classification.
      </p>
    </div>
  );
}
