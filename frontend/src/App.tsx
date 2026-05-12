import { useState } from "react";
import { UploadCard } from "./components/UploadCard";
import { SettingsPanel } from "./components/SettingsPanel";
import { ResultPanel } from "./components/ResultPanel";
import {
  generateImage,
  type AspectRatio,
  type GenerationSuccess,
  type Quality,
  type UgcTier,
} from "./lib/api";

type Status = "idle" | "loading" | "success" | "error";

const SCENE_PLACEHOLDER =
  "Example: A bright morning bathroom, the model holding the serum near her face, natural window light, polished UGC style.";

export default function App() {
  const [modelImage, setModelImage] = useState<File | null>(null);
  const [productImage, setProductImage] = useState<File | null>(null);
  const [scene, setScene] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("4:5");
  const [ugcTier, setUgcTier] = useState<UgcTier>("polished");
  const [quality, setQuality] = useState<Quality>("high");

  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<GenerationSuccess | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canGenerate =
    !!modelImage && !!productImage && scene.trim().length > 0 && status !== "loading";

  const onGenerate = async () => {
    if (!modelImage || !productImage) {
      setErrorMessage("Please upload both a model and a product image.");
      setStatus("error");
      return;
    }
    if (!scene.trim()) {
      setErrorMessage("Please describe the scene.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMessage(null);
    setResult(null);

    const res = await generateImage({
      modelImage,
      productImage,
      scene: scene.trim(),
      aspectRatio,
      ugcTier,
      quality,
    });

    if (res.success) {
      setResult(res);
      setStatus("success");
    } else {
      setErrorMessage(res.error);
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <h1 className="text-xl font-semibold tracking-tight text-ink-900">
            Influencer UGC Generator
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Create realistic creator-style product images from your model and
            product references.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <UploadCard
                label="Model reference"
                hint="A clear photo of the creator / model whose identity should be preserved."
                file={modelImage}
                onChange={setModelImage}
              />
              <UploadCard
                label="Product reference"
                hint="A clear photo of the product with packaging visible."
                file={productImage}
                onChange={setProductImage}
              />
            </div>

            <div className="card p-4">
              <label htmlFor="scene" className="label mb-2 block">
                Scene description
              </label>
              <textarea
                id="scene"
                className="input min-h-[120px] resize-y"
                placeholder={SCENE_PLACEHOLDER}
                value={scene}
                onChange={(e) => setScene(e.target.value)}
              />
              <p className="mt-2 text-xs text-ink-400">
                Tip: describe location, time of day, framing, and how the model
                is interacting with the product.
              </p>
            </div>

            <SettingsPanel
              aspectRatio={aspectRatio}
              ugcTier={ugcTier}
              quality={quality}
              onChange={(next) => {
                if (next.aspectRatio) setAspectRatio(next.aspectRatio);
                if (next.ugcTier) setUgcTier(next.ugcTier);
                if (next.quality) setQuality(next.quality);
              }}
            />

            <button
              type="button"
              onClick={onGenerate}
              disabled={!canGenerate}
              className="btn-primary w-full py-3 text-base"
            >
              {status === "loading" ? "Generating…" : "Generate"}
            </button>

            {status === "error" && errorMessage && (
              <p className="text-sm text-red-600" role="alert">
                {errorMessage}
              </p>
            )}
          </section>

          <section>
            <ResultPanel
              status={status}
              result={result}
              errorMessage={errorMessage}
            />
          </section>
        </div>
      </main>

      <footer className="border-t border-ink-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4 text-xs text-ink-400">
          Powered by GPT Image 2.
        </div>
      </footer>
    </div>
  );
}
