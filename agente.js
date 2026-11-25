import { x402Client, x402HTTPClient, wrapFetchWithPayment } from "@x402/fetch";
import { createEd25519Signer } from "@x402/stellar";
import { ExactStellarScheme } from "@x402/stellar/exact/client";

const API = "http://localhost:3001/dato";
const NETWORK = "stellar:testnet";
const TOPE = process.env.TOPE;

const signer = createEd25519Signer(process.env.AGENTE_SECRETA, NETWORK);
const client = x402Client.fromConfig({
  schemes: [{ network: "stellar:*", client: new ExactStellarScheme(signer, { url: "https://soroban-testnet.stellar.org" }) }],
  spendControls: { maxAmountPerPayment: TOPE },
});
const fetchQuePaga = wrapFetchWithPayment(fetch, client);

console.log(`🤖 Agente ${signer.address} pide ${API}`);
try {
  const res = await fetchQuePaga(API);
  const pago = new x402HTTPClient(client).getPaymentSettleResponse((h) => res.headers.get(h));
  console.log(`Respuesta ${res.status}:`, await res.json());
  console.log(`Pagó: https://stellar.expert/explorer/testnet/tx/${pago.transaction}`);
} catch (error) {
  if (error instanceof Error && error.message.includes("spendControls")) {
    console.log("⛔ Rechazado:", error.message);
    process.exitCode = 1;
  } else {
    throw error;
  }
}