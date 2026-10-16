import { Button } from "../ui/button";
import { SettingsRow } from "./settingsLayout";
import { searchableSetting } from "./settingsSearch";

const UPSTREAM_URL = "https://github.com/pingdotgg/t3code";
const LICENSE_URL = "https://github.com/Mr-Dark-debug/Moonfold/blob/main/LICENSE";

/**
 * Credits the upstream project Moonfold is forked from, as its MIT license requires, and states
 * that Moonfold is independent of the providers it works with.
 */
export function AboutMoonfoldCredits() {
  return (
    <SettingsRow
      {...searchableSetting("credits")}
      description={
        <>
          Moonfold is a fork of T3 Code by T3 Tools Inc., used under the MIT License. Moonfold is
          not affiliated with or endorsed by T3 Tools, OpenAI, Anthropic, Google, Anysphere, or xAI.
        </>
      }
      control={
        <div className="flex gap-2">
          <Button
            render={<a href={UPSTREAM_URL} target="_blank" rel="noreferrer noopener" />}
            size="sm"
            variant="outline"
          >
            T3 Code
          </Button>
          <Button
            render={<a href={LICENSE_URL} target="_blank" rel="noreferrer noopener" />}
            size="sm"
            variant="outline"
          >
            License
          </Button>
        </div>
      }
    />
  );
}
