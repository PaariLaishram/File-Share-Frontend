import copy from "copy-to-clipboard";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import type { UploadSignal } from "../models";

export default function CreateFileShare() {
    const [isReceiver, setIsReceiver] = useState<boolean | null>(null)
    const params = useParams()
    const [isCopied, setIsCopied] = useState(false)
    const [isValidShareLink, setIsValidShareLink] = useState<boolean | null>(null)
    const userType = isReceiver ? 'receiver' : 'sender'
    const shareLink = (params.token ?? "")
    const wsRef = useRef<WebSocket | null>(null)
    const [file, setFile] = useState<File | null>(null)
    const fileRef = useRef<File | null>(null)
    const [fileUrl, setFileUrl] = useState("")
    const CHUNK_SIZE = 64 * 1024 // 64 KB
    const chunksRef = useRef<Record<number, Blob>>({})
    const currentChunkIndexRef = useRef<number>(0)
    const offsetRef = useRef<number>(0)
    const [showConfirm, setShowConfirm] = useState(false)
    const [pendingSignal, setPendingSignal] = useState<UploadSignal | null>(null)



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

    const handleInitConn = (response: UploadSignal) => {
        const responseUserType = response.userType
        if (responseUserType == "sender" && response.isValidShareLink) {
            setIsValidShareLink(true)
        } else {
            setIsValidShareLink(false)
        }
    }

    const handleStartUpload = (response: UploadSignal) => {
        if (userType === "receiver") {
            setPendingSignal(response)
            setShowConfirm(true)
        }
    }

    const handleConfirmUpload = async (response: UploadSignal) => {
        if (userType === "sender") {
            const continueUpload = response.confirmUpload
            const currentFile = fileRef.current
            if (continueUpload && currentFile) {
                sendNextChunk()
            }
            else {
                alert("Receiver has rejected the file")
            }
        }
    }

    const sendNextChunk = async () => {
        const file = fileRef.current
        if (!file) return

        if (offsetRef.current >= file.size) {
            const combinedBlob = combineChunks()
            downloadFile(combinedBlob)
            alert("Upload complete")
            return
        }

        const chunk = file.slice(offsetRef.current, offsetRef.current + CHUNK_SIZE)
        const buffer = await chunk.arrayBuffer()

        const sendChunkUploadSignal: UploadSignal = {
            userType: "sender",
            shareLink,
            actionType: "sendChunk",
            chunkIndex: currentChunkIndexRef.current
        }
        wsRef.current?.send(JSON.stringify(sendChunkUploadSignal))
        wsRef.current?.send(buffer)
        offsetRef.current += CHUNK_SIZE
        currentChunkIndexRef.current++
    }

    const combineChunks = ():Blob => {
        const recordArr: Record<number, Blob>[] = []
        //Construct a new arr
        //sort the arr
        //build a map and combine the blobs
       for (const chunkIndex in chunksRef.current ) {
        const numIndex = Number(chunkIndex)
        const value = chunksRef.current[numIndex]
        const record:Record<number, Blob> = { [numIndex]: value}
        recordArr.push(record)
       }

       recordArr.sort((a,b) => {
        const keyA = Number(Object.keys(a)[0])
        const keyB = Number(Object.keys(b)[0])
        return keyA - keyB
       })

       const orderedBlobs:Blob[] = recordArr.map(obj => {
        const index = Number(Object.keys(obj)[0])
        return obj[index]
       })

       return new Blob(orderedBlobs, {type: fileRef.current?.type})
    }

    const downloadFile = (combinedBlob: Blob) => {
        const url = URL.createObjectURL(combinedBlob)
        const a = document.createElement("a")
        a.href = url
        a.download = fileRef.current?.name ?? "name_not_found.pdf"
        a.click()
    }

    useEffect(() => {
        if (isReceiver === null) return;
        const ws = new WebSocket("ws://localhost:9903/ws")
        wsRef.current = ws

        const actionType = "initConn"
        const initSignal: UploadSignal = {
            userType,
            shareLink,
            actionType
        }
        ws.onopen = () => {
            ws.send(JSON.stringify(initSignal))
        }

        ws.onmessage = (event) => {
            if (event.data instanceof ArrayBuffer && userType == "receiver") {
                // const blob =- new Blob([event.data],)
                // chunksRef.current[currentChunkIndexRef.current] = event.data
            } else {
                const response: UploadSignal = JSON.parse(event.data)
                const handlers: Record<string, (msg: UploadSignal) => void> = {
                    initConn: handleInitConn,
                    startUpload: handleStartUpload,
                    confirmUpload: handleConfirmUpload,
                    sendChunk: handleSendChunk,
                    ackChunk: handleAckChunk,
                }

                const handler = handlers[response.actionType]
                if (handler) handler(response)
                else console.warn("Warning, uknown action type", response.actionType)
            }
        }
    }, [isReceiver])

    const handleAckChunk = (response: UploadSignal) => {
        if (userType === "sender") {
            sendNextChunk()
        }
    }

    const handleSendChunk = (response: UploadSignal) => {
        if (userType === "receiver") {
            const chunkIndex = response.chunkIndex
            const ackResponse: UploadSignal = {
                userType,
                shareLink,
                actionType: "ackChunk",
                chunkIndex
            }
            wsRef.current?.send(JSON.stringify(ackResponse));
        }
    }

    useEffect(() => {
        if (isReceiver === null || isValidShareLink === null) return;
        if (userType === "sender" && !isValidShareLink) {
            alert("Share link is not valid")
        }
    }, [isValidShareLink, isReceiver])

    const handleShareLink = () => {
        const shareLink = window.location.href
        copy(shareLink)
        setIsCopied(true)
    }


    const handleFileUpload = () => {
        if (wsRef.current != null) {
            const uploadSignal: UploadSignal = {
                userType,
                shareLink,
                actionType: "startUpload"
            }
            wsRef.current.send(JSON.stringify(uploadSignal))
            console.log("start file upload")
        }
    }

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.currentTarget.files
        if (files) {
            setFile(files[0])
            fileRef.current = files[0]
            const url = URL.createObjectURL(files[0])
            setFileUrl(url)
        }
    }

    const handleClearFile = () => {
        setFile(null)
        fileRef.current = null
    }

    const handleConfirm = (confirmUpload: boolean) => {
        if (!pendingSignal) return;

        var reply: UploadSignal = {
            userType,
            shareLink,
            actionType: "confirmUpload",
            confirmUpload
        }
        wsRef.current?.send(JSON.stringify(reply))

        setShowConfirm(false)
        setPendingSignal(null)
    }

    return (
        <main>
            {isReceiver ?
                <div>
                    <h1>You are receiving data</h1>
                    <div className="flex">
                        <button onClick={handleShareLink} className="cursor-pointer">{isCopied ? "Copied to clipboard" : "Click to share link"}</button>
                        {/* <button onClick={handleStopReceiving} className="cursor-pointer">Stop Receiving</button> */}
                    </div>
                    {showConfirm && (
                        <div className="modal">
                            <p>Do you want to accept this file?</p>
                            <button onClick={() => handleConfirm(true)}>Yes</button>
                            <button onClick={() => handleConfirm(false)}>No</button>
                        </div>
                    )}
                </div>
                :
                <div>
                    <h1>You are sending data</h1>
                    {/* <input type="file" onChange={handleFileChange} /> */}
                    {!file ?
                        <input type="file" accept=".pdf, .docx, .doc" onChange={handleFileInput}></input>
                        : <div>
                            <a href={fileUrl} target="_blank">{file.name}</a>
                            <button onClick={handleClearFile}>Clear</button>
                            <button onClick={handleFileUpload}>Upload</button>
                        </div>
                    }
                </div>}
        </main>
    )
}