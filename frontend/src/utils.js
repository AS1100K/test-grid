export default async function fetch_(method, url, body, headers = {}) {
  return fetch(`${import.meta.env.VITE_BACKEND_URL}${url}`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  }).then((data) => data.json());
}
