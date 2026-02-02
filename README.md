# BJJEasy - Web

Sistema de gerenciamento de academias de Jiu-Jitsu. Plataforma web para administradores e portal do aluno.

## Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript
- **UI:** MUI v7, Tailwind CSS v4, Framer Motion
- **Backend:** Firebase (Firestore, Auth, Cloud Functions, Storage)
- **State:** TanStack React Query v5, React Context
- **Mobile:** Capacitor v6 (build nativo a partir do web)

## Setup

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

### Variaveis de ambiente

Criar `.env.local` com as credenciais Firebase:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_DEFAULT_ACADEMY_ID=

FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

ABACATEPAY_API_KEY=
```

## Arquitetura

### Multi-Tenant

Cada academia eh um tenant isolado no Firestore. Usuarios podem pertencer a multiplas academias com roles diferentes.

```
/users/{uid}                          # Perfil global (sem role)
/userAcademyMapping/{uid}             # Mapa de academias + role por academia (fonte primaria)
/academies/{academyId}/users/{uid}    # Usuario na academia (fallback)
/academies/{academyId}/...            # Dados isolados por academia
```

### Roles

| Role | Descricao |
|------|-----------|
| `admin` | Acesso completo - donos, professores, staff |
| `student` | Portal do aluno - dados proprios |
| `guardian` | Acompanhamento de filhos |

> A role `instructor` foi descontinuada. Todo staff usa `admin`.

### Permissoes

Fonte de verdade para role (em ordem de prioridade):

1. `userAcademyMapping/{uid}.academyDetails[academyId].role`
2. `academies/{academyId}/users/{uid}.role`

O documento root `/users/{uid}` **nao** contem role.

### Estrutura de diretorio

```
src/
  app/              # Rotas Next.js (App Router)
  components/       # React components (features/, layout/, providers/)
  contexts/         # AcademyContext (academyId, academyUser)
  hooks/            # Hooks de negocio (useFinancial, useStudents, etc.)
  lib/              # Firebase config, permissoes, helpers de API
  services/         # Servicos Firestore (financialService, studentService, etc.)
  types/            # Tipos TypeScript
  utils/            # Utilitarios

functions/          # Firebase Cloud Functions (pagamentos, webhooks, crons)
firestore.rules     # Regras de seguranca do Firestore
```

## Features

- Gerenciamento de alunos e turmas
- Controle de presenca (chamada)
- Financeiro (mensalidades, planos, pagamentos PIX/cartao)
- Graduacao e progressao de faixa
- Competicoes e inscricoes
- Loja (produtos e pedidos)
- Portal do aluno
- Notificacoes push
- 2FA (TOTP)
- Multi-academia (troca de academia)
- Monitores (alunos com permissoes extras)

## Deploy

```bash
# Web
npm run build

# Firestore Rules
firebase deploy --only firestore:rules

# Cloud Functions
cd functions && npm run build && firebase deploy --only functions

# Mobile (Capacitor)
npx cap sync
npx cap open ios    # ou android
```

## Projeto irmao

O app mobile **graduabjj** (Flutter) compartilha o mesmo banco Firestore, autenticacao e Cloud Functions.
