# 张玳源作品集

线上网址：https://zdy0416.github.io/

GitHub 仓库：https://github.com/Zdy0416/zdy0416.github.io

## 以后如何修改

当前网站源码在 GitHub 仓库的 `portfolio/` 文件夹；本机编辑项目为 `Zportfolio`。继续让 Codex 修改文字、图片或排版，查看本地预览后，将修改提交到 GitHub 的 `main` 分支。GitHub Actions 会构建新版并发布到同一网址。历史提交保留，可以恢复旧版本。

## 页面与内容

- `index.html`：首页。
- `projects/index.html` 与 `assets/projects-webgl.js`：All Projects。项目的 `hidden: true` 仅隐藏展示，改为 `false` 即可恢复。
- `project/`：各项目详情页。
- `contact/index.html`：联系页，邮箱为 `2690881791@qq.com`。
- `main.css`：页面样式。
- `assets/`：网站使用的图片和视频。

## 本地预览和构建

在源码文件夹运行 `pnpm install`，然后 `pnpm dev`。

- `pnpm build`：生成根路径托管版本到 `dist/`。
- `pnpm build:github`：生成适配个人主页根路径 `/` 的 GitHub Pages 版本到 `dist/`。

构建会通过 `scripts/sync-page-data.mjs` 同步页面跳转数据。不要直接修改生成的 `dist/`；请修改源码后重新构建。

GitHub Actions 的部署配置位于仓库根目录 `.github/workflows/portfolio-pages.yml`。源代码文件夹为 `portfolio`，构建产物为 `portfolio/dist`。仓库原有网站文件保留，不再作为发布来源。

网页视频是播放版本，原始高质量素材请继续单独保存。
