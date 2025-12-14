import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { type Dispatch, type SetStateAction } from "react"

type Props = {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  handleClick: (confirm: boolean) => void;
}

export function ConfirmDialog(props: Props) {
  return (
    <AlertDialog open={props.open} onOpenChange={props.setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-center">
            Accept Incoming File?
          </AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogDescription className="flex justify-center">
          The file will be saved to your device
        </AlertDialogDescription>
        <AlertDialogFooter>
          <div className="w-full flex justify-center items-center gap-4">
            <AlertDialogCancel className="cursor-pointer" onClick={() => props.handleClick(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="cursor-pointer bg-[#1975D2] text-white hover:bg-[#3B7AC2] transition" onClick={() => props.handleClick(true)}>Continue</AlertDialogAction>
          </div>
        </AlertDialogFooter>

      </AlertDialogContent>
    </AlertDialog>
  )
}
