# BJJEasy - Web (marcusjj)

Sistema de gerenciamento de academias de Jiu-Jitsu. Plataforma web (Next.js) que compartilha o mesmo banco de dados Firebase e autenticacao com o app mobile Flutter (graduabjj).

## Stack

- Next.js 16 (App Router), React 19, TypeScript
- MUI v7, Tailwind CSS v4, Framer Motion
- Firebase (Firestore, Auth, Cloud Functions, Storage)
- TanStack React Query v5
- Capacitor v6 (build mobile)

## Arquitetura Multi-Tenant

Cada academia eh um tenant isolado. Um usuario pode pertencer a multiplas academias com roles diferentes em cada uma.

### Hierarquia de dados no Firestore

```
/users/{uid}                              # Dados globais do usuario (nome, email, foto)
                                          # NAO contem role - role eh por academia

/userAcademyMapping/{uid}                 # Fonte primaria de contexto do usuario
  - academyIds: string[]                  # Academias que o usuario pertence
  - primaryAcademyId: string              # Academia padrao
  - academyDetails:                       # Mapa com detalhes por academia
      {academyId}:
        - role: 'admin' | 'student' | 'guardian'   # Role nesta academia
        - studentId?: string              # ID do aluno vinculado (se aplicavel)
        - joinedAt: timestamp
        - status: 'active' | 'inactive'

/academies/{academyId}/users/{uid}        # Documento do usuario dentro da academia (fallback)
  - role: string
  - studentId?: string

/academies/{academyId}/students/{id}      # Alunos da academia
/academies/{academyId}/financials/{id}    # Registros financeiros (mensalidades)
/academies/{academyId}/plans/{id}         # Planos de mensalidade
/academies/{academyId}/attendance/{id}    # Registros de presenca
/academies/{academyId}/classes/{id}       # Turmas
/academies/{academyId}/competitions/{id}  # Competicoes
/academies/{academyId}/wallet/{id}        # Carteira (somente Cloud Functions)
/academies/{academyId}/storeProducts/{id} # Produtos da loja
/academies/{academyId}/storeOrders/{id}   # Pedidos da loja
/academies/{academyId}/notifications/{id} # Notificacoes
/academies/{academyId}/settings/{id}      # Configuracoes
```

### Roles

O sistema usa apenas estas roles:

- **`admin`** - Acesso completo (dono da academia, professores, staff). TODOS os membros da equipe usam role `admin`.
- **`student`** - Acesso aos proprios dados via portal do aluno
- **`guardian`** - Acesso aos dados dos filhos

> **IMPORTANTE:** A role `instructor` foi descontinuada. Nao usar. Todo staff/professor deve ter role `admin`. A role `instructor` existe apenas como fallback legacy no codigo.

### Fonte de verdade para permissoes

A ordem de prioridade para leitura de role e studentId:

1. **`userAcademyMapping/{uid}.academyDetails[academyId]`** (fonte primaria)
2. **`academies/{academyId}/users/{uid}`** (fallback)
3. **`/users/{uid}`** NAO deve ser usado para role (documento global, sem contexto de academia)

Isso se aplica a:
- Firestore Security Rules (`firestore.rules`)
- API Routes (`src/lib/api/auth.ts`)
- Cloud Functions (`functions/src/index.ts`)
- Client-side (`PermissionProvider` le de `academyUser.role` via `AcademyContext`)

### Documentos financeiros

Ao criar registros em `financials`, o campo `academyId` eh **obrigatorio** no documento. A Firestore rule valida `request.resource.data.academyId == academyId`.

## Estrutura do projeto

```
src/
  app/                          # Rotas (App Router)
    portal/                     # Rotas do portal do aluno
    api/                        # API Routes (pagamentos, auth, webhooks)
    configuracoes/              # Configuracoes da academia (admin)
  components/
    features/                   # Componentes por feature (financial, students, etc.)
    layout/                     # Layout, sidebar, navbar
    providers/                  # AuthProvider, PermissionProvider, FeedbackProvider
    common/                     # Componentes reutilizaveis
  contexts/
    AcademyContext.tsx           # Contexto da academia selecionada (academyUser, academyId)
  hooks/                        # Hooks customizados (useFinancial, useStudents, etc.)
  lib/
    firebase/                   # Config Firebase client e admin
    permissions.ts              # Definicao de permissoes por role
    api/auth.ts                 # Auth helper para API routes (le role do mapping)
  services/                     # Servicos de negocio (financialService, studentService, etc.)
  types/                        # Tipos TypeScript
  utils/                        # Utilitarios

functions/                      # Firebase Cloud Functions
  src/index.ts                  # Pagamentos, webhooks, notificacoes agendadas

firestore.rules                 # Regras de seguranca do Firestore
```

## Contextos importantes

- **`AcademyContext`** - Fornece `academyId`, `academyUser` (com role), `academiesInfo` (lista de academias do usuario)
- **`PermissionProvider`** - Le role de `academyUser.role` e expoe `can()`, `canView()`, `isAdmin`, etc.
- **`AuthProvider`** - Gerencia estado de autenticacao Firebase

## Projeto irmao

O **graduabjj** (Flutter) eh o app mobile que compartilha:
- Mesmo banco Firestore
- Mesma autenticacao Firebase
- Mesmas Firestore Security Rules
- Mesmas Cloud Functions

Bugs corrigidos em um projeto devem ser verificados no outro.
