# Integração de APIs Externas de Notificação de Cobrança

## ✅ Implementação Concluída

As seguintes modificações foram implementadas com sucesso:

### 1. Cloud Functions (`/functions/src/index.ts`)
- ✅ Adicionado parâmetro `apiKey` em `sendWhatsAppNotification()` (linha 434)
- ✅ Adicionado parâmetro `apiKey` em `sendEmailNotification()` (linha 455)
- ✅ Adicionado header `x-api-key` nas requisições HTTP de ambas as funções
- ✅ Validação de API keys em `sendBillingNotifications()` (linha 480)
- ✅ Leitura de env vars `WHATSAPP_API_KEY` e `EMAIL_API_KEY`

### 2. Proxy Routes do Next.js
- ✅ `/src/app/api/billing/send-whatsapp/route.ts` - header `x-api-key` adicionado
- ✅ `/src/app/api/billing/send-email/route.ts` - header `x-api-key` adicionado
- ✅ Validação de existência de API keys antes de fazer requisições

### 3. Variáveis de Ambiente
- ✅ `/.env` (Next.js) - variáveis configuradas
- ✅ `/functions/.env` (Cloud Functions) - variáveis configuradas

---

## 📋 Configuração Necessária

### Desenvolvimento Local

**Arquivo: `/.env` (raiz do projeto Next.js)**
```env
WHATSAPP_API_URL=http://localhost:3001/api/send-whatsapp
EMAIL_API_URL=http://localhost:3001/api/send-email
WHATSAPP_API_KEY=<SUBSTITUIR_PELA_API_KEY_REAL>
EMAIL_API_KEY=<SUBSTITUIR_PELA_API_KEY_REAL>
```

**Arquivo: `/functions/.env` (Cloud Functions local)**
```env
WHATSAPP_API_URL=http://localhost:3001/api/send-whatsapp
EMAIL_API_URL=http://localhost:3001/api/send-email
WHATSAPP_API_KEY=<SUBSTITUIR_PELA_API_KEY_REAL>
EMAIL_API_KEY=<SUBSTITUIR_PELA_API_KEY_REAL>
```

### Produção (Firebase Cloud Functions)

#### Opção 1: Firebase CLI (Recomendado)
```bash
firebase functions:config:set \
  whatsapp.api_url="https://PRODUCTION_URL/api/send-whatsapp" \
  whatsapp.api_key="PRODUCTION_API_KEY" \
  email.api_url="https://PRODUCTION_URL/api/send-email" \
  email.api_key="PRODUCTION_API_KEY"
```

Depois, atualize o código para ler via `functions.config()`:
```typescript
const whatsappApiUrl = functions.config().whatsapp?.api_url || process.env.WHATSAPP_API_URL;
const whatsappApiKey = functions.config().whatsapp?.api_key || process.env.WHATSAPP_API_KEY;
const emailApiUrl = functions.config().email?.api_url || process.env.EMAIL_API_URL;
const emailApiKey = functions.config().email?.api_key || process.env.EMAIL_API_KEY;
```

#### Opção 2: Firebase Console UI
1. Acesse: https://console.firebase.google.com/project/arpjj-76350/functions
2. Vá em **Functions > Environment Variables**
3. Adicione:
   - `WHATSAPP_API_URL` = `https://...`
   - `WHATSAPP_API_KEY` = `...`
   - `EMAIL_API_URL` = `https://...`
   - `EMAIL_API_KEY` = `...`

### Produção (Netlify - Next.js)
1. Acesse: https://app.netlify.com/sites/bjjeasy/settings/deploys#environment
2. Adicione as variáveis:
   - `WHATSAPP_API_URL` = `https://...`
   - `WHATSAPP_API_KEY` = `...`
   - `EMAIL_API_URL` = `https://...`
   - `EMAIL_API_KEY` = `...`
3. Faça um novo deploy após adicionar as variáveis

---

## 🧪 Testes

### 1. Testes Locais

#### Iniciar Firebase Emulators
```bash
cd /Users/igorgewehr/WebstormProjects/marcusjj
firebase emulators:start
```

