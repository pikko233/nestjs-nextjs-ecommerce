-- 每个用户最多只能有一个未结账（活跃）购物车，防止并发加购时重复创建。
-- Prisma schema 无法表达部分唯一索引，因此在这里手写 SQL。
CREATE UNIQUE INDEX "carts_userId_active_key" ON "carts" ("userId") WHERE "checkedOut" = false;
