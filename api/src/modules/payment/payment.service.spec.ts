import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/prisma/prisma.service.js';
import { PaymentService } from './payment.service.js';

describe('PaymentService', () => {
  let service: PaymentService;

  beforeEach(async () => {
    // 构造 Stripe 客户端需要 key，这里只用占位值，不会发请求
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_placeholder');

    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentService, { provide: PrismaService, useValue: {} }],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
