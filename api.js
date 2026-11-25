import express from "express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactStellarScheme } from "@x402/stellar/exact/server";

const app = express();
const NETWORK = "stellar:testnet";
const receptor = process.env.MI_PUBLICA;

if (!receptor) {
  throw new Error("Falta MI_PUBLICA en .env");
}

const facilitador = new HTTPFacilitatorClient({ url: "https://x402.org/facilitator" });
const servidorPagos = new x402ResourceServer(facilitador)
  .register(NETWORK, new ExactStellarScheme());

app.use(paymentMiddleware({
  "GET /dato": {
    accepts: [{ scheme: "exact", price: "$0.005", network: NETWORK, payTo: receptor }],
    description: "Acceso al dato de Superpagos",
  },
}, servidorPagos));

app.get("/dato", (req, res) => {
  res.json({ dato: "API de Superpagos en Stellar testnet." });
});

app.listen(3001, () => {
  console.log("API escuchando en http://localhost:3001");
});