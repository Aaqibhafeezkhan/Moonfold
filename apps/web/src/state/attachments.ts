import { createAttachmentEnvironmentAtoms } from "@moonfold/client-runtime/state/attachments";

import { connectionAtomRuntime } from "../connection/runtime";

export const attachmentEnvironment = createAttachmentEnvironmentAtoms(connectionAtomRuntime);
