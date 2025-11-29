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
                    token: token
                }
                localStorage.setItem("tokenObj", JSON.stringify(tokenObj))
                navigate(`shares/${token}`)
            }
        }
        catch (error) {
            alert("Error calling api")
        }
    }

    return (
        <div>
            <h1>Start Sharing Files</h1>
            <button onClick={handleStartSharing}>Share</button>
        </div>
    )
}