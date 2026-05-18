import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { AdminDataService } from '../../../services/admin-data.service';
import { LoginService } from '../../../services/login.service';

type MenuItem = {
  id: string;
  name: string;
  iconKey: string;
  route: string;
};

type MenuSection = {
  id: string;
  name: string;
  items: MenuItem[];
};

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss'
})
export class MenuComponent {
  userName = 'Usuário';
  currentRoute = '';

  dashboardItem: MenuItem = {
    id: 'dashboard',
    name: 'Dashboard',
    iconKey: 'home',
    route: '/main/dashboard'
  };

  sections: MenuSection[] = [
    {
      id: 'operacao',
      name: 'Operação',
      items: [
        { id: 'projects', name: 'Obras', iconKey: 'briefcase', route: '/main/projects' },
        { id: 'diaries', name: 'Diários de Obra', iconKey: 'receipt', route: '/main/diaries' },
        { id: 'activities', name: 'Atividades', iconKey: 'grid', route: '/main/activities' },
        { id: 'teams', name: 'Equipes', iconKey: 'users', route: '/main/teams' },
        { id: 'users', name: 'Usuários', iconKey: 'users', route: '/main/users' },
        { id: 'permissions', name: 'Permissões', iconKey: 'settings', route: '/main/permissions' },
        { id: 'photos', name: 'Fotos', iconKey: 'message', route: '/main/photos' },
        { id: 'climate', name: 'Clima', iconKey: 'chart', route: '/main/climate' },
        { id: 'signatures', name: 'Assinaturas', iconKey: 'log', route: '/main/signatures' }
      ]
    },
    {
      id: 'campo',
      name: 'Campo',
      items: [
        { id: 'materials', name: 'Materiais', iconKey: 'wallet', route: '/main/materials' },
        { id: 'equipments', name: 'Equipamentos', iconKey: 'database', route: '/main/equipments' },
        { id: 'occurrences', name: 'Ocorrências', iconKey: 'message', route: '/main/occurrences' },
        { id: 'safety', name: 'Checklist de Segurança', iconKey: 'log', route: '/main/safety' },
        { id: 'epi', name: 'EPI', iconKey: 'briefcase', route: '/main/epi' }
      ]
    },
    {
      id: 'planejamento',
      name: 'Planejamento',
      items: [
        { id: 'schedule', name: 'Cronograma', iconKey: 'chart', route: '/main/schedule' },
        { id: 'measurements', name: 'Medições', iconKey: 'grid', route: '/main/measurements' },
        { id: 'budget', name: 'Orçamento x Realizado', iconKey: 'wallet', route: '/main/budget' },
        { id: 'finance', name: 'Financeiro', iconKey: 'wallet', route: '/main/finance' },
        { id: 'approval-flow', name: 'Aprovação por Fluxo', iconKey: 'log', route: '/main/approval-flow' }
      ]
    },
    {
      id: 'analises',
      name: 'Análises',
      items: [
        { id: 'reports', name: 'Relatórios', iconKey: 'chart', route: '/main/reports' },
        { id: 'bi', name: 'BI e Indicadores', iconKey: 'chart', route: '/main/bi' },
        { id: 'map', name: 'Mapa das Obras', iconKey: 'database', route: '/main/map' },
        { id: 'documents', name: 'Documentos', iconKey: 'log', route: '/main/documents' }
      ]
    },
    {
      id: 'integracoes',
      name: 'Integrações',
      items: [
        { id: 'whatsapp', name: 'WhatsApp', iconKey: 'message', route: '/main/whatsapp' },
        { id: 'pdf-automation', name: 'Envio Automático de PDF', iconKey: 'receipt', route: '/main/pdf-automation' },
        { id: 'integrations', name: 'Drive / OneDrive', iconKey: 'database', route: '/main/integrations' },
        { id: 'digital-signature', name: 'Assinatura Digital', iconKey: 'settings', route: '/main/digital-signature' },
        { id: 'settings', name: 'Configurações', iconKey: 'settings', route: '/main/settings' }
      ]
    }
  ];

  constructor(
    private router: Router,
    private adminDataService: AdminDataService,
    public loginService: LoginService
  ) {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.currentRoute = this.router.url;
      });
  }

  ngOnInit(): void {
    this.userName = this.loginService.getLocalToken()?.user?.name ?? 'Usuário';
    this.currentRoute = this.router.url;
  }

  isActive(route: string): boolean {
    return this.currentRoute === route;
  }

  navigate(route: string): void {
    if (this.currentRoute === route) {
      return;
    }
    this.currentRoute = route;
    void this.router.navigate([route]);
  }

  logout(): void {
    this.adminDataService.clearCache();
    this.loginService.clearToken();
    void this.router.navigate(['/login']);
  }
}
