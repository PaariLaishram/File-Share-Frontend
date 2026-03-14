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
  handleProceed: (confirm: boolean) => void;
  title:string;
  description:string;
}

export function ConfirmDialog(props: Props) {
  return (
    <AlertDialog open={props.open} onOpenChange={props.setOpen}>
      <AlertDialogContent className="top-[30%]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-center">
           {props.title}
          </AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogDescription className="flex justify-center">
          {props.description}
        </AlertDialogDescription>
        <AlertDialogFooter>
          <div className="w-full flex justify-center items-center gap-4">
            <AlertDialogCancel className="cursor-pointer" onClick={() => props.handleProceed(false)}>No</AlertDialogCancel>
            <AlertDialogAction className="cursor-pointer bg-blue-600 text-white hover:bg-blue-700 transition" onClick={() => props.handleProceed(true)}>Yes</AlertDialogAction>
          </div>
        </AlertDialogFooter>

      </AlertDialogContent>
    </AlertDialog>
  )
}
