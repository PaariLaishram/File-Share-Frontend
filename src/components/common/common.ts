import Swal, { type SweetAlertIcon } from 'sweetalert2'


  export const showSwal = (title:string, text:string, icon: SweetAlertIcon) => {
        Swal.fire({
            title: title,
            text: text,
            icon: icon
        })
    }