export type FileShare = {
    id: number,
    link: string;
    name: string
}

export type AccessToken = {
    accessToken: string;
    user: number
}

export type LoginResult = {
    user:number;
    email:string;
    accessToken?:string;
    refreshToken?:string;
}

export type RefreshToken = {
    user:number;
    refreshToken: string;
    accessToken:string;
}

export type UserProfile = {
    user:number;
    email: string;
}

export type UploadSignal = {
    userType: string;
    shareLink: string;
    actionType: string;
    isValidShareLink?: boolean;
    confirmUpload?:boolean;
    chunkIndex?:number;
    fileName?:string
    totalChunks?:number
}

