# Obrax Empresarial

Aplicação web empresarial Angular da plataforma Obrax, usando a mesma base estrutural do painel de administração, integrada ao tenant `buildora001` e preparada para deploy no Railway.

## Stack

- Angular 21
- Syncfusion
- SCSS
- API tenant Obrax em:
  - `https://web-production-1d13c.up.railway.app/api/v1/`

## Funcionalidades

- login tenant por `X-Account-Code`
- dashboard operacional da empresa
- gestão de:
  - obras
  - diários de obra
  - atividades
  - equipes
  - materiais
  - equipamentos
  - ocorrências
  - documentos
  - usuários
- relatórios operacionais e resumos de projetos
- configurações e metadados do tenant

## Desenvolvimento local

```bash
npm install
npm run start
```

## Build

```bash
npm run build
```

Saída de build:

- `dist/obrax-empresarial/browser`

## Deploy no Railway

O projeto está preparado para deploy no Railway com:

- `Dockerfile` multi-stage para build Angular
- `nginx.conf.template` com fallback SPA
- suporte ao `PORT` do Railway via `envsubst`

Fluxo recomendado:

1. subir o repositório `front_business_buildora` no GitHub
2. no Railway, criar `New Project`
3. escolher `Deploy from GitHub repo`
4. selecionar o repositório empresarial
5. após o deploy, abrir `Settings -> Networking`
6. clicar em `Generate Domain`

## Observações

- o front usa o código de conta `buildora001` como base de homologação
- a pasta `quartzo/` foi mantida localmente apenas como referência e pode ser removida depois
