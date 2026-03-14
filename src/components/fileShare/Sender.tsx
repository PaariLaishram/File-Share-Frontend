import { useEffect, useRef, useState } from "react"
import UploadBox from "./UploadBox"
import ShowNotification from "../common/ShowNotification"
import { getWsUrl } from "@/api"
import type { NotificationModel, UploadSignal } from "@/models/models"
import { configuration } from "./config"
import ProgressBar from "../common/ProgressBar"
import { ConfirmDialog } from "../common/ConfirmDialog"
import { showSwal } from "../common/common"

type Props = {
    shareLink: string
}

const allowedFileTypes = [
    "video/mp4",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg"
]

export default function Sender(props: Props) {
    const [isValidShareLink, setIsValidShareLink] = useState<boolean | null>(null)
    const [open, setOpen] = useState<NotificationModel>({
        open: false,
        message: "",
        severity: "success"
    })
    const [openConfirm, setOpenConfirm] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [fileUrl, setFileUrl] = useState("")
    const ws = useRef<WebSocket | null>(null)
    const peerConnection = useRef<RTCPeerConnection | null>(null)
    const pendingIce: RTCIceCandidateInit[] = []
    const dataChannelRef = useRef<RTCDataChannel | null>(null)
    const [sentFileSize, setSentFileSize] = useState(0);
    const [progressPercent, setProgressPercent] = useState(0)
    const isCancelled = useRef(false)

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
            setOpen({
                open: true,
                severity: "success",
                message: "Connected with receiver!"
            })
            createPeerConnection()
        } else {
            setOpen({
                open: true,
                severity: "error",
                message: "Receiver Share Link is Invalid!"
            })
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
            // console.log("PeerConnection state:", peerConnection?.current?.connectionState)
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
                // console.log("ICE gathering complete")
            }
        })
        //Data channel - api used to send arbitrary data over RTCPeerConnection
        //ArrayBuffer - buffer used to hold binary data(bytes)
        //Cannot directly read or write values from an ArrayBuffer
        //have to cast to Uint8Array Int32Array Float64Array DataView
        const dataChannel = peerConnection.current.createDataChannel("test")
        dataChannel.binaryType = "arraybuffer"
        dataChannel.onopen = () => {
            // console.log("Data channel open ready to send file")
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

    const handleFileInput = (files: FileList | null) => {
        const file_size_limit = 524288000; //500 MB
        if (!files || files.length === 0) return;
        if (files) {
            const uploaded_file = files[0]
            if (!allowedFileTypes.includes(uploaded_file.type)) {
                setOpen({
                    open: true,
                    message: "Unsupported File Type",
                    severity: "error"
                })
                return
            }
            if(uploaded_file.size > file_size_limit) {
                setOpen({
                    open: true,
                    message: "File size cannot exceed 500 MB",
                    severity: "error"
                })
                return
            }
            setFile(uploaded_file)
            const url = URL.createObjectURL(uploaded_file)
            setFileUrl(url)
        }
    }

    const handleClearFile = () => {
        setFile(null)
    }

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
        const fileSize = file.size
        const buffer = await file.arrayBuffer()
        const chunkSize = 16 * 1024 // 16 KB
        let offset = 0
        let sentBytes = 0

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

            if (isCancelled.current) {
                setSentFileSize(0)
                setProgressPercent(0);
                isCancelled.current = false
                setOpen({
                    open: true,
                    severity: "success",
                    message: "Sending file cancelled"
                })
                return
            }

            //If dc queue is more than 8 MB drain it
            if (dc.bufferedAmount > 8 * 1024 * 1024) {
                await waitForBufferDrain()
            }

            let end = offset + chunkSize
            if (end > fileSize) {
                end = fileSize
            }
            const chunk = buffer.slice(offset, end)
            sentBytes += chunk.byteLength
            setSentFileSize(sentBytes)
            // sentFileSize.current += chunkSize
            const percent = ((sentBytes) / file.size) * 100
            setProgressPercent(percent)
            dc.send(chunk)
            offset = end
        }

        dc.send(JSON.stringify({ type: "done" }))
        setSentFileSize(0)
        setFile(null)
        showSwal("File Sent!", "Your file has been sent", "success")
    }

    const handleCancel = () => {
        setOpenConfirm(true)
    }

    const handleProceedCancel = () => {
       isCancelled.current = true
       const dc = dataChannelRef.current
       dc?.send(JSON.stringify({
        type:"cancel"
       }))
    }

    return (
        <main className="w-full px-4">
            {isValidShareLink === null ?
                <p>....Loading</p> :
                isValidShareLink ?
                    <section>
                        {!file ?
                            <div className="flex flex-col justify-center items-center gap-5">
                                <h2 className="text-3xl font-semibold text-gray-900">Select a file to send</h2>
                                <p className="text-gray-600 mb-4 text-center">
                                    You are now connected with the receiver. Select a file to start sharing.
                                </p>
                                <UploadBox handleInputChange={handleFileInput} />
                            </div>
                            :
                            sentFileSize > 0 ?
                                <div className="flex flex-col px-4 gap-3">
                                    <h3 className="font-semibold text-gray-800 text-2xl text-center">Sending File</h3>
                                    {/* <progress max={file.size} value={sentFileSize.current} /> */}
                                    {/* <p className="text-center text-gray-700">Estimated time remaining: 30 minutes</p> */}
                                    <div className="max-w-xs w-full mx-auto px-2">
                                        <ProgressBar progress={progressPercent} />
                                    </div>
                                    <div className="flex items-center justify-center">
                                        <button
                                            onClick={handleCancel}
                                            className=" cursor-pointer bg-gray-400 px-8 hover:bg-gray-500 text-white font-medium py-2 
                                                rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 "
                                        >Cancel</button>
                                    </div>
                                </div>
                                :
                                <div className="flex flex-col items-center justify-center gap-3">
                                    <h2 className="text-3xl font-semibold text-gray-900">File has been selected</h2>
                                    <div className="max-w-md">
                                        <div className="flex w-full gap-1">
                                            <p className="whitespace-nowrap">Selected File:</p>
                                            <a
                                                href={fileUrl}
                                                target="_blank"
                                                className="text-blue-600 font-medium hover:underline"
                                            >
                                                {file.name}
                                            </a>
                                        </div>
                                    </div>
                                    <div className="flex gap-10 items-center justify-between">
                                        <button
                                            onClick={handleClearFile}
                                            className="cursor-pointer bg-gray-400 px-8 hover:bg-gray-500 text-white font-medium py-2 
                                                rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 "
                                        >
                                            Clear
                                        </button>

                                        <button
                                            onClick={handleSendFile}
                                            className="cursor-pointer bg-blue-600 px-8 hover:bg-blue-700 text-white font-medium py-2 
                                                rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 "
                                        >
                                            Send
                                        </button>
                                    </div>
                                </div>
                        }

                        {/* <ShowNotification
                            severity={"success"}
                            message={"Connected!"}
                            open={open.open}
                            setOpen={setOpen} /> */}
                    </section> :
                    <section className="flex items-center justify-center">
                        <p className="font-semibold text-xl">Invalid Share Link</p>
                    </section>}
            <ShowNotification
                severity={open.severity}
                message={open.message}
                open={open.open}
                setOpen={setOpen} />
            <ConfirmDialog
                title="Are you sure you want to cancel?"
                description="This will cancel sending the file"
                open={openConfirm}
                setOpen={setOpenConfirm}
                handleProceed={handleProceedCancel}
            />
        </main>
    )
}