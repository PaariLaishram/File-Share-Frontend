import { Route, Routes } from "react-router-dom";
import Login from "../login/Login";

export default function LoginRoutes(){
    return(
        <Routes>
            <Route path="/" element={<Login />} />
        </Routes>
    )
}