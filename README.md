# GPT Trek Backend Minimo

Questo progetto fornisce un backend minimo e reale per le Actions del GPT Trek.

## Cosa fa

- espone gli endpoint definiti nello schema OpenAPI;
- restituisce risposte JSON coerenti con l'action;
- include due rotte demo, tra cui `Tiscali da Lanaitto`;
- genera un file GPX scaricabile dopo il build;
- permette di distinguere errori infrastrutturali da blocchi di certificazione.
- espone anche un endpoint `GET /rent_ledger` che organizza il prospetto affitti per data e calcola il debito progressivo.

## File principali

- `server.mjs`: server HTTP senza dipendenze esterne;
- `data/routes.json`: catalogo minimo delle rotte verificate;
- `data/prospetto_pagamento_affitti.json`: dataset locale del prospetto affitti (canoni dovuti + pagamenti);
- `package.json`: script di avvio.

## Avvio locale

Da terminale:

```powershell
cd "G:\Il mio Drive\codex_tmp\gpt_trek_backend"
& "C:\Program Files\WindowsApps\OpenAI.Codex_26.415.1938.0_x64__2p2nqsd0c76g0\app\resources\node.exe" server.mjs
```

Se vuoi usare una porta diversa:

```powershell
$env:PORT="8788"
& "C:\Program Files\WindowsApps\OpenAI.Codex_26.415.1938.0_x64__2p2nqsd0c76g0\app\resources\node.exe" server.mjs
```

## Test rapido

Health check:

```text
GET http://localhost:8787/health
```

Ricerca Tiscali:

```json
POST /search_verified_routes
{
  "area": "Dorgali",
  "keywords": ["tiscali", "lanaitto"]
}
```

Prospetto affitti:

```text
GET http://localhost:8787/rent_ledger
```

L'output contiene:
- timeline ordinata per data;
- delta del debito per evento;
- debito progressivo;
- totale canoni dovuti, totale pagamenti e debito residuo.

## Collegamento al GPT

Nel file OpenAPI devi sostituire:

```yaml
servers:
  - url: https://your-backend.example.com
```

con il dominio pubblico reale del backend, ad esempio:

```yaml
servers:
  - url: https://gpt-trek-backend.onrender.com
```

## Limite attuale

Questo backend e' volutamente minimo:
- non interroga provider esterni;
- non fa analisi GPX avanzata;
- usa un catalogo JSON locale;
- serve per sbloccare l'infrastruttura e testare le Actions.

Il passo successivo naturale e' pubblicarlo su un hosting semplice come Render o Railway e poi sostituire il catalogo demo con dataset reali.
