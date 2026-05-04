import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export async function fetchUserProfile(uid: string) {
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (userDoc.exists()) {
    return userDoc.data();
  }
  return null;
}

const IS_DEV = import.meta.env.DEV;
export const API_URL = ""; // Empty for relative calls in both dev and prod

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  // Ensure endpoint starts with a slash
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${API_URL}/api${path}`;

  try {
    const response = await fetch(url, {
      ...options,
      credentials: "include", // Important for cross-origin cookies
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorMessage = `Erro na requisição ${path} (Status: ${response.status})`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (e) {
        // Not a JSON response
      }
      throw new Error(errorMessage);
    }

    return response.json();
  } catch (error: any) {
    console.error("Fetch Error:", error);
    if (error.message.includes("Failed to fetch")) {
      throw new Error("Não foi possível conectar ao servidor. Verifique se o backend no Render está online (pode levar 1 minuto para ligar).");
    }
    throw error;
  }
}
