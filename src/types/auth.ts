export type ISignin = {
    email: string;
    password: string;
}

export type ISignup = {
    username:string;
    email: string;
    password: string;
    confirmPassword?: string;
    is?: string;
    createdAt?: Date;
    updatedAt?: Date;
    isVN?: boolean
}