export function makeRequest(url: string, options: { method?: string; body?: unknown } = {}): Request {
  const { method = "GET", body } = options;
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  return new Request(`http://localhost:3000${url}`, init);
}
