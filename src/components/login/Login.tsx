import { useState } from "react";
import type { LoginPayload } from "../../models/payloads";
import { login } from "../../api";
import ShowNotification from "../common/ShowNotification";
import type { AccessToken, LoginResult } from "../../models/models";
import { useDispatch } from "react-redux";
import { updateProfile } from "@/redux/features/profileSlice";
import { useNavigate } from "react-router-dom";
import { updateAuthSlice } from "@/redux/features/authSlice";

export default function Login() {
    const [open, setOpen] = useState(false)
    const dispatch = useDispatch()
    const [formData, setFormData] = useState<LoginPayload>({
        email: "",
        password: ""
    })
    const navigate = useNavigate()

    const handleLogin = async () => {
        try {
            const headers = {
                withCredentials: true
            }
            const response = await login(formData, headers)
            if (response.success && response.result) {
                const result: LoginResult = response.result
                const accessToken = result?.accessToken
                const authentication: AccessToken = {
                    accessToken: accessToken ?? "",
                    user: result.user
                }
                const profileData: LoginResult = {
                    user: result.user,
                    email: result.email
                }
                dispatch(updateAuthSlice(authentication))
                localStorage.setItem("profile", JSON.stringify(profileData))
                dispatch(updateProfile(profileData))
                navigate("/")
            } else {
                setOpen(true);
            }
        }
        catch (error) {
            setOpen(true);
        }
    }
    const updateForm = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target as HTMLInputElement & {
            name: keyof typeof formData
        }
        const updated = { ...formData }
        updated[name] = value
        setFormData(updated)
    }

    return (
        <div className="flex items-center justify-center">
            <div className="w-full max-w-sm bg-white shadow-lg rounded-xl p-6">
                <h2 className="text-2xl font-semibold text-gray-800 text-center mb-6">
                    Login
                </h2>

                <div className="flex flex-col gap-4">
                    {/* Email */}
                    <div className="flex flex-col gap-1">
                        <label className="text-gray-700 font-medium">Email</label>
                        <input
                            name="email"
                            value={formData?.email}
                            onInput={updateForm}
                            placeholder="john@mail.com"
                            className="border rounded-lg px-3 py-2 text-gray-800 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                        />
                    </div>

                    {/* Password */}
                    <div className="flex flex-col gap-1">
                        <label className="text-gray-700 font-medium">Password</label>
                        <input
                            onInput={updateForm}
                            name="password"
                            value={formData?.password}
                            type="password"
                            placeholder="******"
                            className="border rounded-lg px-3 py-2 text-gray-800 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                        />
                    </div>

                    <button
                        className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition cursor-pointer"
                        onClick={handleLogin}
                    >
                        Login
                    </button>
                </div>
            </div>
            <ShowNotification
                severity="error"
                message="Invalid Credentials"
                open={open}
                setOpen={setOpen}
            />
        </div>
    );
}
