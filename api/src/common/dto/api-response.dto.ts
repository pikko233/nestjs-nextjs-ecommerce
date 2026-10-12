import { ApiProperty } from '@nestjs/swagger';

// 统一的接口响应外壳；data 的 Swagger 结构由 @ApiWrappedResponse 按接口单独声明
export class ApiResponseDto<T> {
  @ApiProperty({
    description: '请求是否成功',
    example: true,
  })
  success: boolean;

  data: T;

  @ApiProperty({
    description: '请求成功或失败返回的消息提示',
    example: '操作成功',
  })
  message: string;
}
