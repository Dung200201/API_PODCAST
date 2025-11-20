import { Decimal } from "@prisma/client/runtime/library";

enum PackageType {
  MINI = "mini",
  SMALL = "small",
  HUGE = "huge",
  MEGA = "mega",
}

export interface IPackages {
  id?: string; // Optional vì khi tạo Prisma sẽ tự thêm
  userId: string;
  code: string;
  type: PackageType;
  name: string; // Optional
  description?: string; // Optional
  points: number;
  slug: string;
  price_vnd: Decimal;  // Sử dụng Decimal cho giá trị chính xác
  price_usd: Decimal;  // Sử dụng Decimal cho giá trị chính xác
  createdAt?: Date;    // Optional vì Prisma tự thêm
  updatedAt?: Date;    // Optional vì Prisma tự thêm
}
