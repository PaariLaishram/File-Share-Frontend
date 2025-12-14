import { Box, Typography } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { useRef } from "react";

type Props = {
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export default function UploadBox(props: Props) {
    const inputRef = useRef<HTMLInputElement | null>(null)

    const handleClick = () => {
         inputRef.current?.click(); 
    }

    return (
        <>
            <input
                type="file"
                ref={inputRef}
                accept=".pdf, .docx, .doc"
                onChange={props.handleInputChange}
                style={{ display: "none" }}
            />

            <Box
                onClick={handleClick}
                onDrop={() => { }}
                onDragOver={() => { }}
                sx={{
                    width: "400px",
                    height: "170px",
                    border: "2px dashed #cfcfcf",
                    borderRadius: "16px",
                    background: "#fafafa",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 1.5,
                    cursor: "pointer",
                    transition: "0.2s ease",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.05)",

                    "&:hover": {
                        background: "#f5f5f5",
                        borderColor: "#b8b8b8",
                        boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
                    },
                }}
            >
                <CloudUploadIcon sx={{ fontSize: 48, color: "#1975D2" }} />
                {/* 
            <Typography sx={{ fontSize: "1rem", color: "#444" }}>
                Drag & Drop your files here
            </Typography> */}

                <Typography sx={{ fontSize: "1rem", color: "#777" }}>
                    Click to Browse
                </Typography>
            </Box>
        </>
    )
}