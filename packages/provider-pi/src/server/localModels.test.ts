import { describe, expect, it } from "@effect/vitest";

import {
  localModelsLaunch,
  MOONFOLD_PI_LOCAL_PROVIDERS_ENV,
  parseOpenAiModelList,
  PI_LOCAL_MODELS_EXTENSION_SOURCE,
} from "./localModels.ts";

describe("local models for Pi", () => {
  it("reads model ids from an OpenAI-compatible list and ignores junk", () => {
    expect(
      parseOpenAiModelList({
        data: [{ id: "qwen2.5:1.5b" }, { id: "qwen2.5:1.5b" }, { id: "has space" }, { id: 3 }, {}],
      }),
    ).toEqual(["qwen2.5:1.5b"]);
    expect(parseOpenAiModelList({ models: [] })).toEqual([]);
    expect(parseOpenAiModelList(null)).toEqual([]);
  });

  it("loads the extension only when a local server is running", () => {
    expect(localModelsLaunch("/cache/ext.ts", [])).toEqual({ args: [], env: {} });
    expect(localModelsLaunch(undefined, [])).toEqual({ args: [], env: {} });
    const launch = localModelsLaunch("/cache/ext.ts", [
      {
        id: "ollama-local",
        name: "Ollama (local)",
        baseUrl: "http://127.0.0.1:11434/v1",
        models: ["qwen2.5:1.5b"],
      },
    ]);
    expect(launch.args).toEqual(["--extension", "/cache/ext.ts"]);
    expect(JSON.parse(launch.env[MOONFOLD_PI_LOCAL_PROVIDERS_ENV]!)).toEqual([
      {
        id: "ollama-local",
        name: "Ollama (local)",
        baseUrl: "http://127.0.0.1:11434/v1",
        models: ["qwen2.5:1.5b"],
      },
    ]);
  });

  it("registers each server as an OpenAI-completions provider without importing packages", () => {
    expect(PI_LOCAL_MODELS_EXTENSION_SOURCE).toContain("pi.registerProvider(server.id");
    expect(PI_LOCAL_MODELS_EXTENSION_SOURCE).toContain('api: "openai-completions"');
    expect(PI_LOCAL_MODELS_EXTENSION_SOURCE).not.toMatch(/^import /m);
  });
});
