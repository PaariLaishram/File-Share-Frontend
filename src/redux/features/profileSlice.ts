import type { LoginResult } from "@/models/models"
import { createSlice, type PayloadAction } from "@reduxjs/toolkit"


type initialStateType = {
    data: LoginResult | null
}

const initialState: initialStateType = {
    data: null
}

const profileSlice = createSlice({
    name: "profile",
    initialState,
    reducers: {
        updateProfile(state, action: PayloadAction<LoginResult>) {
            state.data = action.payload
        },
        resetProfile() {
            return initialState
        }
    }
});

export const{updateProfile, resetProfile} = profileSlice.actions
export default profileSlice.reducer 