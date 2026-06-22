# 张玳源个人作品集

基于 React + Vite 的桌面端个人作品集基础版本。

## 本地运行

```bash
npm install
npm run dev
```

浏览器打开终端中显示的本地地址即可预览。

## 构建

```bash
npm run build
```

当前版本包含全屏动态 Hero、个人经历、精选项目、个人优势与整屏联系方式模块。Hero 视频使用公开 CC0 演示素材，后续可直接替换为个人作品视频。

“白霭区”项目卡片会进入 `/projects/white-haze`，使用 Three.js 半球投影播放 SBS VR180 视频。网页播放文件位于 `public/videos/white-haze-180.mp4`，由 8K 母版生成 4K 流媒体版本，母版不会被修改。
