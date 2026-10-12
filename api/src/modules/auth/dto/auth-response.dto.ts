import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class AuthUserDto {
  @ApiProperty({ description: '用户ID', example: 'clx1a2b3c0000abcd1234efgh' })
  id: string;

  @ApiProperty({ description: '邮箱', example: 'user@example.com' })
  email: string;

  @ApiProperty({
    description: '名',
    example: 'San',
    type: String,
    nullable: true,
  })
  firstName: string | null;

  @ApiProperty({
    description: '姓',
    example: 'Zhang',
    type: String,
    nullable: true,
  })
  lastName: string | null;

  @ApiProperty({
    description: '用户角色',
    enum: Role,
    enumName: 'Role',
    example: Role.USER,
  })
  role: Role;
}

export class AuthResponseDto {
  @ApiProperty({ description: '访问令牌', example: 'eyJhbGciOiJIUzI1NiIs...' })
  accessToken: string;

  @ApiProperty({ description: '刷新令牌', example: 'eyJhbGciOiJIUzI1NiIs...' })
  refreshToken: string;

  @ApiProperty({ description: '用户信息', type: AuthUserDto })
  user: AuthUserDto;
}
