const MODEL_NAME = "Xenova/clip-vit-base-patch32";
const INDEX_URL = "./data/visual_index.json";
const TRANSFORMERS_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1";

let transformersPromise = null;


export class VisualMatcher {
  constructor() {
    this.refs = [];
    this.extractor = null;
    this.readyPromise = null;
  }

  async load() {
    const response = await fetch(INDEX_URL);

    if (!response.ok) {
      throw new Error(`Could not load visual index: ${response.status}`);
    }

    const index = await response.json();

    if (index.model !== MODEL_NAME || !Array.isArray(index.refs)) {
      throw new Error("Visual index format does not match this matcher.");
    }

    this.refs = index.refs
      .filter((ref) => ref.id && ref.name && Array.isArray(ref.embedding))
      .map((ref) => ({
        id: Number(ref.id),
        name: ref.name,
        source: ref.source || "reference",
        embedding: normalize(ref.embedding),
      }));

    console.log(`Loaded ${this.refs.length} visual references`);
  }

  warmup() {
    if (!this.readyPromise) {
      this.readyPromise = loadTransformers()
        .then(({ pipeline }) => {
          return pipeline("image-feature-extraction", MODEL_NAME, {
            dtype: "q8",
          });
        })
        .then((extractor) => {
          this.extractor = extractor;
          return extractor;
        });
    }

    return this.readyPromise;
  }

  async matchCanvas(canvas, limit = 5) {
    if (!this.refs.length) {
      throw new Error("Visual index is not loaded.");
    }

    const extractor = await this.warmup();
    const output = await extractor(canvas);
    const query = normalize(Array.from(output.data));
    const bestById = new Map();

    for (const ref of this.refs) {
      const score = dot(query, ref.embedding);
      const previous = bestById.get(ref.id);

      if (!previous || score > previous.score) {
        bestById.set(ref.id, {
          id: ref.id,
          name: ref.name,
          score,
          source: ref.source,
        });
      }
    }

    return Array.from(bestById.values())
      .sort((left, right) => right.score - left.score)
      .slice(0, limit);
  }
}

async function loadTransformers() {
  if (!transformersPromise) {
    transformersPromise = import(TRANSFORMERS_URL).then((module) => {
      module.env.allowLocalModels = false;
      module.env.useBrowserCache = true;

      if (module.env.backends?.onnx?.wasm) {
        module.env.backends.onnx.wasm.wasmPaths =
          "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/";
      }

      return module;
    });
  }

  return transformersPromise;
}

function normalize(values) {
  let norm = 0;

  for (const value of values) {
    norm += value * value;
  }

  norm = Math.sqrt(norm) || 1;
  return values.map((value) => value / norm);
}

function dot(left, right) {
  let total = 0;

  for (let i = 0; i < left.length; i += 1) {
    total += left[i] * right[i];
  }

  return total;
}
