import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "../common/ConfirmDialog";
import ShareLinkBox from "../common/ShareLinkBox";
import ShowNotification from "../common/ShowNotification";
import copy from "copy-to-clipboard";
import { getWsUrl } from "@/api";
import type { UploadSignal } from "@/models/models";


type Props = {
    shareLink: string
}

export default function Receiver(props: Props) {
    const [openConfirm, setOpenConfirm] = useState(false)
    const [open, setOpen] = useState(false)
    const shareURL = window.location.href
    const ws = new WebSocket(getWsUrl)
    const peerConnRef = useRef<RTCPeerConnection | null>(null)

    useEffect(() => {
        const initSignal: UploadSignal = {
            userType: "receiver",
            shareLink: props.shareLink,
            actionType: "initConn"
        }
        ws.onopen = () => {
            ws.send(JSON.stringify(initSignal))
        }

        ws.onmessage = (event) => {
            const response: UploadSignal = JSON.parse(event.data)
            const handlers: Record<string, (msg: UploadSignal) => void> = {
                createOffer: handleCreateOffer,
            }

            const handler = handlers[response.actionType]
            if (handler) handler(response)
            else console.warn("Warning, uknown action type: ", response.actionType)
        }

    }, [])


    const handleCreateOffer = async (msg: UploadSignal) => {
        if (!msg.offer) {
            console.error("Error offer field is null")
            return
        }
        const configuration = {
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" },
                { urls: "stun:stun1.l.google.com:19302" },
                { urls: "stun:stun2.l.google.com:19302" }
            ]
        }
        peerConnRef.current = new RTCPeerConnection(configuration)
        peerConnRef.current.setRemoteDescription(new RTCSessionDescription(msg.offer))
        const answer = await peerConnRef.current.createAnswer()
        await peerConnRef.current.setLocalDescription(answer)
        const answerMsg: UploadSignal = {
            answer: answer,
            actionType: "answerOffer",
            userType: "receiver",
            shareLink: props.shareLink
        }
        ws.send(JSON.stringify(answerMsg))
    }

    const handleCopy = () => {
        copy(shareURL)
        setOpen(true)
    }

    const handleConfirm = () => {

    }

    return (
        <div className="flex flex-col items-center justify-center gap-5">
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
        </div>
    )
}