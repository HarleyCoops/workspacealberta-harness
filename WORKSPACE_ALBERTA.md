# WorkspaceAlberta

WorkspaceAlberta is an independent Warre & Vavasour deployment of the MIT-licensed upstream `dsh` plugin runtime. It is not official DeepSeek software. Upstream copyright, license, package names, and notices remain intact; product-facing branding and provider defaults are supplied by this downstream checkout.

Build and launch the Web profile on port 3081 with telemetry hard-disabled and the WorkspaceAlberta deployment patch:

```sh
DSH_CLIENT_BUILD_PROFILE=official DSH_CLIENT_TITLE=WorkspaceAlberta pnpm run build
DSH_TELEMETRY_DISABLED=1 pnpm dsh --profile web --patch workspace-alberta.patch.yml --host 127.0.0.1 --port 3081 --no-open
```

The Cohere route reads `COHERE_API_KEY`. Composio reads `COMPOSIO_API_KEY` and optionally `COMPOSIO_MCP_URL`, which defaults to `https://connect.composio.dev/mcp`. No keys belong in this repository. Composio is omitted when its API key is absent. The WorkspaceAlberta MCP endpoint is mounted through the upstream streamable-HTTP MCP client.

The deployment patch disables the upstream DeepSeek model adapter, DeepSeek-backed web search, the generic Web tool rows that depend on that search provider, and session OTLP telemetry. The source tree contains no `.cn` update or download callback; upstream Chinese-language documentation remains as legal and technical documentation rather than shipped runtime behavior.
