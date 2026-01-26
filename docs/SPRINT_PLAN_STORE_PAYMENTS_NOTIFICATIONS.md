# Sprint Plan: Loja, Pagamentos e Notificações

## Visão Geral

### Escopo
1. **Notificações Push (Flutter only)** - Notificações do app no dispositivo
2. **Loja** - Gestão de produtos e pedidos (admin) + compras (aluno)
3. **Pagamentos via App** - Integração AbacatePay para PIX/Cartão

### Plataformas
- **marcusjj** (Next.js web) - Loja + Pagamentos
- **graduabjj** (Flutter app) - Loja + Pagamentos + Notificações Push

---

## Sprint 1: Limpeza e Estrutura Base
**Objetivo:** Remover configurações desnecessárias e preparar estrutura
**Status:** CONCLUÍDO

### Tarefas:
- [x] 1.1 Remover seção de notificações das configurações (marcusjj)
- [x] 1.2 Criar/atualizar tipos para Store (Product, Order, OrderStatus) - JÁ EXISTIA
- [x] 1.3 Criar/atualizar modelos Flutter para Store - JÁ EXISTIA
- [x] 1.4 Verificar estrutura do storeService existente - COMPLETO

---

## Sprint 2: Loja - Admin (Gestão de Produtos)
**Objetivo:** Admin pode gerenciar produtos da loja
**Status:** CONCLUÍDO

### Tarefas:
- [x] 2.1 Tela de listagem de produtos (marcusjj) - /loja/page.tsx
- [x] 2.2 Formulário criar/editar produto (marcusjj) - /loja/produto/novo e /loja/produto/[id]
  - Nome, descrição, preço
  - Foto do produto (upload)
  - Tipo: estoque ou sob demanda
  - Quantidade em estoque (se aplicável)
  - Status ativo/inativo
- [x] 2.3 Tela de listagem de produtos (graduabjj) - admin/store_screen.dart
- [x] 2.4 Formulário criar/editar produto (graduabjj) - EXISTENTE

---

## Sprint 3: Loja - Admin (Gestão de Pedidos)
**Objetivo:** Admin pode visualizar e gerenciar pedidos
**Status:** CONCLUÍDO

### Tarefas:
- [x] 3.1 Tela de listagem de pedidos (marcusjj) - /loja/pedidos/page.tsx
  - Filtros por status, data, aluno
  - Ver detalhes do pedido
  - Status do pagamento
- [x] 3.2 Ações em pedidos (marcusjj)
  - Marcar como separado/enviado/entregue
  - Cancelar pedido
- [x] 3.3 Tela de listagem de pedidos (graduabjj) - admin/store_orders_screen.dart
- [x] 3.4 Ações em pedidos (graduabjj) - EXISTENTE

---

## Sprint 4: Loja - Aluno (Navegação e Catálogo)
**Objetivo:** Aluno pode ver a loja e produtos
**Status:** CONCLUÍDO

### Tarefas:
- [x] 4.1 Adicionar Loja na navegação do portal (marcusjj) - Sidebar.tsx
  - Condicional: só aparece se storeEnabled
- [x] 4.2 Adicionar Loja na navegação do portal (graduabjj) - portal_shell.dart
  - Condicional: só aparece se storeEnabled
- [x] 4.3 Tela de catálogo de produtos (marcusjj) - /portal/loja/page.tsx
- [x] 4.4 Tela de catálogo de produtos (graduabjj) - portal/store_screen.dart
- [x] 4.5 Tela de detalhes do produto (marcusjj) - EXISTENTE
- [x] 4.6 Tela de detalhes do produto (graduabjj) - EXISTENTE

---

## Sprint 5: Loja - Aluno (Carrinho e Checkout)
**Objetivo:** Aluno pode adicionar ao carrinho e fazer checkout
**Status:** CONCLUÍDO

### Tarefas:
- [x] 5.1 Carrinho de compras (marcusjj) - /portal/loja/carrinho/page.tsx
- [x] 5.2 Carrinho de compras (graduabjj) - portal/cart_screen.dart
- [x] 5.3 Tela de checkout (marcusjj) - EXISTENTE
- [x] 5.4 Tela de checkout (graduabjj) - EXISTENTE
- [x] 5.5 Criar pedido no Firestore - storeService

---

## Sprint 6: Integração AbacatePay - Estrutura
**Objetivo:** Preparar integração com AbacatePay
**Status:** CONCLUÍDO

