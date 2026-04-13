export default async function fetch_(method, url, body, headers = {}) {
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  const fetchHeaders = { ...headers };
  const contentTypeKey = Object.keys(fetchHeaders).find(
    (k) => k.toLowerCase() === "content-type",
  );

  if (isFormData) {
    if (contentTypeKey) delete fetchHeaders[contentTypeKey];
  } else {
    if (!contentTypeKey) fetchHeaders["Content-Type"] = "application/json";
  }

  const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}${url}`, {
    method,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    headers: fetchHeaders,
  });

  return response.json();
}
