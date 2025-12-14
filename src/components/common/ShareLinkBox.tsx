import { Card, CardContent, IconButton, Typography } from "@mui/material";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

type Props = {
    shareLink: string;
    handleCopy: () => void
}
export default function ShareLinkBox(props: Props) {
    return (
        <Card sx={{
            maxWidth: 420,
            padding: "12px",
            borderRadius: "16px",
            boxShadow: "0 4px 12px rgba(0,0,0, 0.08)",
            transition: "0.25s ease",
            "&:hover": {
                boxShadow: "0 6px 18px rgba(0,0,0, 0.15)"
            }
        }
        }
            variant="outlined">
            <CardContent
            sx={{
                display:"fex",
                justifyContent: "space-between",
                alignItems:"center",
                padding: "8px !important",
                background: "#f9fafb",
                borderRadius: "10px"
            }}
            >
                <Typography
                    variant="body1"
                    sx={{ wordBreak: "break-all", flexGrow: 1, marginRight: 1, fontWeight: 500, color:"#212121" }}
                >
                    {props.shareLink}
                </Typography>

                <IconButton onClick={props.handleCopy} color="primary">
                    <ContentCopyIcon />
                </IconButton>
            </CardContent>
        </Card>
    );
}
