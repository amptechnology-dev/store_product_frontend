import { configureStore } from '@reduxjs/toolkit'
import tokenReducer from "../store/features/storeToken"

export const makeStore = () => {


    const store = configureStore({
        reducer: {
            token: tokenReducer
        },
    });
    return store;
};

export type AppStore = ReturnType<typeof makeStore>
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']