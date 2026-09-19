import { create } from "zustand";
import axiosInstance from "@/service/axios.service"

export type Role = "ADMIN" | "MANAGER" | "CASHIER" | "STORE";

interface Profile {
  id: string;
  name: string;
  email: string;
  role: Role;
}

interface ProfileState {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  fetchProfile: () => Promise<void>;
}


export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  loading: false,
  error: null,

  fetchProfile: async () => {
    try {
      set({ loading: true, error: null });
       
      const res = await axiosInstance.get("/api/login/profile-page"); 

      if (!res.status || res.status !== 200) {
        throw new Error("Failed to fetch profile");
      }
      set({
        profile: res.data.user,
        loading: false,
      });
    } catch (err: any) {
      set({
        error: err.message,
        loading: false,
      });
    }
  },
}));
