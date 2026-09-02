# ui-alberta-grid

WorkspaceAlberta 会话视图标签页 **Grid**（`conversation.view` id `alberta-grid`）。

只读 AESO 形态数据源：

- `https://web-production-02936.up.railway.app/api/csd`（CSV 文本）
- `https://web-production-02936.up.railway.app/api/price`（CSV 文本）

深色 Three.js 场景（AIL 体量、燃料塔、联络线弧、池价格脉冲），并在 WebGL 能力有限时回退到 2D canvas。约每 90 秒轮询一次。不虚构 AESO 接口，也不编造节电金额。

通过 `workspace-alberta.patch.yml` 挂载。
