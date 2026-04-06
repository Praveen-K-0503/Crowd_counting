import { listDomains } from "./domain.repository.js";

export async function listDomainsService() {
  return listDomains();
}
