# API

电商项目的后端服务，基于 NestJS 12、Prisma 7（PostgreSQL）和 Stripe。

## 技术栈

- **框架**：NestJS 12（ESM）、TypeScript
- **数据库**：PostgreSQL + Prisma 7（`@prisma/adapter-pg`）
- **认证**：Passport JWT（access token 15 分钟，refresh token 7 天，refresh token 以哈希形式存库）
- **支付**：Stripe PaymentIntent
- **其他**：class-validator 参数校验、`@nestjs/throttler` 限流、Swagger 文档
- **工具链**：Vitest、oxlint、Prettier

## 环境要求

- Node.js 24+
- PostgreSQL

## 本地启动

```bash
npm install
```

在 `api/` 下创建 `.env`：

```dotenv
DATABASE_URL="postgresql://user:password@localhost:5432/ecommerce"

JWT_SECRET="替换为随机字符串"
JWT_EXPIRES_IN="15m"
# 必须与 JWT_SECRET 不同
JWT_REFRESH_SECRET="替换为另一个随机字符串"

STRIPE_SECRET_KEY="sk_test_..."

# 可选
PORT=3000
ALLOWED_ORIGINS="http://localhost:3000"
```

执行数据库迁移并生成 Prisma Client：

```bash
npx prisma migrate dev
```

启动开发服务器：

```bash
npm run dev
```

- 接口前缀：`http://localhost:3000/api/v1`
- Swagger 文档：`http://localhost:3000/api/docs`

## 常用脚本

| 命令 | 说明 |
|---|---|
| `npm run dev` | 开发模式（watch） |
| `npm run build` / `npm run start:prod` | 构建 / 运行生产包 |
| `npm test` | 单元测试 |
| `npm run test:e2e` | e2e 测试（需要可用的数据库） |
| `npm run test:cov` | 测试覆盖率 |
| `npm run lint` | oxlint 检查 |
| `npm run format` | Prettier 格式化 |

## 接口一览

🔒 需要登录，👑 需要管理员权限。

| 模块 | 方法 & 路径 | 说明 |
|---|---|---|
| auth | `POST /auth/register` | 注册 |
| | `POST /auth/login` | 登录 |
| | `POST /auth/refresh` | 用 refresh token 换新 token |
| | `POST /auth/logout` 🔒 | 登出 |
| users | `GET /users/me` 🔒 | 当前用户信息 |
| | `PATCH /users/me` 🔒 | 修改个人信息 |
| | `PATCH /users/me/password` 🔒 | 修改密码 |
| | `DELETE /users/me` 🔒 | 注销账号 |
| | `GET /users`、`GET /users/:id`、`DELETE /users/:id` 👑 | 用户管理 |
| category | `GET /category`、`GET /category/:id`、`GET /category/slug/:slug` | 查询分类 |
| | `POST`、`PATCH /:id`、`DELETE /:id` 👑 | 分类管理 |
| product | `GET /product`、`GET /product/:id` | 查询商品 |
| | `POST`、`PATCH /:id`、`PATCH /:id/stock`、`DELETE /:id` 👑 | 商品与库存管理 |
| cart | `GET /cart` 🔒 | 获取购物车 |
| | `POST /cart/items` 🔒 | 加入购物车 |
| | `PATCH /cart/items/:id`、`DELETE /cart/items/:id` 🔒 | 修改数量 / 移除商品 |
| order | `POST /order` 🔒 | 创建订单 |
| | `GET /order`、`GET /order/:id` 🔒 | 我的订单 |
| | `PATCH /order/:id` 🔒 | 修改收货地址（仅待处理订单） |
| | `DELETE /order/:id` 🔒 | 取消订单 |
| | `GET /order/admin/all`、`GET`/`PATCH`/`DELETE /order/admin/:id` 👑 | 订单管理 |
| payment | `POST /payment/create-intent` 🔒 | 创建 Stripe PaymentIntent |
| | `POST /payment/confirm` 🔒 | 确认支付 |
| | `GET /payment`、`GET /payment/:id`、`GET /payment/order/:orderId` 🔒 | 支付记录 |

完整的请求和响应结构见 Swagger 文档。

## 目录结构

```
api/
├── prisma/            # schema 与迁移
├── src/
│   ├── common/        # 通用装饰器、守卫、响应 DTO
│   ├── prisma/        # PrismaService
│   ├── modules/       # auth / user / category / product / cart / order / payment
│   └── main.ts
└── test/              # e2e 测试
```
