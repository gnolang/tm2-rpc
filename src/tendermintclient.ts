import {
  HttpEndpoint,
} from "./rpcclients";
import {
  Tm2Client,
} from "./tm2";

/**
 * Auto-detects the version of the backend and uses a suitable client.
 */
export async function connectTm2(endpoint: string | HttpEndpoint): Promise<Tm2Client> {
  return await Tm2Client.connect(endpoint);
}
