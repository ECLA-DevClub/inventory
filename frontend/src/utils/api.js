const API_BASE = ""; // set backend base URL here

export async function fetchJSON(url, options = {}) {
  const res = await fetch(API_BASE + url, options);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export default { fetchJSON };
