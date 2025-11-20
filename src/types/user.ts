enum StatusType {
    ACTIVE = "active",
    BANNED = "banned",
}
enum RolerType {
    USER = "user",
    SUPPORT = "support",
    DEV = "dev",
    ADMIN = "admin",
}
enum TypeType {
    NORMAL = "normal",
    ADVANCED = "advanced",
    PRIORITY = "priority",
}

enum EnglishType {
    EN = "en",
    VI = "vi",
}

export type IUser = {
    id?: string;
    email?: string;
    username: string;
    password?: string | undefined;
    status: StatusType;
    role: RolerType;
    type: TypeType;
    phone: string;
    language: EnglishType;
    company: string;
    deletedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
    expiresAt?: Date;
}

export type IUserProfile = {
    id?: string;
    email?: string;
    profile: {
        username: string;
        password?: string | undefined;
        role: RolerType;
        type: TypeType;
        phone: string;
        language: EnglishType;
        company: string;
        deletedAt?: Date | null;
        createdAt?: Date;
        updatedAt?: Date;
    }
    status: StatusType;
    deletedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}