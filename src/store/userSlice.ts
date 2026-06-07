import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "./store";

export interface UserPreferences {
  language: string;
  measurementSystem: "metric" | "imperial";
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  preferences: UserPreferences;
  tokens: number;
  createdAt: any;
  updatedAt: any;
}

interface UserState {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  profile: null,
  loading: false,
  error: null,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUserStart(state) {
      state.loading = true;
      state.error = null;
    },
    setUserSuccess(state, action: PayloadAction<UserProfile>) {
      state.profile = action.payload;
      state.loading = false;
      state.error = null;
    },
    setUserFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    clearUser(state) {
      state.profile = null;
      state.loading = false;
      state.error = null;
    },
  },
});

export const { setUserStart, setUserSuccess, setUserFailure, clearUser } = userSlice.actions;

// Selectors
export const selectUserProfile = (state: RootState) => state.user.profile;
export const selectUserLoading = (state: RootState) => state.user.loading;
export const selectUserError = (state: RootState) => state.user.error;

export default userSlice.reducer;
