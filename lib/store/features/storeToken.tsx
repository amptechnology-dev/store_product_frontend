import { createSlice, } from "@reduxjs/toolkit";
import type { PayloadAction } from '@reduxjs/toolkit'

export interface TokenType {
    token: string | null
}

const initialState: TokenType = {
    token: null,
}

export const tokenSlice = createSlice({
    name: "token",
    initialState,
    reducers: {
        saveToken: (state, action: PayloadAction<string | null>) => {
            state.token = action.payload
        },
        clearToken: (state) => {
            state.token = null
        }
    }
})

export const { saveToken } = tokenSlice.actions;

export default tokenSlice.reducer;