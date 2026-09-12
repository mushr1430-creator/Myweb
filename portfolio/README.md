# 张玳源作品集

线上网址：https://zdy0416.github.io/

GitHub 仓库：https://github.com/Zdy0416/zdy0416.github.io

## 以后如何修改

当前网站源码在 GitHub 仓库的 `portfolio/` 文件夹；本机编辑项目为 `Zportfolio`。继续让 Codex 修改文字、图片或排版，查看本地预览后，将修改提交到 GitHub 的 `main` 分支。GitHub Actions 会构建新版并发布到同一网址。历史提交保留，可以恢复旧版本。

## 页面与内容

- `index.html` 与 `assets/home-spiral.js`：首页及第三屏的螺旋作品展示、两段式滚动入口。
- 第二屏仅保留居中的个人照片和下方 View All Projects 按钮，旧简介、姓名胶囊及隐藏的姓名滚动动画已移除。
- `assets/projects-webgl.js`：首页第三屏的 3D 渲染器。顶部及手机菜单的 Projects 在首页平滑滚到第三屏，从其他页面返回 `/#all-projects`。
- `projects/index.html`：旧链接的跳转文件，仅转到 `/#all-projects`；独立作品画廊已移除。
- `assets/project-catalog.json`：统一的个人项目目录。`hidden: true` 仅隐藏展示，改为 `false` 即可恢复。
- `project/`：各项目详情页。
- `contact/index.html`：联系页，邮箱为 `2690881791@qq.com`。
- `main.css`：页面样式。
- `assets/`：网站使用的图片和视频。

## 本地预览和构建

在源码文件夹运行 `pnpm install`，然后 `pnpm dev`。

- `pnpm build`：生成根路径托管版本到 `dist/`。
- `pnpm build:github`：生成适配个人主页根路径 `/` 的 GitHub Pages 版本到 `dist/`。
- `pnpm check:assets`：从实际页面入口检查资源引用，列出缺失或未引用的文件；不会自动删除。
- `node scripts/check-assets.mjs dist`：检查构建产物中的资源引用。

构建会同步首页备用项目列表、`d` 中的页面片段及仍需 WebGL 预载的纹理，并将共用的 3D 渲染代码打包一次。原生图片、视频与螺旋画廊素材由各自入口加载。不要直接修改生成的 `d.medias` 或 `dist/`；请修改源码后重新构建。

GitHub Actions 的部署配置位于仓库根目录 `.github/workflows/portfolio-pages.yml`，本机对应模板为 `scripts/portfolio-pages.yml`。源代码文件夹为 `portfolio`，构建产物为 `portfolio/dist`。发布前检查源文件、生产包资源和章节滚动；部署网址保持不变。

网页视频是播放版本，原始高质量素材请继续单独保存。
