# Plano de Migração Multi-Tenant - Sprints Implementadas

## Branch: `feature/multi-tenant-v2`

---

## Sprint 1: Estrutura Base Multi-Tenant ✅

### Arquivos Criados:
- `src/types/index.ts` - Novos tipos adicionados:
  - `Academy` - Modelo de academia/tenant
  - `UserAcademyMapping` - Mapeamento usuário-academia
  - `AcademyUser` - Usuário dentro de uma academia
  - `Notification` - Modelo de notificação
  - `NotificationType`, `NotificationPriority` - Enums
  - `WalletTransaction`, `AcademyWallet` - Tipos de wallet
  - `FinancialPaymentLink`, `FinancialWithPayment` - Pagamento via AbacatePay

- `src/contexts/AcademyContext.tsx` - Context para academia ativa
- `src/contexts/NotificationContext.tsx` - Context para notificações
- `src/contexts/index.ts` - Exportações
- `src/lib/firebase/collections.ts` - Helpers para paths multi-tenant

### Arquivos Modificados:
- `src/lib/firebase/index.ts` - Exportar collections helpers
- `src/components/providers/ClientProviders.tsx` - Adicionar AcademyProvider e NotificationProvider

---

## Sprint 2: Services Multi-Tenant ✅

### Arquivos Modificados:
- `src/services/studentService.ts` - Convertido para classe com factory `createStudentService(academyId)`
- `src/services/settingsService.ts` - Convertido para classe com factory `createSettingsService(academyId)`

### Padrão de Migração:
```typescript
// Factory Function
export function createStudentService(academyId: string): StudentService {
  return new StudentService(academyId);
}

// Legacy export para compatibilidade
export const studentService = {
  method: (...args) => new StudentService(DEFAULT_ACADEMY_ID).method(...args),
};
```

---

## Sprint 3: Integração AbacatePay ✅

### Arquivos Criados:
- `src/services/abacatePayService.ts` - Serviço completo de integração:
  - `createPixPayment()` - Criar pagamento PIX
  - `handleWebhook()` - Processar webhooks
  - `getWallet()` - Obter saldo da wallet
  - `getTransactions()` - Listar transações
  - `requestWithdrawal()` - Solicitar saque

### Arquivos Criados:
- `src/services/notificationService.ts` - Serviço de notificações:
  - Templates para cada tipo de notificação
  - Métodos `notifyPaymentReceived`, `notifyGraduationEligible`, etc.

---

## Sprint 4: Login Genérico ✅

### Arquivos Modificados:
- `src/app/login/page.tsx` - Design moderno e minimalista:
  - Removida logo específica
  - Ícone Shield genérico
  - Gradientes suaves no background
  - Animações com Framer Motion
  - Layout glassmorphism

---

## Sprint 5: Componentes de UI ✅

### Arquivos Criados:
- `src/components/features/financial/PaymentDialog.tsx` - Dialog de pagamento PIX:
  - QR Code display
  - Código copia e cola
  - Timer de expiração
  - Estados de loading/pago

- `src/components/features/notifications/NotificationBell.tsx` - Sino de notificações:
  - Badge com contador
  - Popover com lista
  - Marcar como lida
  - Navegação para ação

---

## Sprint 6: Configurações Expandidas ✅

### Arquivos Modificados:
- `src/app/configuracoes/page.tsx` - Novas seções:
  - **Logo Upload**: Upload de logo da academia
  - **Graduação Automática**: Toggle + número de presenças
  - **Configurações PIX**: Tipo e chave PIX
  - **AbacatePay**: Toggle para pagamentos pela plataforma

---

## Sprint 7: Exports e Index ✅

### Arquivos Modificados:
- `src/services/index.ts` - Novos exports:
  - `createStudentService`
  - `createSettingsService`
  - `createNotificationService`
  - `createAbacatePayService`

---

## Sprint 8: Capacitor Mobile ✅

### Arquivos Criados:
- `capacitor.config.ts` - Configuração Capacitor:
  - SplashScreen
  - StatusBar
  - PushNotifications
  - Keyboard handling

### Arquivos Modificados:
- `package.json` - Scripts e dependências:
  - `@capacitor/core`, `@capacitor/cli`
  - `@capacitor/app`, `@capacitor/haptics`
  - `@capacitor/push-notifications`
  - Scripts: `mobile:build`, `mobile:android`, `mobile:ios`

---

## Estrutura de Collections Firebase (Multi-Tenant)

```
firestore/
├── academies/{academyId}
│   ├── name, slug, logoUrl, ...
│   ├── abacatePayEnabled, abacatePayApiKey
│   ├── autoGraduationEnabled, autoGraduationAttendances
│   ├── pixKey, pixKeyType
│   │
│   ├── users/{userId}
│   ├── students/{studentId}
│   ├── classes/{classId}
│   ├── attendance/{attendanceId}
│   ├── financials/{financialId}
│   ├── achievements/{achievementId}
│   ├── beltProgressions/{progressionId}
│   ├── plans/{planId}
│   ├── linkCodes/{codeId}
│   ├── notifications/{notificationId}
│   ├── walletTransactions/{transactionId}
│   └── wallet/balance
│
└── userAcademyMapping/{userId}
    ├── academyIds[]
    └── primaryAcademyId
```

---

## Próximos Passos (Pendentes)

### Refatorar Services Restantes:
- [x] `classService.ts` ✅
- [x] `attendanceService.ts` ✅
- [x] `financialService.ts` ✅
- [x] `achievementService.ts` ✅
- [ ] `beltProgressionService.ts`
- [ ] `planService.ts`
- [ ] `linkCodeService.ts`
- [ ] `competitionService.ts`
- [ ] `competitionEnrollmentService.ts`
- [ ] `assessmentService.ts`

### Atualizar Hooks:
- [ ] `useStudents.ts` - usar `createStudentService`
- [ ] `useFinancial.ts` - usar factory functions
- [ ] `useAttendance.ts` - usar factory functions
- [ ] Demais hooks

### Firestore Rules:
- [ ] Atualizar `firestore.rules` para multi-tenant
- [ ] Adicionar validação de `academyId`

### Testes:
- [ ] Configurar novo Firebase project para testes
- [ ] Testar fluxo completo de onboarding
- [ ] Testar pagamento via AbacatePay

---

## Comandos para Mobile

```bash
# Instalar dependências do Capacitor
npm install

# Build estático + sync
npm run mobile:build

# Abrir projeto Android
npm run mobile:android

# Abrir projeto iOS
npm run mobile:ios
```

---

## Variáveis de Ambiente Necessárias

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Academy padrão (para compatibilidade)
NEXT_PUBLIC_DEFAULT_ACADEMY_ID=default
```
