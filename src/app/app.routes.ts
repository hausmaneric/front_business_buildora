import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { MainComponent } from './components/main/main.component';
import { DashboardComponent } from './components/main/dashboard/dashboard.component';
import { AdminResourcePageComponent } from './components/main/admin-resource-page/admin-resource-page.component';
import { AdminOpsPageComponent } from './components/main/admin-ops-page/admin-ops-page.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  {
    path: 'main',
    component: MainComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        component: DashboardComponent,
        data: {
          title: 'Dashboard',
          subtitle: 'Visão geral da empresa'
        }
      },
      {
        path: 'clients',
        component: AdminResourcePageComponent,
        data: {
          title: 'Clientes',
          subtitle: 'Cadastro de clientes da construtora para vínculo direto com as obras',
          resource: 'clients'
        }
      },
      {
        path: 'employees',
        component: AdminResourcePageComponent,
        data: {
          title: 'Funcionários',
          subtitle: 'Cadastro de funcionários para compor equipes, obras e operação de campo',
          resource: 'employees'
        }
      },
      {
        path: 'projects',
        component: AdminResourcePageComponent,
        data: {
          title: 'Obras',
          subtitle: 'Cadastro, orçamento e acompanhamento das obras da empresa',
          resource: 'projects'
        }
      },
      {
        path: 'diaries',
        component: AdminResourcePageComponent,
        data: {
          title: 'Diários de Obra',
          subtitle: 'Consulta, edição, aprovação e reprovação dos diários das obras',
          resource: 'diaries'
        }
      },
      {
        path: 'activities',
        component: AdminResourcePageComponent,
        data: {
          title: 'Atividades',
          subtitle: 'Serviços executados, produtividade e apontamentos operacionais',
          resource: 'activities'
        }
      },
      {
        path: 'teams',
        component: AdminResourcePageComponent,
        data: {
          title: 'Equipes',
          subtitle: 'Equipes vinculadas às obras, funções e alocações de campo',
          resource: 'teams'
        }
      },
      {
        path: 'team-members',
        component: AdminResourcePageComponent,
        data: {
          title: 'Membros da Equipe',
          subtitle: 'Funcionários vinculados às equipes com função e composição operacional',
          resource: 'teamMembers'
        }
      },
      {
        path: 'materials',
        component: AdminResourcePageComponent,
        data: {
          title: 'Materiais',
          subtitle: 'Entradas, consumo e observações de materiais por diário',
          resource: 'materials'
        }
      },
      {
        path: 'equipments',
        component: AdminResourcePageComponent,
        data: {
          title: 'Equipamentos',
          subtitle: 'Máquinas, ferramentas, uso diário e manutenção operacional',
          resource: 'equipments'
        }
      },
      {
        path: 'occurrences',
        component: AdminResourcePageComponent,
        data: {
          title: 'Ocorrências',
          subtitle: 'Severidade, resolução e acompanhamento das ocorrências das obras',
          resource: 'occurrences'
        }
      },
      {
        path: 'reports',
        component: AdminOpsPageComponent,
        data: {
          title: 'Relatórios',
          subtitle: 'Relatórios executivos, produtividade, diários e consolidados por obra',
          resource: 'reports'
        }
      },
      {
        path: 'documents',
        component: AdminResourcePageComponent,
        data: {
          title: 'Documentos',
          subtitle: 'Contratos, ARTs, plantas, anexos e organização documental do tenant',
          resource: 'documents'
        }
      },
      {
        path: 'users',
        component: AdminResourcePageComponent,
        data: {
          title: 'Usuários',
          subtitle: 'Gestores, engenheiros, encarregados e usuários operacionais da empresa',
          resource: 'users'
        }
      },
      {
        path: 'permissions',
        component: AdminOpsPageComponent,
        data: {
          title: 'Permissões',
          subtitle: 'Perfis de acesso, visibilidade, edição, aprovação e governança operacional',
          resource: 'permissions'
        }
      },
      {
        path: 'photos',
        component: AdminOpsPageComponent,
        data: {
          title: 'Fotos',
          subtitle: 'Galeria por obra, diário, data e tipo de arquivo',
          resource: 'photos'
        }
      },
      {
        path: 'climate',
        component: AdminOpsPageComponent,
        data: {
          title: 'Clima',
          subtitle: 'Clima informado nos diários e impactos operacionais nas obras',
          resource: 'climate'
        }
      },
      {
        path: 'signatures',
        component: AdminOpsPageComponent,
        data: {
          title: 'Assinaturas',
          subtitle: 'Fluxo de assinatura, aprovação e conformidade dos diários',
          resource: 'signatures'
        }
      },
      {
        path: 'schedule',
        component: AdminOpsPageComponent,
        data: {
          title: 'Cronograma',
          subtitle: 'Prazo, andamento e marcos das obras em execução',
          resource: 'schedule'
        }
      },
      {
        path: 'measurements',
        component: AdminOpsPageComponent,
        data: {
          title: 'Medições',
          subtitle: 'Quantidades executadas, avanço físico e acompanhamento por obra',
          resource: 'measurements'
        }
      },
      {
        path: 'budget',
        component: AdminOpsPageComponent,
        data: {
          title: 'Orçamento x Realizado',
          subtitle: 'Comparativo de orçamento, consumo e execução das obras',
          resource: 'budget'
        }
      },
      {
        path: 'finance',
        component: AdminOpsPageComponent,
        data: {
          title: 'Financeiro da Obra',
          subtitle: 'Controle financeiro operacional, custos e alocação por obra',
          resource: 'finance'
        }
      },
      {
        path: 'safety',
        component: AdminOpsPageComponent,
        data: {
          title: 'Checklist de Segurança',
          subtitle: 'Checklist, conformidade e ações corretivas de segurança',
          resource: 'safety'
        }
      },
      {
        path: 'epi',
        component: AdminOpsPageComponent,
        data: {
          title: 'EPI',
          subtitle: 'Controle de entrega, uso e conformidade de equipamentos de proteção',
          resource: 'epi'
        }
      },
      {
        path: 'whatsapp',
        component: AdminOpsPageComponent,
        data: {
          title: 'Integração com WhatsApp',
          subtitle: 'Fluxos de comunicação operacional e compartilhamento externo',
          resource: 'whatsapp'
        }
      },
      {
        path: 'approval-flow',
        component: AdminOpsPageComponent,
        data: {
          title: 'Aprovação por Fluxo',
          subtitle: 'Filas, aprovações pendentes e governança do fluxo operacional',
          resource: 'approval-flow'
        }
      },
      {
        path: 'pdf-automation',
        component: AdminOpsPageComponent,
        data: {
          title: 'Envio Automático de PDF',
          subtitle: 'Automação de fechamento, exportação e entrega de relatórios',
          resource: 'pdf-automation'
        }
      },
      {
        path: 'bi',
        component: AdminOpsPageComponent,
        data: {
          title: 'BI e Indicadores',
          subtitle: 'Painéis, indicadores e leituras gerenciais da operação',
          resource: 'bi'
        }
      },
      {
        path: 'map',
        component: AdminOpsPageComponent,
        data: {
          title: 'Mapa das Obras',
          subtitle: 'Geolocalização, distribuição territorial e leitura geográfica das obras',
          resource: 'map'
        }
      },
      {
        path: 'integrations',
        component: AdminOpsPageComponent,
        data: {
          title: 'Integrações',
          subtitle: 'Google Drive, OneDrive e conectores documentais da empresa',
          resource: 'integrations'
        }
      },
      {
        path: 'digital-signature',
        component: AdminOpsPageComponent,
        data: {
          title: 'Assinatura Digital Avançada',
          subtitle: 'Rastreio, elegibilidade e governança da assinatura digital dos diários',
          resource: 'digital-signature'
        }
      },
      {
        path: 'settings',
        component: AdminOpsPageComponent,
        data: {
          title: 'Configurações',
          subtitle: 'Dados da empresa, padrões, governança e base operacional do tenant',
          resource: 'settings'
        }
      }
    ]
  }
];
