import { Alert, Snackbar } from "@mui/material"

type Props = {
    severity: "success" | "error" | "info" | "warning",
    message: string,
    open: boolean,
    setOpen:React.Dispatch<React.SetStateAction<boolean>>
    autoHideDuration?:number;
}

export default function ShowNotification({severity, message, open, setOpen, autoHideDuration = 1800}: Props) {
    return (
        <Snackbar
            open={open}
            autoHideDuration={autoHideDuration}
            onClose={() => setOpen(false)}
            anchorOrigin={{ vertical: "top", horizontal: "center" }}
            ContentProps={{
                sx: {
                    background: "#f5f5f5",       
                    color: "#333",              
                    fontSize: "0.9rem",
                    paddingX: 2.5,
                    paddingY: 1.5,
                    borderRadius: "12px",
                    boxShadow: "0px 4px 12px rgba(0,0,0,0.1)",  
                    border: "1px solid #e1e1e1",  
                }
            }}
        >
            <Alert
                severity={severity}
                variant="standard"
                onClose={() => setOpen(false)}
                sx={{ width: '100%' }}
            >
                {message}
            </Alert>
        </Snackbar>
    )
}