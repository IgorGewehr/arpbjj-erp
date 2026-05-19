# Complete Setup — Levantamento para Migração Firebase → Backend Dedicado

> Documento técnico completo para substituição do Firestore/Firebase Storage por backend dedicado.
> Gerado em: 2026-05-17

---

## Sumário

1. [Visão Geral da Arquitetura Atual](#1-visão-geral-da-arquitetura-atual)
2. [Inventário de Telas (Rotas)](#2-inventário-de-telas-rotas)
3. [Inventário de Coleções Firestore](#3-inventário-de-coleções-firestore)
4. [Hooks — Dependências Firebase Detalhadas](#4-hooks--dependências-firebase-detalhadas)
5. [Serviços — Dependências Firebase Detalhadas](#5-serviços--dependências-firebase-detalhadas)
6. [Contextos e Providers](#6-contextos-e-providers)
7. [API Routes (Next.js)](#7-api-routes-nextjs)
8. [Cloud Functions](#8-cloud-functions)
9. [Firebase Storage](#9-firebase-storage)
10. [Firebase Auth](#10-firebase-auth)
11. [Processamento Frontend que Deve Migrar para Backend](#11-processamento-frontend-que-deve-migrar-para-backend)
12. [Integrações Externas](#12-integrações-externas)
13. [Firestore Security Rules — Mapeamento para Middleware](#13-firestore-security-rules--mapeamento-para-middleware)
14. [Problemas Críticos de Performance (Frontend Atual)](#14-problemas-críticos-de-performance-frontend-atual)
15. [Checklist de Migração por Domínio](#15-checklist-de-migração-por-domínio)

---

## 1. Visão Geral da Arquitetura Atual

```
┌─────────────────────────────────────────────────────────────────────┐
│  Next.js 15 (App Router) — Frontend + API Routes                     │
│                                                                       │
│  Camadas:                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────────┐ │
│  │   Páginas    │ → │    Hooks     │ → │        Serviços          │ │
│  │ (src/app/)   │   │ (src/hooks/) │   │     (src/services/)      │ │
│  └──────────────┘   └──────────────┘   └──────────┬───────────────┘ │
│                                                    │                  │
│  Contextos: AcademyContext, AuthProvider,          │                  │
│             PermissionProvider, NotificationContext│                  │
└────────────────────────────────────────────────────┼─────────────────┘
                                                     │
                              ┌──────────────────────▼──────────────────┐
                              │        Firebase Platform                  │
                              │                                           │
                              │  ┌────────────┐  ┌─────────────────────┐ │
                              │  │ Firestore  │  │   Cloud Functions    │ │
                              │  │  ~25 coles │  │   (functions/src/)   │ │
                              │  └────────────┘  └─────────────────────┘ │
                              │  ┌────────────┐  ┌─────────────────────┐ │
                              │  │  Storage   │  │        Auth          │ │
                              │  │  (fotos)   │  │  (JWT via Firebase)  │ │
                              │  └────────────┘  └─────────────────────┘ │
                              └───────────────────────────────────────────┘
```

**Modelo Multi-Tenant:** cada academia é um tenant isolado. Estrutura:
- Raiz: `users/{uid}` e `userAcademyMapping/{uid}`
- Por academia: `academies/{academyId}/<subcoleção>/{docId}`

---

## 2. Inventário de Telas (Rotas)

### 2.1 Área Admin (sem prefixo `/portal`)

| Rota | Arquivo | Dados Necessários | Hooks Usados |
|------|---------|-------------------|--------------|
| `/dashboard` | `src/app/dashboard/page.tsx` | stats alunos, financeiros hoje, presença hoje | `useStudents`, `useFinancial`, `useAttendance`, `useClasses` |
| `/alunos` | `src/app/alunos/page.tsx` | lista paginada de alunos com filtros | `useStudents` (infinite scroll) |
| `/alunos/novo` | `src/app/alunos/novo/page.tsx` | CRUD aluno | `useStudents`, `usePlans`, `useClasses` |
| `/alunos/[id]` | `src/app/alunos/[id]/page.tsx` | aluno + histórico presença + financeiros + graduações | `useStudent`, `useFinancial`, `useAttendance`, `useBeltProgression` |
| `/alunos/[id]/editar` | `src/app/alunos/[id]/editar/page.tsx` | editar aluno | `useStudent`, `usePlans` |
| `/turmas` | `src/app/turmas/page.tsx` | lista de turmas | `useClasses` |
| `/chamada` | `src/app/chamada/page.tsx` | turmas + alunos + presenças do dia | `useClasses`, `useStudents`, `useAttendance` |
| `/chamada/qr` | `src/app/chamada/qr/page.tsx` | QR code para check-in | `useClasses` |
| `/graduacao` | `src/app/graduacao/page.tsx` | alunos elegíveis + histórico de graduações | `useStudents`, `useBeltProgression`, `useAcademySettings` |
| `/financeiro` | `src/app/financeiro/page.tsx` | financeiros filtrados + resumo mensal + stats | `useFinancial` |
| `/cobranca` | `src/app/cobranca/page.tsx` | inadimplentes + stages de cobrança + log de contato | `useBillingReminders` |
| `/relatorios` | `src/app/relatorios/page.tsx` | relatório histórico 6 meses + projeção | `useFinancialReport` |
| `/relatorios/financeiro` | `src/app/relatorios/financeiro/page.tsx` | relatório detalhado + CSV export | `useFinancialReport` |
| `/retencao` | `src/app/retencao/page.tsx` | at-risk students + métricas de retenção | `useRetention` |
| `/competicoes` | `src/app/competicoes/page.tsx` | lista competições | `useCompetitions` (direto) |
| `/competicoes/nova` | `src/app/competicoes/nova/page.tsx` | criar competição | `useCompetitions` |
| `/competicoes/[id]` | `src/app/competicoes/[id]/page.tsx` | detalhes + inscrições + resultados + fotos | `useCompetitions`, `useCompetitionPhotos` |
| `/eventos` | `src/app/eventos/page.tsx` | lista eventos | `useEvents` |
| `/eventos/novo` | `src/app/eventos/novo/page.tsx` | criar evento | `useEvents` |
| `/eventos/[id]/editar` | `src/app/eventos/[id]/editar/page.tsx` | editar evento | `useEvents` |
| `/noticias` | `src/app/noticias/page.tsx` | lista notícias | `useNews` |
| `/noticias/novo` | `src/app/noticias/novo/page.tsx` | criar notícia | `useNews` |
| `/noticias/[id]/editar` | `src/app/noticias/[id]/editar/page.tsx` | editar notícia | `useNews` |
| `/loja` | `src/app/loja/page.tsx` | produtos + pedidos | `useStore` |
| `/loja/produto/novo` | `src/app/loja/produto/novo/page.tsx` | criar produto | `useStore` |
| `/loja/produto/[id]` | `src/app/loja/produto/[id]/page.tsx` | editar produto | `useStore` |
| `/loja/pedidos` | `src/app/loja/pedidos/page.tsx` | pedidos (admin) | `useStore` |
| `/codigo-equipe` | `src/app/codigo-equipe/page.tsx` | link codes | `linkCodeService` direto |
| `/configuracoes` | `src/app/configuracoes/page.tsx` | settings da academia | `useAcademySettings` |
| `/carteira` | `src/app/carteira/page.tsx` | wallet + transações | serviços de pagamento |
| `/perfil/[studentId]` | `src/app/perfil/[studentId]/page.tsx` | perfil público aluno | `studentService` direto |
| `/responsavel` | `src/app/responsavel/page.tsx` | portal do responsável | `useStudents`, `useFinancial`, `useAttendance` |

### 2.2 Portal do Aluno (`/portal`)

| Rota | Arquivo | Dados Necessários |
|------|---------|-------------------|
| `/portal` | `src/app/portal/page.tsx` | dashboard: presença, financeiro, competições, horários |
| `/portal/meu-perfil` | `src/app/portal/meu-perfil/page.tsx` | dados do próprio aluno (editar) |
| `/portal/presenca` | `src/app/portal/presenca/page.tsx` | histórico de presenças do aluno |
| `/portal/financeiro` | `src/app/portal/financeiro/page.tsx` | financeiros do próprio aluno + PIX |
| `/portal/chamada` | `src/app/portal/chamada/page.tsx` | self check-in (QR code) |
| `/portal/horarios` | `src/app/portal/horarios/page.tsx` | grade de horários das turmas |
| `/portal/competicoes` | `src/app/portal/competicoes/page.tsx` | competições disponíveis + inscrições |
| `/portal/competicoes/[id]` | `src/app/portal/competicoes/[id]/page.tsx` | detalhes da competição |
| `/portal/comportamento` | `src/app/portal/comportamento/page.tsx` | histórico de comportamento/avaliações |
| `/portal/linha-do-tempo` | `src/app/portal/linha-do-tempo/page.tsx` | timeline de eventos do aluno |
| `/portal/loja` | `src/app/portal/loja/page.tsx` | loja (produtos) |
| `/portal/loja/carrinho` | `src/app/portal/loja/carrinho/page.tsx` | carrinho de compras (estado local) |
| `/portal/loja/pedidos` | `src/app/portal/loja/pedidos/page.tsx` | histórico de pedidos do aluno |
| `/portal/alunos` | `src/app/portal/alunos/page.tsx` | contas vinculadas (dependentes) |
| `/portal/academias` | `src/app/portal/academias/page.tsx` | multi-academia switcher |
| `/portal/academias/adicionar` | `src/app/portal/academias/adicionar/page.tsx` | adicionar outra academia via link code |

### 2.3 Rotas Públicas/Auth

| Rota | Propósito |
|------|-----------|
| `/` | Redirect para dashboard ou login |
| `/login` | Firebase Auth login |
| `/criar-conta` | Firebase Auth registro |
| `/criar-academia` | Setup inicial de academia |
| `/privacy` | Página estática |
| `/termsofservice` | Página estática |

---

## 3. Inventário de Coleções Firestore

### 3.1 Coleções Raiz

| Coleção | Documento | Campos Principais | Quem Acessa |
|---------|-----------|-------------------|-------------|
| `users/{uid}` | dados globais do usuário | `displayName`, `email`, `photoUrl`, `fcmTokens` (subcoleção) | Auth + AcademyContext |
| `users/{uid}/fcmTokens/{token}` | tokens FCM | `token`, `createdAt` | useFCM, Cloud Functions |
| `userAcademyMapping/{uid}` | mapeamento usuário-academias | `academyIds[]`, `primaryAcademyId`, `academyDetails.{academyId}.{role,studentId,status}` | AcademyContext, API /team/promote |

### 3.2 Coleções por Academia (`academies/{academyId}/...`)

| Subcoleção | Volume Típico | Campos Principais | Operações Principais |
|------------|---------------|-------------------|---------------------|
| `academies/{aid}` | 1 doc | `name`, `slug`, `logoUrl`, `pixKey`, `abacatePayEnabled`, `asaasEnabled`, `autoGraduationEnabled`, `storeEnabled`, `monitorIds[]`, `subscription` | getDoc + onSnapshot (realtime) |
| `academies/{aid}/users/{uid}` | ~N admins | `role`, `studentId`, `email`, `displayName` | getDoc (AcademyContext fallback) |
| `academies/{aid}/students/{id}` | ~100-1000 | `fullName`, `currentBelt`, `currentStripes`, `status`, `category`, `attendanceCount`, `planId`, `tuitionValue`, `tuitionDay`, `linkedUserId`, `beltHistory[]`, `sportData{}` | getDocs, getDoc, addDoc, updateDoc (soft delete) |
| `academies/{aid}/classes/{id}` | ~10-50 | `name`, `schedule`, `category`, `isActive`, `weight` | getDocs, getDoc, addDoc, updateDoc, deleteDoc |
| `academies/{aid}/attendance/{id}` | ~1k-50k/ano | `studentId`, `studentName`, `classId`, `className`, `date`, `verifiedBy`, `weight` | getDocs (full scan!), addDoc, deleteDoc, writeBatch |
| `academies/{aid}/financials/{id}` | ~500-10k/ano | `studentId`, `amount`, `dueDate`, `status`, `type`, `referenceMonth`, `planId`, `method`, `paymentDate`, `academyId` | getDocs (full scan!), addDoc, updateDoc, writeBatch |
| `academies/{aid}/plans/{id}` | ~5-20 | `name`, `monthlyValue`, `defaultDueDay`, `studentIds[]`, `customValues{}`, `customDueDays{}` | getDocs, addDoc, updateDoc, deleteDoc |
| `academies/{aid}/competitions/{id}` | ~10-100 | `name`, `date`, `status`, `enrolledStudentIds[]` | getDocs, getDoc, addDoc, updateDoc, deleteDoc |
| `academies/{aid}/competitionEnrollments/{id}` | por competição | `studentId`, `competitionId`, `ageCategory`, `weightCategory`, `transportPreference` | getDocs, addDoc, updateDoc, deleteDoc |
| `academies/{aid}/competitionResults/{id}` | por competição | `studentId`, `position`, `beltCategory`, `modality` | getDocs, addDoc, updateDoc |
| `academies/{aid}/competitionPhotos/{id}` | por competição | `studentId`, `photoUrl`, `isPublished` | getDocs, addDoc, updateDoc, deleteDoc |
| `academies/{aid}/achievements/{id}` | por aluno | `studentId`, `type`, `milestone`, `date` | getDocs, addDoc |
| `academies/{aid}/beltProgressions/{id}` | histórico | `studentId`, `fromBelt`, `toBelt`, `promotedBy`, `date` | getDocs, addDoc |
| `academies/{aid}/assessments/{id}` | avaliações kids | `studentId`, `scores{}`, `date` | getDocs, getDoc, addDoc, updateDoc |
| `academies/{aid}/news/{id}` | ~10-100 | `title`, `content`, `isPublished`, `imageUrl` | getDocs, addDoc, updateDoc, deleteDoc |
| `academies/{aid}/events/{id}` | ~10-100 | `title`, `date`, `isPublished`, `description` | getDocs, addDoc, updateDoc, deleteDoc |
| `academies/{aid}/notifications/{id}` | caixa de entrada | `userId`, `title`, `body`, `type`, `read`, `data{}` | onSnapshot (realtime), addDoc, updateDoc, deleteDoc |
| `academies/{aid}/settings/{settingId}` | configurações | `autoGraduationThreshold`, `billingNotification{}` | getDoc, setDoc, updateDoc |
| `academies/{aid}/storeProducts/{id}` | ~10-200 | `name`, `price`, `imageUrl`, `stock`, `isActive` | getDocs, addDoc, updateDoc, deleteDoc |
| `academies/{aid}/storeOrders/{id}` | por pedido | `studentId`, `items[]`, `total`, `status`, `paymentId` | getDocs, addDoc, updateDoc |
| `academies/{aid}/wallet/{id}` | saldo da academia | `balance`, `asaasBalance` | getDoc (read-only client) |
| `academies/{aid}/walletTransactions/{id}` | histórico financeiro | `type`, `amount`, `description`, `externalId` | addDoc (via API routes) |
| `academies/{aid}/linkCodes/{id}` | códigos de convite | `code`, `used`, `role`, `expiresAt` | getDocs, addDoc, updateDoc |
| `academies/{aid}/instructorLinkCodes/{id}` | convites admin | `code`, `used`, `createdBy` | getDocs, addDoc, updateDoc |
| `academies/{aid}/billingContactLog/{id}` | log de cobranças | `financialId`, `contactType`, `sentAt`, `studentId` | getDocs, addDoc |

---

## 4. Hooks — Dependências Firebase Detalhadas

### 4.1 `useStudents` (`src/hooks/useStudents.ts`)

**Coleção:** `academies/{aid}/students`

**Operações Firestore:**
- `getDocs` com `where('status')`, `where('category')`, `where('currentBelt')` — sem orderBy (evita índice composto)
- Sorting por `attendanceCount + initialAttendanceCount` **feito em memória no cliente** após fetch completo
- `getDocs` sem limite para paginação manual em cursor no cliente
- `searchByName`: fetch **todos** os alunos filtrados + `includes()` em memória (sem suporte a LIKE no Firestore)
- `getDoc` por ID individual
- `addDoc` ao criar
- `updateDoc` (soft delete → `status: 'inactive'`)
- `deleteDoc` (hard delete, raramente usado)
- `writeBatch` (500 docs por batch) em `syncAttendanceCounts`

**Processamento Frontend Pesado:**
- Sorting por frequência: carrega N alunos, ordena em memória, depois fatia página
- Busca textual: carrega todos os alunos filtrados, faz `.toLowerCase().includes(term)`
- Cálculo de stats (`byStatus`, `byCategory`, `byBelt`) em `useMemo` sobre array completo
- `useInfiniteQuery` com cursor manual (não usa `startAfter` do Firestore — usa `findIndex` no array em memória)

**React Query Keys:** `['students', academyId, filters]`, `['activeStudents', academyId]`, `['allStudents', academyId]`, `['student', studentId, academyId]`

---

### 4.2 `useFinancial` (`src/hooks/useFinancial.ts`)

**Coleção:** `academies/{aid}/financials`

**Operações Firestore:**
- `getDocs` (full collection scan!) + filtragem por `studentId`, `status`, `type`, `referenceMonth` em memória
- `getDocs` (full scan) para `getPending()` — filtra `status === 'pending'` em memória
- `getDocs` (full scan) para `getOverdue()` — filtra `status === 'overdue'` em memória
- `getDocs` (full scan) para `getPaidThisMonth()` — filtra `status === 'paid' && paymentDate in range` em memória
- `getDocs` com `where('dueDate', '>=')` e `where('dueDate', '<=')` para `getRevenueStats` (único índice usado)
- `addDoc` ao criar registro
- `updateDoc` ao marcar como pago/cancelar/reativar
- `writeBatch` em `markOverduePayments` (atualiza todos os overdue de uma vez)

**Processamento Frontend Pesado:**
- `getMonthlySummary`: fetch todos do mês + somatório em memória
- `getRevenueStats`: agrupa por mês, soma `paid` vs `expected`, calcula collection rate — tudo em memória
- `generateMonthlyTuitions`: loop serial de alunos, para cada um faz `list({studentId, month, type})` para checar duplicata — N queries sequenciais!
- Stats globais em `useMemo`: soma `pendingPayments.reduce()` e `overduePayments.reduce()`
- Notificação ao aluno após `markAsPaid` — chamada extra ao `studentService.getById()` + `notificationService`

**React Query Keys:** `['financials', academyId, filters]`, `['pendingPayments', academyId]`, `['overduePayments', academyId]`, `['monthlySummary', month, academyId]`, `['revenueStats', academyId]`

---

### 4.3 `useAttendance` (`src/hooks/useAttendance.ts`)

**Coleções:** `academies/{aid}/attendance`, `academies/{aid}/classes`, `academies/{aid}/students`

**Operações Firestore:**
- `getDocs` com `where('classId', '==')` — depois filtra por data em memória
- `getDocs` (full scan!) em `getByDateRange` — filtra data range em memória
- `getDocs` com `where('studentId', '==')` em `isStudentPresent` — filtra classId + date em memória
- `addDoc` ao marcar presença
- `deleteDoc` / `writeBatch` ao desmarcar
- `updateDoc` com `increment(1)` no `students/{id}.attendanceCount` (side-effect de markPresent)
- `updateDoc` com `increment(-N)` no `students/{id}.attendanceCount` (side-effect de unmarkPresent)

**Processamento Frontend Pesado:**
- `bulkMarkPresent`: loop serial — para cada aluno chama `isStudentPresent` (query) e depois `markPresent` (write) — N*2 operações sequenciais
- Agrupamento de attendance por data/classe em memória no componente
- Detecção de "aula atual" (`getCurrentClass`) comparando horários em memória

---

### 4.4 `useRetention` (`src/hooks/useRetention.ts`)

**Coleções:** `academies/{aid}/students`, `academies/{aid}/attendance`, `academies/{aid}/financials`

**Operações Firestore:**
- Query 1: `getActive()` → fetch todos com `where('status', '==', 'active')`
- Query 2: `getByDateRange(30d)` → full scan de attendance + filtragem de data em memória
- Query 3: `list({ status: 'overdue' })` → full scan de financials + filtra `status === 'overdue'` em memória

**Processamento Frontend Pesado (todo o algoritmo de risco está no cliente):**
- `attendanceMap`: `Map<studentId, Attendance[]>` construído em memória
- `financialsMap`: `Map<studentId, Financial[]>` construído em memória
- `retentionService.calculateStudentRisk()` executado para **cada aluno ativo**:
  - Fator 1 (40pts): conta presenças últimos 15 dias vs 15 dias anteriores
  - Fator 2 (30pts): `differenceInDays` desde última presença
  - Fator 3 (20pts): conta pagamentos overdue por aluno
  - Fator 4 (10pts): `differenceInMonths` desde entrada na academia
- Score 0-100, classificação em 4 níveis (low/medium/high/critical)
- Métricas agregadas: `distributionByRisk`, `distributionByBelt`, `distributionByCategory`
- Average frequency: loop sobre todos os active students + filter attendance por aluno

---

### 4.5 `useFinancialReport` (`src/hooks/useFinancialReport.ts`)

**Coleções:** `academies/{aid}/financials`, `academies/{aid}/plans`

**Operações Firestore:**
- `getDocs` (full scan financials) + `getDocs` (full scan plans) — executados em paralelo
- Agrupamento em `Map<month, Financial[]>` em memória

**Processamento Frontend Pesado:**
- Relatório histórico 6 meses: calcula `confirmedRevenue`, `pendingRevenue`, `overdueRevenue`, `collectionRate`, `growthMoM` para cada mês
- Projeção de receita: regressão linear + média móvel calculada em JS
- Revenue by plan: agrupa financials por `planId`, mapeia para nome do plano
- Geração de CSV: `exportCSV()` — string CSV montada no cliente via `Array.join()`
- Recomendações: lógica de negócio (`if collectionRate < 70`, `if growthMoM < -10`) computada no frontend

---

### 4.6 `useBillingReminders` (`src/hooks/useBillingReminders.ts`)

**Coleções:** `academies/{aid}/financials`, `academies/{aid}/billingContactLog`, `academies/{aid}/settings`

**Operações Firestore:**
- Full scan de financials + filtragem `status in ['overdue', 'pending']` em memória
- `getDocs` de billingContactLog para verificar histórico de contato por `financialId`
- `getDoc` de settings para templates de mensagem
- `addDoc` em billingContactLog ao registrar contato

**Processamento Frontend Pesado:**
- Classificação em billing stages (D+0, D+1, D+3, D+7, D+15, D+30) calculada em memória
- Join manual: financials → students (por studentId) para obter telefone/email
- Template de mensagem processado no cliente (substituição de variáveis)
- Estatísticas: `getCollectionStats()` — soma por stage, taxa de contato

---

### 4.7 `useBeltProgression` (`src/hooks/useBeltProgression.ts`)

**Coleções:** `academies/{aid}/beltProgressions`, `academies/{aid}/students`, `academies/{aid}/settings`

**Operações Firestore:**
- `getDocs` de students com `status === 'active'`
- `getDocs` de settings para `autoGraduationAttendances`
- `getDocs` de beltProgressions por `studentId`
- `addDoc` ao criar progressão
- `updateDoc` no student (atualiza `currentBelt`, `currentStripes`, `beltHistory`)

**Processamento Frontend Pesado:**
- Elegibilidade: para cada aluno, compara `attendanceCount + initialAttendanceCount` com threshold — feito em memória
- Lógica de "próximo cinto": tabela de progressão de belts em memória no frontend

---

### 4.8 `useCheckin` (`src/hooks/useCheckin.ts`)

**Coleções:** `academies/{aid}/attendance`, `academies/{aid}/students`, `academies/{aid}/classes`

**Operações Firestore:**
- `getDoc` da turma para validar check-in
- `getDocs` de students com `where('linkedUserId', '==', uid)`
- `addDoc` em attendance ao fazer check-in

---

### 4.9 `useStore` (`src/hooks/useStore.ts`)

**Coleções:** `academies/{aid}/storeProducts`, `academies/{aid}/storeOrders`

**Operações Firestore:**
- `getDocs` de produtos com `where('isActive', '==', true)` (query Firestore)
- `getDocs` de pedidos (admin: todos; student: filtro por `studentId`)
- `addDoc` ao criar pedido
- `updateDoc` ao atualizar status do pedido ou produto
- `deleteDoc` ao remover produto

**Lógica Frontend:**
- Carrinho de compras: estado local React (não persiste no Firestore até finalizar pedido)
- Cálculo de total do carrinho em memória

---

### 4.10 `useCompetitionPhotos` (`src/hooks/useCompetitionPhotos.ts`)

**Coleções:** `academies/{aid}/competitionPhotos`
**Firebase Storage:** `competitionPhotos/{academyId}/{competitionId}/{filename}`

**Operações:**
- `getDocs` de fotos por `competitionId`
- `addDoc` ao criar registro de foto
- `updateDoc` ao publicar/ocultar foto
- `deleteDoc` ao remover foto
- `uploadBytes` para Storage
- `getDownloadURL` para obter URL pública

---

### 4.11 `useProfilePhotoUpload` (`src/hooks/useProfilePhotoUpload.ts`)

**Firebase Storage:** `profilePhotos/{academyId}/{studentId}`
**Coleção:** `academies/{aid}/students/{id}`

**Operações:**
- `uploadBytes` — upload da foto para Storage
- `getDownloadURL` — obter URL da foto
- `updateDoc` — atualizar `photoUrl` no documento do aluno

---

### 4.12 `useFCM` (`src/hooks/useFCM.ts`)

**Coleção:** `users/{uid}/fcmTokens`

**Operações:**
- `setDoc` ao registrar token FCM do dispositivo
- `deleteDoc` ao desregistrar (logout)

---

### 4.13 `useClasses` (`src/hooks/useClasses.ts`)

**Coleção:** `academies/{aid}/classes`

**Operações:** `getDocs`, `getDoc`, `addDoc`, `updateDoc`, `deleteDoc`
**Processamento:** filtragem por `isActive` em memória

---

### 4.14 `useNews` / `useEvents` (`src/hooks/useNews.ts`, `useEvents.ts`)

**Coleções:** `academies/{aid}/news`, `academies/{aid}/events`

**Operações:** `getDocs` com `where('isPublished', '==', true)`, `addDoc`, `updateDoc`, `deleteDoc`

---

### 4.15 `useAcademySettings` (`src/hooks/useAcademySettings.ts`)

**Coleção:** `academies/{aid}/settings`

**Operações:** `getDoc`, `updateDoc`

---

### 4.16 `useAssessment` (`src/hooks/useAssessment.ts`)

**Coleção:** `academies/{aid}/assessments`

**Operações:** `getDocs`, `getDoc`, `addDoc`, `updateDoc`

---

### 4.17 `useIsMonitor` (`src/hooks/useIsMonitor.ts`)

**Coleção:** `academies/{aid}` (campo `monitorIds`)

**Operações:** leitura de `academy.monitorIds` via `AcademyContext` (já carregado)

---

### 4.18 `usePlans` (`src/hooks/usePlans.ts`)

**Coleções:** `academies/{aid}/plans`, `academies/{aid}/students`, `academies/{aid}/classes`

**Operações:**
- `getDocs`, `getDoc`, `addDoc`, `updateDoc`, `deleteDoc` em plans
- `updateDoc` em students ao enrolar/desenrolar aluno no plano
- Sync de `tuitionValue` e `tuitionDay` nos docs de student ao alterar plano

---

## 5. Serviços — Dependências Firebase Detalhadas

### 5.1 `financialService.ts`

**Problemas críticos identificados no código:**

```typescript
// PROBLEMA: Full collection scan toda vez
async list(filters = {}): Promise<Financial[]> {
  const snapshot = await getDocs(this.financialsRef); // SEM FILTRO
  let results = snapshot.docs.map(docToFinancial);
  // Filtragem em memória — 10k docs baixados para mostrar 50
  if (filters.status) results = results.filter(f => f.status === filters.status);
  if (filters.month) results = results.filter(f => f.referenceMonth === filters.month);
  return results.sort(...); // Sort em memória
}

// PROBLEMA: N queries sequenciais na geração de mensalidades
async generateMonthlyTuitions(students, month, createdBy) {
  for (const student of students) {
    const existing = await this.list({ studentId: student.id, month }); // Query por aluno!
    if (!existing.some(...)) await this.create(...);
  }
}

// PROBLEMA: Full scan para encontrar overdue
async getPending(): Promise<Financial[]> {
  const snapshot = await getDocs(this.financialsRef); // TODOS os docs
  return snapshot.docs.map(docToFinancial).filter(f => f.status === 'pending');
}
```

**Métodos e suas operações:**

| Método | Operação Firestore | Problema |
|--------|-------------------|---------|
| `list(filters)` | `getDocs` full scan | Filtra 100% em memória |
| `getById(id)` | `getDoc` | OK |
| `getByStudent(studentId)` | `getDocs where('studentId')` + sort memória | Moderado |
| `getPending()` | `getDocs` full scan | Full scan desnecessário |
| `getOverdue()` | `getDocs` full scan | Full scan desnecessário |
| `getPaidThisMonth()` | `getDocs` full scan | Full scan desnecessário |
| `getMonthlySummary(month)` | Chama `list({month})` → full scan | Full scan |
| `create(data, createdBy)` | `addDoc` | OK |
| `generateMonthlyTuitions()` | N chamadas a `list()` sequenciais | N * full scan! |
| `markAsPaid(id, method)` | `updateDoc` + `getDoc` | OK |
| `markOverduePayments()` | `getDocs` full scan + `writeBatch` | Full scan |
| `cancel(id)` | `updateDoc` + `getDoc` | OK |
| `reactivate(id)` | `getDoc` + `updateDoc` + `getDoc` | OK |
| `update(id, data)` | `updateDoc` + `getDoc` | OK |
| `delete(id)` | `deleteDoc` | OK |
| `getRevenueStats(start, end)` | `getDocs where(dueDate range)` | Único uso de índice |

---

### 5.2 `studentService.ts`

**Métodos e operações:**

| Método | Operação Firestore | Problema |
|--------|-------------------|---------|
| `listAll(filters, pageSize, cursor)` | `getDocs where(filters)` SEM LIMIT | Carrega TODOS, ordena e fatia em memória |
| `searchByName(term, filters)` | `getDocs where(filters)` + `.includes()` | Full scan + busca textual em memória |
| `list(filters, page, perPage)` | `getDocs where() limit()` + `getDocs where()` count | 2 queries por página |
| `getById(id)` | `getDoc` | OK |
| `getByStatus(status)` | `getDocs where('status')` | OK |
| `getActive()` | `getByStatus('active')` | OK |
| `getByLinkedUserId(userId)` | `getDocs where() limit(1)` | OK |
| `getAll()` | `getDocs` full scan | Usado em relatórios |
| `search(term)` | `getDocs where('fullName', '>=', term)` | Busca prefix-only (Firestore limitation) |
| `create(student, createdBy)` | `addDoc` + `getDoc` | Leitura extra após create |
| `update(id, data)` | `updateDoc` + `getDoc` | Leitura extra após update |
| `delete(id)` | `updateDoc` (soft delete) | OK |
| `hardDelete(id)` | `deleteDoc` | OK |
| `getDashboardStats()` | `getDocs` full scan | Conta stats em memória |
| `getCountByStatus()` | 4x `getDocs where('status')` | 4 queries separadas |
| `updateBelt(id, belt, stripes)` | `updateDoc` + `getDoc` | OK |
| `updateSportGrade(id, ...)` | `getDoc` + `updateDoc` + `getDoc` | 3 operações por graduação |
| `syncAttendanceCounts()` | `getDocs students` + `getDocs attendance` + `writeBatch` | Operação de manutenção |

---

### 5.3 `attendanceService.ts`

**Problemas críticos:**

```typescript
// PROBLEMA: Full scan de attendance (pode ter 50k docs!)
async getByDateRange(startDate, endDate): Promise<Attendance[]> {
  const snapshot = await getDocs(this.attendanceRef); // TODOS os docs!
  let results = snapshot.docs.map(docToAttendance);
  results = results.filter(a => a.date >= start && a.date <= end); // Filtra em memória
}

// PROBLEMA: bulkMarkPresent é O(N) queries sequenciais
async bulkMarkPresent(students, classId, ...) {
  for (const student of students) {
    await this.isStudentPresent(student.id, classId, date); // Query por aluno
    await this.markPresent(student.id, ...); // Write + side-effect query
  }
}

// PROBLEMA: checkAttendanceMilestone faz query extra por aluno toda vez
async markPresent(...) {
  await addDoc(...);
  this.checkAttendanceMilestone(studentId, studentName, createdBy); // Query adicional async
}
```

| Método | Operação | Problema |
|--------|---------|---------|
| `getByDateAndClass(date, classId)` | `getDocs where('classId')` + filtra data memória | Carrega todos da turma |
| `getByStudent(studentId, limit)` | `getDocs where('studentId')` + sort + slice memória | OK moderado |
| `getByDateRange(start, end)` | `getDocs` **full scan** | Crítico — 50k docs |
| `isStudentPresent(...)` | `getDocs where('studentId')` + filtra memória | 1 query por aluno |
| `getPresentStudentIds(classId, date)` | Chama `getByDateAndClass` | Moderado |
| `markPresent(...)` | `addDoc` + `updateDoc(increment)` + `checkMilestone` | Side-effect queries |
| `unmarkPresent(...)` | `getDocs where('studentId')` + `writeBatch delete` + `updateDoc(decrement)` | Busca em memória |
| `bulkMarkPresent(students, ...)` | N * (isPresent + markPresent) sequenciais | **Crítico — N*3 queries** |
| `getMonthlyStats(month)` | Chama `getByDateRange` → full scan | Full scan |
| `getTodayTotal()` | `getDocs where(date range)` | OK (único índice usado) |

---

### 5.4 `billingReminderService.ts`

**Operações:** Full scan de financials + full scan de billingContactLog + join manual em memória

**Fluxo completo:**
1. `getDocs` de financials (todos overdue/pending)
2. `getDocs` de billingContactLog (histórico de contatos)
3. `getDoc` de settings (templates)
4. Join em memória: financials ↔ contactLog (por `financialId`)
5. Classificação em stages (D+0 a D+30) calculada em memória
6. Template de mensagem substituído no cliente

---

### 5.5 `financialReportService.ts`

**Fluxo (todo processamento no cliente):**
1. `getDocs` completo de financials + `getDocs` completo de plans (em paralelo)
2. Agrupa financials por mês em `Map<string, Financial[]>`
3. Para cada um dos 6 meses históricos: calcula confirmed/pending/overdue, collection rate, growthMoM
4. Projeção: regressão linear (least-squares) sobre 6 pontos — cálculo matemático no JS do browser
5. Revenue by plan: agrupa por planId, mapeia para nome do plano
6. Recomendações: if/else sobre métricas — lógica de negócio no browser
7. CSV export: `Array.join(',')` — gerado no cliente

---

### 5.6 `retentionService.ts` (Pure Computation — Sem Firestore)

**Algoritmo de risco (executado no browser para cada aluno ativo):**
```
score = 0
Factor 1 (peso 40): queda de frequência 15d vs 15d anteriores
  - ≤ -50%  → +40 pts
  - ≤ -25%  → +25 pts
  - < 0%    → +10 pts
  - ≥ 0%    → +0 pts

Factor 2 (peso 30): inatividade (dias desde última presença)
  - > 30d   → +30 pts
  - > 14d   → +20 pts
  - > 7d    → +10 pts
  - ≤ 7d    → +0 pts

Factor 3 (peso 20): pagamentos overdue
  - > 2     → +20 pts
  - == 2    → +15 pts
  - == 1    → +10 pts
  - == 0    → +0 pts

Factor 4 (peso 10): tempo na academia
  - < 3 meses  → +10 pts (período crítico)
  - < 6 meses  → +5 pts
  - ≥ 6 meses  → +0 pts

Nível:
  ≥ 75 → critical | ≥ 50 → high | ≥ 25 → medium | < 25 → low
```

---

### 5.7 `planService.ts`

**Operações:** `getDocs`, `getDoc`, `addDoc`, `updateDoc`, `deleteDoc`

**Side-effects críticos:**
- `enrollStudent(planId, studentId)`: atualiza `plans/{id}.studentIds[]` + `students/{id}.tuitionValue` + `students/{id}.tuitionDay`
- `unenrollStudent(planId, studentId)`: reverso
- Operações feitas em chamadas separadas (não atômicas — sem transação)

---

### 5.8 `competitionService.ts`

**Coleções:** `academies/{aid}/competitions`, `competitionEnrollments`, `competitionResults`, `competitionPhotos`

**Operações:** CRUD padrão em cada subcoleção. Joins manuais entre competition + enrollments + results + photos feitos no componente.

---

### 5.9 `beltProgressionService.ts`

**Operações:**
- `getDocs` de beltProgressions por `studentId`
- `addDoc` de nova progressão
- `updateDoc` no student (belt, stripes, beltHistory)
- Validação de elegibilidade baseada em `attendanceCount` — calculada no frontend

---

### 5.10 `notificationService.ts`

**Coleção:** `academies/{aid}/notifications`

**Operações:** `addDoc` (criar notificação in-app), integração com FCM via `pushNotificationService`

**Métodos:** `notifyNewTuitionCreated`, `notifyPaymentReceived`, `notifyAttendanceMilestone`, `notifyBeltPromotion`, `notifyCompetitionResult`

---

### 5.11 `crossAcademyService.ts`

**Coleções:** `userAcademyMapping` (collectionGroup), `academies/{aid}/linkCodes`

**Operações:**
- `collectionGroup('userAcademyMapping')` query — busca mapeamento de todas as academias
- `updateDoc` para redimir link code (one-shot)

---

### 5.12 `globalUserService.ts`

**Coleções:** `users/{uid}`, `userAcademyMapping/{uid}`

**Operações:** `getDoc`, `updateDoc`, `setDoc`

---

### 5.13 `achievementService.ts`

**Coleção:** `academies/{aid}/achievements`

**Operações:** `getDocs where('studentId')`, `addDoc`

---

### 5.14 `checkinService.ts`

**Coleções:** `academies/{aid}/attendance`, `academies/{aid}/classes`, `academies/{aid}/students`

**Fluxo:**
1. Valida se aluno existe e está ativo
2. Valida se turma aceita check-in (studentCheckinEnabled)
3. Valida se está no horário da aula
4. Chama `attendanceService.markPresent()`

---

## 6. Contextos e Providers

### 6.1 `AcademyContext` (`src/contexts/AcademyContext.tsx`)

**Firebase Dependencies:**
- `getDoc(db, 'userAcademyMapping', uid)` — ao montar
- `getDoc(db, 'academies', academyId)` — ao selecionar academia
- `getDoc(db, 'academies/{aid}/users', uid)` — ao selecionar academia (fallback)
- `Promise.allSettled([getDoc(academyRef)])` — para cada academia do usuário (load parallel)
- `onSnapshot(db, 'academies', academyId)` — **realtime listener** para updates da academia
- `updateDoc('userAcademyMapping', uid)` — ao trocar academia primária

**Dados mantidos em estado:**
- `academy`: objeto completo da academia (~30 campos)
- `academyUser`: role, studentId, permissões
- `academiesInfo[]`: nome + logo de todas as academias do usuário
- `userAcademyMapping`: mapeamento completo

**Cache invalidation:** ao trocar de academia, invalida todas as React Query com fragmentos relacionados à academia

---

### 6.2 `NotificationContext` (`src/components/providers/`)

**Firebase Dependencies:**
- `onSnapshot(query(notifications, where('userId', '==', uid), orderBy('createdAt', 'desc')))` — **realtime listener** ativo
- `updateDoc(notificationRef)` — ao marcar como lida
- `deleteDoc(notificationRef)` — ao remover

**Comportamento:** pausa listener quando offline detectado

---

### 6.3 `AuthProvider` (`src/components/providers/AuthProvider.tsx`)

**Firebase Dependencies:**
- `onAuthStateChanged` — listener de autenticação Firebase
- `getDoc('users', uid)` — ao autenticar
- Link code redemption via `linkCodeService`

---

### 6.4 `PermissionProvider`

**Sem Firebase direto** — lê `academyUser.role` do `AcademyContext`

**Expõe:** `can()`, `canView()`, `isAdmin`, `isStudent`, `isGuardian`

---

## 7. API Routes (Next.js)

### 7.1 Autenticação/TOTP

| Rota | Método | Firebase Usado | Lógica |
|------|--------|---------------|--------|
| `/api/auth/totp/setup` | POST | Admin SDK — `users/{uid}` | Gera TOTP secret, salva em Firestore |
| `/api/auth/totp/verify-setup` | POST | Admin SDK — `users/{uid}` | Verifica código TOTP, ativa 2FA |
| `/api/auth/totp/validate` | POST | Admin SDK — `users/{uid}` | Valida código em login |
| `/api/auth/totp/disable` | POST | Admin SDK — `users/{uid}` | Desativa 2FA |

### 7.2 Pagamentos AbacatePay

| Rota | Método | Firebase | Externo | Lógica |
|------|--------|---------|---------|--------|
| `/api/payments/create-pix` | POST | Admin SDK — `financials`, `walletTransactions` | AbacatePay API | Autentica, valida academy, cria PIX, salva transação |
| `/api/payments/create-card` | POST | Admin SDK — `financials`, `walletTransactions` | AbacatePay API | Cria pagamento cartão |
| `/api/payments/create-order-pix` | POST | Admin SDK — `storeOrders`, `walletTransactions` | AbacatePay API | PIX para pedido de loja |
| `/api/payments/withdraw` | POST | Admin SDK — `walletTransactions`, `wallet` | AbacatePay API | Saque para conta bancária |

### 7.3 Pagamentos Asaas

| Rota | Método | Firebase | Externo |
|------|--------|---------|---------|
| `/api/payments/asaas/create-pix` | POST | Admin SDK | Asaas API |
| `/api/payments/asaas/create-card` | POST | Admin SDK | Asaas API |
| `/api/payments/asaas/create-order-pix` | POST | Admin SDK | Asaas API |
| `/api/payments/asaas/withdraw` | POST | Admin SDK | Asaas API |
| `/api/payments/onboard` | POST | Admin SDK — `academies/{aid}` | Asaas API |
| `/api/payments/onboard/status` | GET | Admin SDK | Asaas API |
| `/api/payments/onboard/documents` | GET | Admin SDK | Asaas API |
| `/api/payments/onboard/documents/upload` | POST | Admin SDK | Asaas API |

### 7.4 Webhooks

| Rota | Método | Firebase | Trigger |
|------|--------|---------|---------|
| `/api/webhooks/asaas` | POST | Admin SDK — `walletTransactions`, `financials` (mark paid) | Asaas → pago |
| `/api/webhooks/abacate-pay` | POST | Admin SDK — `walletTransactions`, `financials` | AbacatePay → pago |

### 7.5 Billing

| Rota | Método | Firebase | Externo |
|------|--------|---------|---------|
| `/api/billing/send-whatsapp` | POST | Nenhum (proxy puro) | WhatsApp API Gateway |
| `/api/billing/send-email` | POST | Nenhum (proxy puro) | Email service |
| `/api/billing/send-bulk` | POST | Nenhum (proxy puro) | WhatsApp + Email bulk |

**Nota:** billing routes são proxies simples — não escrevem no Firestore diretamente. O log é gravado pelo `billingReminderService` no cliente.

### 7.6 Equipe e Misc

| Rota | Método | Firebase | Lógica |
|------|--------|---------|--------|
| `/api/team/promote` | POST | Admin SDK — `userAcademyMapping` | Promove usuário (admin → role) |
| `/api/check-slug` | GET | Admin SDK — `academies` query | Valida unicidade do slug |
| `/api/store/generate-payment` | POST | Admin SDK | AbacatePay pagamento loja |
| `/api/store/asaas-generate-payment` | POST | Admin SDK | Asaas pagamento loja |

**Segurança nas API Routes:**
- `authenticateRequest()`: verifica Firebase ID token via Admin SDK
- `checkPaymentRateLimit()`: limita por `uid` em memória (in-process, não persistido)
- `validateAmount()`: sanitiza valores monetários
- CORS configurado

---

## 8. Cloud Functions

**Arquivo:** `functions/src/index.ts` (2048 linhas)

### 8.1 Triggers Firestore

| Função | Trigger | O que Faz |
|--------|---------|-----------|
| `onFinancialCreated` | `academies/{aid}/financials/{id}` onCreate | Lê student para obter linkedUserId, envia push notification "mensalidade criada" |
| `onTimelineEventCreated` | `academies/{aid}/timelineEvents/{id}` onCreate | Envia push notification para o aluno |
| `onNotificationCreated` | `academies/{aid}/notifications/{id}` onCreate | Envia push notification via FCM para o `userId` |

### 8.2 Scheduled Functions (Pub/Sub)

| Função | Schedule | O que Faz |
|--------|---------|-----------|
| `scheduledOverdueCheck` | Diário (cron) | Busca todos os financials `status=pending` com `dueDate < hoje`, atualiza para `status=overdue` em batch, envia notificação |
| `scheduledDueSoonReminder` | Diário | Busca financials vencendo em X dias, envia lembretes automáticos de cobrança |

### 8.3 Callable Functions

| Função | Chamado De | O que Faz |
|--------|-----------|-----------|
| `createPixPayment` | Portal aluno (PIX) | Autenticação + validação + criação PIX no AbacatePay + write em Firestore |
| `createOrderPixPayment` | Portal loja | Idem para pedidos de loja |
| `createCardPayment` | Portal aluno (cartão) | Autenticação + validação cartão (luhn, CVV, expiry) + criação Asaas + write Firestore |
| `sendAcademyNotification` | Admin (callable) | Envia notificação para todos os admins da academia |
| `sendUserNotification` | Admin (callable) | Envia notificação para usuário específico |

### 8.4 Helpers Internos (não exportados)

| Helper | O que Faz |
|--------|-----------|
| `getUserTokens(uid)` | Busca FCM tokens de `users/{uid}/fcmTokens` |
| `sendToUser(uid, title, body)` | Envia FCM multicast + limpa tokens inválidos |
| `sendToTopic(topic, title, body)` | Envia FCM para tópico |
| `getStudentUserId(studentId, academyId)` | Busca userId via `userAcademyMapping` (full collection scan!) + fallback student.linkedUserId |
| `getAcademyAdminUserId(academyId)` | Busca ownerId/adminUserId da academia |

---

## 9. Firebase Storage

### 9.1 Caminhos Usados

| Path Pattern | Usado Em | Operações | Tamanho Típico |
|---|---|---|---|
| `profilePhotos/{academyId}/{studentId}` | `useProfilePhotoUpload` | `uploadBytes`, `getDownloadURL` | 50-500 KB |
| `competitionPhotos/{academyId}/{competitionId}/{filename}` | `useCompetitionPhotos`, `competitionPhotoService` | `uploadBytes`, `getDownloadURL`, (delete implícito ao remover doc) | 100 KB - 5 MB |
| `products/{academyId}/{productId}` | `storeService` (implícito) | `uploadBytes`, `getDownloadURL` | 50-500 KB |
| `medicalCertificates/{academyId}/{studentId}` | campos student | Upload direto | PDFs 100 KB - 2 MB |
| `onboarding/{academyId}/documents` | `/api/payments/onboard/documents/upload` | Upload via Admin SDK | KYC docs |

### 9.2 Operações Storage por Serviço

```typescript
// useProfilePhotoUpload.ts
const storageRef = ref(storage, `profilePhotos/${academyId}/${studentId}`);
await uploadBytes(storageRef, file);
const url = await getDownloadURL(storageRef);
await updateDoc(studentRef, { photoUrl: url });

// competitionPhotoService.ts
const storageRef = ref(storage, `competitionPhotos/${academyId}/${competitionId}/${filename}`);
await uploadBytes(storageRef, file);
const photoUrl = await getDownloadURL(storageRef);
await addDoc(photosRef, { photoUrl, studentId, competitionId, isPublished: false });
```

---

## 10. Firebase Auth

### 10.1 Uso no Cliente

| Onde | Operação | Propósito |
|------|---------|-----------|
| `AuthProvider` | `onAuthStateChanged(auth)` | Listener de sessão |
| `AuthProvider` | `signInWithEmailAndPassword` | Login |
| `AuthProvider` | `createUserWithEmailAndPassword` | Registro |
| `AuthProvider` | `signOut(auth)` | Logout |
| `AuthProvider` | `sendPasswordResetEmail` | Reset de senha |
| API Routes | `verifyIdToken(token)` via Admin SDK | Autenticação server-side |
| Cloud Functions | `context.auth` | Autenticação callable functions |

### 10.2 Token Flow

```
Browser → Firebase Auth → ID Token (JWT)
  ↓
Request Header: Authorization: Bearer <token>
  ↓
Next.js API Route → adminAuth.verifyIdToken(token) → { uid, email }
  ↓
Busca userAcademyMapping/{uid} para obter { academyId, role, studentId }
```

**Arquivo chave:** `src/lib/api/auth.ts` — `authenticateRequest()`

---

## 11. Processamento Frontend que Deve Migrar para Backend

### 11.1 CRÍTICO — Full Collection Scans (N+1 e Sem Índice)

| Operação Atual | Problema | Solução Backend |
|---|---|---|
| `financialService.list()` — full scan + filtra em memória | Baixa TODOS os financials (pode ser 10k docs) | `GET /financials?status=X&month=Y&studentId=Z` com SQL WHERE indexado |
| `financialService.getPending()` — full scan | Idem | `GET /financials?status=pending` |
| `financialService.getOverdue()` — full scan | Idem | `GET /financials?status=overdue` |
| `attendanceService.getByDateRange()` — full scan | Baixa TODOS os attendances (pode ser 50k docs) | `GET /attendance?from=X&to=Y&classId=Z` com índice em `date` |
| `studentService.listAll()` — full scan + sort em memória | Sem índice composto, ordena N alunos no browser | `GET /students?sort=attendance&page=1&limit=30` com cursor do banco |
| `studentService.searchByName()` — full scan + includes() | Busca textual inexistente no Firestore | `GET /students/search?q=joao` com `ILIKE` ou full-text search |
| `generateMonthlyTuitions()` — N queries sequenciais | 1 query por aluno para checar duplicata | `POST /financials/generate-monthly` — 1 query no backend com `WHERE referenceMonth=X AND planId IN(...)` |
| `billingReminderService` — full scan financials + contactLog | Traz todos os docs para classificar stages | `GET /billing/stages` — query com JOIN no banco |

### 11.2 CRÍTICO — Algoritmos de Negócio no Browser

| Algoritmo | Custo Atual | Solução Backend |
|---|---|---|
| **Risk Score (Retenção)** | Para cada aluno ativo: 4 cálculos com datas, arrays de attendance, loops | `GET /retention/at-risk` — SQL com window functions ou computed columns |
| **Financial Report** | Regressão linear (least-squares) em JavaScript, groupBy mês em memória | `GET /reports/financial?months=6` — aggregation no banco (SUM, GROUP BY) |
| **Revenue Projection** | Média móvel + trend calculado no browser | Endpoint dedicado com cálculo server-side |
| **Collection Rate** | Loop sobre financials em memória | `SELECT SUM(CASE WHEN status='paid'...) / SUM(amount)` |
| **Monthly Summary** | Loop sobre todos os financials do mês | `SELECT status, COUNT(*), SUM(amount) GROUP BY status` |
| **Belt Eligibility** | Compara attendanceCount com threshold por aluno | `SELECT * FROM students WHERE attendanceCount >= threshold` |
| **Billing Stages** | Classifica D+0 a D+30 em memória com arrays | `SELECT DATEDIFF(NOW(), dueDate) as days_overdue FROM financials WHERE status='overdue'` |
| **Dashboard Stats** | 4-5 queries separadas + combina no cliente | `GET /dashboard` — 1 endpoint com múltiplos aggregates |

### 11.3 IMPORTANTE — Operações Não Atômicas

| Operação | Problema | Solução |
|---|---|---|
| `planService.enrollStudent()` | Atualiza `plan.studentIds[]` + `student.tuitionValue` + `student.tuitionDay` em chamadas separadas | Transação no backend |
| `attendanceService.markPresent()` + `updateDoc(increment)` | addDoc + updateDoc separados — se o segundo falhar, attendanceCount fica inconsistente | Transação ou trigger no banco |
| `generateMonthlyTuitions()` — loop serial | Se falhar no meio, estado fica inconsistente | Transação batch no backend |
| `beltProgressionService` | Cria progressão + atualiza student em separado | Transação no backend |

### 11.4 IMPORTANTE — Notificações Coordenadas pelo Cliente

| Fluxo Atual | Problema | Solução |
|---|---|---|
| `markAsPaid` → busca student → `notificationService.notifyPaymentReceived()` | Notificação disparada do browser, falha silenciosa | Backend event: after UPDATE financial SET status='paid', dispara evento |
| `createFinancial` → busca student → `notificationService.notifyNewTuitionCreated()` | Idem | Backend event |
| Cloud Functions já fazem isso via triggers, mas o cliente também dispara em paralelo | Duplicação potencial | Centralizar no backend |

### 11.5 MODERADO — Joins Manuais no Frontend

| Join Atual | Coleções Envolvidas | Alternativa |
|---|---|---|
| Retenção | students + attendance (30d) + financials (overdue) | `SELECT s.*, COUNT(a.*), COUNT(f.*) FROM students s LEFT JOIN attendance a LEFT JOIN financials f...` |
| Billing reminders | financials + students (telefone/email) + billingContactLog | JOIN no backend |
| Dashboard | students + financials + attendance + classes | Endpoint dedicado `/dashboard` |
| Competition page | competitions + enrollments + results + photos | `GET /competitions/{id}` com dados completos |
| Student profile page | student + beltHistory + attendance + financials + achievements | `GET /students/{id}` com includes |
| Graduation page | students + settings (threshold) + beltProgressions | Endpoint de elegibilidade |

### 11.6 MODERADO — Geração de Arquivos no Browser

| Geração Atual | Problema | Solução |
|---|---|---|
| CSV de relatório financeiro — `exportCSV()` | Gera string no browser, download via blob | `GET /reports/financial/export.csv` — stream do backend |
| Templates de WhatsApp — substituição de variáveis | Processamento de texto no browser | Templates processados no backend antes de enviar |

### 11.7 MENOR — Conversão de Timestamps

**Atualmente:** todo timestamp do Firestore (`Timestamp.toDate()`) é convertido no cliente em cada `docToXxx()`. Com banco SQL/NoSQL, as datas já vêm em ISO 8601 — remoção de ~500 linhas de boilerplate de conversão.

---

## 12. Integrações Externas

### 12.1 AbacatePay (Pagamentos PIX/Cartão)

| Item | Detalhe |
|------|---------|
| Base URL | `https://api.abacatepay.com/v1` |
| Autenticação | `ABACATEPAY_API_KEY` (env var) |
| Endpoints usados | `POST /billing/create` (PIX), `GET /billing/{id}` (status) |
| Webhook | `POST /api/webhooks/abacate-pay` — recebe evento de pagamento |
| Dados gravados | `walletTransactions/{id}`, `financials/{id}` (status → paid) |
| Config por academia | `academy.abacatePayEnabled: boolean` |

### 12.2 Asaas (Pagamentos, Saques, KYC)

| Item | Detalhe |
|------|---------|
| Base URL | `https://api.asaas.com/api/v3` |
| Autenticação | `ASAAS_API_KEY` (env var) |
| Subcontas | Cada academia tem `asaasSubAccountId` — pagamentos vão para sub-account |
| Endpoints | `/payments` (criar), `/customers` (criar cliente), `/transfers` (saque), `/myAccount/commercialInfo` (KYC) |
| Webhook | `POST /api/webhooks/asaas` — `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED` |
| KYC status | `academy.asaasKycStatus`, `academy.asaasOnboardingStatus` |

### 12.3 WhatsApp (Cobrança)

| Item | Detalhe |
|------|---------|
| Endpoint | `WHATSAPP_API_URL` (env var — API Gateway própria) |
| Autenticação | `WHATSAPP_API_KEY` (env var) |
| Timeout individual | 30 segundos |
| Timeout bulk | 120 segundos |
| Payload | `{ phone, message, appId: 'gestao-raiz' }` |
| Bulk endpoint | URL derivada: `base/api/send-bulk` |

### 12.4 Firebase Cloud Messaging (Push Notifications)

| Item | Detalhe |
|------|---------|
| Tokens | Armazenados em `users/{uid}/fcmTokens/{token}` |
| Envio | Via Admin SDK `messaging.sendEachForMulticast()` |
| Limpeza | Tokens inválidos removidos automaticamente após falha |
| Tópicos | `sendToTopic()` para broadcast |

---

## 13. Firestore Security Rules — Mapeamento para Middleware

**Arquivo:** `firestore.rules`

### 13.1 Funções Helper → Middleware Backend

| Função Firestore Rule | Equivalente Backend |
|---|---|
| `belongsToAcademy(academyId)` | Middleware: `req.user.academyIds.includes(academyId)` |
| `isAcademyStaff(academyId)` | Middleware: `req.user.academyRole[academyId] === 'admin'` |
| `isMonitor(academyId)` | Middleware: `academy.monitorIds.includes(req.user.studentId)` |
| `isOwnStudent(academyId, studentId)` | Middleware: `req.user.studentId === studentId` |

### 13.2 Regras por Coleção → Permissões de Endpoint

| Coleção | Leitura | Escrita | Middleware Necessário |
|---------|---------|---------|----------------------|
| `users/{uid}` | Próprio usuário | Próprio usuário | `auth.uid === req.params.uid` |
| `userAcademyMapping/{uid}` | Próprio | Staff da primary academy | `auth.uid === uid OR isStaff` |
| `academies/{aid}` | Qualquer membro | Admin | `isMember(aid)` / `isAdmin(aid)` |
| `students/{id}` | Staff: todos; Monitor: sem financeiro; Student: próprio | Staff | Por role |
| `attendance/{id}` | Staff + self check-in | Staff + student (self) | Valida enrollment na turma |
| `financials/{id}` | Staff + próprio student | Staff + próprio (PIX) | `isStaff OR student.id === financial.studentId` |
| `wallet` | Owner/Admin only | Nunca (client) | `isAdmin(aid)` |
| `storeOrders/{id}` | Staff: todos; Student: próprio | Student: cria próprio | `isStaff OR student.id === order.studentId` |
| `linkCodes/{id}` | Staff + unauthenticated (unused) | Staff | `isStaff` |
| `competitionPhotos/{id}` | Public (isPublished) | Staff + student criando próprio | `isPublished OR isStaff OR ownStudent` |

### 13.3 Validação de Campo → Request Validation

| Validação Atual (Firestore Rule) | Equivalente Backend (Zod/Joi) |
|---|---|
| `request.resource.data.academyId == academyId` | `z.object({ academyId: z.literal(req.params.academyId) })` |
| `request.resource.data.status in ['pending', 'paid', 'overdue', 'cancelled']` | `z.enum(['pending', 'paid', 'overdue', 'cancelled'])` |
| `request.resource.data.amount > 0` | `z.number().positive()` |
| `!('code' in request.resource.data.diff) OR !existingCode.data().used` | Validação de one-shot link code no service |

---

## 14. Problemas Críticos de Performance (Frontend Atual)

### 14.1 Ranking por Severidade

| # | Problema | Impacto | Frequência |
|---|---------|---------|-----------|
| 1 | `attendance.getByDateRange()` — full scan de toda coleção | Baixa 50k+ docs para filtrar por 30 dias | Toda abertura de `/retencao`, `/chamada` |
| 2 | `financial.list()` — full scan para qualquer filtro | Baixa 10k+ docs para mostrar 50 | Toda abertura de `/financeiro`, `/cobranca` |
| 3 | `generateMonthlyTuitions()` — N queries sequenciais | 1 round-trip por aluno (100 alunos = 100 queries) | Geração mensal |
| 4 | `studentService.listAll()` — sem LIMIT no Firestore | Baixa todos os alunos para fazer sort em memória | Toda abertura de `/alunos` |
| 5 | `bulkMarkPresent()` — N*2 queries sequenciais | isPresent + markPresent por aluno (30 alunos = 60 queries) | Cada chamada em massa |
| 6 | `retentionService` — 3 full scans + algoritmo em memória | 3 coleções completas + CPU do browser | Abertura de `/retencao` |
| 7 | `financialReportService.loadAll()` — 2 full scans | Todos os financials + todos os planos | Abertura de `/relatorios` |
| 8 | `studentService.getCountByStatus()` — 4 queries separadas | 4 round-trips para 4 números | Dashboard |

### 14.2 Custo Estimado Firestore (por Operação de Tela)

| Tela | Reads Estimados | Writes Estimados |
|------|----------------|-----------------|
| `/dashboard` | 500-5000 (full scans) | 0 |
| `/alunos` | 100-1000 (todos alunos) | 0 |
| `/chamada` (abrir) | 100-2000 (attendance full scan) | 0 |
| `/chamada` (marcar 30 alunos) | 90 reads (isPresent) | 60 writes (30 attendance + 30 increment) |
| `/financeiro` | 1000-10000 (full scan) | 0 |
| `/cobranca` | 5000-20000 (financials + contactLog full scan) | 1-N writes (log) |
| `/relatorios` | 5000-20000 (financials + plans full scan) | 0 |
| `/retencao` | 3000-80000 (3 full scans) | 0 |
| Gerar mensalidades (100 alunos) | 100+ reads (check duplicata) | 100 writes |

---

## 15. Checklist de Migração por Domínio

### 15.1 Domínio: Alunos

- [ ] `GET /academies/:aid/students` — lista paginada com filtros (status, category, belt, search) via SQL
- [ ] `GET /academies/:aid/students/search?q=` — full-text search (PostgreSQL `ILIKE` ou `tsvector`)
- [ ] `GET /academies/:aid/students/:id` — aluno completo com includes (beltHistory, sportData)
- [ ] `POST /academies/:aid/students` — criar aluno
- [ ] `PUT /academies/:aid/students/:id` — atualizar aluno
- [ ] `DELETE /academies/:aid/students/:id` — soft delete (status=inactive)
- [ ] `PUT /academies/:aid/students/:id/belt` — graduação de cinto (cria beltHistory + atualiza belt)
- [ ] `PUT /academies/:aid/students/:id/sport-grade` — graduação multi-esporte
- [ ] `GET /academies/:aid/students/stats` — contagens por status/category/belt (substitui getDashboardStats)
- [ ] Upload de foto → S3/GCS presigned URL

### 15.2 Domínio: Financeiro

- [ ] `GET /academies/:aid/financials` — com filtros SQL (status, month, studentId, type)
- [ ] `GET /academies/:aid/financials/:id`
- [ ] `POST /academies/:aid/financials` — criar registro
- [ ] `PUT /academies/:aid/financials/:id/mark-paid` — marcar pago + disparar evento notificação
- [ ] `PUT /academies/:aid/financials/:id/cancel`
- [ ] `PUT /academies/:aid/financials/:id/reactivate`
- [ ] `POST /academies/:aid/financials/generate-monthly` — geração em batch com check de duplicata via SQL
- [ ] `PUT /academies/:aid/financials/mark-overdue-batch` — cron job: UPDATE WHERE status='pending' AND dueDate < NOW()
- [ ] `GET /academies/:aid/financials/summary?month=` — `GROUP BY status, SUM(amount)` no banco
- [ ] `GET /academies/:aid/financials/revenue-stats?from=&to=` — aggregation por mês

### 15.3 Domínio: Presença

- [ ] `GET /academies/:aid/attendance?classId=&date=` — presença de uma turma em um dia
- [ ] `GET /academies/:aid/attendance?studentId=&limit=` — histórico do aluno
- [ ] `GET /academies/:aid/attendance?from=&to=&classId=` — range de datas (com índice em `date`)
- [ ] `POST /academies/:aid/attendance` — marcar presença (atomic: insert + increment counter)
- [ ] `DELETE /academies/:aid/attendance/:id` — desmarcar (atomic: delete + decrement)
- [ ] `POST /academies/:aid/attendance/bulk` — marcar em lote (transaction: N inserts + N increments)
- [ ] `POST /academies/:aid/attendance/checkin` — self check-in via QR

### 15.4 Domínio: Relatórios / Analytics

- [ ] `GET /academies/:aid/reports/financial?months=6` — histórico agregado por mês (SQL GROUP BY)
- [ ] `GET /academies/:aid/reports/financial/projection?months=3` — projeção (cálculo server-side)
- [ ] `GET /academies/:aid/reports/financial/export.csv` — CSV stream do backend
- [ ] `GET /academies/:aid/retention/at-risk` — score de risco por aluno (SQL + algoritmo no backend)
- [ ] `GET /academies/:aid/retention/metrics` — métricas agregadas

### 15.5 Domínio: Turmas

- [ ] `GET /academies/:aid/classes`
- [ ] `GET /academies/:aid/classes/:id`
- [ ] `POST /academies/:aid/classes`
- [ ] `PUT /academies/:aid/classes/:id`
- [ ] `DELETE /academies/:aid/classes/:id`
- [ ] `GET /academies/:aid/classes/current` — turma em andamento agora (comparação de horário no backend)

### 15.6 Domínio: Planos

- [ ] `GET /academies/:aid/plans`
- [ ] `GET /academies/:aid/plans/:id`
- [ ] `POST /academies/:aid/plans`
- [ ] `PUT /academies/:aid/plans/:id`
- [ ] `DELETE /academies/:aid/plans/:id`
- [ ] `POST /academies/:aid/plans/:id/enroll` — enrolar aluno (transaction: plan + student update)
- [ ] `DELETE /academies/:aid/plans/:id/students/:studentId` — desenrolar

### 15.7 Domínio: Graduação

- [ ] `GET /academies/:aid/belt-progressions?studentId=`
- [ ] `POST /academies/:aid/belt-progressions` — registrar graduação
- [ ] `GET /academies/:aid/graduation/eligible` — alunos elegíveis (SQL: attendanceCount >= threshold)
- [ ] `GET /academies/:aid/assessments?studentId=`
- [ ] `POST /academies/:aid/assessments`
- [ ] `PUT /academies/:aid/assessments/:id`

### 15.8 Domínio: Cobrança / Billing

- [ ] `GET /academies/:aid/billing/stages` — financials agrupados por stage (D+0, D+1...) com JOIN em students
- [ ] `GET /academies/:aid/billing/contact-log?financialId=`
- [ ] `POST /academies/:aid/billing/contact-log` — registrar contato
- [ ] `POST /academies/:aid/billing/send-whatsapp` — proxy (sem mudança)
- [ ] `POST /academies/:aid/billing/send-email` — proxy (sem mudança)
- [ ] `POST /academies/:aid/billing/send-bulk` — proxy (sem mudança)

### 15.9 Domínio: Competições

- [ ] `GET /academies/:aid/competitions`
- [ ] `GET /academies/:aid/competitions/:id` — com enrollments + results + photos
- [ ] `POST /academies/:aid/competitions`
- [ ] `PUT /academies/:aid/competitions/:id`
- [ ] `DELETE /academies/:aid/competitions/:id`
- [ ] `GET /academies/:aid/competitions/:id/enrollments`
- [ ] `POST /academies/:aid/competitions/:id/enrollments`
- [ ] `PUT /academies/:aid/competitions/:id/results`
- [ ] Upload de fotos → presigned URL S3/GCS

### 15.10 Domínio: Notificações (Realtime)

**Opções para substituir `onSnapshot`:**
- WebSockets (Socket.io / ws) para inbox em tempo real
- Server-Sent Events (SSE) — mais simples, unidirecional
- Polling a cada 30s — mais simples, sem realtime

- [ ] `GET /academies/:aid/notifications?userId=` — lista
- [ ] `PUT /academies/:aid/notifications/:id/read`
- [ ] `DELETE /academies/:aid/notifications/:id`
- [ ] `POST /academies/:aid/notifications` — criar (internal, chamado por eventos)
- [ ] WebSocket endpoint para realtime inbox (substitui `onSnapshot`)

### 15.11 Domínio: Academia / Multi-Tenant

- [ ] `GET /users/:uid/academy-mapping` — substitui `userAcademyMapping/{uid}`
- [ ] `PUT /users/:uid/academy-mapping/primary` — trocar academia primária
- [ ] `GET /academies/:aid` — dados da academia
- [ ] `PUT /academies/:aid` — atualizar settings
- [ ] `GET /academies/:aid/settings`
- [ ] `PUT /academies/:aid/settings`
- [ ] SSE/WebSocket para updates realtime da academia (substitui `onSnapshot` do AcademyContext)

### 15.12 Domínio: Loja

- [ ] `GET /academies/:aid/store/products`
- [ ] `POST /academies/:aid/store/products`
- [ ] `PUT /academies/:aid/store/products/:id`
- [ ] `DELETE /academies/:aid/store/products/:id`
- [ ] `GET /academies/:aid/store/orders`
- [ ] `POST /academies/:aid/store/orders`
- [ ] `PUT /academies/:aid/store/orders/:id/status`

### 15.13 Domínio: Auth / Usuários

- [ ] JWT próprio (substituir Firebase Auth token)
- [ ] `POST /auth/login` → retorna JWT + refresh token
- [ ] `POST /auth/register`
- [ ] `POST /auth/refresh`
- [ ] `POST /auth/logout`
- [ ] `POST /auth/reset-password`
- [ ] TOTP endpoints (migrar das API routes atuais)
- [ ] FCM token management (ou migrar push para OneSignal/Expo)

### 15.14 Cloud Functions → Cron Jobs Backend

| Função Atual | Equivalente Backend |
|---|---|
| `scheduledOverdueCheck` | Cron diário: `UPDATE financials SET status='overdue' WHERE status='pending' AND dueDate < NOW()` |
| `scheduledDueSoonReminder` | Cron diário: SELECT vencendo em X dias → envia lembretes |
| `onFinancialCreated` | Event/Hook após INSERT em financials → dispara notificação |
| `onNotificationCreated` | Event após INSERT em notifications → FCM push |
| Limpeza de tokens FCM inválidos | Reutilizar lógica existente |

---

## Apêndice A — Variáveis de Ambiente Firebase a Migrar

```env
# Firebase Client (a remover)
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
NEXT_PUBLIC_FIREBASE_VAPID_KEY

# Firebase Admin (a remover)
FIREBASE_SERVICE_ACCOUNT_KEY (ou GOOGLE_APPLICATION_CREDENTIALS)

# Manter (integrações externas)
ABACATEPAY_API_KEY
ASAAS_API_KEY
WHATSAPP_API_URL
WHATSAPP_API_KEY

# Adicionar (backend dedicado)
BACKEND_API_URL
BACKEND_API_KEY (ou JWT_SECRET)
DATABASE_URL
S3_BUCKET / GCS_BUCKET
S3_ACCESS_KEY / GCS_CREDENTIALS
```

---

## Apêndice B — Arquivos a Remover/Modificar na Migração

### Remover Completamente
```
src/lib/firebase/config.ts         # Firebase client config
src/lib/firebase/admin.ts          # Firebase Admin SDK
src/lib/firebase/collections.ts    # Path builders Firestore
functions/                          # Cloud Functions (migrar para cron)
firestore.rules                     # Security rules (migrar para middleware)
```

### Reescrever do Zero (substituindo Firestore por fetch() para API própria)
```
src/services/financialService.ts
src/services/studentService.ts
src/services/attendanceService.ts
src/services/planService.ts
src/services/billingReminderService.ts
src/services/financialReportService.ts
src/services/competitionService.ts
src/services/competitionEnrollmentService.ts
src/services/competitionPhotoService.ts
src/services/beltProgressionService.ts
src/services/achievementService.ts
src/services/assessmentService.ts
src/services/notificationService.ts
src/services/storeService.ts
src/services/newsService.ts
src/services/academyEventService.ts
src/services/linkCodeService.ts
src/services/instructorLinkCodeService.ts
src/services/globalUserService.ts
src/services/crossAcademyService.ts
src/services/checkinService.ts
src/services/settingsService.ts
```

### Adaptar (remover Firebase, manter lógica de UI)
```
src/contexts/AcademyContext.tsx        # Trocar getDoc/onSnapshot por fetch/SSE
src/components/providers/AuthProvider.tsx   # Trocar Firebase Auth por JWT próprio
src/components/providers/NotificationProvider.tsx  # Trocar onSnapshot por SSE/polling
src/hooks/useProfilePhotoUpload.ts     # Trocar Storage por presigned URL
src/hooks/useCompetitionPhotos.ts      # Trocar Storage por presigned URL
src/hooks/useFCM.ts                    # Adaptar para backend próprio
```

### Manter Quase Intactos (lógica pura, sem Firebase)
```
src/services/retentionService.ts       # Pure computation — sem Firestore
src/services/billingNotificationService.ts  # Template processing — sem Firestore
```
