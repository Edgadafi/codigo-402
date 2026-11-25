import { x402Client, x402HTTPClient, wrapFetchWithPayment } from "@x402/fetch";
import { createEd25519Signer } from "@x402/stellar";
import { ExactStellarScheme } from "@x402/stellar/exact/client";

const API = "http://localhost:3001/dato";
const NETWORK = "stellar:testnet";
const tope = process.env.TOPE;

function aUnidadesUSDC(valor) {
  const coincidencia = /^\$?(\d+)(?:\.(\d{0,7}))?$/.exec(valor.trim());
  if (!coincidencia) throw new Error(`Tope inválido: ${valor}`);
  return BigInt(coincidencia[1]) * 10_000_000n + BigInt((coincidencia[2] ?? "").padEnd(7, "0"));
}

const topeEnUnidades = tope ? aUnidadesUSDC(tope) : null;

const signer = createEd25519Signer(process.env.AGENTE_SECRETA, NETWORK);
const client = x402Client.fromConfig({
  schemes: [{ network: "stellar:*", client: new ExactStellarScheme(signer, { url: "https://soroban-testnet.stellar.org" }) }],
  paymentRequirementsSelector: (_version, accepts) => {
    const opcionesAdmisibles = accepts.filter((opcion) =>
      topeEnUnidades === null || BigInt(opcion.amount) <= topeEnUnidades
    );
    if (!opcionesAdmisibles.length) throw new Error(`El pago supera el tope de ${tope}`);
    return opcionesAdmisibles[0];
  },
});
const fetchQuePaga = wrapFetchWithPayment(fetch, client);

console.log(`🤖 Agente ${signer.address} pide ${API}`);
const res = await fetchQuePaga(API);
const pago = new x402HTTPClient(client).getPaymentSettleResponse((h) => res.headers.get(h));
console.log(`Respuesta ${res.status}:`, await res.json());
console.log(`Pagó: https://stellar.expert/explorer/testnet/tx/${pago.transaction}`);