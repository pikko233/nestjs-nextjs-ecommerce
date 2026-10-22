// 后端统一的响应包装：{ success, data, message }
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}
