import { useEffect, useRef, useState } from "react"
import UploadBox from "./UploadBox"
import ShowNotification from "../common/ShowNotification"
import { getWsUrl } from "@/api"
import type { UploadSignal } from "@/models/models"

type Props = {
    shareLink: string
}

export default function Sender(props: Props) {
    const [isValidShareLink, setIsValidShareLink] = useState<boolean | null>(null)
    const [open, setOpen] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [fileUrl, setFileUrl] = useState("")
    const ws = new WebSocket(getWsUrl)
    const peerConnRef = useRef<RTCPeerConnection | null>(null)


    useEffect(() => {
        const initSignal: UploadSignal = {
            userType: "sender",
            shareLink: props.shareLink,
            actionType: "initConn"
        }
        ws.onopen = () => {
            ws.send(JSON.stringify(initSignal))
        }

        ws.onmessage = (event) => {
            const response: UploadSignal = JSON.parse(event.data)
            const handlers: Record<string, (msg: UploadSignal) => void> = {
                initConn: handleInitConn,
                answerOffer: handleAnswerOffer,

            }

            const handler = handlers[response.actionType]
            if (handler) handler(response)
            else console.warn("Warning, uknown action type: ", response.actionType)
        }
    }, [])

    const handleInitConn = (msg: UploadSignal) => {
        if (msg.isValidShareLink) {
            setIsValidShareLink(true)
            setOpen(true)
            createPeerConnection()
        } else {
            setIsValidShareLink(false)
        }
    }

    const handleAnswerOffer = (msg: UploadSignal) => {
        console.log(msg)
    }

    const createPeerConnection = async () => {
        const configuration = {
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" },
                { urls: "stun:stun1.l.google.com:19302" },
                { urls: "stun:stun2.l.google.com:19302" }
            ]
        }

        // const peerConnection = new RTCPeerConnection(configuration)
        peerConnRef.current = new RTCPeerConnection(configuration)
        const offer = await peerConnRef.current.createOffer()
        await peerConnRef.current.setLocalDescription(offer)
        const offerMsg: UploadSignal = {
            offer: offer,
            actionType: "createOffer",
            userType: "sender",
            shareLink: props.shareLink,
        }
        ws.send(JSON.stringify(offerMsg))
    }

    const handleFileInput = () => {

    }

    const handleClearFile = () => {

    }

    const handleFileUpload = () => {

    }

    return (
        <div>
            {isValidShareLink === null ?
                <p>....Loading</p> :
                isValidShareLink ?
                    <div>
                        {!file ?
                            <div className="flex flex-col justify-center items-center gap-5">
                                <h2 className="text-3xl font-semibold">Select a File</h2>
                                <UploadBox handleInputChange={handleFileInput} />
                            </div> :
                            <div className="flex items-center justify-center">
                                <div className="flex justify-between items-center bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm w-full max-w-md">
                                    <a
                                        href={fileUrl}
                                        target="_blank"
                                        className="text-blue-600 font-medium truncate hover:underline"
                                    >
                                        {file.name}
                                    </a>

                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={handleClearFile}
                                            className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 transition hover:cursor-pointer"
                                        >
                                            Clear
                                        </button>

                                        <button
                                            onClick={handleFileUpload}
                                            className="px-3 py-1.5 text-sm rounded-lg bg-[#4A90E2] text-white hover:bg-[#3B7AC2] transition hover:cursor-pointer"
                                        >
                                            Upload
                                        </button>
                                    </div>
                                </div>
                            </div>

                        }

                        <ShowNotification
                            severity={"success"}
                            message={"Connected!"}
                            open={open}
                            setOpen={setOpen} />
                    </div> :
                    <div className="flex items-center justify-center">
                        <p className="font-semibold text-xl">Invalid Share Link</p>
                        <ShowNotification
                            severity={"error"}
                            message={"Invalid Share Link"}
                            open={open}
                            setOpen={setOpen} />
                    </div>}

        </div>
    )
}