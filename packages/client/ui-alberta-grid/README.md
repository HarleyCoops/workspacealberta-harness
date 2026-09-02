# ui-alberta-grid

WorkspaceAlberta conversation view tab **Grid** (`conversation.view` id `alberta-grid`).

Live read-only AESO-shaped feeds:

- `https://web-production-02936.up.railway.app/api/csd` (CSV text)
- `https://web-production-02936.up.railway.app/api/price` (CSV text)

Renders a dark Three.js scene (AIL volume, fuel towers, intertie arcs, pool-price pulse) with a 2D canvas fallback when WebGL is modest. Polls every ~90s. No invented AESO endpoints and no fake dollar savings.

Mounted via `workspace-alberta.patch.yml`.
