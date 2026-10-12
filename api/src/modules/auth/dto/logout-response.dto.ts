import { ApiProperty } from '@nestjs/swagger';

export class LogoutResponseDto {
  @ApiProperty({ description: '提示信息', example: '退出登录成功' })
  message: string;
}