### Tarefas:
- [x] 6.1 Criar API routes para AbacatePay (marcusjj - Next.js API)
  - [x] POST /api/payments/create-pix - Criar cobrança PIX
  - [x] POST /api/payments/create-card - Criar cobrança Cartão
  - [x] POST /api/webhooks/abacate-pay - Receber webhooks (JÁ EXISTIA)
  - [x] GET /api/payments/status/:id - Via webhook automático
- [x] 6.2 Atualizar abacatePayService (marcusjj) - JÁ EXISTIA
- [x] 6.3 Criar abacatePayService (graduabjj) - CRIADO
- [x] 6.4 Criar API route para pagamento com cartão (marcusjj) - /api/payments/create-card
- [x] 6.5 Adicionar método de pagamento com cartão (marcusjj + graduabjj)

---

## Sprint 7: Pagamento de Produtos (Loja)
**Objetivo:** Aluno pode pagar produtos via PIX ou Cartão
**Status:** CONCLUÍDO

### Tarefas:
- [x] 7.1 Tela de pagamento PIX (marcusjj) - storeService.generateOrderPayment()
  - Exibir QR Code
  - Exibir código copia-e-cola
  - Webhook para confirmar pagamento
- [x] 7.2 Tela de pagamento PIX (graduabjj) - store_orders_screen.dart com QR Code e botão copiar
- [x] 7.3 Tela de pagamento Cartão (marcusjj) - /api/payments/create-card
  - Formulário de cartão
  - Processamento
- [x] 7.4 Tela de pagamento Cartão (graduabjj) - _CardPaymentBottomSheet em store_orders_screen.dart
- [x] 7.5 Atualizar status do pedido após pagamento - VIA WEBHOOK

---

## Sprint 8: Pagamento de Mensalidades (Financeiro)
**Objetivo:** Aluno pode pagar mensalidades via PIX
**Status:** CONCLUÍDO

### Tarefas:
- [x] 8.1 Tela de financeiro do aluno (marcusjj) - JÁ EXISTIA
  - Ver faturas pendentes
  - Ver histórico de pagamentos
- [x] 8.2 Tela de financeiro do aluno (graduabjj) - ATUALIZADA
- [x] 8.3 Botão "Pagar" em fatura pendente (marcusjj) - JÁ EXISTIA
- [x] 8.4 Botão "Pagar" em fatura pendente (graduabjj) - ADICIONADO
- [x] 8.5 Fluxo de pagamento PIX para mensalidade - IMPLEMENTADO
- [x] 8.6 Atualizar status da fatura após pagamento - VIA WEBHOOK

---

## Sprint 9: Notificações Push (Flutter only)
**Objetivo:** Configurar Firebase Cloud Messaging
**Status:** CONCLUÍDO

### Tarefas:
- [x] 9.1 Configurar Firebase Cloud Messaging no projeto - ADICIONADO
- [x] 9.2 Serviço de notificações local (flutter_local_notifications) - CRIADO push_notification_service.dart
- [x] 9.3 Solicitar permissão de notificações - IMPLEMENTADO
- [x] 9.4 Salvar FCM token no Firestore (por usuário) - IMPLEMENTADO em /users/{uid}/fcmTokens

---

## Sprint 10: Triggers de Notificações
**Objetivo:** Disparar notificações nos eventos corretos
**Status:** CONCLUÍDO

### Cloud Functions Criadas (functions/src/index.ts):
- [x] onFinancialCreated - Trigger Firestore para notificar aluno sobre nova fatura
- [x] onCompetitionCreated - Trigger Firestore para notificar alunos sobre novo campeonato
- [x] onTimelineEventCreated - Trigger Firestore para notificar aluno sobre conquistas/graduações
- [x] scheduledOverdueCheck - Cron diário (9h) para verificar pagamentos atrasados e notificar admin
- [x] scheduledDueSoonReminder - Cron diário (8h) para lembrar alunos de pagamentos próximos (3 dias)
- [x] sendAcademyNotification - HTTP Callable para admin enviar notificações broadcast
- [x] sendUserNotification - HTTP Callable para notificações direcionadas

### Notificações para Alunos:
- [x] 10.1 Pagamento pendente (fatura gerada) - Cloud Function onFinancialCreated
- [x] 10.2 Novo campeonato criado - Cloud Function onCompetitionCreated (via topic)
- [x] 10.3 Novo achievement conquistado - Cloud Function onTimelineEventCreated

