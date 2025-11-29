import { generateShareLink } from "../../api"
import { useNavigate } from "react-router-dom"

export default function FileShare(){
    const apiUrl = "http://localhost:9900/api/v1"
    const body = {
        name:"Paari",
        age:25
    }
    const testHeaders = {
        "Authorization":"Bearer token123"
    }
    const navigate = useNavigate()
    const handleStartSharing = async () => {
        try {
           const response = await generateShareLink()
            if(response.success) {
                const token = response?.result?.link
                const tokenObj = {
                    tokenId: response.result?.id,
                    token: token
                }
               localStorage.setItem("tokenObj", JSON.stringify(tokenObj))
               navigate(`shares/${token}`)
            }
        }
        catch(error) {
            alert("Error calling api")
        }
    }

    return(
        <main>
            <h1>Start Sharing Files</h1>
            <button onClick={handleStartSharing}>Share</button>
        </main>
    )
}