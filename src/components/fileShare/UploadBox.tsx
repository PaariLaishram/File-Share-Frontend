import { Typography } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { useRef, useState } from "react";

type Props = {
    handleInputChange: (files: FileList | null) => void;
};

export default function UploadBox(props: Props) {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);

        props.handleInputChange(e.dataTransfer.files);
    };


    return (
        <label className="w-full md:w-[50%]  block cursor-pointer">
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border border-dashed rounded-md px-5 py-5 transition flex 
                    flex-col items-center justify-center  md:h-[200px] shadow-md
          ${isDragging
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300"
                    }`}
            >
                <div className="flex flex-col items-center justify-center pointer-events-none gap-1">
                    <CloudUploadIcon sx={{ fontSize: 48, color: "#1975d2" }} />

                    <p className="font-semibold text-gray-800">
                        <span className="underline">Choose a file</span> or drag & drop it here
                    </p>

                    <p className="text-gray-600">
                        Supported Formats: <span className="font-semibold">JPEG, PDF, MP4 </span>
                    </p>
                    <p className="text-gray-600">
                        Maximum Size: <span className="font-semibold">500MB</span>
                    </p>
                </div>
            </div>

            <input
                ref={inputRef}
                type="file"
                accept=".mp4, .pdf, .docx, .jpeg, .jpg"
                onChange={(e) => props.handleInputChange(e.target.files)}
                hidden
            />
        </label>
    );
}
