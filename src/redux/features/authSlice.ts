import type { AccessToken } from '../../models/models'
import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

type initialStateType = {
    data: AccessToken | null
}

const initialState: initialStateType = {
    data: null
}

const authSlice =  createSlice({
    name:"auth",
    initialState,
    reducers: {
        updateAuthSlice(state, action: PayloadAction<AccessToken>) {
            state.data = action.payload
        },
        resetAuthSlice() {
            return initialState
        }
    }
})

export const {updateAuthSlice, resetAuthSlice} = authSlice.actions
export default authSlice.reducer