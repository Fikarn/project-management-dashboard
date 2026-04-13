import http from "http";
import { URL } from "./config";

export function postLocalApi(pathname: string, body?: unknown, timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = http.request(
      `${URL}${pathname}`,
      {
        method: "POST",
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      },
      (response) => {
        response.resume();
        response.on("end", resolve);
      }
    );

    request.on("error", reject);
    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error(`Request timed out after ${timeoutMs}ms`));
    });

    if (body !== undefined) {
      request.write(JSON.stringify(body));
    }

    request.end();
  });
}
