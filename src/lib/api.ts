export const API_URL = ""; // Relative path works since we use Vite middleware

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}/api${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Erro desconhecido" }));
    throw new Error(errorData.error || "Erro na requisição");
  }

  return response.json();
}
