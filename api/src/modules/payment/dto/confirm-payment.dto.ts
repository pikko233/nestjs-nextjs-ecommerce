import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ConfirmPaymentDto {
  @ApiProperty({
    example: 'pi_3Nk...',
    description: 'Stripe PaymentIntent ID',
  })
  @IsNotEmpty()
  @IsString()
  paymentIntentId: string;

  @ApiProperty({ example: '123123123', description: '订单ID' })
  @IsNotEmpty()
  @IsString()
  orderId: string;
}
