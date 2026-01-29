import type { Metadata } from 'next';
import { Box, Container, Typography, Paper } from '@mui/material';

export const metadata: Metadata = {
  title: 'Política de Privacidade',
};

export default function PrivacyPage() {
  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', py: { xs: 4, sm: 6 } }}>
      <Container maxWidth="md">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 5 },
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              component="img"
              src="/bjjeasy_logo.png"
              alt="BJJEasy"
              sx={{ width: 80, height: 80, objectFit: 'contain', mb: 2 }}
            />
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Política de Privacidade
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Última atualização: 29 de janeiro de 2026
            </Typography>
          </Box>

          <Section title="1. Introdução">
            O BJJEasy (&quot;nós&quot;, &quot;nosso&quot; ou &quot;aplicativo&quot;) é um sistema de gestão para
            academias de Jiu-Jitsu. Esta Política de Privacidade descreve como coletamos, usamos,
            armazenamos e protegemos suas informações pessoais quando você utiliza nosso aplicativo
            móvel e serviços relacionados.
          </Section>

          <Section title="2. Informações que Coletamos">
            <SubSection title="2.1 Informações fornecidas por você:">
              <BulletList
                items={[
                  'Nome completo e dados de identificação',
                  'Endereço de e-mail',
                  'Número de telefone',
                  'Data de nascimento',
                  'Informações de faixa e graduação em Jiu-Jitsu',
                  'Foto de perfil (opcional)',
                  'Informações de pagamento e financeiras',
                  'Dados do responsável legal (quando aplicável)',
                ]}
              />
            </SubSection>
            <SubSection title="2.2 Informações coletadas automaticamente:">
              <BulletList
                items={[
                  'Dados de uso do aplicativo',
                  'Registros de presença e frequência',
                  'Informações do dispositivo (modelo, sistema operacional)',
                  'Endereço IP e dados de conexão',
                ]}
              />
            </SubSection>
          </Section>

          <Section title="3. Como Usamos suas Informações">
            Utilizamos suas informações para:
            <BulletList
              items={[
                'Gerenciar sua conta e perfil na academia',
                'Registrar presenças e frequência nas aulas',
                'Gerenciar graduações e progressão de faixas',
                'Processar pagamentos e gerenciar informações financeiras',
                'Enviar notificações relevantes sobre a academia',
                'Permitir comunicação entre alunos, professores e responsáveis',
                'Melhorar nossos serviços e experiência do usuário',
                'Gerar relatórios de gestão para a academia',
              ]}
            />
          </Section>

          <Section title="4. Compartilhamento de Informações">
            Suas informações podem ser compartilhadas com:
            <BulletList
              items={[
                'A academia de Jiu-Jitsu à qual você está vinculado, para fins de gestão',
                'Professores e instrutores autorizados da sua academia',
                'Responsáveis legais (no caso de alunos menores de idade)',
                'Prestadores de serviços de pagamento para processamento de transações',
                'Autoridades competentes, quando exigido por lei',
              ]}
            />
            Não vendemos, alugamos ou comercializamos suas informações pessoais com terceiros para
            fins de marketing.
          </Section>

          <Section title="5. Armazenamento e Segurança">
            Seus dados são armazenados em servidores seguros fornecidos pelo Google Firebase, com
            criptografia em trânsito e em repouso. Implementamos medidas técnicas e organizacionais
            adequadas para proteger suas informações contra acesso não autorizado, alteração,
            divulgação ou destruição.
          </Section>

          <Section title="6. Seus Direitos">
            Em conformidade com a Lei Geral de Proteção de Dados (LGPD), você tem direito a:
            <BulletList
              items={[
                'Acessar seus dados pessoais',
                'Corrigir dados incompletos, inexatos ou desatualizados',
                'Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários',
                'Solicitar a portabilidade dos seus dados',
                'Revogar o consentimento a qualquer momento',
                'Solicitar informações sobre o compartilhamento dos seus dados',
              ]}
            />
          </Section>

          <Section title="7. Retenção de Dados">
            Mantemos seus dados pessoais enquanto sua conta estiver ativa ou conforme necessário
            para fornecer nossos serviços. Ao encerrar sua conta, seus dados serão eliminados ou
            anonimizados em até 30 dias, exceto quando a retenção for necessária por obrigações
            legais.
          </Section>

          <Section title="8. Menores de Idade">
            O BJJEasy pode ser utilizado por menores de idade com o consentimento de seus
            responsáveis legais. Os responsáveis têm acesso e controle sobre os dados dos menores
            sob sua responsabilidade através do portal do responsável.
          </Section>

          <Section title="9. Alterações nesta Política">
            Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos sobre
            mudanças significativas através do aplicativo ou por e-mail. O uso continuado do
            aplicativo após as alterações constitui aceitação da política atualizada.
          </Section>

          <Section title="10. Contato">
            Para dúvidas, solicitações ou reclamações sobre esta Política de Privacidade ou sobre
            o tratamento dos seus dados pessoais, entre em contato conosco pelo e-mail:{' '}
            <strong>contato@bjjeasy.com.br</strong>
          </Section>
        </Paper>
      </Container>
    </Box>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        {title}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
        {children}
      </Typography>
    </Box>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mt: 1.5 }}>
      <Typography variant="subtitle2" fontWeight={600} component="span">
        {title}
      </Typography>
      {children}
    </Box>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <Box component="ul" sx={{ pl: 3, mt: 1, mb: 1 }}>
      {items.map((item) => (
        <Box component="li" key={item} sx={{ mb: 0.5 }}>
          {item}
        </Box>
      ))}
    </Box>
  );
}
