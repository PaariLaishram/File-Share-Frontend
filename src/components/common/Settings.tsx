import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../redux/store'; //
import { useNavigate } from "react-router-dom";
import { logout } from "@/api";
import { resetAuthSlice } from "@/redux/features/authSlice";
import { resetProfile } from "@/redux/features/profileSlice";

export default function Settings() {
    const profile = useSelector((state: RootState) => state.profile.data)
    const navigate = useNavigate()
    const dispatch = useDispatch()

    const loginHandler = () => {
        navigate("/login")
    }

    const logoutHandler = async () => {
        //remove the refresh token
        //clear profile localStorage
        //remove access token
        try {
            const response = await logout(profile?.user ?? 0)
            if (response.success) {
                localStorage.clear()
                dispatch(resetAuthSlice())
                dispatch(resetProfile())
            } else {
                console.error("error loggingg user out")
            }
        }
        catch (error) {
            console.error("error logging out: ", error)
        }

    }

    const profileHandler = () => {
        navigate("/profile")
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="text-gray-800 font-medium text-lg hover:text-gray-600  transition cursor-pointer">Settings</button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-40" align="start">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuGroup>
                    <DropdownMenuItem className="cursor-pointer" onClick={profileHandler}>
                        Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">
                        History
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuItem className="cursor-pointer" onClick={profile ? logoutHandler : loginHandler}>
                    {profile ? `Logout` : `Login`}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}