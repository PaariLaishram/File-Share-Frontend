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
    const chunksRef = useRef<Record<number, ArrayBuffer>>({})
    const currentChunkIndexRef = useRef<number>(0)
    const offsetRef = useRef<number>(0)
    const [showConfirm, setShowConfirm] = useState(false)
    const [pendingSignal, setPendingSignal] = useState<UploadSignal | null>(null)

    useEffect(() => {
        if (isReceiver === null) return;
        const ws = new WebSocket("ws://localhost:9903/ws")
        ws.binaryType = "arraybuffer"
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
            if (event.data instanceof Blob) {
                const blob = event.data;
                handleBinaryMessage(blob)
            }
            if (event.data instanceof ArrayBuffer) {
                const blob = new Blob([event.data])
                handleBinaryMessage(blob)
            }
            if (typeof event.data === "string") {
                const response: UploadSignal = JSON.parse(event.data)
                const handlers: Record<string, (msg: UploadSignal) => void> = {
                    initConn: handleInitConn,
                    startUpload: handleStartUpload,
                    confirmUpload: handleConfirmUpload,
                    // sendChunk: handleSendChunk,
                    ackChunk: handleAckChunk,
                    uploadComplete: handleUploadComplete
                }

                const handler = handlers[response.actionType]
                if (handler) handler(response)
                else console.warn("Warning, uknown action type", response.actionType)
            }
        }
    }, [isReceiver])

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

    const handleUploadComplete = (response: UploadSignal) => {
        if (userType === "receiver") {
            console.log("downloading file")
            const fileName = response.fileName ?? ""
            downloadFile(fileName)
        }
    }

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
                currentChunkIndexRef.current = 0
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
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
        if (currentChunkIndexRef.current === undefined || currentChunkIndexRef.current === null) {
            currentChunkIndexRef.current = 0
        }
        if(currentChunkIndexRef.current == totalChunks) {
            console.log("upload completed")
            const uploadComplete: UploadSignal = {
                userType:"sender",
                shareLink,
                actionType:"uploadComplete",
                fileName: file.name,
                totalChunks
            }
            console.log(uploadComplete.fileName)
            wsRef.current?.send(JSON.stringify(uploadComplete))
            return
            
        }

        const chunk = file.slice(offsetRef.current, offsetRef.current + CHUNK_SIZE)
        const buffer = await chunk.arrayBuffer()
        const metadata = JSON.stringify({
            userType: "sender",
            shareLink,
            actionType: "sendChunk",
            chunkIndex: currentChunkIndexRef.current,
            totalChunks: totalChunks
        });

        const metadataBytes = new TextEncoder().encode(metadata)
        const metadataLength = metadataBytes.byteLength;

        // Step 2: Prepend 4-byte length header for metadata
        const header = new ArrayBuffer(4);
        new DataView(header).setUint32(0, metadataLength, false); // big-endian

        // Step 3: Combine: [4-byte header][metadata][chunk data]
        const combined = new Blob([
            header,
            metadataBytes,
            buffer
        ]);

        // Step 4: Send as single binary message
        wsRef.current?.send(combined);

        // Update refs
        offsetRef.current += CHUNK_SIZE;
        currentChunkIndexRef.current++;
    }


    const combineChunks = (): Blob => {
        // Get all chunk indices as numbers and sort them
        const indices = Object.keys(chunksRef.current)
            .map(Number)
            .sort((a, b) => a - b); // ascending order: 0, 1, 2, ...

        // Map sorted indices to their ArrayBuffers
        const orderedChunks: ArrayBuffer[] = indices.map(index =>
            chunksRef.current[index]
        );

        // Create final Blob with correct MIME type
        return new Blob(orderedChunks, { type: fileRef.current?.type || "application/octet-stream" });
    };

    const downloadFile = (fileName: string) => {
        const finalBlob = combineChunks();
        // Create downloadable link
        const url = URL.createObjectURL(finalBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName || "downloaded-file";
        document.body.appendChild(a); // Required in Firefox
        a.click();
        document.body.removeChild(a);

        // Clean up
        URL.revokeObjectURL(url);
    };

    const handleBinaryMessage = (blob: Blob) => {
        blob.arrayBuffer().then(buffer => {
            const view = new DataView(buffer);
            const metadataLength = view.getUint32(0, false); // big-endian

            const metadataBytes = buffer.slice(4, 4 + metadataLength);
            const metadataText = new TextDecoder().decode(metadataBytes);
            const metadata: UploadSignal = JSON.parse(metadataText);

            const chunkData = buffer.slice(4 + metadataLength);
            const chunkIndex = metadata.chunkIndex ?? 0
            // Now you safely have both metadata and chunk
            chunksRef.current[chunkIndex] = chunkData
            //ack and then sendNextChunk()
            const ackResponse: UploadSignal = {
                userType,
                shareLink,
                actionType: "ackChunk",
                chunkIndex
            }
            wsRef.current?.send(JSON.stringify(ackResponse));
        });
    }

    const handleAckChunk = (response: UploadSignal) => {
        if (userType === "sender") {
            sendNextChunk()
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