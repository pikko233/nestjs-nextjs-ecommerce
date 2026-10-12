import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ description: '邮箱', example: 'admin@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: '名', example: 'San' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ description: '姓', example: 'San' })
  @IsOptional()
  @IsString()
  lastName?: string;
}
