import type { GenerationSuccess } from "../lib/api";
import { PromptDetails } from "./PromptDetails";

type Status = "idle" | "loading" | "success" | "error";

interface ResultPanelProps {
  status: Status;
  result: GenerationSuccess | null;
  errorMessage: string | null;
}

function dataUrl(result: GenerationSuccess): string {
  return `data:${result.mime_type};base64,${result.image_base64}`;
}

export function ResultPanel({ status, result, errorMessage }: ResultPanelProps) {
  return (
    <div className="card flex h-full flex-col p-4">
      <h2 className="mb-3 text-sm font-semibold text-ink-900">Result</h2>

      <div className="flex flex-1 flex-col">
        <div className="relative flex min-h-[320px] flex-1 items-center justify-center overflow-hidden rounded-xl border border-ink-200 bg-ink-50/50">
          {status === "idle" && (
            <p className="px-6 text-center text-sm text-ink-400">
              Your generated image will appear here.
            </p>
          )}

          {status === "loading" && (
            <div className="flex flex-col items-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-200 border-t-ink-900" />
              <p className="mt-3 text-sm text-ink-500">Generating image…</p>
              <p className="mt-1 text-xs text-ink-400">
                This can take 20–60 seconds.
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="max-w-sm px-6 text-center">
              <p className="text-sm font-medium text-red-600">
                Generation failed
              </p>
              <p className="mt-2 text-xs text-ink-500">
                {errorMessage ?? "Something went wrong. Please try again."}
              </p>
            </div>
          )}

          {status === "success" && result && (
            <img
              src={dataUrl(result)}
              alt="Generated UGC"
              className="max-h-[640px] w-full object-contain"
            />
          )}
        </div>

        {status === "success" && result && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <Metadata metadata={result.metadata} />
              <a
                href={dataUrl(result)}
                download={`ugc-${Date.now()}.png`}
                className="btn-primary"
              >
                Download PNG
              </a>
            </div>

            <PromptDetails prompt={result.used_prompt} />
          </div>
        )}
      </div>
    </div>
  );
}

function Metadata({ metadata }: { metadata: GenerationSuccess["metadata"] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-ink-500 sm:grid-cols-4">
      <Pair label="Backend" value={metadata.model} />
      <Pair label="Aspect" value={metadata.aspect_ratio} />
      <Pair label="Tier" value={metadata.ugc_tier} />
      <Pair label="Quality" value={metadata.quality} />
    </dl>
  );
}

function Pair({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-ink-400">
        {label}
      </dt>
      <dd className="font-medium text-ink-700">{value}</dd>
    </div>
  );
}
