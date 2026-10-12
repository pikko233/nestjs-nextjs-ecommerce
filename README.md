# nestjs-nextjs-ecommerce

基于 NestJS + Next.js 的全栈电商项目（monorepo）。

## 目录结构

| 目录 | 说明 | 状态 |
|---|---|---|
| [`api/`](api/) | 后端 REST API：NestJS 12 + Prisma 7 + PostgreSQL + Stripe | 基本完成 |
| `web/` | 前端：Next.js | 计划中 |

## 功能概览

- 用户注册 / 登录，JWT access token + refresh token
- 基于角色的权限控制（`USER` / `ADMIN`）
- 商品分类、商品与库存管理
- 购物车
- 订单创建、查询、取消与状态流转
- Stripe 支付（PaymentIntent）
- Swagger 接口文档

## 快速开始

后端的启动方式见 [api/README.md](api/README.md)。
