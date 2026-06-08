import { newBalanceDataset } from "./newbalance";
import { nestleDataset } from "./nestle";
import type { ClientDataset } from "./types";

export const datasets: Record<string, ClientDataset> = {
  "new-balance": newBalanceDataset,
  "nestle": nestleDataset,
};

export function getDataset(clientId: string): ClientDataset {
  const d = datasets[clientId];
  if (!d) throw new Error(`No dataset for clientId=${clientId}`);
  return d;
}

export const clientList = [
  { id: "nestle", label: "Nestlé" },
];
