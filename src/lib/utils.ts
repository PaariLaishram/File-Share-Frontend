import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export function convertBytes(bytes:number): string {
  if(bytes < 1024) {
    return `${bytes}B`
  }

  const kb = bytes/1024 
  if(kb < 1024) {
    return `${Number(kb.toFixed(2))}KB`
  }
  const mb = kb/1024 
  return `${Number(mb.toFixed(2))}MB`
}