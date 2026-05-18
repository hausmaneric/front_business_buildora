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
        { id: 'materials', name: 'Materiais', iconKey: 'wallet', route: '/main/materials' },
        { id: 'equipments', name: 'Equipamentos', iconKey: 'database', route: '/main/equipments' },
        { id: 'occurrences', name: 'Ocorrências', iconKey: 'message', route: '/main/occurrences' }
      ]
    },
    {
      id: 'analises',
      name: 'Análises',
      items: [
        { id: 'reports', name: 'Relatórios', iconKey: 'chart', route: '/main/reports' },
        { id: 'documents', name: 'Documentos', iconKey: 'log', route: '/main/documents' }
      ]
    },
    {
      id: 'administracao',
      name: 'Administração',
      items: [
        { id: 'users', name: 'Usuários', iconKey: 'users', route: '/main/users' },
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
