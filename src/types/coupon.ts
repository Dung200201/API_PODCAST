enum CouponType {
  INCREASE = "increase",
  DISCOUNT = "discount",
  REWARD = "reward",
}

export interface ICoupon {
  id?: string | undefined; // Optional vì khi tạo Prisma sẽ tự thêm
  userId: string;
  couponValue: number;
  maxRedemptions: number;
  redeemedCount: number;
  isActive: boolean;
  code: string;
  couponType: CouponType;
  description?: string; // Optional
  expiresAt: Date; // Optional vì Prisma tự thêm
  deletedAt?: Date | null; // Optional vì Prisma tự thêm
  createdAt?: Date; // Optional vì Prisma tự thêm
  updatedAt?: Date; // Optional vì Prisma tự thêm
}
