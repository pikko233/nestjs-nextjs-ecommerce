import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty({ description: '用户ID', example: '123qwe1231qwe12ewe1' })
  id: string;

  @ApiProperty({ description: '邮箱', example: 'admin@example.com' })
  email: string;

  @ApiProperty({ description: '名', example: 'San', nullable: true })
  firstName: string | null;

  @ApiProperty({ description: '姓', example: 'Zhang', nullable: true })
  lastName: string | null;

  @ApiProperty({ description: '用户权限', enum: Role })
  role: Role;

  @ApiProperty({
    description: '账号创建日期',
    example: '2023-10-01T12:34:56.789Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '用户信息最近一次更新时间',
    example: '2023-10-01T12:34:56.789Z',
  })
  updatedAt: Date;
}
