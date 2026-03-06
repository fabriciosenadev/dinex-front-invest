# DinExFrontend

Frontend Next.js minimo para testar os endpoints da `DinExApi`.

## Endpoints usados

- `POST /api/movements`
- `GET /api/movements/portfolio`

As chamadas do browser passam por rotas internas do Next:

- `POST /api/movements` -> proxy para API .NET
- `GET /api/movements/portfolio` -> proxy para API .NET

## Como rodar

1. Copie `.env.example` para `.env.local`.
2. Ajuste `DINEX_API_URL` para a URL da sua API .NET.
3. Execute:

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.
