cask "moonfold" do
  arch arm: "arm64", intel: "x64"

  version "0.1.0-beta.1"
  sha256 arm:   "d7e4ad58465ff3d2facdd91233966095412a6ab5465602b921743bf9d7a184ac",
         intel: "dcd6ce00727eb09e79c630f61d7d986fb12716c4967124bb06bc5cfe10222933"

  url "https://github.com/Mr-Dark-debug/Moonfold/releases/download/v#{version}/Moonfold-#{version}-#{arch}.dmg"
  name "Moonfold"
  desc "Open-source workspace for coding agents, with handoff between providers"
  homepage "https://github.com/Mr-Dark-debug/Moonfold"

  livecheck do
    url :url
    strategy :github_latest
  end

  auto_updates true
  depends_on macos: ">= :monterey"

  app "Moonfold.app"
end
