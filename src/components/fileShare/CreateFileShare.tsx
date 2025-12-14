import copy from "copy-to-clipboard";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import type { UploadSignal } from "../../models/models";
import ShareLinkBox from "../common/ShareLinkBox";
import ShowNotification from "../common/ShowNotification";
import UploadBox from "./UploadBox";
import { ConfirmDialog } from "../common/ConfirmDialog";

export default function CreateFileShare() {
    const [isReceiver, setIsReceiver] = useState<boolean | null>(null)
    const params = useParams()
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
    const shareURL = window.location.href
    const [open, setOpen] = useState(false)
    const [openConfirm, setOpenConfirm] = useState(false)
    const [openSenderConnected, setOpenSenderConnected] = useState(false)

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

    const handleStartUpload = () => {
        if (userType === "receiver") {
            setOpenConfirm(true)
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
        if (currentChunkIndexRef.current == totalChunks) {
            const uploadComplete: UploadSignal = {
                userType: "sender",
                shareLink,
                actionType: "uploadComplete",
                fileName: file.name,
                totalChunks
            }
            wsRef.current?.send(JSON.stringify(uploadComplete))

            offsetRef.current = 0
            return
        }

        const chunk = file.slice(offsetRef.current, offsetRef.current + CHUNK_SIZE)
        console.log(offsetRef.current, offsetRef.current + CHUNK_SIZE)
        console.log(chunk)
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
            chunksRef.current[chunkIndex] = chunkData
            console.log(chunksRef.current)
            const ackResponse: UploadSignal = {
                userType,
                shareLink,
                actionType: "ackChunk",
                chunkIndex
            }
            wsRef.current?.send(JSON.stringify(ackResponse));
        });
    }

    const handleAckChunk = () => {
        if (userType === "sender") {
            sendNextChunk()
        }
    }

    useEffect(() => {
        if (isReceiver === null || isValidShareLink === null) return;
        setOpenSenderConnected(true)
    }, [isValidShareLink, isReceiver])

    const handleCopy = () => {
        copy(shareURL)
        setOpen(true)
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

    const handleConfirm = (confirm: boolean) => {
        var reply: UploadSignal = {
            userType,
            shareLink,
            actionType: "confirmUpload",
            confirmUpload: confirm
        }
        wsRef.current?.send(JSON.stringify(reply))
    }

    return (
        <main>
            {isReceiver ?
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
                :
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
                                    open={openSenderConnected}
                                    setOpen={setOpenSenderConnected} />
                            </div> :
                            <div className="flex items-center justify-center">
                                <p className="font-semibold text-xl">Invalid Share Link</p>
                                <ShowNotification
                                    severity={"error"}
                                    message={"Invalid Share Link"}
                                    open={openSenderConnected}
                                    setOpen={setOpenSenderConnected} />
                            </div>}

                </div>}

        </main>
    )
}