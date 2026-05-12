import { useState } from "react";

interface PromptDetailsProps {
  prompt: string;
}

export function PromptDetails({ prompt }: PromptDetailsProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be unavailable; ignore */
    }
  };

  return (
    <div className="rounded-xl border border-ink-200 bg-ink-50/40">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-ink-700"
        onClick={() => setOpen((o) => !o)}
      >
        <span>Prompt used</span>
        <span className="text-ink-400">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="border-t border-ink-200 p-3">
          <div className="mb-2 flex justify-end">
            <button type="button" className="btn-secondary" onClick={copy}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-xs text-ink-700">
{prompt}
          </pre>
        </div>
      )}
    </div>
  );
}
