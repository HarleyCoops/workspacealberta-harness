# workspaceAlberta

workspaceAlberta is an independent Warre & Vavasour deployment of the MIT-licensed upstream `dsh` plugin runtime. It is not official DeepSeek software. Upstream copyright, license, package names, and notices remain intact; product-facing branding and provider defaults are supplied by this downstream checkout.

Build and launch the Web profile on port 3081 with telemetry hard-disabled and the workspaceAlberta deployment patch:

```sh
DSH_CLIENT_BUILD_PROFILE=official DSH_CLIENT_TITLE=workspaceAlberta pnpm run build
DSH_TELEMETRY_DISABLED=1 pnpm dsh --profile web --patch workspace-alberta.patch.yml --host 127.0.0.1 --port 3081 --no-open
```

The Cohere route reads `COHERE_API_KEY`. Composio is not part of this harness: it is the WorkspaceAlberta connection layer for other products, never a tool-calling surface here and never bridged to the workspaceAlberta server. The harness's model-facing MCP surface is Linear plus the direct workspaceAlberta endpoint, mounted through the upstream streamable-HTTP MCP client. No keys belong in this repository.

The deployment patch disables the upstream DeepSeek model adapter, DeepSeek-backed web search, the generic Web tool rows that depend on that search provider, and session OTLP telemetry. The source tree contains no `.cn` update or download callback; upstream Chinese-language documentation remains as legal and technical documentation rather than shipped runtime behavior.
