// 登录态保存在 localStorage，proxy 运行在服务端读不到，
// 因此额外写一个标记 cookie 供 proxy 做乐观检查；真正的鉴权仍由后端接口完成
export const AUTH_COOKIE = "is-authenticated";

// 与 refresh token 的有效期（7 天）保持一致
const MAX_AGE = 7 * 24 * 60 * 60;

export const syncAuthCookie = (isAuthenticated: boolean) => {
  if (typeof document === "undefined") return;

  document.cookie = isAuthenticated
    ? `${AUTH_COOKIE}=1; path=/; max-age=${MAX_AGE}; samesite=lax`
    : `${AUTH_COOKIE}=; path=/; max-age=0; samesite=lax`;
};
