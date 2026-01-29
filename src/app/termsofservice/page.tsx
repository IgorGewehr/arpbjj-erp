import type { Metadata } from 'next';
import { Box, Container, Typography, Paper } from '@mui/material';

export const metadata: Metadata = {
  title: 'Termos de Serviço',
};

export default function TermsOfServicePage() {
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
              Termos de Serviço
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Última atualização: 29 de janeiro de 2026
            </Typography>
          </Box>

          <Section title="1. Aceitação dos Termos">
            Ao acessar e utilizar o aplicativo BJJEasy (&quot;Aplicativo&quot;), você concorda com
            estes Termos de Serviço. Se você não concorda com qualquer parte destes termos, não
            utilize o Aplicativo. O uso continuado do Aplicativo constitui aceitação integral
            destes Termos.
          </Section>

          <Section title="2. Descrição do Serviço">
            O BJJEasy é um sistema de gestão para academias de Jiu-Jitsu que oferece:
            <BulletList
              items={[
                'Gestão de alunos e matrículas',
                'Controle de presença e frequência',
                'Gerenciamento de graduações e faixas',
                'Gestão financeira e cobranças',
                'Portal do aluno com acompanhamento de progresso',
                'Portal do responsável para acompanhamento de menores',
                'Comunicação entre academia, alunos e responsáveis',
                'Relatórios e análises de gestão',
              ]}
            />
          </Section>

          <Section title="3. Cadastro e Conta">
            <SubSection title="3.1">
              Para utilizar o Aplicativo, é necessário criar uma conta utilizando um código de
              convite fornecido pela sua academia.
            </SubSection>
            <SubSection title="3.2">
              Você é responsável por manter a confidencialidade das suas credenciais de acesso
              (e-mail e senha).
            </SubSection>
            <SubSection title="3.3">
              As informações fornecidas no cadastro devem ser verdadeiras, precisas e atualizadas.
            </SubSection>
            <SubSection title="3.4">
              Você deve notificar imediatamente sobre qualquer uso não autorizado da sua conta.
            </SubSection>
          </Section>

          <Section title="4. Uso Adequado">
            Ao utilizar o Aplicativo, você se compromete a:
            <BulletList
              items={[
                'Usar o Aplicativo apenas para fins legítimos relacionados à gestão da academia',
                'Não compartilhar suas credenciais de acesso com terceiros',
                'Não tentar acessar dados de outros usuários sem autorização',
                'Não utilizar o Aplicativo para atividades ilegais ou não autorizadas',
                'Não interferir no funcionamento do Aplicativo ou de seus servidores',
                'Não realizar engenharia reversa, descompilar ou desmontar o Aplicativo',
                'Respeitar os direitos de propriedade intelectual do BJJEasy',
              ]}
            />
          </Section>

          <Section title="5. Planos e Pagamentos">
            <SubSection title="5.1">
              O BJJEasy oferece planos gratuitos e pagos. As funcionalidades disponíveis variam
              conforme o plano contratado pela academia.
            </SubSection>
            <SubSection title="5.2">
              Os pagamentos realizados através do Aplicativo são processados por serviços de
              pagamento terceirizados e estão sujeitos aos termos desses prestadores.
            </SubSection>
            <SubSection title="5.3">
              A academia é responsável pela gestão das cobranças de seus alunos. O BJJEasy atua
              como ferramenta de gestão, não como intermediador financeiro.
            </SubSection>
          </Section>

          <Section title="6. Propriedade Intelectual">
            <SubSection title="6.1">
              Todo o conteúdo do Aplicativo, incluindo mas não limitado a textos, gráficos, logos,
              ícones, imagens e software, é propriedade do BJJEasy ou de seus licenciadores.
            </SubSection>
            <SubSection title="6.2">
              O uso do Aplicativo não confere a você qualquer direito de propriedade sobre o
              conteúdo ou funcionalidades do BJJEasy.
            </SubSection>
            <SubSection title="6.3">
              Os dados inseridos por você no Aplicativo permanecem de sua propriedade, concedendo
              ao BJJEasy licença para processá-los conforme necessário para a prestação do serviço.
            </SubSection>
          </Section>

          <Section title="7. Responsabilidades da Academia">
            A academia que utiliza o BJJEasy como ferramenta de gestão é responsável por:
            <BulletList
              items={[
                'Garantir o consentimento adequado dos alunos e responsáveis para o uso do sistema',
                'Gerenciar corretamente os acessos e permissões dos seus usuários',
                'Manter atualizadas as informações cadastrais dos seus membros',
                'Cumprir a legislação aplicável, incluindo a LGPD, no tratamento dos dados',
              ]}
            />
          </Section>

          <Section title="8. Limitação de Responsabilidade">
            <SubSection title="8.1">
              O BJJEasy é fornecido &quot;como está&quot;. Não garantimos que o serviço será
              ininterrupto, livre de erros ou que atenderá todas as suas necessidades específicas.
            </SubSection>
            <SubSection title="8.2">
              Não nos responsabilizamos por perdas ou danos decorrentes de: indisponibilidade
              temporária do serviço, perda de dados causada por fatores externos, uso indevido do
              Aplicativo por terceiros, ou decisões tomadas com base em informações do sistema.
            </SubSection>
            <SubSection title="8.3">
              Nossa responsabilidade total está limitada ao valor pago pelo plano contratado nos
              últimos 12 meses.
            </SubSection>
          </Section>

          <Section title="9. Suspensão e Encerramento">
            <SubSection title="9.1">
              Reservamo-nos o direito de suspender ou encerrar sua conta em caso de violação destes
              Termos, uso fraudulento ou atividades que prejudiquem o funcionamento do Aplicativo.
            </SubSection>
            <SubSection title="9.2">
              Você pode encerrar sua conta a qualquer momento. Após o encerramento, seus dados
              serão tratados conforme nossa Política de Privacidade.
            </SubSection>
          </Section>

          <Section title="10. Alterações nos Termos">
            Podemos modificar estes Termos de Serviço a qualquer momento. Alterações significativas
            serão comunicadas com antecedência através do Aplicativo ou por e-mail. O uso
            continuado após as alterações implica aceitação dos novos Termos.
          </Section>

          <Section title="11. Legislação Aplicável">
            Estes Termos são regidos pelas leis da República Federativa do Brasil. Qualquer
            controvérsia será submetida ao foro da comarca do domicílio do usuário consumidor,
            conforme o Código de Defesa do Consumidor.
          </Section>

          <Section title="12. Contato">
            Para dúvidas sobre estes Termos de Serviço, entre em contato conosco pelo e-mail:{' '}
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
      <Typography variant="body1" color="text.secondary" component="div" sx={{ lineHeight: 1.8 }}>
        {children}
      </Typography>
    </Box>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mt: 1.5 }}>
      <Typography variant="subtitle2" fontWeight={600} component="span">
        {title}{' '}
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