#### Simular Cloud Function Manualmente
No Firebase Console (http://localhost:4000), acesse **Functions** e execute:
- `scheduledOverdueCheck` (simula cron 9h AM)
- `scheduledDueSoonReminder` (simula cron 8h AM)

#### Verificar Logs
```bash
# Logs em tempo real
firebase emulators:start --only functions --inspect-functions

# Verificar se o header x-api-key está sendo enviado
# Use ferramentas como Postman, Burp Suite ou tcpdump
```

### 2. Verificações Essenciais

- [ ] **Notificação D-3 (pré-vencimento)** - enviada corretamente às 8h AM
- [ ] **Notificação D+1** - enviada no dia seguinte ao vencimento
- [ ] **Notificação D+30** - enviada após 30 dias de atraso
- [ ] **WhatsApp para guardian** - alunos `category: 'kids'` recebem no telefone do responsável
- [ ] **Email para guardian** - alunos `category: 'kids'` recebem no email do responsável
- [ ] **Notificações NÃO enviadas quando disabled** - `settings.whatsappEnabled: false` ou `settings.emailEnabled: false`
- [ ] **Logs criados em `billingContactLog`** - cada notificação gera um registro
- [ ] **Multi-tenancy** - Academia A ≠ Academia B (dados isolados)

### 3. Monitoramento Pós-Deploy

#### Firebase Console
```bash
# Acessar logs de produção
firebase functions:log --only scheduledOverdueCheck,scheduledDueSoonReminder
```

#### Métricas Esperadas
- Taxa de sucesso: **>95%**
- Latência média: **<2s** por notificação
- Erros 4xx/5xx: **<1%**

---

## 🔧 Estrutura de Payload

### Payload Enviado pelas Cloud Functions
```json
{
  "studentName": "João Silva",
  "studentId": "abc123",
  "financialId": "fin456",
  "academyId": "gym789",
  "academyName": "Academia XYZ",
  "amount": 15000,
  "amountFormatted": "R$ 150.00",
  "dueDate": "2026-02-01T00:00:00.000Z",
  "dueDateFormatted": "01/02/2026",
  "daysOverdue": 7,
  "stage": "D+7",
  "type": "billing_reminder",
  "phone": "5511999999999",
  "message": "João, URGENTE: sua mensalidade de R$ 150.00 da Academia XYZ esta atrasada ha 7 dias..."
}
```

### Payload Esperado pela API Externa (campos essenciais)
```json
{
  "phone": "5511999999999",
  "message": "João, URGENTE: sua mensalidade..."
}
```

**Nota:** A API externa deve **ignorar campos extras**. Se não ignorar, será necessário criar um adapter layer.

---

## 🚨 Pontos Críticos de Atenção

### Multi-Tenancy
- ✅ Cloud Functions iteram sobre `academies` collection
- ✅ Campo `academyId` obrigatório em `financials`
- ⚠️ **Testar:** Criar 2 academias e confirmar isolamento completo

### Guardians para Menores
- ✅ Lógica prioriza `guardianPhone/guardianEmail` quando `category === 'kids'`
- ⚠️ **Testar:** Aluno menor deve receber no telefone/email do responsável

### Estágios de Cobrança
- ✅ **D-3 (pré-vencimento):** `scheduledDueSoonReminder` às 8h AM
- ✅ **D+1, D+3, D+7, D+15, D+30:** `scheduledOverdueCheck` às 9h AM
- ⚠️ **Validar:** Notificações enviadas apenas nos dias exatos (não todos os dias)

### Configurações por Academia
- ✅ Lê `academies/{id}/settings/billingReminders`
- ✅ Campos: `whatsappEnabled`, `emailEnabled`, `messageTemplates`
- ⚠️ **Testar:** Desabilitar WhatsApp em uma academia e confirmar que só Email é enviado

### Logging
- ✅ Logs criados em `billingContactLog` com todos os campos
- ✅ Tipo: `'whatsapp'` ou `'email'`
- ✅ ContactedBy: `'system'` (para automático)

### Normalização de Telefone
- ✅ Adiciona prefixo `55` (DDI Brasil) se não houver
- ⚠️ **Testar:** Números com/sem DDI, com/sem DDD

---

## 📝 Checklist de Deploy

### Antes do Deploy
- [ ] Variáveis de ambiente configuradas (local + produção)
- [ ] API keys válidas e testadas
- [ ] Código TypeScript compilando sem erros (`npm run build`)
- [ ] URLs corretas (localhost para dev, produção para prod)

### Deploy
```bash
# Deploy Cloud Functions
cd /Users/igorgewehr/WebstormProjects/marcusjj
firebase deploy --only functions

# Deploy Next.js (Netlify auto-deploy via Git push)
git add .
git commit -m "feat: integração de APIs externas de notificação de cobrança com x-api-key"
git push origin main
```

### Pós-Deploy
- [ ] Aguardar execução agendada (8h AM ou 9h AM horário de Brasília)
- [ ] Monitorar logs no Firebase Console
- [ ] Verificar taxa de sucesso (>95%)
- [ ] Confirmar que não há duplicatas
- [ ] Feedback positivo das academias

---

## 🐛 Troubleshooting

### Erro: "WHATSAPP_API_KEY not configured"
**Causa:** Variável de ambiente não definida
**Solução:** Verificar se a variável está no `.env` correto e se foi carregada

### Erro: "x-api-key header missing" (da API externa)
**Causa:** Header não está sendo enviado
**Solução:** Verificar se a implementação está passando o header corretamente

### Notificações não sendo enviadas
**Causa 1:** `settings.whatsappEnabled: false` ou `settings.emailEnabled: false`
**Solução:** Verificar configurações da academia em `academies/{id}/settings/billingReminders`

**Causa 2:** Aluno sem telefone/email cadastrado
**Solução:** Verificar campos `phone`, `email`, `guardian.phone`, `guardian.email` no documento do aluno

**Causa 3:** Dia não é um stage day exato
**Solução:** Notificações são enviadas apenas em D-3, D+1, D+3, D+7, D+15, D+30 (ou diariamente após D+30)

### Duplicatas de notificações
**Causa:** Lógica de stage day não está validando corretamente
**Solução:** Verificar lógica `BILLING_STAGE_DAYS.includes(daysOverdue)` em `scheduledOverdueCheck`

---

## 📚 Referências

- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Cloud Functions Scheduled](https://firebase.google.com/docs/functions/schedule-functions)
- [Firebase Environment Variables](https://firebase.google.com/docs/functions/config-env)
- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/overview/)

---

## 🔄 Próximos Passos (Opcional)

1. **Implementar retry mechanism** - Retentar envio em caso de falha temporária
2. **Rate limiting** - Evitar sobrecarga da API externa
3. **Metrics dashboard** - Dashboard para visualizar taxa de sucesso, latência, erros
4. **A/B testing de templates** - Testar diferentes mensagens para otimizar conversão
5. **Webhooks de confirmação** - Receber confirmação de entrega da API externa

---

**Data de Implementação:** 2026-02-08
**Versão:** 1.0.0
**Status:** ✅ Implementado - Aguardando Configuração de API Keys