### Notificações para Admin/Instrutor:
- [x] 10.4 Novo pedido na loja - IMPLEMENTADO no webhook
- [x] 10.5 Pagamento realizado por aluno - IMPLEMENTADO no webhook
- [x] 10.6 Pagamento entrou em status atrasado - Cloud Function scheduledOverdueCheck

---

## Sprint Extra: Carteira do Admin
**Objetivo:** Admin pode visualizar saldo, transações e solicitar saques
**Status:** CONCLUÍDO

### Tarefas:
- [x] E.1 Toggle AbacatePay nas configurações (marcusjj) - JÁ EXISTIA
- [x] E.2 Página de Carteira (marcusjj) - /carteira com saldo, transações, saque
- [x] E.3 Link da Carteira no sidebar (condicional ao AbacatePay ativo)
- [x] E.4 Página de Carteira (graduabjj) - wallet_screen.dart com saldo, transações, saque
- [x] E.5 Link da Carteira na navegação admin Flutter (condicional ao AbacatePay)

---

## Sprint 11: Testes e Refinamentos
**Objetivo:** Testar fluxos completos e corrigir bugs

### Tarefas:
- [ ] 11.1 Testar fluxo completo de compra na loja
- [ ] 11.2 Testar fluxo de pagamento de mensalidade
- [ ] 11.3 Testar notificações push
- [ ] 11.4 Corrigir bugs encontrados
- [ ] 11.5 Ajustes de UX/UI

---

## Sprint 12: Segurança e Proteção
**Objetivo:** Garantir segurança total do sistema de pagamentos e carteira
**Status:** CONCLUÍDO

### 12.1 Firestore Security Rules (firestore.rules)
- [x] Atualizar regras para arquitetura multi-tenant
- [x] Proteger wallet - somente leitura pelo owner, escrita bloqueada para clients
- [x] Proteger walletTransactions - somente leitura pelo owner, escrita bloqueada
- [x] Proteger financials - bloquear modificação de campos de pagamento pelo client
- [x] Proteger storeOrders - validar ownership, bloquear modificação de payment fields
- [x] Validar amounts positivos em creates
- [x] Bloquear acesso cross-academy
- [x] Adicionar regra deny-all para paths não mapeados

### 12.2 API Route Security (/api/payments/*)
- [x] Implementar autenticação via Firebase ID Token
- [x] Verificar se usuário pertence à academy
- [x] Verificar se usuário é owner do studentId (ou é staff)
- [x] Validar amounts (positivo, inteiro, limite máximo)
- [x] Validar número de cartão (algoritmo de Luhn)
- [x] Validar CPF
- [x] Validar data de expiração do cartão
- [x] Sanitizar inputs (prevenir XSS/injection)
- [x] Rate limiting (5 tentativas de pagamento por minuto)
- [x] CORS restritivo (não usar *)

### 12.3 Webhook Security (/api/webhooks/abacate-pay)
- [x] Validação de assinatura HMAC-SHA256 com secret global (ABACATEPAY_WEBHOOK_SECRET)
- [x] Timing-safe comparison para prevenir timing attacks
- [x] Deduplicação de webhooks (prevenir replay attacks)
- [x] Validar amount > 0 antes de processar
- [x] Idempotência - não processar pagamentos já pagos
- [x] Logs de segurança para tentativas inválidas
- [x] Identificação do tenant via metadata (academyId no payload)
- [x] Em produção, webhook secret é OBRIGATÓRIO

### 12.4 Firestore Indexes (firestore.indexes.json)
- [x] Index para walletTransactions por abacatePayTransactionId
- [x] Index para walletTransactions por createdAt
- [x] Index para walletTransactions por financialId + createdAt
- [x] Index para financials por status + dueDate
- [x] Index para storeOrders por studentId + createdAt
- [x] Index para notifications por userId + createdAt

### 12.5 Middleware de Segurança (/lib/api/auth.ts)
- [x] Função de autenticação de requests
- [x] Rate limiting em memória
- [x] Validadores de input (amount, CPF, card number)
- [x] Sanitização de strings
- [x] Helpers para responses padronizadas
- [x] CORS headers configuráveis

