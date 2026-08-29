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

## The principle

We want to know every "wouldn't it be great if" idea you have about your business — and we build
them, with you, like a family doctor. The AI lab behind WorkspaceAlberta, **Warre & Vavasour**,
manages all the spinning plates to keep the tools running, so the CEO works only on executing new
ideas in the workspace.

We do not build apps. We do not replace employees. What this device can do will shock you — so
give us your best ideas and let's build a growing pie instead of thinking about reducing people.
We amplify what is already working.

## The harness that learns

The terminal gets better at your industry the more real work it does, and it does so with an
auditable loop instead of opaque fine-tuning:

1. **Every session leaves a full trajectory** — each prompt, reasoning trace, tool call, and
   result is retained on-device in the local session logs.
2. **The evolution loop reviews those trajectories** (`dsh-continual-evolve`): on turn intervals
   and compaction checkpoints it proposes versioned refinements — prompt notes, memories, skills,
   and subagent specs — each carrying its evidence trail.
3. **Nothing global ships without a human at the gate.** Automatic review may promote or archive
   session-local entries, but global edits require explicit approval, every change is
   benchmark-scored against industry rubric keys, and every refinement has deterministic
   rollback. The model proposes; the code guarantees.
4. **Approved learning compounds.** Prompt notes and memories are injected into real system
   prompts (zero token cost when empty), and curated packs are plain versioned files — so an
   industry-specific corpus distilled on one terminal can be reviewed in git and shipped to the
   fleet. Long-term retention is a backup policy, not a research project.

The `autoresearcher` skill mines accumulated session traces to feed this loop deliberately; the
Trajectory tab shows any session's full reasoning path — how the agent actually reached its
outcome, turn by turn.

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
