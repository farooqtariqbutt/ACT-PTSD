import type { User } from "../../types";
const BASE_URL = import.meta.env.VITE_API_BASE_URL; // Adjust to your backend URL

export const userService = {
  async getProfile() {
    const token = localStorage.getItem("token");
    const response = await fetch(`${BASE_URL}/user/profile`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error("Could not fetch profile");
    return response.json();
  },

  async updateProfile(userData: Partial<User>) {
    const token = localStorage.getItem("token"); // Or however you store your JWT
    const response = await fetch(`${BASE_URL}/user/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update profile");
    }

    return response.json();
  },
  async getSessionTemplate(sessionNumber: number) {
    const response = await fetch(`${BASE_URL}/sessions/${sessionNumber}`);

    if (!response.ok) {
      throw new Error(`Session ${sessionNumber} not found.`);
    }

    return await response.json();
  },
  async completeSession(sessionData: any) {
    const token = localStorage.getItem("token");
    const res = await fetch(`${BASE_URL}/sessions/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(sessionData),
    });
    if (!res.ok) throw new Error("Failed to save session");
    return await res.json();
  },
};
