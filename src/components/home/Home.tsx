import { Route, Routes } from "react-router-dom"
import Navbar from "../navbar/Navbar"
import Dashboard from "../dashboard/Dashboard"
import FileShareRoutes from "../routes/FileShareRoutes"

export default function Home() {

    return (
        <div>
            <Navbar />
            <main>
                <Routes>
                    <Route index element={<Dashboard />} />
                    <Route path="shares/*" element={<FileShareRoutes />} />
                </Routes>
            </main>
        </div>
    )
}