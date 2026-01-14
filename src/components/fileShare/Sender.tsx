import { useEffect, useRef, useState } from "react"
import UploadBox from "./UploadBox"
import ShowNotification from "../common/ShowNotification"
import { getWsUrl } from "@/api"
import type { UploadSignal } from "@/models/models"
import { configuration } from "./config"

type Props = {
    shareLink: string
}


export default function Sender(props: Props) {
    const [isValidShareLink, setIsValidShareLink] = useState<boolean | null>(null)
    const [open, setOpen] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [fileUrl, setFileUrl] = useState("")
    const ws = useRef<WebSocket | null>(null)
    const peerConnection = useRef<RTCPeerConnection | null>(null)
    const pendingIce: RTCIceCandidateInit[] = []
    const dataChannelRef = useRef<RTCDataChannel | null>(null)
    const CHUNK_SIZE = 16 * 1024
    console.log(props.shareLink)

    useEffect(() => {
        if (ws.current) return
        ws.current = new WebSocket(getWsUrl)
        const initSignal: UploadSignal = {
            userType: "sender",
            shareLink: props.shareLink,
            actionType: "initConn"
        }
        ws.current.onopen = () => {
            ws?.current?.send(JSON.stringify(initSignal))
        }

        ws.current.onmessage = (event) => {
            const response: UploadSignal = JSON.parse(event.data)
            const handlers: Record<string, (msg: UploadSignal) => void> = {
                initConn: handleInitConn,
                answerOffer: handleAnswerOffer,
                iceCandidate: handleIceCandidate,
            }

            const handler = handlers[response.actionType]
            if (handler) handler(response)
            else console.warn("Warning, uknown action type: ", response.actionType)
        }

    }, [props.shareLink])

    const handleInitConn = (msg: UploadSignal) => {
        if (msg.isValidShareLink) {
            setIsValidShareLink(true)
            setOpen(true)
            createPeerConnection()
        } else {
            setIsValidShareLink(false)
        }
    }

    const handleIceCandidate = async (msg: UploadSignal) => {
        if (!peerConnection.current || !msg.candidate) return

        if (!peerConnection.current.remoteDescription) {
            pendingIce.push(msg.candidate)
            return
        }
        await peerConnection.current.addIceCandidate(
            new RTCIceCandidate(msg.candidate)
        )
    }
    //Create a new RTCPeerConnection which takes in the list of ice servers
    //Gather ICE candidates
    const createPeerConnection = async () => {
        peerConnection.current = new RTCPeerConnection(configuration)
        peerConnection.current.onconnectionstatechange = () => {
            console.log("PeerConnection state:", peerConnection?.current?.connectionState)
        }
        peerConnection.current.addEventListener('icecandidate', e => {
            if (e.candidate) {
                const msg: UploadSignal = {
                    userType: "sender",
                    shareLink: props.shareLink,
                    actionType: "iceCandidate",
                    candidate: e.candidate
                }
                ws.current?.send(JSON.stringify(msg))
            } else {
                console.log("ICE gathering complete")
            }
        })
        //Data channel - api used to send arbitrary data over RTCPeerConnection
        //ArrayBuffer - buffer used to hold binary data(bytes)
        //Cannot directly read or write values from an ArrayBuffer
        //have to cast to Uint8Array Int32Array Float64Array DataView
        const dataChannel = peerConnection.current.createDataChannel("test")
        dataChannel.binaryType = "arraybuffer"
        dataChannel.onopen = () => {
            console.log("Data channel open ready to send file")
        }

        dataChannelRef.current = dataChannel
        //Create offer creats a new SDP offer 
        const offer = await peerConnection.current.createOffer()
        //Changes the local description associated with the peer connection
        await peerConnection.current.setLocalDescription(offer)

        const msg: UploadSignal = {
            userType: "sender",
            shareLink: props.shareLink,
            actionType: "createOffer",
            offer: offer
        }
        ws.current?.send(JSON.stringify(msg))
    }

    //handle SDP answer sent from receiver
    const handleAnswerOffer = async (msg: UploadSignal) => {
        if (!msg.answer) {
            console.error("error: answer is undefined")
            return
        }
        await peerConnection.current?.setRemoteDescription(msg.answer)
        pendingIce.forEach(c =>
            peerConnection.current?.addIceCandidate(new RTCIceCandidate(c))
        )
        pendingIce.length = 0
    }

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.currentTarget.files
        if (files) {
            setFile(files[0])
            const url = URL.createObjectURL(files[0])
            setFileUrl(url)
        }
    }

    const handleClearFile = () => {
        setFile(null)
    }

    // const handleSendFile = async () => {
    //     const dc = dataChannelRef.current
    //     if (!dc || dc.readyState !== 'open') {
    //         console.log("data channel is not open")
    //         return
    //     }
    //     //Send data over the datachannel 
    //     dc.send(JSON.stringify({
    //         type: "meta",
    //         name: file?.name,
    //         size: file?.size,
    //         mime: file?.type
    //     }))

    //     //Send file data
    //     if (file) {
    //         const buffer = await file?.arrayBuffer()
    //         const chunk_size = 16  * 1024 // 16 KB
    //         const fileSize = file.size
    //         let offset = 0
    //         while(offset <= buffer.byteLength)  {
    //             let end = offset + chunk_size
    //             if (end > fileSize) {
    //                 end = fileSize
    //             }
    //             let chunk = buffer.slice(offset, end)
    //             dc.send(chunk)
    //             offset+=chunk_size
    //         }  

    //         dc.send(JSON.stringify({type:"done"}))

    //     }

    // }

    const handleSendFile = async () => {
        const dc = dataChannelRef.current
        if (!dc || dc.readyState !== "open") {
            console.log("Data channel is not open")
            return
        }

        // Send metadata
        dc.send(JSON.stringify({
            type: "meta",
            name: file?.name,
            size: file?.size,
            mime: file?.type
        }))

        if (!file) return

        const buffer = await file.arrayBuffer()
        const chunkSize = 16 * 1024 // 16 KB
        let offset = 0

        const waitForBufferDrain = () =>
            new Promise<void>((resolve) => {
                if (dc.bufferedAmount < dc.bufferedAmountLowThreshold) {
                    resolve()
                } else {
                    //Fired when dc.bufferedAmount < dc.BufferedAmountLowThreshold 
                    // when safe to add to dc queue
                    dc.onbufferedamountlow = () => {
                        //setting it null to ensure handler runs only once
                        dc.onbufferedamountlow = null
                        resolve()
                    }
                }
            })

        while (offset < buffer.byteLength) {
            //If dc queue is more than 8 MB drain it
            if (dc.bufferedAmount > 8 * 1024 * 1024) {
                await waitForBufferDrain()
            }

            const end = Math.min(offset + chunkSize, buffer.byteLength)
            const chunk = buffer.slice(offset, end)

            dc.send(chunk)
            offset = end
        }

        dc.send(JSON.stringify({ type: "done" }))
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
                                            onClick={handleSendFile}
                                            className="px-3 py-1.5 text-sm rounded-lg bg-[#4A90E2] text-white hover:bg-[#3B7AC2] transition hover:cursor-pointer"
                                        >
                                            Send
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