/* eslint-disable @typescript-eslint/no-explicit-any */
import fetch from "cross-fetch";

/**
 * Filters HTTP responses and throws an error for bad status codes.
 *
 * @param res - The HTTP response object
 * @returns The response object if status is good (< 400)
 * @throws Error if status code is 400 or higher
 */
function filterBadStatus(res: any): any {
  if (res.status >= 400) {
    throw new Error(`Bad status on response: ${res.status}`);
  }
  return res;
}

/**
 * Helper to work around missing CORS support in Tendermint (https://github.com/tendermint/tendermint/pull/2800)
 *
 * For some reason, fetch does not complain about missing server-side CORS support.
 */

export async function http(
  method: "POST",
  url: string,
  headers: Record<string, string> | undefined,
  request?: any,
): Promise<any> {
  const settings = {
    method: method,
    body: request ? JSON.stringify(request) : undefined,
    headers: {

      "Content-Type": "application/json",
      ...headers,
    },
  };
  return fetch(url, settings)
    .then(filterBadStatus)
    .then((res: any) => res.json());
}
