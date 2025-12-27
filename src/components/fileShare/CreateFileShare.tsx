import { useEffect, useState } from "react";
import Receiver from "./Receiver";
import Sender from "./Sender";
import { useParams } from "react-router-dom";

export default function CreateFileShare() {
    const [isReceiver, setIsReceiver] = useState(false)
     const params = useParams()
    const shareLink = (params.token ?? "")

    useEffect(() => {
        const tokenObj = localStorage.getItem("tokenObj")
        if (tokenObj) {
            const parsedTokenObj = JSON.parse(tokenObj)
            if (parsedTokenObj && parsedTokenObj.token === shareLink) {
                setIsReceiver(true)
            } else {
                setIsReceiver(false)
            }
        } else {
            setIsReceiver(false)
        }
    }, [params])


    return (
        <main>
            {isReceiver ? <Receiver shareLink={shareLink} /> : <Sender shareLink={shareLink} />}
        </main>
    )
}