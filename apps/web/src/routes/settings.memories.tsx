import { createFileRoute } from "@tanstack/react-router";

import { MemoriesSettings } from "../components/settings/MemoriesSettings";

export const Route = createFileRoute("/settings/memories")({
  component: MemoriesSettings,
});
