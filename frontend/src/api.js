const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const getHeaders = (token) => {
  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["auth-token"] = token;
  }

  return headers;
};

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...getHeaders(options.token),
      ...(options.headers || {}),
    },
  });

  let data = null;
  try {
    data = await response.json();
  } catch (_error) {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.msg || "Request failed");
  }

  return data;
}

export { API_URL };
