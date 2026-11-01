# Release Guide

发布由 [`.github/workflows/release.yml`](../../.github/workflows/release.yml) 自动完成：
推送 `v*` tag 后，在 Windows runner 上运行 typecheck、build、test，打包 npm tarball，
通过 npm Trusted Publisher（OIDC）发布到 npm，并创建 GitHub Release。

## 包名说明

npm 上的 `dsh-env-manager` 已经被另一个**不同功能的包**占用，因此本插件发布为：

```text
dsh-env-manager-plugin
```

插件运行时 id、Skill 名和数据目录仍是 `dsh-env-manager`；只有 npm 包名和
`cordis.patch.yml` 的模块名使用 `dsh-env-manager-plugin`。

## 触发方式

### 推荐：推送 tag

```sh
git tag -a v0.1.0 -m "v0.1.0"
git push origin v0.1.0
```

也可以一次推送提交和 tag：

```sh
git push origin main --follow-tags
```

`--follow-tags` 只推送 annotated tag；如果使用 lightweight tag，必须显式
`git push origin v0.1.0`。

### 手动触发

GitHub → Actions → Release → Run workflow，输入已存在的 tag（例如 `v0.1.0`）。

## 发布前检查

1. `package.json` 的 `version` 必须与 tag 去掉 `v` 后完全一致；不一致时 workflow 会在
   第一步失败。
2. 本地运行 `npm run check`（typecheck + build + test + client 语法检查）。
3. 确认 `lib/` 已重新构建；`npm pack` 的 `prepack` 也会构建，但本地检查应提前暴露错误。
4. 确认 `README.md`、`docs/00-project/current-state.md` 已更新。
5. 检查 tarball：

   ```sh
   npm pack --dry-run
   ```

   确认包含 `index.js`、`client.js`、`cordis.patch.yml`、`lib/`、`locale/`、`icon.svg`、
   `README.md`、`LICENSE` 和 `docs/`。
6. 提交所有发布内容，再打 tag；tag 指向的 commit 应包含完整发布内容。

## 首次发布与 Trusted Publisher

Trusted Publisher 只能在 npm 包已经存在后绑定，因此**第一次发布需要先手动完成**。
之后的版本由 GitHub Actions 自动发布，不需要 `NPM_TOKEN`。

### 1. 首次发布（bootstrap）

Trusted Publisher 只能在包存在后绑定，因此第一次用一个不会占用 `latest` 的
placeholder 版本把包名注册下来：

```sh
npm version 0.0.0-stage --no-git-tag-version
npm publish --access public --tag stage
```

这一步需要交互式 2FA/OTP；不能用没有 OTP 的自动化 shell 代替。发布成功后，
npm 上会出现 `dsh-env-manager-plugin@0.0.0-stage`，当前账号成为 maintainer；
`stage` tag 不会覆盖 `latest`。

然后把版本恢复为本次正式发布版本：

```sh
npm version 0.1.0 --no-git-tag-version
```

> 如果 `npm publish` 报 `EOTP`，请在交互终端完成 2FA；不要把一次性密码写进脚本或仓库。
> 也可以使用 `0.0.0-bootstrap`，只要 tag 用 `stage` 而不是 `latest`。

### 2. 绑定 GitHub Actions

打开 npmjs.com → `dsh-env-manager-plugin` → Settings → Trusted publishing →
Add GitHub Actions publisher：

| 字段 | 值 |
|---|---|
| Organization or user | `zhiwuli0228` |
| Repository | `dsh-env-manager` |
| Workflow filename | `release.yml` |
| Environment | 留空 |

绑定后可以检查：

```sh
npm trust list dsh-env-manager-plugin
```

`npm trust` 也可能要求 2FA；失败时以 npm 网页设置页为准。

### 3. 之后的自动发布

```sh
git tag -a v0.1.1 -m "v0.1.1"
git push origin v0.1.1
```

workflow 使用 `id-token: write` 获取 OIDC token，执行：

```sh
npm publish --access public --provenance
```

不需要 `NPM_TOKEN`，也不需要 `.npmrc`。`--provenance` 只生成供应链证明；
它本身不授予发布权限，授权来自 npm 侧的 Trusted Publisher 绑定。

### 备选：NPM_TOKEN

如果暂时不绑定 Trusted Publisher，可以创建 npm Automation token，配置为仓库
secret `NPM_TOKEN`，并在 publish 前写入 `.npmrc`。当前 workflow 不使用该方案；
不要把 token 提交到仓库。

## Workflow 步骤

1. Checkout tag。
2. 校验 tag 与 `package.json` 版本。
3. `npm ci`。
4. `npm run check`（typecheck + build + test + client 语法检查）。
5. `npm pack`，生成 `dsh-env-manager-plugin-<version>.tgz`。
6. 查询 npm 上是否已经存在该版本；已存在则跳过 publish，但仍然创建 GitHub Release。
7. 升级 npm CLI，然后用 Trusted Publisher / OIDC 发布到 npm。
8. 创建 GitHub Release，自动生成 release notes，并上传 tarball。

第 6 步让 workflow 可以安全地补做 Release：如果某个版本已经在本地手动发布成功，
但 workflow 在 publish 阶段因“版本已存在”失败，重新手动触发同一个 tag 即可跳过
publish 并完成 Release，不需要删除或覆盖 npm 版本。

## 权限

```yaml
permissions:
  contents: write   # 创建 Release
  id-token: write   # Trusted Publisher + npm provenance
```

不要使用 `write-all`。

## 发布后验证

1. 等待 registry 传播（通常 1–5 分钟）：

   ```sh
   npm view dsh-env-manager-plugin version
   ```

2. 验证元数据：

   ```sh
   npm view dsh-env-manager-plugin@0.1.0 dist.shasum dist.integrity gitHead dist.attestations
   ```

   `gitHead` 应等于 tag commit；provenance 的 `predicateType` 应为
   `https://slsa.dev/provenance/v1`。

3. 验证 Release：

   ```sh
   gh release view v0.1.0
   ```

   确认 `dsh-env-manager-plugin-0.1.0.tgz` 附件存在。

4. 更新 `docs/00-project/current-state.md` 的发布状态和测试计数。

## 常见失败

- **`private: true` / npm 拒绝发布**：当前 `package.json` 已移除 `private`。
- **tag 与版本不一致**：先改 `package.json`，提交后再打 tag。
- **npm 版本已存在**：npm 不允许覆盖同版本。正常发版应提升版本并重新打 tag；
  如果该版本已手动发布、只缺 GitHub Release，则手动触发同一个 tag，workflow 会
  跳过 publish 并补建 Release。
- **`EOTP` / 2FA**：交互式发布需要 OTP；CI 使用 Trusted Publisher。
- **`ENEEDAUTH`**：没有 token 且 Trusted Publisher 未绑定，或 workflow 缺少
  `id-token: write`。
- **`E403` / 版本已存在**：先确认 `npm view`，不要立即重试。
- **`npm view` 仍显示旧版本**：registry 传播/缓存，先看 workflow 日志。
- **首次 workflow 发布失败**：Trusted Publisher 必须在包存在且绑定后才能用；
  先完成上面的 bootstrap。
- **lightweight tag 没被推送**：用 annotated tag 或显式 `git push origin <tag>`。
- **Release 已存在**：`softprops/action-gh-release` 会更新已有 Release；
  需要全新发布时使用新 tag。
