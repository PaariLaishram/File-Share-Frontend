export type FileShare = {
    id: number,
    link: string;
    name: string
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

