import { MemoryId, MemoryText, OrchestratorMcpFailure } from "@moonfold/contracts";
import * as Schema from "effect/Schema";
import { Tool, Toolkit } from "effect/ai";

import * as MemoryStore from "../../../memories/MemoryStore.ts";
import * as ThreadManagementService from "../../../orchestration-v2/ThreadManagementService.ts";
import * as McpInvocationContext from "../../McpInvocationContext.ts";

const RememberTool = Tool.make("remember", {
  description:
    "Save something the user asked you to remember across conversations, such as a lasting preference or a fact about how they work. Use it only when the user asks you to remember something or clearly states a lasting preference; never for task progress or details of this conversation. Write one short sentence in your own words. Later turns receive it as background. It applies to this thread's project. The user sees every memory in Settings → Memories and can edit it, delete it or make it apply everywhere. Fails when the user has turned memories off.",
  parameters: Schema.Struct({ text: MemoryText }),
  success: Schema.Struct({ memoryId: MemoryId, message: Schema.String }),
  failure: OrchestratorMcpFailure,
  failureMode: "return",
  dependencies: [
    McpInvocationContext.McpInvocationContext,
    ThreadManagementService.ThreadManagementService,
    MemoryStore.MemoryStore,
  ],
})
  .annotate(Tool.Title, "Remember")
  .annotate(Tool.Readonly, false)
  .annotate(Tool.Destructive, false)
  .annotate(Tool.Idempotent, false)
  .annotate(Tool.OpenWorld, false);

export const MemoryToolkit = Toolkit.make(RememberTool);
