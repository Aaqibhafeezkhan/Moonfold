import { createFileRoute } from "@tanstack/react-router";

import { HandoffSettingsPanel } from "../components/settings/HandoffSettings";

export const Route = createFileRoute("/settings/handoff")({
  component: HandoffSettingsPanel,
});
