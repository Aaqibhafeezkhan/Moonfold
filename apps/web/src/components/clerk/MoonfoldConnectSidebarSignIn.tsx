import { UserButton, useAuth } from "@clerk/react";
import { LogInIcon } from "lucide-react";

import { hasCloudPublicConfig } from "../../cloud/publicConfig";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "../ui/sidebar";
import { MOONFOLD_CONNECT_ACCOUNT_PAGES } from "./MoonfoldConnectAccountPages";
import { useMoonfoldConnectAuthPrompt } from "./useMoonfoldConnectAuthPrompt";

export function MoonfoldConnectSidebarSignIn() {
  if (!hasCloudPublicConfig()) return null;

  return <ConfiguredMoonfoldConnectSidebarSignIn />;
}

export function MoonfoldConnectSidebarAvatar() {
  if (!hasCloudPublicConfig()) return null;

  return <ConfiguredMoonfoldConnectSidebarAvatar />;
}

function ConfiguredMoonfoldConnectSidebarAvatar() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded || !isSignedIn) return null;

  return (
    <UserButton
      appearance={{
        elements: {
          avatarBox: "size-7",
          userButtonTrigger: "rounded-lg p-1 hover:bg-sidebar-row-hover",
        },
      }}
    >
      {MOONFOLD_CONNECT_ACCOUNT_PAGES.map((page) => (
        <UserButton.UserProfilePage
          key={page.url}
          label={page.label}
          labelIcon={page.icon}
          url={page.url}
        >
          {page.content}
        </UserButton.UserProfilePage>
      ))}
    </UserButton>
  );
}

function ConfiguredMoonfoldConnectSidebarSignIn() {
  const { isLoaded, isSignedIn } = useAuth();
  const { authPrompt, openAuthPrompt } = useMoonfoldConnectAuthPrompt();

  if (!isLoaded || isSignedIn) return null;

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton onClick={openAuthPrompt}>
            <LogInIcon />
            <span>Sign in to Moonfold Connect</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
      {authPrompt}
    </>
  );
}
