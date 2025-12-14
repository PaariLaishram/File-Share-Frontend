import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./features/authSlice"
import profileReducer from "./features/profileSlice"

const reducer = {
    auth: authReducer,
    profile: profileReducer
}

export const store = configureStore({
    reducer
})

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;