const API_URL = "https://inventory-9ko1.onrender.com";

/* ---------------- AUTH ---------------- */

export async function loginUser(username, password) {
  const body = new URLSearchParams();
  body.append("username", username);
  body.append("password", password);

  console.log("API_URL =", API_URL);
  console.log("LOGIN URL =", `${API_URL}/auth/login`);

  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Ошибка входа");
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
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Ошибка регистрации");
  }

  return res.json();
}

/* ---------------- FURNITURE ---------------- */

export async function getFurniture() {
  const res = await fetch(`${API_URL}/furniture/`);
  if (!res.ok) throw new Error("Не удалось загрузить мебель");
  return res.json();
}

export async function getFurnitureById(id) {
  const res = await fetch(`${API_URL}/furniture/${id}`);
  if (!res.ok) throw new Error("Не удалось загрузить мебель");
  return res.json();
}

export async function createFurniture(data, token) {
  const res = await fetch(`${API_URL}/furniture/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Ошибка создания");
  }

  return res.json();
}

export async function updateFurniture(id, data, token) {
  const res = await fetch(`${API_URL}/furniture/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Ошибка обновления");
  }

  return res.json();
}

export async function deleteFurniture(id, token) {
  const res = await fetch(`${API_URL}/furniture/${id}`, {
    method: "DELETE",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Ошибка удаления");
  }

  return res.json();
}

export async function uploadPhoto(id, file, token) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/furniture/${id}/photo`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Ошибка загрузки фото");
  }

  return res.json();
}

export async function moveFurniture(id, data, token) {
  const res = await fetch(`${API_URL}/furniture/${id}/move`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Ошибка перемещения");
  }

  return res.json();
}

export async function getFurnitureHistory(id) {
  const res = await fetch(`${API_URL}/furniture/history/${id}`);
  if (!res.ok) throw new Error("Ошибка загрузки истории");
  return res.json();
}

export function getFurnitureQrUrl(id) {
  return `${API_URL}/furniture/${id}/qr`;
}

/* ---------------- REFERENCES ---------------- */

export async function getTypes() {
  const res = await fetch(`${API_URL}/references/types`);
  if (!res.ok) throw new Error("Ошибка загрузки типов");
  return res.json();
}

export async function getBuildings() {
  const res = await fetch(`${API_URL}/references/buildings`);
  if (!res.ok) throw new Error("Ошибка загрузки корпусов");
  return res.json();
}

export async function getRooms() {
  const res = await fetch(`${API_URL}/references/rooms`);
  if (!res.ok) throw new Error("Ошибка загрузки комнат");
  return res.json();
}

export async function getConditions() {
  const res = await fetch(`${API_URL}/references/conditions`);
  if (!res.ok) throw new Error("Ошибка загрузки состояний");
  return res.json();
}

/* ---------------- USERS ---------------- */

export async function getUsers(token) {
  const res = await fetch(`${API_URL}/users/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Ошибка загрузки пользователей");
  }

  return res.json();
}

export async function updateUserRole(userId, role, token) {
  const res = await fetch(`${API_URL}/users/${userId}/role`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ role }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Ошибка изменения роли");
  }

  return res.json();
}

export { API_URL };