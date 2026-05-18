import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { TextBoxModule } from '@syncfusion/ej2-angular-inputs';
import { Observable, finalize, forkJoin } from 'rxjs';
import {
  BusinessActivity,
  BusinessDiary,
  BusinessDocument,
  BusinessOccurrence,
  BusinessProject,
  BusinessUser,
  TenantMetadataRole
} from '../../../models/admin-resource';
import { AdminDataService } from '../../../services/admin-data.service';
import { LoginService } from '../../../services/login.service';

@Component({
  selector: 'app-admin-ops-page',
  standalone: true,
  imports: [CommonModule, ButtonModule, TextBoxModule],
  templateUrl: './admin-ops-page.component.html',
  styleUrl: './admin-ops-page.component.scss'
})
export class AdminOpsPageComponent {
  title = '';
  subtitle = '';
  resource: 'reports' | 'settings' = 'reports';
  loading = true;
  errorMessage = '';
  cards: Array<{ label: string; value: string; detail: string; tone?: string }> = [];
  rows: any[] = [];
  filteredRows: any[] = [];
  columns: Array<{ field: string; headerText: string; width?: number; type?: 'badge' }> = [];
  panels: Array<{ title: string; lines: string[] }> = [];
  searchTerm = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private loginService: LoginService,
    private adminDataService: AdminDataService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      this.title = data['title'] ?? 'Operações';
      this.subtitle = data['subtitle'] ?? '';
      this.resource = data['resource'] ?? 'reports';
      this.resetState();
      this.load();
    });
  }

  load(): void {
    const token = this.loginService.getToken();
    if (!token) {
      this.redirectToLogin();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.requestFor(this.resource, token)
      .pipe(finalize(() => {
        this.loading = false;
        this.flushView();
      }))
      .subscribe({
        next: (payload) => this.mapPayload(payload),
        error: (error) => {
          const message = error?.error?.message || 'Falha ao carregar dados do módulo.';
          if (this.isAuthenticationFailure(message)) {
            this.redirectToLogin();
            return;
          }
          this.errorMessage = message;
        }
      });
  }

  onSearch(term: string): void {
    this.searchTerm = term ?? '';
    this.applyFilter();
  }

  totalRowsLabel(): string {
    const total = this.rows.length;
    const filtered = this.filteredRows.length;
    return filtered === total ? `${total} registros` : `${filtered} de ${total} registros`;
  }

  totalRowsMinWidth(): number {
    return this.columns.reduce((sum, column) => sum + Number(column.width || 180), 0);
  }

  isBadgeField(column: { type?: string }): boolean {
    return column.type === 'badge';
  }

  badgeTone(value: any): string {
    const text = String(value ?? '').toLowerCase();
    if (text.includes('ativo') || text.includes('online') || text.includes('ok') || text.includes('aprovado')) return 'success';
    if (text.includes('atenção') || text.includes('pendente') || text.includes('média')) return 'warning';
    if (text.includes('crítica') || text.includes('alto') || text.includes('reprovado') || text.includes('bloqueado')) return 'danger';
    return 'neutral';
  }

  private requestFor(resource: 'reports' | 'settings', token: string): Observable<any> {
    if (resource === 'reports') {
      return forkJoin({
        projects: this.adminDataService.projects(token),
        diaries: this.adminDataService.diaries(token),
        occurrences: this.adminDataService.occurrences(token),
        activities: this.adminDataService.activities(token),
        documents: this.adminDataService.documents(token),
        users: this.adminDataService.tenantUsers(token)
      });
    }

    return forkJoin({
      metadata: this.adminDataService.tenantMetadata(token),
      companies: this.adminDataService.tenantCompanies(token),
      users: this.adminDataService.tenantUsers(token),
      projects: this.adminDataService.projects(token),
      teams: this.adminDataService.teams(token)
    });
  }

  private mapPayload(payload: any): void {
    this.cards = [];
    this.rows = [];
    this.filteredRows = [];
    this.columns = [];
    this.panels = [];

    if (this.resource === 'reports') {
      this.mapReports(payload);
    } else {
      this.mapSettings(payload);
    }

    this.applyFilter();
    this.flushView();
  }

  private mapReports(payload: any): void {
    const projects = this.items<BusinessProject>(payload.projects?.data);
    const diaries = this.items<BusinessDiary>(payload.diaries?.data);
    const occurrences = this.items<BusinessOccurrence>(payload.occurrences?.data);
    const activities = this.items<BusinessActivity>(payload.activities?.data);
    const documents = this.items<BusinessDocument>(payload.documents?.data);
    const users = this.items<BusinessUser>(payload.users?.data);

    const approvedDiaries = diaries.filter((item) => this.diaryStatus(item.status) === 'Aprovado').length;
    const openOccurrences = occurrences.filter((item) => !this.toBoolean(item.resolved)).length;
    const productivity = projects.length ? Math.min(100, Math.max(42, Math.round((activities.length / Math.max(projects.length, 1)) * 11))) : 0;

    this.cards = [
      { label: 'Obras cadastradas', value: `${projects.length}`, detail: 'Base operacional da empresa' },
      { label: 'Diários aprovados', value: `${approvedDiaries}`, detail: `${diaries.length} diários lançados`, tone: 'success' },
      { label: 'Ocorrências abertas', value: `${openOccurrences}`, detail: 'Demandam acompanhamento', tone: openOccurrences ? 'warning' : 'success' },
      { label: 'Produtividade estimada', value: `${productivity}%`, detail: `${activities.length} atividades registradas` }
    ];

    this.rows = projects.map((project) => {
      const projectDiaries = diaries.filter((item) => Number(item.project_id) === Number(project.id));
      const projectOccurrences = occurrences.filter((item) =>
        projectDiaries.some((diary) => Number(diary.id) === Number(item.daily_log_id)) && !this.toBoolean(item.resolved)
      );
      const projectActivities = activities.filter((item) =>
        projectDiaries.some((diary) => Number(diary.id) === Number(item.daily_log_id))
      );

      return {
        obra: project.name,
        codigo: project.code,
        cliente: project.client_name || 'Sem cliente',
        diarios: `${projectDiaries.length}`,
        atividades: `${projectActivities.length}`,
        ocorrencias: `${projectOccurrences.length}`,
        prazo: this.formatDate(project.end_date),
        situacao: this.projectStatus(project.status)
      };
    });

    this.columns = [
      { field: 'obra', headerText: 'Obra', width: 260 },
      { field: 'codigo', headerText: 'Código', width: 130 },
      { field: 'cliente', headerText: 'Cliente', width: 220 },
      { field: 'diarios', headerText: 'Diários', width: 110 },
      { field: 'atividades', headerText: 'Atividades', width: 120 },
      { field: 'ocorrencias', headerText: 'Ocorrências', width: 130 },
      { field: 'prazo', headerText: 'Prazo', width: 140 },
      { field: 'situacao', headerText: 'Situação', width: 160, type: 'badge' }
    ];

    this.panels = [
      {
        title: 'Resumo operacional',
        lines: [
          `${users.filter((item) => this.toBoolean(item.active)).length} usuários ativos no tenant`,
          `${documents.length} documentos vinculados aos diários`,
          `${activities.length} atividades produtivas registradas`
        ]
      },
      {
        title: 'Leituras úteis',
        lines: [
          approvedDiaries ? `${approvedDiaries} diários já aprovados pela gestão` : 'Nenhum diário aprovado ainda',
          openOccurrences ? `${openOccurrences} ocorrências continuam abertas` : 'Não há ocorrências pendentes',
          productivity ? `Produtividade estimada em ${productivity}%` : 'Produtividade ainda sem base suficiente'
        ]
      }
    ];
  }

  private mapSettings(payload: any): void {
    const metadata = payload.metadata?.data ?? {};
    const companies = this.items<any>(payload.companies?.data);
    const users = this.items<BusinessUser>(payload.users?.data);
    const projects = this.items<BusinessProject>(payload.projects?.data);
    const teams = this.items<any>(payload.teams?.data);
    const roles = Array.isArray(metadata.roles) ? (metadata.roles as TenantMetadataRole[]) : [];
    const company = companies[0];

    this.cards = [
      {
        label: 'Empresa base',
        value: company?.fantasy_name || company?.corporate_name || 'Buildora Cliente 001',
        detail: company?.email || 'Sem e-mail cadastrado'
      },
      {
        label: 'Perfis disponíveis',
        value: `${roles.length}`,
        detail: 'Perfis prontos para operação'
      },
      {
        label: 'Usuários ativos',
        value: `${users.filter((item) => this.toBoolean(item.active)).length}`,
        detail: `${users.length} usuários cadastrados`
      },
      {
        label: 'Equipes cadastradas',
        value: `${teams.length}`,
        detail: `${projects.length} obras vinculadas`
      }
    ];

    this.rows = users.map((user) => ({
      usuario: user.name,
      email: user.email,
      empresa: company?.fantasy_name || company?.corporate_name || 'Tenant principal',
      perfil: roles.find((role) => Number(role.id) === Number(user.role_id))?.name || 'Usuário',
      telefone: user.phone || 'Não informado',
      situacao: this.toBoolean(user.active) ? 'Ativo' : 'Inativo'
    }));

    this.columns = [
      { field: 'usuario', headerText: 'Usuário', width: 220 },
      { field: 'email', headerText: 'E-mail', width: 280 },
      { field: 'empresa', headerText: 'Empresa', width: 220 },
      { field: 'perfil', headerText: 'Perfil', width: 180 },
      { field: 'telefone', headerText: 'Telefone', width: 160 },
      { field: 'situacao', headerText: 'Situação', width: 140, type: 'badge' }
    ];

    this.panels = [
      {
        title: 'Dados da empresa',
        lines: [
          `Nome fantasia: ${company?.fantasy_name || 'Não informado'}`,
          `Razão social: ${company?.corporate_name || 'Não informado'}`,
          `Documento: ${company?.document || 'Não informado'}`,
          `Telefone: ${company?.phone || 'Não informado'}`
        ]
      },
      {
        title: 'Perfis e permissões',
        lines: roles.length ? roles.map((role) => role.name) : ['Nenhum perfil retornado pela API tenant']
      }
    ];
  }

  private applyFilter(): void {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.filteredRows = [...this.rows];
      return;
    }

    this.filteredRows = this.rows.filter((row) =>
      Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(term))
    );
  }

  private items<T>(data: T[] | null | undefined): T[] {
    return Array.isArray(data) ? data : [];
  }

  private formatDate(value: any): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('pt-BR').format(date);
  }

  private diaryStatus(status?: string): string {
    const value = String(status || '').toLowerCase();
    if (!value) return 'Pendente';
    if (value.includes('aprov')) return 'Aprovado';
    if (value.includes('reprov')) return 'Reprovado';
    if (value.includes('pend')) return 'Pendente';
    return this.labelize(status);
  }

  private projectStatus(status?: string): string {
    const value = String(status || '').toLowerCase();
    if (!value) return 'Em andamento';
    if (value.includes('plan')) return 'Planejada';
    if (value.includes('concl')) return 'Concluída';
    if (value.includes('pause')) return 'Pausada';
    return 'Em andamento';
  }

  private labelize(value: any): string {
    const raw = String(value ?? '').replace(/_/g, ' ').trim();
    if (!raw) return '-';
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  private toBoolean(value: any): boolean {
    return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
  }

  private isAuthenticationFailure(message?: string): boolean {
    const normalized = String(message ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return normalized.includes('autentic') || normalized.includes('sessao') || normalized.includes('token');
  }

  private redirectToLogin(): void {
    this.adminDataService.clearCache();
    this.loginService.clearToken();
    void this.router.navigate(['/login']);
  }

  private resetState(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cards = [];
    this.rows = [];
    this.filteredRows = [];
    this.columns = [];
    this.panels = [];
    this.searchTerm = '';
    this.flushView();
  }

  private flushView(): void {
    queueMicrotask(() => this.cdr.detectChanges());
  }
}
