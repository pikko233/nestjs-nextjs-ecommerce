// 复用同一个实例，避免每次调用都重新创建 Intl.NumberFormat
const priceFormatter = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
});

// 格式化为人民币价格，例如 1299 → "¥1,299.00"
// 同时接受字符串：后端 Prisma Decimal 序列化为 JSON 后是字符串
export const formatPrice = (price: number | string): string => {
  const value = typeof price === "string" ? Number(price) : price;
  if (!Number.isFinite(value)) return "--";
  return priceFormatter.format(value);
};
