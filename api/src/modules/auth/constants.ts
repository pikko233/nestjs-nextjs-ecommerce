/**
 * refresh token 的签发/验签密钥兜底值。
 * 仅用于本地开发，生产环境必须在 .env 配置 JWT_REFRESH_SECRET，
 * 且不能与 JWT_SECRET 相同 —— 否则 access token 可以被当作 refresh token 使用。
 */
export const JWT_REFRESH_SECRET_FALLBACK = 'default-refresh-secret-20260921';
