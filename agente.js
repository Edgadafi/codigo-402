import { x402Client, x402HTTPClient, wrapFetchWithPayment } from "@x402/fetch";
import { createEd25519Signer } from "@x402/stellar";
import { ExactStellarScheme } from "@x402/stellar/exact/client";
import { Horizon } from "@stellar/stellar-sdk";

const API = "http://localhost:3001/dato";
const NETWORK = "stellar:testnet";
const TOPE = process.env.TOPE;
const USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const MAX_INTENTOS = 3;
const horizon = new Horizon.Server("https://horizon-testnet.stellar.org");

const signer = createEd25519Signer(process.env.AGENTE_SECRETA, NETWORK);
const client = x402Client.fromConfig({
  schemes: [{ network: "stellar:*", client: new ExactStellarScheme(signer, { url: "https://soroban-testnet.stellar.org" }) }],
  spendControls: { maxAmountPerPayment: TOPE },
});
let pagoIntentado = false;

function aUnidadesUSDC(valor) {
  const coincidencia = /^\$?(\d+)(?:\.(\d{0,7}))?$/.exec(valor.trim());
  if (!coincidencia) throw new Error(`Monto USDC inválido: ${valor}`);
  return BigInt(coincidencia[1]) * 10_000_000n + BigInt((coincidencia[2] ?? "").padEnd(7, "0"));
}

async function leerSaldoUSDC() {
  const cuenta = await horizon.loadAccount(signer.address);
  const trustline = cuenta.balances.find((balance) =>
    balance.asset_code === "USDC" && balance.asset_issuer === USDC_ISSUER
  );
  const balance = trustline?.balance ?? "0";
  return { balance, unidades: aUnidadesUSDC(balance) };
}

async function fetchConReintentosSeguros(input, init) {
  const request = new Request(input, init);
  if (request.headers.has("PAYMENT-SIGNATURE") || request.headers.has("X-PAYMENT")) {
    pagoIntentado = true;
    return fetch(request);
  }

  for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
    try {
      return await fetch(request.clone());
    } catch (error) {
      if (intento === MAX_INTENTOS) throw error;
      console.warn(`⚠️ Falló la solicitud inicial (${intento}/${MAX_INTENTOS}); reintento seguro.`);
      await new Promise((resolve) => setTimeout(resolve, intento * 500));
    }
  }
}

const fetchQuePaga = wrapFetchWithPayment(fetchConReintentosSeguros, client);

console.log(`🤖 Agente ${signer.address} pide ${API}`);
try {
  const saldoInicial = await leerSaldoUSDC();
  const limite = aUnidadesUSDC(TOPE ?? "$1");
  console.log(`💰 Saldo disponible: ${saldoInicial.balance} USDC`);

  if (saldoInicial.unidades < limite) {
    console.error(`⛔ Saldo insuficiente para el tope ${TOPE ?? "$1"} USDC.`);
    process.exitCode = 1;
  } else {
    const res = await fetchQuePaga(API);
    const pago = new x402HTTPClient(client).getPaymentSettleResponse((h) => res.headers.get(h));
    console.log(`Respuesta ${res.status}:`, await res.json());
    console.log(`Pagó: https://stellar.expert/explorer/testnet/tx/${pago.transaction}`);
    try {
      const saldoFinal = await leerSaldoUSDC();
      console.log(`💰 Saldo después del pago: ${saldoFinal.balance} USDC`);
    } catch (error) {
      console.warn("⚠️ No se pudo consultar el saldo posterior al pago:", error.message);
    }
  }
} catch (error) {
  if (error instanceof Error && error.message.includes("spendControls")) {
    console.log("⛔ Rechazado:", error.message);
    process.exitCode = 1;
  } else if (pagoIntentado) {
    try {
      const saldoActual = await leerSaldoUSDC();
      console.error(`⚠️ Saldo tras el intento: ${saldoActual.balance} USDC`);
    } catch {
      console.error("⚠️ No se pudo confirmar el saldo tras el intento.");
    }
    console.error("⛔ Resultado incierto; no se reintenta para evitar un posible doble pago.", error);
    process.exitCode = 1;
  } else {
    throw error;
  }
}