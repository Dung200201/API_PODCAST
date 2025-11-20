export interface ISocialAccount {
    id?: string;
    socialGroupId: string;
    id_tool?: string;
    note?: string;
    active?: string;
    website: string;
    username: string;
    email: string;
    password: string;
    cookies?:string;
    twoFA: string;
    status?: 'uncheck' | 'checking' | 'live' | 'limit' | 'error';
    deletedAt?: Date | null;
    createdAt?: Date| null;
    updatedAt?: Date| null;
  }
  