### Vulnerabilidades Corrigidas:
| Vulnerabilidade | Risco | Correção |
|-----------------|-------|----------|
| Firestore rules desatualizadas | CRÍTICO | Regras completas para multi-tenant |
| Wallet sem proteção | CRÍTICO | Write bloqueado para clients |
| API sem autenticação | CRÍTICO | Firebase ID Token obrigatório |
| Webhook sem validação | ALTO | HMAC + timing-safe comparison |
| Sem rate limiting | ALTO | 5 req/min para pagamentos |
| CORS permissivo | MÉDIO | Origens restritas |
| Sem validação de input | MÉDIO | CPF, cartão, amounts validados |
| Replay attacks | MÉDIO | Deduplicação de webhooks |

---

## Estrutura de Dados

### Product (Produto da Loja)
```typescript
interface StoreProduct {
  id: string;
  academyId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  stockType: 'stock' | 'on_demand';
  stockQuantity?: number; // só se stockType === 'stock'
  isActive: boolean;
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Order (Pedido)
```typescript
interface StoreOrder {
  id: string;
  academyId: string;
  studentId: string;
  studentName: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'paid' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod?: 'pix' | 'card';
  paymentId?: string; // ID do AbacatePay
  pixCode?: string;
  pixQrCode?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  paidAt?: Date;
  deliveredAt?: Date;
}

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}
```

### FCM Token (para notificações)
```typescript
// Salvo em /users/{uid}/fcmTokens/{tokenId}
interface FCMToken {
  token: string;
  platform: 'ios' | 'android';
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Notas de Implementação

### AbacatePay
- API Key por academy armazenada no Firestore (academies/{id}.abacatePayApiKey)
- Webhook URL único: `https://[domain]/api/webhooks/abacate-pay`
- Webhook Secret global: variável de ambiente `ABACATEPAY_WEBHOOK_SECRET`
- Identificação do tenant via metadata no payload (academyId, studentId, financialId)
- Somente PIX para mensalidades
- PIX e Cartão para loja

### Fluxo de Identificação do Pagamento
1. App cria pagamento via API `/api/payments/create-*`
2. API envia para AbacatePay e recebe `pixQrCode.id` (transaction ID)
3. API salva em `walletTransactions` com: `{ academyId, studentId, financialId, abacatePayTransactionId }`
4. AbacatePay envia webhook com payload:
   ```json
   {
     "event": "billing.paid",
     "data": {
       "pixQrCode": { "id": "pix_char_xxx", "amount": 200, "status": "PAID" },
       "payment": { "amount": 200, "fee": 80, "method": "PIX" }
     },
     "devMode": false
   }
   ```
5. Webhook busca transação por `pixQrCode.id` usando `collectionGroup` query
6. Identifica `academyId` pelo path do documento encontrado
7. Atualiza financial/order e wallet da academy correta
8. Deduz `fee` do valor creditado na wallet (saldo = amount - fee)

### API Routes Disponíveis
| Rota | Método | Descrição |
|------|--------|-----------|
| /api/payments/create-pix | POST | Criar cobrança PIX para mensalidade |
| /api/payments/create-order-pix | POST | Criar cobrança PIX para pedido da loja |
| /api/payments/create-card | POST | Criar cobrança via cartão de crédito |
| /api/webhooks/abacate-pay | POST | Webhook para receber confirmações de pagamento |

### Notificações Push
- Usar Firebase Cloud Messaging (FCM)
- flutter_local_notifications para exibir notificações
- Triggers implementados via:
  - Cloud Functions (quando dados mudam no Firestore)
  - Webhook do AbacatePay (quando pagamentos são confirmados)
  - Cron jobs (verificação diária de pagamentos atrasados)

### Cloud Functions - Deploy
```bash
# Instalar dependências
cd functions && npm install

# Deploy das Cloud Functions
firebase deploy --only functions

# Deploy de uma função específica
firebase deploy --only functions:onFinancialCreated

# Ver logs das funções
firebase functions:log
```

### Cloud Functions - Funções Disponíveis
| Função | Tipo | Trigger | Descrição |
|--------|------|---------|-----------|
| onFinancialCreated | Firestore | onCreate | Notifica aluno sobre nova fatura |
| onCompetitionCreated | Firestore | onCreate | Notifica todos alunos sobre novo campeonato |
| onTimelineEventCreated | Firestore | onCreate | Notifica aluno sobre conquista/graduação |
| scheduledOverdueCheck | Scheduled | 9h diário | Verifica pagamentos atrasados |
| scheduledDueSoonReminder | Scheduled | 8h diário | Lembra alunos de pagamentos em 3 dias |
| sendAcademyNotification | HTTP Callable | Manual | Admin envia broadcast para alunos |
| sendUserNotification | HTTP Callable | Manual | Admin envia notificação específica |
