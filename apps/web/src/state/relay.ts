import { createRelayEnvironmentDiscoveryAtoms } from "@moonfold/client-runtime/state/relay";

import { connectionAtomRuntime } from "../connection/runtime";

export const relayEnvironmentDiscovery: ReturnType<typeof createRelayEnvironmentDiscoveryAtoms> =
  createRelayEnvironmentDiscoveryAtoms(connectionAtomRuntime);
