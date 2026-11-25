import express from "express";

const app = express();

app.get("/dato", (req, res) => {
  res.json({ dato: "API de Superpagos en Stellar testnet." });
});

app.listen(3001, () => {
  console.log("API escuchando en http://localhost:3001");
});