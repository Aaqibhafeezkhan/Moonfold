---
title: Reach your Moonfold from another device
description: Pair a phone, a browser or another desktop with a Moonfold running on a different machine, using your own network, Tailscale or an SSH tunnel.
category: Guides
date: 2026-10-25
---

Agents run for a long time. You should not have to sit in front of the machine that is running them. Moonfold's server speaks WebSocket, so a browser on another device can drive it as long as the host stays on and reachable.

## There is no Moonfold relay

Moonfold does not run a relay or an account service. Moonfold Connect, which reaches a machine through a relay without router forwarding, exists in the code but is turned off in release builds. If you want it, you deploy your own relay and sign-in service from the repository and build with their settings. Everything below works without any of that.

## Option 1: pair on your network

Use direct pairing when the other device can reach the host's address.

On a desktop host, open **Settings → Connections**, enable **Network access**, then create a pairing link with an address the other device can reach. Changing network access restarts the app, and you can turn it off in the same place.

For a command-line host, give the server an address the other device can reach:

```bash
moonfold serve --host <private-ip>
```

If a server is already running, create a fresh link without restarting it:

```bash
moonfold pair
```

Scan the QR code on your phone or paste the link into **Add environment** in the receiving app. A loopback address such as `127.0.0.1` only reaches the device it was opened on.

## Option 2: Tailscale or an SSH tunnel

If your devices are on a Tailscale network, use the host's tailnet address in the same pairing flow. An SSH tunnel works for hosts you can already reach over SSH. Either way you are using a network you control rather than a service we operate.

## Several routes to one machine

A machine can be reachable by LAN, Tailscale, another VPN, a public URL or SSH. Pairing the same machine over another address adds a route instead of a second machine, new routes are placed by speed, and you can reorder them. Pairing authorizes that device for future connections, so use a fresh one-time link for each new device.

The [remote access guide](/docs/remote-access/) covers every setting.
