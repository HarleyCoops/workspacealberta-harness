# Agent Note: Alberta Grid v2 的 Wilke 诚实编码

Status: implemented

[English](2026-09-02-alberta-grid-wilke-v2.md) | 中文

## 问题

Grid 标签页（`conversation.view` id `alberta-grid`）把 AESO Current Supply Demand 与池价格主要编码成 Three.js 立体布景：发光的 AIL 体量、透视燃料塔、联络线丝带和价格脉冲。这些标记违反 Claus Wilke《数据可视化基础》第 17 章（柱必须从 0 起；墨水必须成比例）、第 4 章（定性色与顺序色的角色；不用彩虹色）和第 26 章（不要用无谓的 3D 去做必须能在 2D 还原的比较）。HUD 还打印 CSD 的 `Last update` 时间戳，让 90 秒一次的实时轮询看起来像过了数小时。2D canvas 回退仍用脉冲圆表示 AIL，并且没有始终可见的 MW / 占 AIL 百分比标签。树莓派部署需要保持同一标签 id，以便 :3081 只拾取一个 Grid 标签页。

## 决策

`@workspacealberta/ui-alberta-grid` 保持 id `alberta-grid`，并原地升级该视图。

主编码始终是 React 2D 布局：从共享 0 基线对齐的燃料柱（Solar / Wind / Gas（cogen+CC+steam+SC）/ Hydro+Other / Storage），同时标注 MW 与占 AIL 百分比；大号 AIL 数字；池价格为 `$/MWh` 加上冷–琥珀–热的顺序/发散色带（阈值 $40 与 $100，绘制域 $0–$400）；BC / Montana 联络线从 0 向左（进口）或向右（出口）延伸的有符号柱。燃料颜色是 `encodings.ts` 中固定的 Okabe–Ito 风格定性色，图例与任一 3D 面板复用。HUD 用客户端 `fetchedAt` 时钟显示轮询健康状态（`Live AESO feed` / 陈旧 / 不可达）。CSD 时间戳仍解析到 `CsdSnapshot.lastUpdate`，但从不渲染。

`?lite`（`URLSearchParams.has('lite')`）或失败/软件 WebGL 探测会保持 2D 柱挂载，并且不构造 `WebGLRenderer`。在硬件 WebGL 可用时，可以挂载次要轨道面板：固定尺寸的半透明负荷容器（不按 AIL 缩放）、复用同一套色相的燃料柱，以及地面上的有符号联络线标记。价格从不用光晕强度表示。拖动轨道，滚轮缩放。读数不依赖该面板。

数据源仍是 `https://web-production-02936.up.railway.app/api/csd` 与 `.../api/price`。轮询间隔 90 秒。Solar 仍是 AESO 可见（>5 MW）。不修改 Railway 应用。接线仍是 `workspace-alberta.patch.yml` 的 `ui-alberta-grid` insert。

## 考虑过的替代方案

**用 `alberta-grid-v2` 替换标签页。** 不予采用：Pi 部署只有一个 Grid 标签页；第二个 id 会让旧布景与 v2 并存，或要求在 :3081 热重启期间协同改 roster。

**把 Three.js 留作主标记，只改样式。** 不予采用：透视高度与光晕无法满足成比例墨水或可还原比较，而且 2D 回退仍会变成第二套更弱的编码。

**完全去掉 Three.js。** 不予采用：在 2D 保持权威时，可选轨道隐喻是允许的；去掉该依赖还能再缩小包体，但不是交付诚实编码的前提。

**在轮询健康状态旁继续展示 CSD last-update 时间戳。** 不予采用：正是该时间戳让实时数据源看起来过时；留在屏幕上等于把缺陷加回去。

## 结果

读者可以只凭 2D 柱与数字比较燃料、AIL、价格和 BC/Montana 交换，包括在 `?lite` 与软件 GL 主机上。3D 面板仅 GPU 可用，且 jsdom 通道无法覆盖；`canUseWebGL` / `shouldMountThree` / `createGridScene` 的空路径有单元测试，渲染器类被明确排除在覆盖率之外。包测试钉住解析器、编码、HUD 文案（无 `Last update`）、悬停 MW/%，以及视图注册的 HMR 卸载。
