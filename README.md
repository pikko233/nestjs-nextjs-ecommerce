# nestjs-nextjs-ecommerce

基于 NestJS + Next.js 的全栈电商项目（monorepo）。

## 目录结构

| 目录 | 说明 |
|---|---|
| [`api/`](api/) | 后端 REST API：NestJS 12 + Prisma 7 + PostgreSQL + Stripe |
| [`front/`](front/) | 前端：Next.js 16（App Router）+ React 19 + Tailwind CSS 4 + shadcn/ui |
| [`.github/workflows/`](.github/workflows/) | 后端 CI/CD：测试、构建镜像、推送 ECR、部署到 EC2 |

## 功能概览

- 用户注册 / 登录，JWT access token + refresh token
- 基于角色的权限控制（`USER` / `ADMIN`）
- 商品分类、商品与库存管理
- 购物车
- 订单创建、查询、取消与状态流转
- Stripe 支付（PaymentIntent）
- Swagger 接口文档

前端页面：

| 路由 | 页面 | 需要登录 |
|---|---|---|
| `/` | 首页 / 商品列表 | |
| `/product/[id]` | 商品详情 | |
| `/cart` | 购物车 | |
| `/auth/login`、`/auth/register` | 登录 / 注册 | |
| `/checkout` | 结算与 Stripe 支付 | ✅ |
| `/user` | 个人中心 | ✅ |
| `/user/order` | 我的订单（可对待支付订单继续支付） | ✅ |

未登录访问需要登录的页面时，[`front/proxy.ts`](front/proxy.ts) 会重定向到登录页，并在登录后跳回原地址。

## 技术栈

**后端**：NestJS 12（ESM）、Prisma 7（`@prisma/adapter-pg`）、PostgreSQL、Passport JWT、Stripe、class-validator、`@nestjs/throttler`、Swagger、Vitest、oxlint

**前端**：Next.js 16、React 19、TypeScript、Tailwind CSS 4、shadcn/ui、Zustand、axios、Stripe Elements

**部署**：Vercel（前端）、AWS EC2 + Docker + Caddy（后端）、Amazon ECR、GitHub Actions（OIDC）、CloudWatch Logs、Neon（PostgreSQL）

## 本地开发

### 1. 启动后端

环境变量、数据库迁移和脚本说明见 [api/README.md](api/README.md)。启动后：

- 接口：`http://localhost:3000/api/v1`
- Swagger：`http://localhost:3000/api/docs`

### 2. 启动前端

