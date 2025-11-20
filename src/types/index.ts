export interface IIndexRequest {
    id?: string | null; 
    userId?: string | null; 
    name?: string | null; 
    status: 'new' | 'pending' | 'running' | 'completed'; // enum
    deletedAt?: Date | null; // optional, nullable
    createdAt?: Date | null;
    updatedAt?: Date | null; 
}

export interface IIndexRequestCreate {
    name?: string | null;
    checking?: boolean | null;
    urls: string | string[];
    time_zone?: string | null;
    filter: boolean | null;
}