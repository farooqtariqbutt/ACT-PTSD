import type { User } from "../../types";
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const therapistService = {
  
  async getClients() {
    const token = localStorage.getItem("token");
    const response = await fetch(`${BASE_URL}/therapist/clients`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Could not fetch assigned clients");
    return response.json();
  },

  async getClientById(clientId: string) {
    const token = localStorage.getItem("token");
    const response = await fetch(`${BASE_URL}/therapist/clients/${clientId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Could not fetch client details");
    const data = await response.json();
  // DEBUG: Check your console to see exactly where the scores are
  console.log("Client Data received from API:", data); 
  return data;
  },

  async updateClientSettings(clientId: string, data: Partial<User>) {
    const token = localStorage.getItem("token");
    const response = await fetch(`${BASE_URL}/therapist/clients/${clientId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update client settings");
    return response.json();
  }
};