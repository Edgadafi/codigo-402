# superpagos

compara rutas de envío de dólares a pesos m

**Track:** API de pago · Código 402 · BAF México × Programa de Embajadores de Stellar · Stellar testnet (dinero de prueba)

## Cómo correrlo

Con `.env` configurado con `MI_PUBLICA`, `MI_SECRETA`, `AGENTE_PUBLICA` y `AGENTE_SECRETA`, inicia la API:

```bash
npm run api
```

En otra terminal, `curl -i http://localhost:3001/dato` devuelve `402 Payment Required` sin pago. El agente paga hasta el límite indicado en `TOPE` y muestra la respuesta:

```bash
TOPE='$0.005' npm run agente
```

Cada integrante puede documentar su parte en `partes/<usuario>/README.md`.

## Hashes de prueba

- Pago de 0.005 USDC del agente a la API: [ver transacción en Stellar Expert](https://stellar.expert/explorer/testnet/tx/d1e3b2eeefdeffd45661ac88f6300499547dea9cec17aca2b3bb31421a71ac51).

## Equipo y partes

- [*](https://github.com/*): [su parte](partes/*/README.md)
