# WorkspaceAlberta Harness

A custom, CEO-focused, enterprise-grade AI terminal for building and delivering real work.
Forked from the MIT-licensed [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
(`dsh`), operated as a Warre & Vavasour product. Launch instructions live in
[WORKSPACE_ALBERTA.md](WORKSPACE_ALBERTA.md).

## What WorkspaceAlberta is

WorkspaceAlberta is two things working as one.

**A service that details industrial work available today through
[CanadaBuys](https://canadabuys.canada.ca)** — delivered straight into the terminal through the
WorkspaceAlberta MCP server, so the opportunities and the machine that acts on them are the same
surface.

**A terminal that builds.** This is a tool for work: it writes code, files, and documents. It is
not chatting with you. It is not your friend. Get up and get to work.

## It learns your business while it works

This is the feature that separates WorkspaceAlberta from every chatbot with a sidebar: **the
terminal gets better at your industry every day it is used, and you can audit every step of how.**

- **Every session leaves a full trajectory** — each prompt, decision, tool call, and result is
  retained on-device. Nothing about how the agent reached an outcome is a mystery: the Trajectory
  tab replays the reasoning path turn by turn.
- **The evolution loop turns that experience into capability.** On its own cadence, the harness
  reviews its trajectories and proposes versioned refinements — memories, prompt notes, and
  entire skills. Four skills on the origin terminal — from Linear board operations to
  dated finance research — were **written by the harness itself**, from real work, for real work.
- **Nothing global ships without a human at the gate.** Automatic review may promote or archive
  session-local entries, but global edits require explicit approval, every refinement is
  benchmark-scored against your rubric, and every change has deterministic rollback. The model
  proposes; the code guarantees.
- **Learning compounds across the fleet.** Approved skills and prompt notes are plain versioned
  files — reviewed in git, shipped to every terminal through the industry skill pack. Long-term
  retention is a backup policy, not a research project. Your business gets an AI that remembers
  it.

## The principle

We want to know every "wouldn't it be great if" idea you have about your business — and we build
them, with you, like a family doctor. The AI lab behind WorkspaceAlberta, **Warre & Vavasour**,
manages all the spinning plates to keep the tools running, so the CEO works only on executing new
ideas in the workspace.

We do not build apps. We do not replace employees. What this device can do will shock you — so
give us your best ideas and let's build a growing pie instead of thinking about reducing people.
We amplify what is already working.

## Canadian to the metal

WorkspaceAlberta is a Canadian data-sovereignty story, end to end:

- **Canadian LLM, only.** The default model route is Cohere — a Canadian company — with no other
  model provider in the deployment. Your prompts never ride a foreign model.
- **Canadian cloud deployment.** The WorkspaceAlberta service layer is deployed on Canadian
  cloud infrastructure.
- **European hardware, removable Canadian data.** The terminal is a Raspberry Pi 5, manufactured
  in Europe, fitted with **Swissbit industrial SSD storage mounted on the bottom of the device —
  so your corporate files are physically resident on a drive you can remove and hold in your
  hand.** Data leaves the building only when you unplug it and carry it.
- **The last mile: Canadian sandboxes.** Isolated execution currently depends on a non-Canadian
  sandbox provider; we are actively evaluating Canadian alternatives for the e2b sandbox role.
  When your workloads need it, that gap closes too.

## Upstream: DeepSeek Harness

This repository is the upstream `dsh` codebase carrying the WorkspaceAlberta deployment layer
(branding, model route, presets, and deployment patch on the `workspace-alberta` branch). The
upstream project — architecture where everything is a plugin, powered by
[Cordis](https://github.com/cordiverse/cordis) — is in developer preview and iterates rapidly;
expect compatibility-breaking changes when pulling it in.

- Upstream docs: [development guide](docs/development.md), [architecture](docs/architecture.md),
  [Web UI guide](docs/user/guide/index.md) ([中文](README.zh.md))
- Community: upstream [GitHub Discussions](https://github.com/deepseek-ai/deepseek-harness/discussions),
  [`dsh-plugin`](https://github.com/topics/dsh-plugin) topic, upstream
  [Discord](https://discord.gg/Ycq5dCaS4)

## License

[MIT](LICENSE). Third-party dependencies and their licenses are disclosed in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
