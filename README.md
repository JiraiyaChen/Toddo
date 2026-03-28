# 公务员备考任务规划台

这是一个基于 Vue 3 + Vite 的任务规划记录前端项目，支持：

- 任务新增、筛选、排序和状态切换
- 备考分类（行测、申论）与行测子分类
- IndexedDB 本地持久化

## 本地开发

```bash
pnpm install
pnpm dev
```

## 构建

```bash
pnpm build
```

## GitHub Pages 自动发布

项目已内置 GitHub Actions 工作流：

- 工作流文件：.github/workflows/deploy-pages.yml
- 触发条件：推送到 main 分支，或手动触发
- 发布内容：dist 目录

### 首次启用步骤

1. 把仓库代码推送到 GitHub 的 main 分支。
2. 打开仓库 Settings -> Pages。
3. Build and deployment 选择 GitHub Actions。
4. 等待 Actions 中 Deploy To GitHub Pages 工作流执行完成。

发布地址一般为：

https://你的用户名.github.io/你的仓库名/

## 说明

vite.config.js 已自动根据 GitHub Actions 环境设置 base 路径，
本地开发仍使用根路径，不影响本地调试。
