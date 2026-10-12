import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: '旧密码', example: 'Password123' })
  @IsString()
  @IsNotEmpty({ message: '旧密码不能为空' })
  currentPassword: string;

  @ApiProperty({ description: '新密码', example: 'Password123', minLength: 8 })
  @IsString()
  @IsNotEmpty({ message: '新密码不能为空' })
  @MinLength(8, { message: '密码长度不能少于8位数' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: '密码必须包含大小写字母和数字',
  })
  newPassword: string;
}
