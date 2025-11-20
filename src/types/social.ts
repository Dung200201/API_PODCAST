export interface ISocialAccountUpdate {
  note?: string;
  cookies?: string;
  twoFA?: string;
  status?: "uncheck" | "checking" | "live" | "limit" | "error"; // enum chính xác
}

export interface ISocialRequest {
  id?: string;
  userId: string;
  socialGroupId: string;
  id_tool: string;
  data: {
    id: string;
    value: string;
  }[];
  name: string;
  status?: 'new' | 'pending' | 'ongoing' | 'finish' | 'cancel';
  deletedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

