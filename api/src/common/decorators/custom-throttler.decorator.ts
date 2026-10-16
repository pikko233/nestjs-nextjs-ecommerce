import { Throttle } from '@nestjs/throttler';

export const StrictThrottler = () =>
  Throttle({
    default: {
      ttl: 1000,
      limit: 3,
    },
  });

export const ModerateThrottler = () =>
  Throttle({
    default: {
      ttl: 1000,
      limit: 5,
    },
  });

export const RelaxedThrottler = () =>
  Throttle({
    default: {
      ttl: 1000,
      limit: 20,
    },
  });

// 登录、注册等认证接口：防暴力破解
export const AuthThrottler = () =>
  Throttle({
    default: {
      ttl: 60000,
      limit: 10,
    },
  });
