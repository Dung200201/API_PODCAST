
export interface ICredit {
  id?: string; // Optional vì khi tạo Prisma sẽ tự thêm
  userId: string;
  code: string;
  name: string; 
  description?: string; // Optional
  createdAt?: Date; // Optional vì Prisma tự thêm
  updatedAt?: Date; // Optional vì Prisma tự thêm
}
