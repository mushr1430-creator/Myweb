# 张玳源作品集

线上网址：https://mushr1430-creator.github.io/Myweb/

## 当前网站

新版源码位于 `portfolio/`。仓库原有网站文件和提交历史保留，便于回看旧版本。

## 以后如何修改

在 Codex 中编辑 `portfolio/` 下的源码，查看本地预览后提交到 `main` 分支。GitHub Actions 使用 `.github/workflows/portfolio-pages.yml` 构建并发布到同一网址。

- 首页：`portfolio/index.html`
- All Projects：`portfolio/projects/index.html` 和 `portfolio/assets/projects-webgl.js`
- 项目详情：`portfolio/project/`
- 联系页：`portfolio/contact/index.html`
- 图片和视频：`portfolio/assets/`

京东 AI 导购和策展项目通过 `hidden: true` 暂时隐藏，内容保留。

## 本地运行

进入 `portfolio` 文件夹，运行 `pnpm install`，然后 `pnpm dev`。

`pnpm build:github` 生成适配 `/Myweb/` 的发布文件到 `dist/`。修改源码后重新构建，不要直接编辑生成的 `dist/`。
