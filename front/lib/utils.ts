import { isAxiosError } from "axios";

export { cn } from "cn";

// 优先取后端返回的错误信息；校验失败时 message 可能是字符串数组
export const getErrorMessage = (e: unknown): string => {
  if (isAxiosError(e)) {
    const message = e.response?.data?.message;
    if (Array.isArray(message)) return message[0];
    if (typeof message === "string") return message;
  }
  return e instanceof Error ? e.message : String(e);
};
