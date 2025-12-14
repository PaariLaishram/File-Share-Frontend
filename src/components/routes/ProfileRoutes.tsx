import { Route, Routes } from "react-router-dom";
import Profile from "../profile/Profile";

export default function ProfileRoutes(){
        return (
            <Routes>
                <Route path="/" element={<Profile />}  />
            </Routes>
        )
}