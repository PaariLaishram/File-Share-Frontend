import axios, { AxiosError } from "axios"
import type { FileShare, LoginResult, RefreshToken } from "./models/models"
import type { LoginPayload } from "./models/payloads"

type HttpMethod = "get" | "post" | "put" | "delete"

type ApiSingleResponse<T> = {
    success: boolean,
    message: string,
    result?: T,
    count: number
}

const baseUrl = import.meta.env.VITE_BASE_URL

// export const getAuthenticationStatus = async(header:any): Promise<ApiSingleResponse<Authentication>> => _callApi("/auth/status", "get", header)
export const getShareLink = async (): Promise<ApiSingleResponse<FileShare>> => _callApi("/share-links")
export const generateShareLink = async (): Promise<ApiSingleResponse<FileShare>> => _callApi("/share-links", "post")

// *****************LOGIN APIS******************
export const login = async (body: LoginPayload, headers: any): Promise<ApiSingleResponse<LoginResult>> => _callApi("/auth/login", "post", body, headers)
export const validateRefreshToken = async (headers:any): Promise<ApiSingleResponse<RefreshToken>> => _callApi("/auth/refresh", "post", {}, headers)
export const getProfile = (user:number, configData:any):Promise<ApiSingleResponse<LoginResult>> => _callApi(`/profiles/${user ?? ""}`, "get", configData) 
export const logout = (user:number): Promise<ApiSingleResponse<any>> => _callApi(`/auth/logout/${user ?? ""}`, "delete")
// *****************UPLOAD APIS******************
export const uploadFile = async (body: any): Promise<ApiSingleResponse<any>> => _callApi("/uploads", "post", body)

const _callApi = async (url: string, method: HttpMethod = "get", configData = {}, headers = {}) => {
    try {
        const config = method.toLowerCase() === "get"
            ? { headers: configData } : configData
        var apiEndpoint = axios[method](`${baseUrl}${url}`, config)
        if(method.toLowerCase() === "post") {
            apiEndpoint = axios[method](`${baseUrl}${url}`, config, 
                headers
            ) 
        }
        console.log(configData)
        console.log(config)
        const response = await apiEndpoint
        const { status, data } = response
        if (status === 200 || status === 201) {
            return data
        }else if(status === 401) {
            alert("Invalid Credentials")
        }
         else {
            return { success: false, message: data.message }
        }
    }
    catch (error) {
        const err = error as AxiosError;
        if(err.response?.status === 401) {
            return {success: false}
        }
        return err.response?.data;
    }
}