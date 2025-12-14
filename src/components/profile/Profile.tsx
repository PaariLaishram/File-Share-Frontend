import { useEffect, useState } from "react";
import Avatar from "../../assets/images/avatar.png";
import { useSelector } from "react-redux";
import type { RootState } from "@/redux/store";
import { getProfile } from "@/api";
import type { UserProfile } from "@/models/models";
import axios from "axios";

export default function Profile() {
    const profile = useSelector((state: RootState) => state.profile.data)
    const [isUpdating, setIsUpdating] = useState(false)
    const [formData, setFormData] = useState<UserProfile>({
        user: 0,
        email: "",
    })

    useEffect(() => {
        const updated = { ...formData }
        updated.user = profile?.user ?? 0
        updated.email = profile?.email ?? ""
        setFormData(updated)
    }, [profile])

    const changeImageHandler = () => {
        console.log("change image");
    };

    const updateHandler = () => {
        setIsUpdating(true)
    }

    const saveHandler = () => {
        setIsUpdating(false)
    }

    return (
        <div className="flex justify-center px-4 mt-10">
            <div className="w-full max-w-lg">
                <div className="flex flex-col items-center gap-6 border rounded-xl p-6 shadow-sm bg-white">
                    <h1 className="text-3xl font-semibold text-gray-800">Profile</h1>

                    {/* Avatar */}
                    <div
                        className="relative w-32 h-32 group cursor-pointer"
                        onClick={changeImageHandler}
                    >
                        <img
                            src={Avatar}
                            alt="Profile"
                            className="w-full h-full rounded-full object-cover transition duration-300 group-hover:brightness-50"
                        />

                        <div className="absolute inset-0 flex items-center justify-center 
                            opacity-0 group-hover:opacity-100 transition duration-300">
                            <span className="text-white text-sm font-medium bg-black/50 px-3 py-1 rounded-md">
                                Change Image
                            </span>
                        </div>
                    </div>

                    <div className=" flex flex-col items-center justify-center gap-5">
                        {/* Email */}
                        <div className="w-full">
                            <label className="block text-sm font-medium text-gray-600 mb-1">
                                Email Address
                            </label>
                            <input
                                value={formData.email}
                                disabled={!isUpdating}
                                type="email"
                                placeholder="john@mail.com"
                                className="w-full border border-gray-300 rounded-md px-4 py-2
                                    focus:outline-none focus:ring-2 focus:ring-blue-500
                                    disabled:bg-gray-100 disabled:text-gray-400
                                    disabled:cursor-not-allowed disabled:border-gray-200"
                            />
                        </div>

                        {/* Action */}
                        <button
                            className={`${isUpdating ? `bg-[#2ab25a]` : `bg-[#439eed]`} px-4 py-2 rounded-4xl w-[125px] text-white cursor-pointer`}
                            onClick={isUpdating ?
                                saveHandler
                                : updateHandler}
                        >
                            {isUpdating ? `Save` : `Update`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
