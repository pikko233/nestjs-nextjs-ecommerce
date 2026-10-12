import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreatePaymentIntentDto {
  @ApiProperty({ example: '123123123' })
  @IsNotEmpty()
  @IsString()
  orderId: string;

  @ApiProperty({ example: 99.99 })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ example: 'usd', required: false })
  @IsOptional()
  @IsString()
  currency?: string;
}
