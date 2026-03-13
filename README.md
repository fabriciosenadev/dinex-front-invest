# DinEx Front Invest

Frontend do DinEx para acompanhamento de investimentos, extrato e base de apoio para imposto de renda.

## Visao Geral

Aplicacao web em Next.js com foco em:
- importacao e visualizacao de extrato;
- consolidacao de carteira;
- eventos corporativos manuais;
- base anual para imposto de renda;
- catalogo de ativos;
- visualizacao Sankey da distribuicao da carteira.

## Principais Modulos

- **Extrato**: importacao de planilhas e lancamentos no livro de extrato.
- **Carteira**: posicoes consolidadas por ativo com filtros e ordenacao.
- **Imposto de Renda**: consolidacao anual, separacao por classe e proventos.
- **Ativos**: cadastro e manutencao do catalogo de ativos.
- **Eventos**: cadastro/edicao/exclusao de eventos corporativos manuais.

## Tecnologias

- Next.js (App Router)
- TypeScript
- React

## Execucao Local

No diretorio `DinExFrontend`:

```bash
npm install
npm run dev
```

Aplicacao padrao em `http://localhost:3000`.

## API Consumida

O frontend consome os endpoints do backend DinExApi por rotas internas (`app/api/*`) e chamadas de pagina/components.
