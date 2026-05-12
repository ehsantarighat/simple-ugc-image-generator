import type { AspectRatio, Quality, UgcTier } from "../lib/api";

interface SettingsPanelProps {
  aspectRatio: AspectRatio;
  ugcTier: UgcTier;
  quality: Quality;
  onChange: (next: {
    aspectRatio?: AspectRatio;
    ugcTier?: UgcTier;
    quality?: Quality;
  }) => void;
}

const ASPECT_RATIOS: AspectRatio[] = ["1:1", "4:5", "9:16", "16:9"];
const TIERS: UgcTier[] = ["raw", "polished", "premium"];
const QUALITIES: Quality[] = ["low", "medium", "high"];

export function SettingsPanel({
  aspectRatio,
  ugcTier,
  quality,
  onChange,
}: SettingsPanelProps) {
  return (
    <div className="card p-4">
      <h3 className="mb-3 text-sm font-semibold text-ink-900">Settings</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="label mb-1 block">Aspect ratio</label>
          <select
            className="input"
            value={aspectRatio}
            onChange={(e) =>
              onChange({ aspectRatio: e.target.value as AspectRatio })
            }
          >
            {ASPECT_RATIOS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label mb-1 block">UGC tier</label>
          <select
            className="input"
            value={ugcTier}
            onChange={(e) => onChange({ ugcTier: e.target.value as UgcTier })}
          >
            {TIERS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label mb-1 block">Quality</label>
          <select
            className="input"
            value={quality}
            onChange={(e) => onChange({ quality: e.target.value as Quality })}
          >
            {QUALITIES.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