前端使用 [Bun](https://bun.sh) 管理依赖：

```bash
cd front
bun install
```

在 `front/` 下创建 `.env.local`：

```dotenv
# 后端接口地址（axios baseURL）
NEXT_PUBLIC_APP_URL="http://localhost:3000/api/v1"
# Stripe 可公开的 key（pk_test_...）
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

```bash
bun dev
```

后端已经占用 3000 端口，Next.js 会自动改用 `http://localhost:3001`。因此后端 `.env` 的 `ALLOWED_ORIGINS` 需要包含 `http://localhost:3001`，否则请求会被 CORS 拦截。

`NEXT_PUBLIC_` 开头的变量会在构建时写入前端代码，修改后需要重启 `bun dev`；在 Vercel 上修改后需要重新部署。

## 部署

```
浏览器
  │
  ├── https://ecommerce.lzs32486.xyz ──────▶ Vercel（Next.js 前端）
  │
  └── https://ecommerce-api.lzs32486.xyz ──▶ EC2
                                              ├── caddy        :80/:443，自动签发 HTTPS 证书
                                              │     │ Docker 网络 web
                                              │     ▼
                                              └── nestjs-...   :3000（不对外暴露）──▶ Neon PostgreSQL
```

### 前端（Vercel）

Vercel 项目的 Root Directory 设为 `front/`，在项目的 Environment Variables 中配置上面两个 `NEXT_PUBLIC_` 变量，其中 `NEXT_PUBLIC_APP_URL` 指向后端的 HTTPS 地址。

自定义域名通过 Dynadot 上的 CNAME 记录指向 Vercel，证书由 Vercel 自动签发。

### 后端（GitHub Actions → ECR → EC2）

推送到 `main` 且改动了 `api/**` 或 [`.github/workflows/api.yml`](.github/workflows/api.yml) 时触发：

1. **ci**：`npm ci` → `prisma generate` → lint → 单元测试 → 构建
2. **deploy**：
   1. 通过 OIDC 换取 AWS 临时凭证（不保存长期 Access Key）
   2. 构建镜像，打 `latest` 和 commit sha 两个 tag，推送到 ECR
   3. SSH 到 EC2：登录 ECR、拉取 sha 镜像，从 Secrets Manager 读取 `nestjs-prod-secrets` 生成临时 env 文件，替换 API 容器
   4. 容器日志通过 `awslogs` 驱动写入 CloudWatch 日志组 `nestjs-nextjs-ecommerce`，每次部署一个日志流（以 commit sha 命名）

#### 所需的 GitHub Secrets

| Secret | 说明 |
|---|---|
| `AWS_OIDC_ROLE_ARN` | GitHub Actions 扮演的 IAM Role，仅需推送这一个 ECR 仓库的权限 |
| `AWS_REGION` | 例如 `ap-northeast-2` |
| `ECR_REPOSITORY` | 完整仓库地址，例如 `<account>.dkr.ecr.<region>.amazonaws.com/nestjs-nextjs-ecommerce` |
| `EC2_HOST` | EC2 的 Elastic IP |
| `EC2_USER` | Amazon Linux 为 `ec2-user` |
| `EC2_KEY` | SSH 私钥（`.pem`）的完整内容 |

#### AWS 侧的准备

- **OIDC Provider**：`token.actions.githubusercontent.com`，audience 为 `sts.amazonaws.com`
- **GitHub Actions Role**：信任策略的 `sub` 限定到本仓库的 `main` 分支。仓库开启了 immutable subject，`sub` 的格式为 `repo:<owner>@<owner_id>/<repo>@<repo_id>:ref:refs/heads/main`
- **EC2 实例角色**：ECR 只读、读取 `nestjs-prod-secrets`、写入 CloudWatch Logs
- **Secrets Manager**：`nestjs-prod-secrets`，以 JSON 形式保存后端的全部环境变量，其中的每个 key 都会注入容器
- **CloudWatch Logs**：日志组 `nestjs-nextjs-ecommerce` 需要提前创建，建议设置保留天数
- **安全组**：只开放 22、80、443

#### EC2 初始化（一次性）

```bash
sudo dnf install -y docker jq
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user   # 重新登录后生效
```

Caddy 以容器形式运行，配置文件为 `~/caddy/Caddyfile`：

```caddyfile
ecommerce-api.lzs32486.xyz {
	reverse_proxy nestjs-nextjs-ecommerce:3000
}
```

```bash
docker network create web
docker run -d --name caddy --restart unless-stopped --network web \
  -p 80:80 -p 443:443 -p 443:443/udp \
  -v ~/caddy/Caddyfile:/etc/caddy/Caddyfile:ro \
  -v caddy_data:/data -v caddy_config:/config \
  caddy:2.10
```

证书保存在 `caddy_data` 卷中，重建容器不会重新申请。

#### 注意事项

- EC2 是 x86_64。在 Apple Silicon 的 Mac 上手动构建镜像时，需要加 `--platform linux/amd64`，否则 EC2 拉取时会报 `no matching manifest for linux/amd64`。CI 的 runner 本身就是 amd64，不受影响。
- 后端 API 当前不在线：AWS 上的 EC2、Elastic IP 和 ECR 镜像已经释放，重新部署需要按上面的步骤重建资源，并更新 `EC2_HOST` 和 DNS 记录。
