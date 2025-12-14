import { Route, Routes } from "react-router-dom"
import Navbar from "../navbar/Navbar"
import Dashboard from "../dashboard/Dashboard"
import FileShareRoutes from "../routes/FileShareRoutes"
import LoginRoutes from "../routes/LoginRoutes"
import { useDispatch } from "react-redux"
import type { LoginResult, AccessToken } from "@/models/models"
import { useEffect } from "react"
import { updateProfile } from "@/redux/features/profileSlice"
import { updateAuthSlice } from "@/redux/features/authSlice"
import ProfileRoutes from "../routes/ProfileRoutes"

type Props = {
    profileData: LoginResult | null,
    accessToken: AccessToken | null,
}

export default function Home(props: Props) {
    const dispatch  = useDispatch()

    useEffect(() => {
        if(props.profileData) {
            dispatch(updateProfile(props.profileData))
        }
        if(props.accessToken) {
            dispatch(updateAuthSlice(props.accessToken))
        }
    },[props.profileData, props.accessToken])

    return (
        <div>
            <Navbar />
            <main className="max-w-6xl mx-auto mt-10 px-4">
                <Routes>
                    <Route index element={<Dashboard />} />
                    <Route path="profile/*" element={<ProfileRoutes />} />
                    <Route path="login/*" element={<LoginRoutes />} />
                    <Route path="shares/*" element={<FileShareRoutes />} />
                </Routes>
            </main>
        </div>
    )
}