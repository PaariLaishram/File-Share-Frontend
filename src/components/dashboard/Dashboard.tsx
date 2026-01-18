import { useNavigate } from "react-router-dom"
import { generateShareLink } from "../../api"

export default function Dashboard() {
    const navigate = useNavigate()

    const handleStartSharing = async () => {
        try {
            const response = await generateShareLink()
            if (response.success) {
                const token = response?.result?.link
                const tokenObj = {
                    tokenId: response.result?.id,
                    token
                }
                localStorage.setItem("tokenObj", JSON.stringify(tokenObj))
                navigate(`shares/${token}`)
            }
        } catch {
            alert("Error calling api")
        }
    }

    return (
            <main className=" w-full text-center">
                <h1 className="text-3xl font-semibold text-gray-900 mb-3">
                    Share Files
                </h1>

                <p className="text-gray-600 mb-8">
                    Click on the button below to start receving files
                </p>

                <button
                    onClick={handleStartSharing}
                    className="cursor-pointer bg-blue-600 px-10 hover:bg-blue-700 text-white font-medium py-3 
                    rounded-4xl transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 "
                >
                    Start Sharing
                </button>

                <p className="text-xs text-gray-400 mt-6">
                    {/* Encrypted • Auto-expire links • Fast uploads */}
                </p>
            </main>
    )
}
