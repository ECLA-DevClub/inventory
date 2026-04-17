export const getFurnitureTypes = async () => {
  const res = await fetch(`${API_BASE_URL}/furniture-types`);
  return res.json();
};

const API_URL =
  import.meta.env.VITE_API_URL || "https://inventory-9ko1.onrender.com";

/* ---------------- HELPERS ---------------- */

function normalizeErrorDetail(detail) {
  if (!detail) return null;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item;

        const field = Array.isArray(item?.loc)
          ? item.loc.filter((part) => part !== "body").join(".")
          : "";

        const message = item?.msg || "Invalid value";
        return field ? `${field}: ${message}` : message;
      })
      .join(" | ");
  }

  if (typeof detail === "object") {
    return JSON.stringify(detail);
  }

  return null;
}

async function parseError(res, fallbackMessage) {
  const err = await res.json().catch(() => ({}));
  const normalized =
    normalizeErrorDetail(err?.detail) || err?.message || fallbackMessage;

  throw new Error(normalized);
}

function getStoredToken() {
  return localStorage.getItem("access_token") || "";
}

function buildAuthHeaders(token, extraHeaders = {}) {
  const finalToken = token || getStoredToken();

  return {
    ...extraHeaders,
    ...(finalToken ? { Authorization: `Bearer ${finalToken}` } : {}),
  };
}

export function resolveAssetUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_URL}${cleanPath}`;
}

/* ---------------- AUTH ---------------- */

export async function loginUser(username, password) {
  const body = new URLSearchParams();
  body.append("username", username);
  body.append("password", password);

  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    await parseError(res, "Ошибка входа");
  }

  return res.json();
}

export async function registerUser(data) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    await parseError(res, "Ошибка регистрации");
  }

  return res.json();
}

/* ---------------- FURNITURE ---------------- */

export async function getFurniture(filters = {}, token = "") {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      params.append(key, value);
    }
  });

  const query = params.toString();
  const url = `${API_URL}/furniture/${query ? `?${query}` : ""}`;

  const res = await fetch(url, {
    headers: buildAuthHeaders(token),
  });

  if (!res.ok) {
    await parseError(res, "Не удалось загрузить мебель");
  }

  return res.json();
}

export async function getFurnitureById(id, token = "") {
  const res = await fetch(`${API_URL}/furniture/${id}`, {
    headers: buildAuthHeaders(token),
  });

  if (!res.ok) {
    await parseError(res, "Не удалось загрузить мебель");
  }

  return res.json();
}

export async function createFurniture(data, token) {
  const formData = new FormData();

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (value instanceof File) {
        formData.append(key, value);
      } else {
        formData.append(key, String(value));
      }
    }
  });

  const res = await fetch(`${API_URL}/furniture/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("API Error:", errorText);
    await parseError(res, "Ошибка создания");
  }

  return res.json();
}

export async function updateFurniture(id, data, token) {
  const res = await fetch(`${API_URL}/furniture/${id}`, {
    method: "PUT",
    headers: buildAuthHeaders(token, {
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    await parseError(res, "Ошибка обновления");
  }

  return res.json();
}

export async function deleteFurniture(id, token) {
  const res = await fetch(`${API_URL}/furniture/${id}`, {
    method: "DELETE",
    headers: buildAuthHeaders(token),
  });

  if (!res.ok) {
    await parseError(res, "Ошибка удаления");
  }

  if (res.status === 204) {
    return { success: true };
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json();
  }

  return { success: true };
}

export async function uploadPhoto(id, file, token) {
  const formData = new FormData();
  formData.append("photo", file);

  const res = await fetch(`${API_URL}/furniture/${id}/photo`, {
    method: "POST",
    headers: buildAuthHeaders(token),
    body: formData,
  });

  if (!res.ok) {
    await parseError(res, "Ошибка загрузки фото");
  }

  return res.json();
}

export async function moveFurniture(id, data, token) {
  const res = await fetch(`${API_URL}/furniture/${id}/move`, {
    method: "POST",
    headers: buildAuthHeaders(token, {
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    await parseError(res, "Ошибка перемещения");
  }

  return res.json();
}

export async function markFurnitureAsInspected(id, token) {
  const res = await fetch(`${API_URL}/furniture/${id}/inspect`, {
    method: "POST",
    headers: buildAuthHeaders(token),
  });

  if (!res.ok) {
    await parseError(res, "Ошибка отметки проверки");
  }

  return res.json();
}

export async function getFurnitureHistory(id, token = "") {
  const res = await fetch(`${API_URL}/furniture/history/${id}`, {
    headers: buildAuthHeaders(token),
  });

  if (!res.ok) {
    await parseError(res, "Ошибка загрузки истории");
  }

  return res.json();
}

export function getFurnitureQrUrl(id) {
  return `${API_URL}/furniture/${id}/qr`;
}

/* ---------------- FURNITURE TYPES ---------------- */



  if (!res.ok) {
    await parseError(res, "Ошибка загрузки типов мебели");
  }

  return res.json();


/* ---------------- REFERENCES ---------------- */

export async function getTypes(token = "") {
  const res = await fetch(`${API_URL}/references/types`, {
    headers: buildAuthHeaders(token),
  });

  if (!res.ok) {
    await parseError(res, "Ошибка загрузки типов");
  }

  return res.json();
}

export async function getBuildings(token = "") {
  const res = await fetch(`${API_URL}/references/buildings`, {
    headers: buildAuthHeaders(token),
  });

  if (!res.ok) {
    await parseError(res, "Ошибка загрузки корпусов");
  }

  return res.json();
}

export async function getRooms(token = "") {
  const res = await fetch(`${API_URL}/references/rooms`, {
    headers: buildAuthHeaders(token),
  });

  if (!res.ok) {
    await parseError(res, "Ошибка загрузки комнат");
  }

  return res.json();
}

export async function getConditions(token = "") {
  const res = await fetch(`${API_URL}/references/conditions`, {
    headers: buildAuthHeaders(token),
  });

  if (!res.ok) {
    await parseError(res, "Ошибка загрузки состояний");
  }

  return res.json();
}

/* ---------------- USERS ---------------- */

export async function getUsers(token) {
  const res = await fetch(`${API_URL}/users/`, {
    headers: buildAuthHeaders(token),
  });

  if (!res.ok) {
    await parseError(res, "Ошибка загрузки пользователей");
  }

  return res.json();
}

export async function createUser(data, token) {
  const res = await fetch(`${API_URL}/users/`, {
    method: "POST",
    headers: buildAuthHeaders(token, {
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    await parseError(res, "Ошибка создания пользователя");
  }

  return res.json();
}

export async function updateUserRole(userId, role, token) {
  const res = await fetch(`${API_URL}/users/${userId}/role`, {
    method: "PUT",
    headers: buildAuthHeaders(token, {
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ role }),
  });

  if (!res.ok) {
    await parseError(res, "Ошибка изменения роли");
  }

  return res.json();
}

export async function deleteUser(id, token) {
  const res = await fetch(`${API_URL}/users/${id}`, {
    method: "DELETE",
    headers: buildAuthHeaders(token),
  });

  if (!res.ok) {
    await parseError(res, "Ошибка удаления пользователя");
  }

  if (res.status === 204) {
    return { success: true };
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json();
  }

  return { success: true };
}

export { API_URL };