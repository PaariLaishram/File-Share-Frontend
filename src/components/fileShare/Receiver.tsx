import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "../common/ConfirmDialog";
import ShareLinkBox from "../common/ShareLinkBox";
import ShowNotification from "../common/ShowNotification";
import copy from "copy-to-clipboard";
import { getWsUrl } from "@/api";
import type { UploadSignal } from "@/models/models";
import { configuration } from "./config";


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
    const [open, setOpen] = useState(false)
    const shareURL = window.location.href
    const ws = useRef<WebSocket | null>(null)
    const peerConnection = useRef<RTCPeerConnection | null>(null)
    const pendingIce: RTCIceCandidateInit[] = []
    const meta = useRef<Meta | null>(null)
    const [progessPercent, setProgressPercent] = useState(0)
    const currentFileSize = useRef(0)
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
                console.log("reconnecting...")
            } 
            if(document.visibilityState === "hidden") {
                console.log("hidden")
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
            console.log("PeerConnection state:", peerConnection?.current?.connectionState)
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
                console.log("ICE gathering complete")
            }
        })

        await peerConnection.current.setRemoteDescription(msg.offer)
        let receivedBuffer: ArrayBuffer[] = []
        //Remote peer can receive data channel by listening using ondatachannel event on the RTCPeerConnection obj
        peerConnection.current.ondatachannel = event => {
            const dc = event.channel
            //Need to wait for channel to open before sending data
            dc.onopen = () => {
                console.log("Data channel open")
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
                        console.log("File received")
                        meta.current = null
                        currentFileSize.current = 0

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
        setOpen(true)
    }

    const handleConfirm = () => {

    }

    return (
        <div className="flex flex-col items-center justify-center gap-5">
            {meta.current ?
                <div>
                    <h2>File Share in Progess</h2>
                    <progress className="upload-progess" max={meta.current.size} value={currentFileSize.current} />
                </div> :
                <div>
                    {/* <progress className="upload-progess" max={100} value={50} /> */}
                    <h1 className="font-semibold text-2xl">Share the link to start receiving files</h1>
                    <div>
                        <ShareLinkBox
                            shareLink={shareURL}
                            handleCopy={handleCopy}
                        />
                    </div>
                    <ConfirmDialog open={openConfirm} setOpen={setOpenConfirm} handleClick={handleConfirm} />
                    <ShowNotification
                        severity={"success"}
                        message={"Link Copied!"}
                        open={open}
                        setOpen={setOpen}
                    />
                </div>}


        </div>
    )
}