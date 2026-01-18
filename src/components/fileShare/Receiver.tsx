import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "../common/ConfirmDialog";
import ShareLinkBox from "../common/ShareLinkBox";
import ShowNotification from "../common/ShowNotification";
import copy from "copy-to-clipboard";
import { getWsUrl } from "@/api";
import type { NotificationModel, UploadSignal } from "@/models/models";
import { configuration } from "./config";
import ProgressBar from "../common/ProgressBar";
import { convertBytes } from "@/lib/utils";


type Props = {
    shareLink: string
}

type Meta = {
    name: string,
    size: number,
    mime: string
}

export default function Receiver(props: Props) {
    const [openConfirm, setOpenConfirm] = useState(false)
    const [open, setOpen] = useState<NotificationModel>({
        open: false,
        message: "",
        severity: "success"
    })
    const shareURL = window.location.href
    const ws = useRef<WebSocket | null>(null)
    const peerConnection = useRef<RTCPeerConnection | null>(null)
    const pendingIce: RTCIceCandidateInit[] = []
    const meta = useRef<Meta | null>(null)
    const [progressPercent, setProgressPercent] = useState(0)
    const currentFileSize = useRef(0)
    /// wasClosed use to determine is browser is minimise on phone
    const [wasClosed, setWasClosed] = useState(false)

    useEffect(() => {
        const connect = () => {
            if (ws.current) return
            ws.current = new WebSocket(getWsUrl)
            const initSignal: UploadSignal = {
                userType: "receiver",
                shareLink: props.shareLink,
                actionType: "initConn"
            }
            ws.current.onopen = () => {
                ws.current?.send(JSON.stringify(initSignal))
            }

            ws.current.onmessage = (event) => {
                const response: UploadSignal = JSON.parse(event.data)
                const handlers: Record<string, (msg: UploadSignal) => void> = {
                    createOffer: handleCreateOffer,
                    iceCandidate: handleIceCandidate
                }

                const handler = handlers[response.actionType]
                if (handler) handler(response)
                else console.warn("Warning, uknown action type: ", response.actionType)
            }
            ws.current.onclose = () => {
                ws.current = null
                setWasClosed(true)
            }
        }

        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible" && wasClosed) {
                connect()
                // console.log("reconnecting...")
            }
            if (document.visibilityState === "hidden") {
                // console.log("hidden")
            }
        })
        connect()
    }, [props.shareLink])

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

    //handle the createOffer sent from sender
    const handleCreateOffer = async (msg: UploadSignal) => {
        if (!msg.offer) {
            console.error("error: offer is undefined")
            return
        }
        peerConnection.current = new RTCPeerConnection(configuration)
        peerConnection.current.onconnectionstatechange = () => {
            // console.log("PeerConnection state:", peerConnection?.current?.connectionState)
        }
        peerConnection.current.addEventListener('icecandidate', e => {
            if (e.candidate) {
                const msg: UploadSignal = {
                    userType: "receiver",
                    shareLink: props.shareLink,
                    actionType: "iceCandidate",
                    candidate: e.candidate
                }
                ws.current?.send(JSON.stringify(msg))
            } else {
                // console.log("ICE gathering complete")
            }
        })

        await peerConnection.current.setRemoteDescription(msg.offer)
        let receivedBuffer: ArrayBuffer[] = []
        //Remote peer can receive data channel by listening using ondatachannel event on the RTCPeerConnection obj
        peerConnection.current.ondatachannel = event => {
            const dc = event.channel
            //Need to wait for channel to open before sending data
            dc.onopen = () => {
                // console.log("Data channel open")
            }
            //Receive the dc sent message
            dc.onmessage = (event) => {
                //metadata
                if (typeof event.data === "string") {
                    const msg = JSON.parse(event.data)
                    if (msg.type === "meta") {
                        const metaData: Meta = {
                            name: msg.name,
                            size: msg.size,
                            mime: msg.mime
                        }
                        meta.current = metaData
                    }
                    if (msg.type === "done" && meta.current) {
                        const blob = new Blob(receivedBuffer, { type: meta.current.mime })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement("a")
                        a.href = url
                        a.download = meta.current.name
                        a.click()
                        meta.current = null
                        currentFileSize.current = 0
                        receivedBuffer = []

                    }
                } else {
                    if (meta.current) {
                        currentFileSize.current += event.data.byteLength
                        const percent = (currentFileSize.current / meta.current.size) * 100
                        setProgressPercent(percent)
                        receivedBuffer.push(event.data)
                    }

                }
            }

        }
        const answer = await peerConnection.current.createAnswer()
        await peerConnection.current.setLocalDescription(answer)

        const answerMsg: UploadSignal = {
            userType: "receiver",
            actionType: "answerOffer",
            answer: answer,
            shareLink: props.shareLink
        }

        ws.current?.send(JSON.stringify(answerMsg))

    }

    const handleCopy = () => {
        copy(shareURL)
        setOpen({
            open: true,
            severity: "success",
            message: "Link Copied!"
        })
    }

    const handleConfirm = () => {

    }

    return (
        <main className="w-full px-4">
            {meta.current ?
              <section>
                    <div className="flex flex-col px-4 gap-3">
                        <h3 className="font-semibold text-gray-800 text-2xl text-center">Receiving File</h3>
                        <div className="flex flex-col items-center justify-center">
                            <div className="flex gap-1">
                                <label className="text-gray-700">File Name:</label>
                                <span className="text-gray-700">{meta.current.name}</span>
                            </div>
                           <div className="flex gap-1">
                                <label className="text-gray-700">File Size:</label>
                                <span className="text-gray-700">{convertBytes(meta.current.size)}</span>
                            </div>
                        </div>
                        {/* <progress max={file.size} value={sentFileSize.current} /> */}
                        <p className="text-center text-gray-700">Estimated time remaining: 30 minutes</p>
                        <div className="max-w-xs w-full mx-auto px-2">
                            <ProgressBar progress={progressPercent} />
                        </div>
                    </div>
                </section>
                :
                <section className="flex flex-col items-center justify-center">
                    <div className="flex flex-col items-center justify-center">
                        <h1 className="text-3xl font-semibold text-gray-900 mb-3 text-center">
                            Share the link to receive files
                        </h1>
                        <p className="text-gray-600 mb-8">
                            Supported file formats: <span className="font-bold text-gray-800">PDF, MP4, JPEG</span>
                        </p>
                    </div>
                    <div>
                        <ShareLinkBox
                            shareLink={shareURL}
                            handleCopy={handleCopy}
                        />
                    </div>
                    <ConfirmDialog open={openConfirm} setOpen={setOpenConfirm} handleClick={handleConfirm} />
                </section>
            }
            <ShowNotification
                severity={open.severity}
                message={open.message}
                open={open.open}
                setOpen={setOpen}
            />
        </main>
    )
}