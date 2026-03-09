const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

/* ---------------- GET ---------------- */

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

/* ---------------- CREATE ---------------- */

export async function createFurniture(data) {
  const res = await fetch(`${API_URL}/furniture/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Ошибка создания");
  }

  return res.json();
}

/* ---------------- UPDATE ---------------- */

export async function updateFurniture(id, data) {
  const res = await fetch(`${API_URL}/furniture/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Ошибка обновления");
  }

  return res.json();
}

/* ---------------- DELETE ---------------- */

export async function deleteFurniture(id) {
  const res = await fetch(`${API_URL}/furniture/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    throw new Error("Ошибка удаления");
  }

  return res.json();
}

/* ---------------- PHOTO ---------------- */

export async function uploadPhoto(id, file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/furniture/${id}/photo`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error("Ошибка загрузки фото");
  }

  return res.json();
}

/* ---------------- REFERENCES ---------------- */

export async function getConditions() {
  const res = await fetch(`${API_URL}/references/conditions`);
  if (!res.ok) throw new Error("Ошибка загрузки состояний");
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