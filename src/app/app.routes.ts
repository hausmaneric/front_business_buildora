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
          subtitle: 'Controle dos diários registrados por obra, data e status',
          resource: 'diaries'
        }
      },
      {
        path: 'activities',
        component: AdminResourcePageComponent,
        data: {
          title: 'Atividades',
          subtitle: 'Atividades produtivas registradas nos diários das obras',
          resource: 'activities'
        }
      },
      {
        path: 'teams',
        component: AdminResourcePageComponent,
        data: {
          title: 'Equipes',
          subtitle: 'Equipes vinculadas às obras, responsáveis e status de atuação',
          resource: 'teams'
        }
      },
      {
        path: 'materials',
        component: AdminResourcePageComponent,
        data: {
          title: 'Materiais',
          subtitle: 'Materiais consumidos, recebidos ou movimentados nos diários',
          resource: 'materials'
        }
      },
      {
        path: 'equipments',
        component: AdminResourcePageComponent,
        data: {
          title: 'Equipamentos',
          subtitle: 'Equipamentos, horas de uso e status operacional registrados nas obras',
          resource: 'equipments'
        }
      },
      {
        path: 'occurrences',
        component: AdminResourcePageComponent,
        data: {
          title: 'Ocorrências',
          subtitle: 'Incidentes, problemas e apontamentos abertos nos diários da obra',
          resource: 'occurrences'
        }
      },
      {
        path: 'reports',
        component: AdminOpsPageComponent,
        data: {
          title: 'Relatórios',
          subtitle: 'Resumo executivo das obras, produtividade e evolução dos diários',
          resource: 'reports'
        }
      },
      {
        path: 'documents',
        component: AdminResourcePageComponent,
        data: {
          title: 'Documentos',
          subtitle: 'Arquivos, fotos e anexos vinculados aos diários das obras',
          resource: 'documents'
        }
      },
      {
        path: 'users',
        component: AdminResourcePageComponent,
        data: {
          title: 'Usuários',
          subtitle: 'Pessoas da empresa com acesso ao ambiente empresarial',
          resource: 'users'
        }
      },
      {
        path: 'settings',
        component: AdminOpsPageComponent,
        data: {
          title: 'Configurações',
          subtitle: 'Metadados do tenant, catálogos, perfis e parâmetros de operação',
          resource: 'settings'
        }
      }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
