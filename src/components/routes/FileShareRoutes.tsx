import { Route, Routes } from "react-router";
import CreateFileShare from "../fileShare/CreateFileShare";

export default function FileShareRoutes() {
    return(
        <Routes>
            {/* FILE SHARE */}
            {/* <Route path="/shares" element={<FileShare />} /> */}
            <Route path="/:token" element={<CreateFileShare />} />
        </Routes>
    )
}