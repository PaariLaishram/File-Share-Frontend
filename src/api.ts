import axios from "axios"
import type { FileShare } from "./components/models"

type HttpMethod = "get" | "post" | "put" | "delete"

type ApiSingleResponse<T> = {
    success: boolean,
    message: string,
    result?: T,
    count: number
}

const baseUrl = 'http://localhost:9902/api/v1'

export const getShareLink = async(): Promise<ApiSingleResponse<FileShare>> => _callApi("/share-links")
export const generateShareLink = async(): Promise<ApiSingleResponse<FileShare>> => _callApi("/share-links", "post")


export const uploadFile = async (body:any): Promise<ApiSingleResponse<any>> => _callApi("/uploads", "post", body)

const _callApi = async(url:string, method: HttpMethod = "get",body = {}) => {
    try {
        const response = await axios[method](`${baseUrl}${url}`, body)
        const {status, data} = response
        if(status === 200 || status === 201) {
            return data
        } 
    }
    catch(error) {
        console.error("Error calling api")
    }

}