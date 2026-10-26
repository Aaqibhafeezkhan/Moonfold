cask "moonfold" do
  arch arm: "arm64", intel: "x64"

  version "0.1.0-beta.2"
  sha256 arm:   "beb81cc1a1ab761a2fe7b0823f6a4cb641a5422d8fdb7b40245b9e2e44ff686f",
         intel: "7e8f99fa2363c8acf9d22b025d2b855cc4a4a2a5509f2def20210f91788d6edb"

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
