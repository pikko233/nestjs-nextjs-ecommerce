import { createHash } from 'crypto';

/**
 * refresh token 入库前先哈希。
 *
 * 这里用 SHA-256 而不是 bcrypt：refresh token 本身是 JWT 签名后的高熵字符串，
 * 不存在被字典攻击猜出来的风险，不需要 bcrypt 那种刻意放慢的算法；
 * 而且 bcrypt 只取输入的前 72 字节，JWT 普遍超过这个长度，会被静默截断。
 */
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
