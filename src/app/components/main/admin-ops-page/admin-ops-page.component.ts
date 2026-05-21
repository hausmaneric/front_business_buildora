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
  BusinessEquipment,
  BusinessMaterial,
  BusinessOccurrence,
  BusinessProject,
  BusinessTeam,
  BusinessUser,
  TenantMetadataRole
} from '../../../models/admin-resource';
import { AdminDataService } from '../../../services/admin-data.service';
import { LoginService } from '../../../services/login.service';

type OpsResource =
  | 'reports'
  | 'settings'
  | 'permissions'
  | 'photos'
  | 'climate'
  | 'signatures'
  | 'schedule'
  | 'measurements'
  | 'budget'
  | 'finance'
  | 'safety'
  | 'epi'
  | 'whatsapp'
  | 'approval-flow'
  | 'pdf-automation'
  | 'bi'
  | 'map'
  | 'integrations'
  | 'digital-signature';

interface SnapshotPayload {
  metadata: any;
  companies: any;
  users: any;
  projects: any;
  teams: any;
  diaries: any;
  occurrences: any;
  activities: any;
  documents: any;
  materials: any;
  equipments: any;
  members: any;
}

interface OpsQuickFilterChip {
  id: string;
  label: string;
  count: number;
}

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
  resource: OpsResource = 'reports';
  loading = true;
  errorMessage = '';
  cards: Array<{ label: string; value: string; detail: string; tone?: string }> = [];
  rows: any[] = [];
  filteredRows: any[] = [];
  columns: Array<{ field: string; headerText: string; width?: number; type?: 'badge' }> = [];
  panels: Array<{ title: string; lines: string[] }> = [];
  quickFilters: OpsQuickFilterChip[] = [];
  activeQuickFilter = 'all';
  searchTerm = '';
  selectedRow: any = null;

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
    this.businessSnapshot(token)
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

  applyQuickFilter(filterId: string): void {
    this.activeQuickFilter = filterId;
    this.applyFilter();
  }

  isActiveQuickFilter(filterId: string): boolean {
    return this.activeQuickFilter === filterId;
  }

  totalRowsLabel(): string {
    const total = this.rows.length;
    const filtered = this.filteredRows.length;
    return filtered === total ? `${total} registros` : `${filtered} de ${total} registros`;
  }

  totalRowsMinWidth(): number {
    return this.columns.reduce((sum, column) => sum + Number(column.width || 180), 0);
  }

  selectRow(row: any): void {
    this.selectedRow = row;
    this.flushView();
  }

  isSelectedRow(row: any): boolean {
    return this.trackRow(this.selectedRow) === this.trackRow(row);
  }

  showDetailPanel(): boolean {
    return !!this.selectedRow;
  }

  detailPrimaryActionLabel(): string {
    switch (this.resource) {
      case 'climate':
        return 'Ver diário';
      case 'signatures':
        return 'Abrir diário';
      case 'photos':
        return 'Abrir arquivo';
      case 'pdf-automation':
        return 'Ver relatórios';
      case 'whatsapp':
        return 'Abrir contato';
      case 'integrations':
        return 'Abrir link';
      case 'settings':
        return 'Abrir configurações';
      case 'reports':
        return 'Ver obra';
      default:
        return 'Abrir detalhe';
    }
  }

  detailSecondaryActionLabel(): string {
    switch (this.resource) {
      case 'climate':
        return 'Ir para diários';
      case 'signatures':
        return 'Ir para assinaturas';
      case 'photos':
        return 'Copiar link';
      case 'pdf-automation':
        return 'Ir para documentos';
      case 'whatsapp':
        return 'Copiar obra';
      case 'integrations':
        return 'Copiar link';
      case 'settings':
        return 'Copiar valor';
      case 'reports':
        return 'Copiar obra';
      default:
        return 'Copiar referência';
    }
  }

  canUseDetailPrimaryAction(): boolean {
    if (!this.selectedRow) return false;
    switch (this.resource) {
      case 'climate':
      case 'signatures':
      case 'pdf-automation':
        return true;
      case 'whatsapp':
        return !!(this.selectedRow.usuario || this.selectedRow.obra);
      case 'photos':
      case 'integrations':
        return !!(this.selectedRow.link || this.selectedRow.file_url);
      case 'settings':
        return true;
      case 'reports':
        return !!this.selectedRow.obra;
      default:
        return false;
    }
  }

  canUseDetailSecondaryAction(): boolean {
    if (!this.selectedRow) return false;
    switch (this.resource) {
      case 'climate':
      case 'signatures':
      case 'pdf-automation':
        return true;
      case 'whatsapp':
        return !!this.selectedRow.obra;
      case 'photos':
      case 'integrations':
        return !!(this.selectedRow.link || this.selectedRow.file_url);
      case 'settings':
        return !!(this.selectedRow.valor || this.selectedRow.configuracao);
      case 'reports':
        return !!this.selectedRow.obra;
      default:
        return false;
    }
  }

  runDetailPrimaryAction(): void {
    if (!this.selectedRow) return;
    switch (this.resource) {
      case 'climate':
      case 'signatures':
        void this.router.navigate(['/main/diaries']);
        return;
      case 'photos':
      case 'integrations':
        this.openExternalUrl(this.selectedRow.link || this.selectedRow.file_url);
        return;
      case 'pdf-automation':
        void this.router.navigate(['/main/reports']);
        return;
      case 'whatsapp':
        void this.copyToClipboard(this.selectedRow.usuario || this.selectedRow.obra, 'Contato preparado', 'A referência operacional foi copiada para compartilhamento rápido.');
        return;
      case 'settings':
        void this.router.navigate(['/main/settings']);
        return;
      case 'reports':
        void this.router.navigate(['/main/projects']);
        return;
    }
  }

  runDetailSecondaryAction(): void {
    if (!this.selectedRow) return;
    switch (this.resource) {
      case 'climate':
        void this.router.navigate(['/main/diaries']);
        return;
      case 'signatures':
        void this.router.navigate(['/main/signatures']);
        return;
      case 'photos':
      case 'integrations':
        void this.copyToClipboard(this.selectedRow.link || this.selectedRow.file_url, 'Link copiado', 'O link foi copiado com sucesso.');
        return;
      case 'pdf-automation':
        void this.router.navigate(['/main/documents']);
        return;
      case 'whatsapp':
        void this.copyToClipboard(this.selectedRow.obra, 'Obra copiada', 'A obra relacionada foi copiada com sucesso.');
        return;
      case 'settings':
        void this.copyToClipboard(this.selectedRow.valor || this.selectedRow.configuracao, 'Valor copiado', 'O valor da configuração foi copiado.');
        return;
      case 'reports':
        void this.copyToClipboard(this.selectedRow.obra, 'Obra copiada', 'O nome da obra foi copiado.');
        return;
    }
  }

  detailEyebrow(): string {
    switch (this.resource) {
      case 'reports':
        return 'Leitura consolidada';
      case 'settings':
        return 'Configuração selecionada';
      case 'permissions':
        return 'Permissão selecionada';
      case 'photos':
        return 'Registro visual';
      case 'climate':
        return 'Leitura climática';
      case 'signatures':
        return 'Assinatura selecionada';
      case 'schedule':
        return 'Marco do cronograma';
      case 'measurements':
        return 'Medição consolidada';
      case 'budget':
        return 'Planejamento orçamentário';
      case 'finance':
        return 'Leitura financeira';
      case 'safety':
        return 'Item de segurança';
      case 'epi':
        return 'Cobertura de EPI';
      case 'whatsapp':
        return 'Contato operacional';
      case 'approval-flow':
        return 'Fluxo de aprovação';
      case 'pdf-automation':
        return 'Automação PDF';
      case 'bi':
        return 'Indicador gerencial';
      case 'map':
        return 'Visão territorial';
      case 'integrations':
        return 'Conector previsto';
      case 'digital-signature':
        return 'Assinatura avançada';
      default:
        return 'Registro operacional';
    }
  }

  detailTitle(): string {
    if (!this.selectedRow) {
      return '';
    }

    const candidates: Array<any> = [
      this.selectedRow.obra,
      this.selectedRow.configuracao,
      this.selectedRow.usuario,
      this.selectedRow.arquivo,
      this.selectedRow.data,
      this.selectedRow.titulo,
      this.selectedRow.equipe
    ];

    return candidates.find((value) => !!value) || 'Registro operacional';
  }

  detailSubtitle(): string {
    switch (this.resource) {
      case 'reports':
        return 'Base consolidada para acompanhamento, fechamento e indicadores.';
      case 'settings':
        return 'Use este registro para revisar governança, branding, identidade e operação do tenant.';
      case 'permissions':
        return 'Visibilidade, edição e aprovação concentradas em um único ponto.';
      case 'photos':
        return 'Cobertura visual por diário, obra, disponibilidade e tipo de arquivo.';
      case 'climate':
        return 'Leitura de clima para produtividade, prazo, risco e segurança.';
      case 'signatures':
        return 'Estado atual do aceite operacional, validação e bloqueio de assinatura.';
      case 'schedule':
        return 'Marco de cronograma usado para leitura de prazo e avanço da obra.';
      case 'measurements':
        return 'Consolidação de quantitativos lançados por obra e diário.';
      case 'budget':
        return 'Referência para evolução de orçamento x execução da obra.';
      case 'finance':
        return 'Leitura rápida de orçamento, custo projetado e saldo.';
      case 'safety':
        return 'Acompanhamento de risco, gravidade e situação operacional.';
      case 'epi':
        return 'Cobertura de proteção por equipe e frente de obra.';
      case 'whatsapp':
        return 'Base de comunicação operacional e disponibilidade de contato.';
      case 'approval-flow':
        return 'Etapa atual de aprovação vinculada ao diário e à obra.';
      case 'pdf-automation':
        return 'Estado de automação para geração e envio de PDF.';
      case 'bi':
        return 'Indicador consolidado para leitura gerencial rápida.';
      case 'map':
        return 'Geolocalização e leitura territorial da carteira de obras.';
      case 'integrations':
        return 'Base disponível para evoluir integrações documentais e operacionais.';
      case 'digital-signature':
        return 'Preparação para trilha de auditoria e assinatura avançada.';
      default:
        return 'Registro operacional selecionado.';
    }
  }

  detailHighlights(): Array<{ label: string; value: string }> {
    if (!this.selectedRow) {
      return [];
    }

    const row = this.selectedRow;

    switch (this.resource) {
      case 'reports':
        return [
          { label: 'Código', value: row.codigo || '-' },
          { label: 'Prazo', value: row.prazo || '-' },
          { label: 'Situação', value: row.situacao || '-' },
          { label: 'Obra', value: row.obra || '-' },
          { label: 'Cliente', value: row.cliente || '-' }
        ];
      case 'settings':
        return [
          { label: 'Grupo', value: row.grupo || '-' },
          { label: 'Valor', value: row.valor || '-' },
          { label: 'Situação', value: row.situacao || '-' },
          { label: 'Configuração', value: row.configuracao || '-' }
        ];
      case 'permissions':
        return [
          { label: 'Perfil', value: row.perfil || '-' },
          { label: 'Aprovação', value: row.aprovacao || '-' },
          { label: 'Edição', value: row.edicao || '-' }
        ];
      case 'photos':
        return [
          { label: 'Obra', value: row.obra || '-' },
          { label: 'Diário', value: row.diario || '-' },
          { label: 'Tamanho', value: row.tamanho || '-' },
          { label: 'Disponibilidade', value: row.disponibilidade || '-' },
          { label: 'Tipo', value: row.tipo || '-' }
        ];
      case 'climate':
        return [
          { label: 'Obra', value: row.obra || '-' },
          { label: 'Clima', value: row.clima || '-' },
          { label: 'Situação', value: row.situacao || '-' },
          { label: 'Data', value: row.data || '-' },
          { label: 'Resumo', value: row.resumo || '-' }
        ];
      case 'signatures':
        return [
          { label: 'Responsável', value: row.responsavel || '-' },
          { label: 'Fluxo', value: row.assinatura || '-' },
          { label: 'Bloqueio', value: row.bloqueio || '-' },
          { label: 'Status do diário', value: row.status || '-' },
          { label: 'Obra', value: row.obra || '-' }
        ];
      case 'schedule':
        return [
          { label: 'Início', value: row.inicio || '-' },
          { label: 'Fim', value: row.fim || '-' },
          { label: 'Progresso', value: row.progresso || '-' }
        ];
      case 'measurements':
        return [
          { label: 'Quantidade', value: row.quantidade || '-' },
          { label: 'Registros', value: row.registros || '-' },
          { label: 'Situação', value: row.medicao || '-' }
        ];
      case 'budget':
        return [
          { label: 'Orçamento', value: row.orcamento || '-' },
          { label: 'Materiais', value: row.materiais || '-' },
          { label: 'Equipamentos', value: row.equipamentos || '-' }
        ];
      case 'finance':
        return [
          { label: 'Orçamento', value: row.orcamento || '-' },
          { label: 'Custo', value: row.custo || '-' },
          { label: 'Saldo', value: row.saldo || '-' }
        ];
      case 'safety':
        return [
          { label: 'Tipo', value: row.tipo || '-' },
          { label: 'Gravidade', value: row.gravidade || '-' },
          { label: 'Situação', value: row.situacao || '-' }
        ];
      case 'epi':
        return [
          { label: 'Equipe', value: row.equipe || '-' },
          { label: 'Obra', value: row.obra || '-' },
          { label: 'Cobertura', value: row.cobertura || '-' }
        ];
      case 'whatsapp':
        return [
          { label: 'E-mail', value: row.email || '-' },
          { label: 'Telefone', value: row.telefone || '-' },
          { label: 'Canal', value: row.canal || '-' }
        ];
      case 'approval-flow':
        return [
          { label: 'Obra', value: row.obra || '-' },
          { label: 'Etapa', value: row.fluxo || '-' },
          { label: 'Situação', value: row.situacao || '-' }
        ];
      case 'pdf-automation':
        return [
          { label: 'Status', value: row.status || '-' },
          { label: 'PDF', value: row.pdf || '-' },
          { label: 'Anexos', value: row.anexos || '-' },
          { label: 'Obra', value: row.obra || '-' }
        ];
      case 'bi':
        return [
          { label: 'Diários', value: row.diarios || '-' },
          { label: 'Atividades', value: row.atividades || '-' },
          { label: 'Produtividade', value: row.produtividade || '-' }
        ];
      case 'map':
        return [
          { label: 'Cidade', value: row.cidade || '-' },
          { label: 'Coordenadas', value: row.coordenadas || '-' },
          { label: 'Situação', value: row.situacao || '-' }
        ];
      case 'integrations':
        return [
          { label: 'Tipo', value: row.tipo || '-' },
          { label: 'Link', value: row.link || '-' },
          { label: 'Integração', value: row.integracao || '-' },
          { label: 'Empresa', value: row.empresa || '-' }
        ];
      case 'digital-signature':
        return [
          { label: 'Data', value: row.data || '-' },
          { label: 'Assinatura', value: row.assinatura || '-' },
          { label: 'Rastreio', value: row.rastreio || '-' }
        ];
      default:
        return [];
    }
  }

  detailNotes(): string[] {
    if (!this.selectedRow) {
      return [];
    }

    const row = this.selectedRow;
    const notes: string[] = [];

    if (row.resumo) notes.push(`Resumo: ${row.resumo}`);
    if (row.valor && this.resource === 'settings') notes.push(`Valor atual: ${row.valor}`);
    if (row.disponibilidade) notes.push(`Disponibilidade: ${row.disponibilidade}`);
    if (row.situacao) notes.push(`Situação atual: ${row.situacao}`);
    if (row.link) notes.push(`Link relacionado: ${row.link}`);
    if (row.endereco) notes.push(`Endereço: ${row.endereco}`);
    if (row.arquivo && row.tipo) notes.push(`Arquivo ${row.arquivo} classificado como ${row.tipo}.`);
    if (row.obra && row.data && (this.resource === 'climate' || this.resource === 'signatures' || this.resource === 'approval-flow')) {
      notes.push(`Registro vinculado à obra ${row.obra} em ${row.data}.`);
    }
    if (this.resource === 'reports' && row.obra) notes.push(`Fechamento consolidado para a obra ${row.obra}.`);
    if (this.resource === 'reports' && row.cliente) notes.push(`Cliente relacionado: ${row.cliente}.`);
    if (this.resource === 'settings' && row.configuracao) notes.push(`Configuração tratada: ${row.configuracao}.`);
    if (this.resource === 'settings' && row.grupo) notes.push(`Grupo operacional: ${row.grupo}.`);
    if (this.resource === 'photos' && row.arquivo) notes.push(`Arquivo visual registrado: ${row.arquivo}.`);
    if (this.resource === 'photos' && row.obra) notes.push(`Cobertura visual vinculada à obra ${row.obra}.`);
    if (this.resource === 'photos' && row.tipo) notes.push(`Tipo de ativo visual: ${row.tipo}.`);
    if (this.resource === 'climate' && row.clima) notes.push(`Condição climática observada: ${row.clima}.`);
    if (this.resource === 'climate' && row.resumo) notes.push(`Resumo operacional: ${row.resumo}.`);
    if (this.resource === 'signatures' && row.responsavel) notes.push(`Responsável atual pelo fluxo: ${row.responsavel}.`);
    if (this.resource === 'signatures' && row.bloqueio) notes.push(`Bloqueio atual do fluxo: ${row.bloqueio}.`);
    if (this.resource === 'pdf-automation' && row.pdf) notes.push(`Condição atual do PDF: ${row.pdf}.`);
    if (this.resource === 'integrations' && row.integracao) notes.push(`Conector em foco: ${row.integracao}.`);

    return notes.length ? notes : ['Registro pronto para acompanhamento operacional.'];
  }

  isBadgeField(column: { type?: string }): boolean {
    return column.type === 'badge';
  }

  badgeTone(value: any): string {
    const text = String(value ?? '').toLowerCase();
    if (text.includes('ativo') || text.includes('online') || text.includes('ok') || text.includes('aprovado') || text.includes('conforme') || text.includes('pronto')) return 'success';
    if (text.includes('atenção') || text.includes('pendente') || text.includes('média') || text.includes('aguardando') || text.includes('planejada')) return 'warning';
    if (text.includes('crítica') || text.includes('alto') || text.includes('reprovado') || text.includes('bloqueado') || text.includes('alerta') || text.includes('aberta')) return 'danger';
    return 'neutral';
  }

  private businessSnapshot(token: string): Observable<SnapshotPayload> {
    return forkJoin({
      metadata: this.adminDataService.tenantMetadata(token),
      companies: this.adminDataService.tenantCompanies(token),
      users: this.adminDataService.tenantUsers(token),
      projects: this.adminDataService.projects(token),
      teams: this.adminDataService.teams(token),
      diaries: this.adminDataService.diaries(token),
      occurrences: this.adminDataService.occurrences(token),
      activities: this.adminDataService.activities(token),
      documents: this.adminDataService.documents(token),
      materials: this.adminDataService.materials(token),
      equipments: this.adminDataService.equipments(token),
      members: this.adminDataService.teamMembers(token)
    });
  }

  private mapPayload(payload: SnapshotPayload): void {
    this.cards = [];
    this.rows = [];
    this.filteredRows = [];
    this.columns = [];
    this.panels = [];
    this.quickFilters = [];
    this.activeQuickFilter = 'all';

    switch (this.resource) {
      case 'reports':
        this.mapReports(payload);
        break;
      case 'settings':
        this.mapSettings(payload);
        break;
      case 'permissions':
        this.mapPermissions(payload);
        break;
      case 'photos':
        this.mapPhotos(payload);
        break;
      case 'climate':
        this.mapClimate(payload);
        break;
      case 'signatures':
        this.mapSignatures(payload);
        break;
      case 'schedule':
        this.mapSchedule(payload);
        break;
      case 'measurements':
        this.mapMeasurements(payload);
        break;
      case 'budget':
        this.mapBudget(payload);
        break;
      case 'finance':
        this.mapFinance(payload);
        break;
      case 'safety':
        this.mapSafety(payload);
        break;
      case 'epi':
        this.mapEpi(payload);
        break;
      case 'whatsapp':
        this.mapWhatsapp(payload);
        break;
      case 'approval-flow':
        this.mapApprovalFlow(payload);
        break;
      case 'pdf-automation':
        this.mapPdfAutomation(payload);
        break;
      case 'bi':
        this.mapBi(payload);
        break;
      case 'map':
        this.mapMap(payload);
        break;
      case 'integrations':
        this.mapIntegrations(payload);
        break;
      case 'digital-signature':
        this.mapDigitalSignature(payload);
        break;
    }

    this.applyFilter();
    this.flushView();
  }

  private mapReports(payload: SnapshotPayload): void {
    const projects = this.items<BusinessProject>(payload.projects?.data);
    const diaries = this.items<BusinessDiary>(payload.diaries?.data);
    const occurrences = this.items<BusinessOccurrence>(payload.occurrences?.data);
    const activities = this.items<BusinessActivity>(payload.activities?.data);
    const documents = this.items<BusinessDocument>(payload.documents?.data);
    const users = this.items<BusinessUser>(payload.users?.data);

    const approvedDiaries = diaries.filter((item) => this.diaryStatus(item.status) === 'Aprovado').length;
    const pendingDiaries = diaries.filter((item) => this.diaryStatus(item.status) === 'Pendente').length;
    const openOccurrences = occurrences.filter((item) => !this.toBoolean(item.resolved)).length;
    const productivity = projects.length ? Math.min(100, Math.max(42, Math.round((activities.length / Math.max(projects.length, 1)) * 11))) : 0;

    this.cards = [
      { label: 'Obras analisadas', value: `${projects.length}`, detail: 'Base ativa para relatórios' },
      { label: 'Diários aprovados', value: `${approvedDiaries}`, detail: `${diaries.length} diários lançados`, tone: 'success' },
      { label: 'Diários pendentes', value: `${pendingDiaries}`, detail: 'Aguardando fechamento ou aprovação', tone: pendingDiaries ? 'warning' : 'success' },
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

    this.buildQuickFilters([
      ['all', 'Todos'],
      ['approved', 'Com aprovação'],
      ['pending', 'Pendentes'],
      ['attention', 'Com atenção'],
      ['high_volume', 'Maior volume'],
      ['risk', 'Com risco']
    ]);

    this.panels = [
      {
        title: 'Resumo executivo',
        lines: [
          `${users.filter((item) => this.toBoolean(item.active)).length} usuários ativos alimentam a operação`,
          `${documents.length} documentos podem compor anexos e consolidados`,
          `${activities.length} atividades formam a base para produtividade e avanço físico`
        ]
      },
      {
        title: 'Obras com maior volume operacional',
        lines: this.rows
          .slice()
          .sort((left, right) => Number(right.diarios || 0) - Number(left.diarios || 0))
          .slice(0, 4)
          .map((row) => `${row.obra} • ${row.diarios} diários • ${row.ocorrencias} ocorrências`)
      },
      {
        title: 'Leituras úteis',
        lines: [
          approvedDiaries ? `${approvedDiaries} diários já podem virar material de fechamento mensal` : 'Ainda não há diários aprovados para fechamento',
          openOccurrences ? `${openOccurrences} ocorrências seguem abertas e devem entrar nos relatórios de risco` : 'Não há ocorrências abertas no momento',
          productivity ? `A produtividade operacional estimada está em ${productivity}%` : 'A produtividade ainda não tem base suficiente'
        ]
      },
      {
        title: 'Próximos passos recomendados',
        lines: [
          pendingDiaries ? `Priorize ${pendingDiaries} diários pendentes para acelerar fechamento e histórico` : 'Os diários já estão em estágio saudável para fechamento',
          openOccurrences ? `Inclua ${openOccurrences} ocorrências abertas no resumo gerencial da semana` : 'Não há desvios críticos pressionando o relatório atual',
          documents.length ? `${documents.length} documentos podem enriquecer relatórios e entregas formais` : 'A base documental ainda precisa amadurecer para relatórios mais ricos'
        ]
      },
      {
        title: 'Prontidão de fechamento',
        lines: [
          `${this.rows.filter((row) => Number(row.diarios || 0) >= 3).length} obras já têm volume suficiente para leitura gerencial mais robusta`,
          `${this.rows.filter((row) => Number(row.ocorrencias || 0) >= 1).length} obras pedem atenção por risco ou desvio aberto`,
          approvedDiaries ? `${approvedDiaries} diários aprovados já sustentam fechamento formal e geração de PDF` : 'A base ainda precisa de mais aprovações para fechamento formal'
        ]
      }
    ];
  }

  private mapSettings(payload: SnapshotPayload): void {
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
        label: 'Perfis cadastrados',
        value: `${roles.length}`,
        detail: 'Perfis prontos para operação'
      },
      {
        label: 'Usuários ativos',
        value: `${users.filter((item) => this.toBoolean(item.active)).length}`,
        detail: `${users.length} usuários cadastrados`
      },
      {
        label: 'Equipes vinculadas',
        value: `${teams.length}`,
        detail: `${projects.length} obras relacionadas`
      }
    ];

    const settingsRows = [
      {
        grupo: 'Empresa',
        configuracao: 'Nome fantasia',
        valor: company?.fantasy_name || company?.corporate_name || 'Não informado',
        situacao: company?.fantasy_name || company?.corporate_name ? 'Configurado' : 'Pendente'
      },
      {
        grupo: 'Empresa',
        configuracao: 'Documento',
        valor: company?.document || 'Não informado',
        situacao: company?.document ? 'Configurado' : 'Pendente'
      },
      {
        grupo: 'Contato',
        configuracao: 'E-mail principal',
        valor: company?.email || 'Não informado',
        situacao: company?.email ? 'Configurado' : 'Pendente'
      },
      {
        grupo: 'Contato',
        configuracao: 'Telefone principal',
        valor: company?.phone || 'Não informado',
        situacao: company?.phone ? 'Configurado' : 'Pendente'
      },
      {
        grupo: 'Governança',
        configuracao: 'Perfis ativos',
        valor: `${roles.length} perfil${roles.length === 1 ? '' : 'is'}`,
        situacao: roles.length ? 'Configurado' : 'Pendente'
      },
      {
        grupo: 'Governança',
        configuracao: 'Usuários ativos',
        valor: `${users.filter((item) => this.toBoolean(item.active)).length}`,
        situacao: users.some((item) => this.toBoolean(item.active)) ? 'Operacional' : 'Atenção'
      },
      {
        grupo: 'Operação',
        configuracao: 'Equipes vinculadas',
        valor: `${teams.length}`,
        situacao: teams.length ? 'Operacional' : 'Atenção'
      },
      {
        grupo: 'Operação',
        configuracao: 'Obras vinculadas',
        valor: `${projects.length}`,
        situacao: projects.length ? 'Operacional' : 'Atenção'
      },
      {
        grupo: 'Identidade',
        configuracao: 'Logo e branding',
        valor: company?.logo_url ? 'Logo cadastrada' : 'Logo pendente',
        situacao: company?.logo_url ? 'Configurado' : 'Pendente'
      }
    ];

    this.rows = settingsRows;

    this.columns = [
      { field: 'grupo', headerText: 'Grupo', width: 160 },
      { field: 'configuracao', headerText: 'Configuração', width: 240 },
      { field: 'valor', headerText: 'Valor atual', width: 320 },
      { field: 'situacao', headerText: 'Situação', width: 150, type: 'badge' }
    ];

    this.buildQuickFilters([
      ['all', 'Todos'],
      ['configured', 'Configurados'],
      ['pending', 'Pendentes'],
      ['attention', 'Atenção'],
      ['contact', 'Contato'],
      ['branding', 'Branding']
    ]);

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
        title: 'Padronização recomendada',
        lines: roles.length
          ? [
              `Perfis atuais: ${roles.map((role) => role.name).join(', ')}`,
              'Revise o logo, os dados da empresa e os padrões para relatórios oficiais.',
              'Use esta base para alinhar comunicação, acesso e branding do tenant.'
            ]
          : ['Nenhum perfil retornado pela API tenant.']
      },
      {
        title: 'Cobertura operacional',
        lines: [
          `${projects.length} obras usam esta empresa como base operacional`,
          `${teams.length} equipes estão vinculadas ao tenant`,
          `${users.filter((item) => this.toBoolean(item.active)).length} usuários ativos podem refletir mudanças de configuração`
        ]
      },
      {
        title: 'Prioridades de ajuste',
        lines: settingsRows
          .filter((row) => row.situacao === 'Pendente' || row.situacao === 'Atenção')
          .slice(0, 4)
          .map((row) => `${row.grupo} • ${row.configuracao} • ${row.valor}`)
      },
      {
        title: 'Base pronta para homologação',
        lines: [
          `${roles.length} perfis sustentam a governança operacional atual`,
          `${projects.length} obras e ${teams.length} equipes dependem dessas configurações`,
          'Priorize identidade visual, contato e regras de governança antes de expandir acessos'
        ]
      },
      {
        title: 'Próximas ações',
        lines: [
          company?.logo_url ? 'A identidade visual principal já está registrada no tenant' : 'Cadastre a logo oficial para padronizar relatórios e telas',
          company?.email ? 'O e-mail principal já pode receber notificações e automações' : 'Defina um e-mail principal para comunicação e alertas',
          roles.length ? 'Os perfis existentes já permitem avançar na governança de usuários' : 'Crie perfis mínimos de gestor, engenharia e campo antes de expandir acessos'
        ]
      },
      {
        title: 'Prontidão da empresa',
        lines: [
          `${settingsRows.filter((row) => row.situacao === 'Configurado' || row.situacao === 'Operacional').length} itens já estão em condição adequada para homologação`,
          `${settingsRows.filter((row) => row.grupo === 'Contato' && row.situacao === 'Configurado').length} pontos de contato já estão prontos para comunicação operacional`,
          `${settingsRows.filter((row) => row.grupo === 'Identidade' && row.situacao === 'Configurado').length} elementos de branding já sustentam a apresentação oficial`
        ]
      }
    ];
  }

  private mapPermissions(payload: SnapshotPayload): void {
    const metadata = payload.metadata?.data ?? {};
    const users = this.items<BusinessUser>(payload.users?.data);
    const companies = this.items<any>(payload.companies?.data);
    const roles = Array.isArray(metadata.roles) ? (metadata.roles as TenantMetadataRole[]) : [];
    const company = companies[0];
    const roleDistribution = new Map<string, number>();

    users.forEach((user) => {
      const roleName = roles.find((role) => Number(role.id) === Number(user.role_id))?.name || 'Usuário';
      roleDistribution.set(roleName, (roleDistribution.get(roleName) || 0) + 1);
    });

    const activeUsers = users.filter((item) => this.toBoolean(item.active));
    const approvers = users.filter((item) => item.role_id);
    const editEnabled = activeUsers.length;
    const topRoles = [...roleDistribution.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 4)
      .map(([role, count]) => `${role} • ${count} usuário${count > 1 ? 's' : ''}`);

    this.cards = [
      { label: 'Perfis disponíveis', value: `${roles.length}`, detail: 'Perfis retornados pelo tenant' },
      { label: 'Usuários com perfil', value: `${approvers.length}`, detail: 'Controle de autorização já vinculado' },
      { label: 'Usuários ativos', value: `${activeUsers.length}`, detail: 'Com acesso operacional', tone: 'success' },
      { label: 'Fluxos de aprovação', value: `${approvers.length}`, detail: 'Base para aprovação e visibilidade' },
      { label: 'Edição habilitada', value: `${editEnabled}`, detail: 'Usuários aptos a atuar no tenant' }
    ];

    this.rows = users.map((user) => ({
      usuario: user.name,
      email: user.email,
      perfil: roles.find((role) => Number(role.id) === Number(user.role_id))?.name || 'Usuário',
      aprovacao: user.role_id ? 'Pode aprovar' : 'Consulta',
      edicao: this.toBoolean(user.active) ? 'Pode editar' : 'Somente leitura',
      situacao: this.toBoolean(user.active) ? 'Ativo' : 'Inativo',
      empresa: company?.fantasy_name || company?.corporate_name || 'Tenant principal'
    }));

    this.columns = [
      { field: 'usuario', headerText: 'Usuário', width: 220 },
      { field: 'email', headerText: 'E-mail', width: 260 },
      { field: 'empresa', headerText: 'Empresa', width: 220 },
      { field: 'perfil', headerText: 'Perfil', width: 180 },
      { field: 'aprovacao', headerText: 'Aprovação', width: 160, type: 'badge' },
      { field: 'edicao', headerText: 'Edição', width: 160, type: 'badge' },
      { field: 'situacao', headerText: 'Situação', width: 140, type: 'badge' }
    ];

    this.panels = [
      {
        title: 'Governança de acesso',
        lines: [
          'Perfis controlam visibilidade, edição e aprovação dos fluxos de obra.',
          'Usuários ativos entram na operação conforme o perfil vinculado.',
          'Esta leitura ajuda a revisar governança antes de abrir novos acessos.'
        ]
      },
      {
        title: 'Distribuição por perfil',
        lines: topRoles.length ? topRoles : ['Nenhum perfil distribuído entre os usuários atuais.']
      },
      {
        title: 'Ações recomendadas',
        lines: [
          'Padronize perfis por função: gestor, engenheiro, encarregado e campo.',
          'Garanta aprovação formal para diários críticos e ocorrências graves.',
          'Revise usuários inativos antes de liberar novos acessos.'
        ]
      },
      {
        title: 'Maturidade da governança',
        lines: [
          `${activeUsers.length} usuários já estão ativos no tenant empresarial`,
          `${approvers.length} perfis já sustentam aprovação operacional`,
          `${users.filter((item) => !this.toBoolean(item.active)).length} acessos ainda merecem revisão antes da homologação`
        ]
      }
    ];

    this.buildQuickFilters([
      ['all', 'Todos'],
      ['approved', 'Aprovadores'],
      ['editing', 'Com edição'],
      ['active', 'Ativos']
    ]);
  }

  private mapPhotos(payload: SnapshotPayload): void {
    const documents = this.items<BusinessDocument>(payload.documents?.data);
    const diaries = this.items<BusinessDiary>(payload.diaries?.data);
    const imageDocs = documents.filter((doc) => this.isImage(doc.file_name, doc.file_type, doc.file_url));
    const totalImageBytes = imageDocs.reduce((sum, item) => sum + Number(item.file_size_bytes || 0), 0);
    const availablePhotos = imageDocs.filter((item) => !!item.file_url).length;
    const pendingPhotos = imageDocs.filter((item) => !item.file_url).length;
    const largePhotos = imageDocs.filter((item) => Number(item.file_size_bytes || 0) >= 5 * 1024 * 1024).length;

    this.cards = [
      { label: 'Fotos localizadas', value: `${imageDocs.length}`, detail: 'Arquivos com tipo de imagem' },
      { label: 'Diários com foto', value: `${new Set(imageDocs.map((item) => item.daily_log_id)).size}`, detail: 'Base para galeria por diário', tone: 'success' },
      { label: 'Obras com foto', value: `${new Set(imageDocs.map((item) => this.diaryProjectId(diaries, item.daily_log_id))).size}`, detail: 'Cobertura visual das obras' },
      { label: 'Volume em fotos', value: this.formatFileSize(totalImageBytes), detail: 'Armazenamento visual ocupado' }
    ];

    this.rows = imageDocs.map((doc) => {
      const diary = diaries.find((item) => Number(item.id) === Number(doc.daily_log_id));
      return {
        arquivo: doc.file_name,
        diario: diary ? this.formatDate(diary.work_date) : `Diário #${doc.daily_log_id}`,
        obra: this.projectName(payload, diary?.project_id),
        tipo: this.labelize(doc.file_type || 'Imagem'),
        tamanho: this.formatFileSize(doc.file_size_bytes),
        disponibilidade: doc.file_url ? 'Disponível' : 'Pendente'
      };
    });

    this.columns = [
      { field: 'arquivo', headerText: 'Arquivo', width: 240 },
      { field: 'diario', headerText: 'Diário', width: 150 },
      { field: 'obra', headerText: 'Obra', width: 240 },
      { field: 'tipo', headerText: 'Tipo', width: 140 },
      { field: 'tamanho', headerText: 'Tamanho', width: 140 },
      { field: 'disponibilidade', headerText: 'Disponibilidade', width: 170, type: 'badge' }
    ];

    this.buildQuickFilters([
      ['all', 'Todas'],
      ['available', 'Disponíveis'],
      ['pending', 'Pendentes'],
      ['large', 'Arquivos grandes']
    ]);

    this.panels = [
      {
        title: 'Galeria operacional',
        lines: [
          'As fotos derivam dos anexos vinculados aos diários de obra.',
          'A base atual permite consulta por obra, diário e data de registro.',
          'A próxima evolução natural é preview, organização por álbum e upload dedicado.'
        ]
      },
      {
        title: 'Últimos registros visuais',
        lines: this.rows
          .slice(0, 5)
          .map((row) => `${row.obra} • ${row.arquivo} • ${row.tamanho}`)
      },
      {
        title: 'Cobertura visual por obra',
        lines: Array.from(
          imageDocs.reduce((map, doc) => {
            const diary = diaries.find((item) => Number(item.id) === Number(doc.daily_log_id));
            const projectName = this.projectName(payload, diary?.project_id);
            map.set(projectName, (map.get(projectName) || 0) + 1);
            return map;
          }, new Map<string, number>()).entries()
        )
          .sort((left, right) => right[1] - left[1])
          .slice(0, 4)
          .map(([project, count]) => `${project} • ${count} foto${count > 1 ? 's' : ''}`)
      },
      {
        title: 'Disponibilidade dos arquivos',
        lines: [
          `${availablePhotos} fotos já estão com link disponível`,
          `${pendingPhotos} registros ainda exigem publicação ou vínculo`,
          `${new Set(imageDocs.map((item) => item.daily_log_id)).size} diários já contam com cobertura visual`
        ]
      },
      {
        title: 'Prontidão da galeria',
        lines: [
          `${availablePhotos} imagens já podem ser abertas ou compartilhadas diretamente`,
          `${largePhotos} arquivos estão na faixa de tamanho que merece atenção de armazenamento`,
          pendingPhotos ? `${pendingPhotos} imagens ainda precisam de publicação antes do uso externo` : 'Toda a galeria atual já está pronta para uso operacional'
        ]
      }
    ];
  }

  private mapClimate(payload: SnapshotPayload): void {
    const diaries = this.items<BusinessDiary>(payload.diaries?.data);
    const weatherGroups = new Map<string, number>();
    const withWeather = diaries.filter((item) => !!item.weather).length;
    const criticalCount = diaries.filter((item) => this.isCriticalWeather(item.weather)).length;
    const withSummary = diaries.filter((item) => !!item.summary).length;
    diaries.forEach((diary) => {
      const key = diary.weather?.trim() || 'Não informado';
      weatherGroups.set(key, (weatherGroups.get(key) || 0) + 1);
    });

    this.cards = [
      { label: 'Diários com clima', value: `${withWeather}`, detail: `${diaries.length} diários avaliados` },
      { label: 'Climas mapeados', value: `${weatherGroups.size}`, detail: 'Categorias encontradas' },
      { label: 'Maior incidência', value: Array.from(weatherGroups.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Sem dados', detail: 'Clima mais informado', tone: 'success' },
      { label: 'Impacto potencial', value: `${criticalCount}`, detail: 'Diários com clima crítico', tone: 'warning' }
    ];

    this.rows = diaries.map((diary) => ({
      data: this.formatDate(diary.work_date),
      obra: this.projectName(payload, diary.project_id),
      clima: diary.weather || 'Não informado',
      resumo: diary.summary || 'Sem resumo',
      situacao: this.isCriticalWeather(diary.weather) ? 'Atenção' : 'Estável'
    }));

    this.columns = [
      { field: 'data', headerText: 'Data', width: 140 },
      { field: 'obra', headerText: 'Obra', width: 240 },
      { field: 'clima', headerText: 'Clima', width: 180 },
      { field: 'resumo', headerText: 'Resumo', width: 320 },
      { field: 'situacao', headerText: 'Situação', width: 140, type: 'badge' }
    ];

      this.buildQuickFilters([
        ['all', 'Todos'],
        ['critical', 'Clima crítico'],
        ['stable', 'Estáveis'],
        ['attention', 'Atenção'],
        ['with_summary', 'Com resumo'],
        ['missing_summary', 'Sem resumo']
      ]);

    this.panels = [
      {
        title: 'Leitura climática',
        lines: [
          'O clima informado nos diários já pode ser consolidado por obra e data.',
          'Climas críticos são marcados para apoiar produtividade e segurança.',
          'Esta base também alimenta relatórios e leitura de risco de prazo.'
        ]
      },
      {
        title: 'Condições mais recorrentes',
        lines: Array.from(weatherGroups.entries())
          .sort((left, right) => right[1] - left[1])
          .slice(0, 4)
          .map(([weather, count]) => `${weather} • ${count} diário${count > 1 ? 's' : ''}`)
      },
      {
        title: 'Impacto operacional',
        lines: [
          `${criticalCount} diários exigem atenção de clima`,
          `${weatherGroups.size} variações climáticas já podem alimentar análises mensais`,
          'Use a leitura climática para cruzar produtividade, atraso e segurança'
        ]
      },
      {
        title: 'Janelas de operação',
        lines: [
          `${diaries.filter((item) => !this.isCriticalWeather(item.weather)).length} diários estão em condição operacional estável`,
          `${criticalCount} registros podem impactar prazo e produtividade`,
          'Cruze essa base com ocorrências e atividades para antecipar desvios'
        ]
      },
      {
        title: 'Prontidão climática',
        lines: [
          `${withWeather} diários já possuem leitura climática registrada`,
          `${withSummary} registros já trazem resumo para contextualizar o clima do dia`,
          `${diaries.filter((item) => !item.summary).length} lançamentos ainda podem ganhar melhor fechamento operacional`
        ]
      }
    ];
  }

  private mapSignatures(payload: SnapshotPayload): void {
    const diaries = this.items<BusinessDiary>(payload.diaries?.data);
    const approved = diaries.filter((item) => this.diaryStatus(item.status) === 'Aprovado').length;
    const rejected = diaries.filter((item) => this.diaryStatus(item.status) === 'Reprovado').length;
    const pending = diaries.filter((item) => this.diaryStatus(item.status) === 'Pendente').length;

    this.cards = [
      { label: 'Aprovados', value: `${approved}`, detail: 'Diários com aceite operacional', tone: 'success' },
      { label: 'Pendentes', value: `${pending}`, detail: 'Aguardando revisão ou assinatura', tone: 'warning' },
      { label: 'Reprovados', value: `${rejected}`, detail: 'Exigem ajuste ou reenvio', tone: 'danger' },
      { label: 'Cobertura', value: `${diaries.length}`, detail: 'Registros avaliados para assinatura' }
    ];

    this.rows = diaries.map((diary) => ({
      data: this.formatDate(diary.work_date),
      obra: this.projectName(payload, diary.project_id),
      status: this.diaryStatus(diary.status),
      responsavel: this.userName(payload, diary.created_by),
      assinatura: this.signatureStage(this.diaryStatus(diary.status)),
      bloqueio:
        this.diaryStatus(diary.status) === 'Reprovado'
          ? 'Correção necessária'
          : this.diaryStatus(diary.status) === 'Pendente'
            ? 'Aguardando validação'
            : 'Liberado'
    }));

    this.columns = [
      { field: 'data', headerText: 'Data', width: 140 },
      { field: 'obra', headerText: 'Obra', width: 240 },
      { field: 'status', headerText: 'Status do diário', width: 160, type: 'badge' },
      { field: 'responsavel', headerText: 'Responsável', width: 220 },
      { field: 'assinatura', headerText: 'Fluxo de assinatura', width: 200, type: 'badge' },
      { field: 'bloqueio', headerText: 'Bloqueio atual', width: 180, type: 'badge' }
    ];

    this.buildQuickFilters([
      ['all', 'Todos'],
      ['approved', 'Aprovados'],
      ['pending', 'Pendentes'],
      ['blocked', 'Bloqueados'],
      ['rejected', 'Reprovados']
    ]);

    this.panels = [
      {
        title: 'Fluxo atual',
        lines: [
          'A aprovação do diário já representa o estágio operacional da assinatura.',
          'Pendências e reprovações alimentam a fila de revisão do responsável.',
          'A base está pronta para evoluir para assinatura digital formal.'
        ]
      },
      {
        title: 'Fila de aprovação',
        lines: this.rows
          .filter((row) => row.status === 'Pendente' || row.status === 'Reprovado')
          .slice(0, 5)
          .map((row) => `${row.obra} • ${row.data} • ${row.assinatura}`)
      },
      {
        title: 'Diários prontos para assinatura',
        lines: this.rows
          .filter((row) => row.status === 'Aprovado')
          .slice(0, 4)
          .map((row) => `${row.obra} • ${row.data} • ${row.responsavel}`)
      },
      {
        title: 'Bloqueios atuais',
        lines: this.rows
          .filter((row) => row.bloqueio !== 'Liberado')
          .slice(0, 5)
          .map((row) => `${row.obra} • ${row.data} • ${row.bloqueio}`)
      },
      {
        title: 'Responsáveis no fluxo',
        lines: this.rows
          .slice(0, 5)
          .map((row) => `${row.obra} • ${row.responsavel} • ${row.assinatura}`)
      },
      {
        title: 'Leitura de maturidade',
        lines: [
          `${approved} diários já atingiram o estágio ideal para assinatura formal`,
          `${pending} registros ainda exigem validação antes de liberar a próxima etapa`,
          'Esta base já suporta a evolução para assinatura digital e trilha de auditoria'
        ]
      },
        {
          title: 'Próximos passos',
          lines: [
            approved ? `${approved} diários já podem seguir para assinatura formal ou fluxo digital avançado` : 'Ainda não há diários aprovados prontos para assinatura formal',
            pending ? `${pending} registros precisam de revisão para liberar o aceite operacional` : 'A fila de pendências está controlada no momento',
            rejected ? `${rejected} reprovações exigem correção antes da assinatura` : 'Não há reprovações bloqueando o fluxo atual'
          ]
        },
        {
          title: 'Prontidão de assinatura',
          lines: [
            `${approved} diários já chegaram ao estágio ideal para assinatura e fechamento formal`,
            `${this.rows.filter((row) => row.bloqueio === 'Aguardando validação').length} registros seguem na fila de validação`,
            `${rejected} itens ainda precisam de correção antes de liberar o aceite definitivo`
          ]
        }
      ];
    }

  private mapSchedule(payload: SnapshotPayload): void {
    const projects = this.items<BusinessProject>(payload.projects?.data);
    const diaries = this.items<BusinessDiary>(payload.diaries?.data);
    const activities = this.items<BusinessActivity>(payload.activities?.data);

    this.cards = [
      { label: 'Obras planejadas', value: `${projects.length}`, detail: 'Obras com prazo definido' },
      { label: 'Em andamento', value: `${projects.filter((item) => this.projectStatus(item.status) === 'Em andamento').length}`, detail: 'Execução ativa', tone: 'success' },
      { label: 'Com prazo crítico', value: `${projects.filter((item) => this.projectNearDeadline(item.end_date)).length}`, detail: 'Prazo nos próximos 45 dias', tone: 'warning' },
      { label: 'Atividades vinculadas', value: `${activities.length}`, detail: `${diaries.length} diários alimentam o cronograma` }
    ];

    this.rows = projects.map((project) => ({
      codigo: project.code,
      obra: project.name,
      inicio: this.formatDate(project.start_date),
      fim: this.formatDate(project.end_date),
      progresso: `${this.projectProgress(project.id, diaries, activities)}%`,
      situacao: this.projectStatus(project.status)
    }));

    this.columns = [
      { field: 'codigo', headerText: 'Código', width: 130 },
      { field: 'obra', headerText: 'Obra', width: 240 },
      { field: 'inicio', headerText: 'Início', width: 140 },
      { field: 'fim', headerText: 'Fim', width: 140 },
      { field: 'progresso', headerText: 'Progresso', width: 140 },
      { field: 'situacao', headerText: 'Situação', width: 150, type: 'badge' }
    ];

    this.panels = [
      {
        title: 'Leitura do cronograma',
        lines: [
          'As obras usam prazo cadastrado, diários e atividades para estimar avanço operacional.',
          'Os projetos com vencimento próximo devem entrar na rotina semanal da gestão.',
          'Esta base já sustenta a evolução para cronograma físico detalhado.'
        ]
      }
    ];
  }

  private mapMeasurements(payload: SnapshotPayload): void {
    const activities = this.items<BusinessActivity>(payload.activities?.data);
    const diaries = this.items<BusinessDiary>(payload.diaries?.data);
    const projectRows = new Map<number, { obra: string; quantidade: number; registros: number }>();

    activities.forEach((activity) => {
      const diary = diaries.find((item) => Number(item.id) === Number(activity.daily_log_id));
      const projectId = Number(diary?.project_id || 0);
      const current = projectRows.get(projectId) || {
        obra: this.projectName(payload, projectId),
        quantidade: 0,
        registros: 0
      };
      current.quantidade += Number(activity.quantity || 0);
      current.registros += 1;
      projectRows.set(projectId, current);
    });

    this.cards = [
      { label: 'Atividades medidas', value: `${activities.length}`, detail: 'Base para medições físicas' },
      { label: 'Obras com medição', value: `${projectRows.size}`, detail: 'Consolidadas por diário', tone: 'success' },
      { label: 'Quantidade total', value: this.formatNumber(Array.from(projectRows.values()).reduce((sum, item) => sum + item.quantidade, 0)), detail: 'Somatório bruto informado' },
      { label: 'Produtividade média', value: `${projectRows.size ? Math.round(activities.length / projectRows.size) : 0}`, detail: 'Registros por obra' }
    ];

    this.rows = Array.from(projectRows.values()).map((item) => ({
      obra: item.obra,
      quantidade: this.formatNumber(item.quantidade),
      registros: `${item.registros}`,
      medicao: item.registros ? 'Consolidada' : 'Sem base'
    }));

    this.columns = [
      { field: 'obra', headerText: 'Obra', width: 260 },
      { field: 'quantidade', headerText: 'Quantidade total', width: 180 },
      { field: 'registros', headerText: 'Registros', width: 140 },
      { field: 'medicao', headerText: 'Situação', width: 160, type: 'badge' }
    ];
  }

  private mapBudget(payload: SnapshotPayload): void {
    const projects = this.items<BusinessProject>(payload.projects?.data);
    const materials = this.items<BusinessMaterial>(payload.materials?.data);
    const equipments = this.items<BusinessEquipment>(payload.equipments?.data);
    const diaries = this.items<BusinessDiary>(payload.diaries?.data);

    this.cards = [
      { label: 'Obras orçadas', value: `${projects.filter((item) => Number(item.budget_amount || 0) > 0).length}`, detail: 'Base com orçamento informado' },
      { label: 'Orçamento total', value: this.formatCurrency(projects.reduce((sum, item) => sum + Number(item.budget_amount || 0), 0)), detail: 'Valor somado das obras', tone: 'success' },
      { label: 'Movimentos de custo', value: `${materials.length + equipments.length}`, detail: 'Materiais e equipamentos apontados' },
      { label: 'Cobertura operacional', value: `${diaries.length}`, detail: 'Diários alimentando comparativos' }
    ];

    this.rows = projects.map((project) => ({
      obra: project.name,
      orcamento: this.formatCurrency(project.budget_amount),
      materiais: this.formatCurrency(this.estimatedMaterialCost(project.id, diaries, materials)),
      equipamentos: this.formatCurrency(this.estimatedEquipmentCost(project.id, diaries, equipments)),
      status: this.projectStatus(project.status)
    }));

    this.columns = [
      { field: 'obra', headerText: 'Obra', width: 240 },
      { field: 'orcamento', headerText: 'Orçamento', width: 160 },
      { field: 'materiais', headerText: 'Materiais estimados', width: 180 },
      { field: 'equipamentos', headerText: 'Equipamentos estimados', width: 190 },
      { field: 'status', headerText: 'Situação', width: 150, type: 'badge' }
    ];
  }

  private mapFinance(payload: SnapshotPayload): void {
    const projects = this.items<BusinessProject>(payload.projects?.data);
    const diaries = this.items<BusinessDiary>(payload.diaries?.data);
    const materials = this.items<BusinessMaterial>(payload.materials?.data);
    const equipments = this.items<BusinessEquipment>(payload.equipments?.data);

    const totalBudget = projects.reduce((sum, item) => sum + Number(item.budget_amount || 0), 0);
    const totalEstimatedCost =
      projects.reduce((sum, item) => sum + this.estimatedMaterialCost(item.id, diaries, materials), 0) +
      projects.reduce((sum, item) => sum + this.estimatedEquipmentCost(item.id, diaries, equipments), 0);

    this.cards = [
      { label: 'Base financeira', value: this.formatCurrency(totalBudget), detail: 'Orçamento consolidado' },
      { label: 'Custo estimado', value: this.formatCurrency(totalEstimatedCost), detail: 'A partir de materiais e equipamentos', tone: 'warning' },
      { label: 'Saldo projetado', value: this.formatCurrency(totalBudget - totalEstimatedCost), detail: 'Diferença entre orçamento e custo estimado', tone: totalBudget - totalEstimatedCost >= 0 ? 'success' : 'danger' },
      { label: 'Obras monitoradas', value: `${projects.length}`, detail: 'Com visibilidade financeira operacional' }
    ];

      this.rows = projects.map((project) => {
        const budget = Number(project.budget_amount || 0);
        const estimated =
          this.estimatedMaterialCost(project.id, diaries, materials) +
          this.estimatedEquipmentCost(project.id, diaries, equipments);
        return {
          obra: project.name,
          orcamento: this.formatCurrency(budget),
          orcamento_valor: budget,
          custo: this.formatCurrency(estimated),
          saldo: this.formatCurrency(budget - estimated),
          saldo_valor: budget - estimated,
          situacao: budget - estimated >= 0 ? 'Saudável' : 'Atenção'
        };
      });

      this.columns = [
        { field: 'obra', headerText: 'Obra', width: 240 },
        { field: 'orcamento', headerText: 'Orçamento', width: 160 },
        { field: 'custo', headerText: 'Custo estimado', width: 170 },
        { field: 'saldo', headerText: 'Saldo projetado', width: 170 },
        { field: 'situacao', headerText: 'Situação', width: 150, type: 'badge' }
      ];

      this.buildQuickFilters([
        ['all', 'Todas'],
        ['healthy', 'Saudáveis'],
        ['attention', 'Atenção'],
        ['high_budget', 'Orçamento alto']
      ]);

      this.panels = [
        {
          title: 'Leitura financeira',
          lines: [
            'O módulo cruza orçamento da obra com consumo estimado de materiais e uso de equipamentos.',
            'A leitura atual ajuda a enxergar saldo projetado, pressão de custo e prioridade de revisão.',
            'A próxima evolução natural é orçamento realizado, medições e financeiro mais granular.'
          ]
        },
        {
          title: 'Obras com maior orçamento',
          lines: this.rows
            .slice()
            .sort((left, right) => Number(right.orcamento_valor || 0) - Number(left.orcamento_valor || 0))
            .slice(0, 4)
            .map((row) => `${row.obra} • ${row.orcamento} • saldo ${row.saldo}`)
        },
        {
          title: 'Saúde financeira',
          lines: [
            `${this.rows.filter((row) => Number(row.saldo_valor || 0) >= 0).length} obras seguem com saldo projetado saudável`,
            `${this.rows.filter((row) => Number(row.saldo_valor || 0) < 0).length} obras pedem revisão por pressão de custo`,
            `${this.rows.filter((row) => Number(row.orcamento_valor || 0) >= 100000).length} obras já estão na faixa de orçamento alto`
          ]
        },
        {
          title: 'Próximos passos financeiros',
          lines: [
            `${materials.length} movimentos de materiais já podem alimentar custo realizado`,
            `${equipments.length} apontamentos de equipamentos já ajudam a medir pressão operacional`,
            totalBudget >= totalEstimatedCost
              ? 'A carteira atual ainda sustenta saldo positivo consolidado'
              : 'Há pressão consolidada de custo e convém revisar orçamento e consumo'
          ]
        }
      ];
    }

  private mapSafety(payload: SnapshotPayload): void {
    const occurrences = this.items<BusinessOccurrence>(payload.occurrences?.data);
    const critical = occurrences.filter((item) => this.isCriticalSeverity(item.severity));

    this.cards = [
      { label: 'Ocorrências de segurança', value: `${occurrences.length}`, detail: 'Base para checklist e gestão de risco' },
      { label: 'Críticas', value: `${critical.length}`, detail: 'Demandam ação imediata', tone: 'danger' },
      { label: 'Resolvidas', value: `${occurrences.filter((item) => this.toBoolean(item.resolved)).length}`, detail: 'Com tratativa concluída', tone: 'success' },
      { label: 'Abertas', value: `${occurrences.filter((item) => !this.toBoolean(item.resolved)).length}`, detail: 'Em acompanhamento', tone: 'warning' }
    ];

    this.rows = occurrences.map((occurrence) => ({
      titulo: occurrence.title,
      tipo: this.labelize(occurrence.occurrence_type || 'Geral'),
      gravidade: this.labelize(occurrence.severity || 'Média'),
      situacao: this.toBoolean(occurrence.resolved) ? 'Resolvida' : 'Aberta',
      diario: `Diário #${occurrence.daily_log_id}`
    }));

    this.columns = [
      { field: 'titulo', headerText: 'Ocorrência', width: 260 },
      { field: 'tipo', headerText: 'Tipo', width: 150 },
      { field: 'gravidade', headerText: 'Gravidade', width: 150, type: 'badge' },
      { field: 'situacao', headerText: 'Situação', width: 150, type: 'badge' },
      { field: 'diario', headerText: 'Diário', width: 150 }
    ];
  }

  private mapEpi(payload: SnapshotPayload): void {
    const teams = this.items<BusinessTeam>(payload.teams?.data);
    const members = this.items<any>(payload.members?.data);

    this.cards = [
      { label: 'Equipes monitoradas', value: `${teams.length}`, detail: 'Base para controle de EPI' },
      { label: 'Alocações em campo', value: `${members.length}`, detail: 'Vínculos de pessoas com equipes', tone: 'success' },
      { label: 'Equipes com cobertura', value: `${teams.filter((team) => this.teamMembersFor(team.id, members).length).length}`, detail: 'Com responsáveis vinculados' },
      { label: 'Conformidade sugerida', value: `${teams.length ? Math.max(70, Math.min(98, 60 + members.length * 4)) : 0}%`, detail: 'Índice operacional de cobertura', tone: 'warning' }
    ];

    this.rows = teams.map((team) => ({
      equipe: team.name,
      obra: this.projectName(payload, team.project_id),
      membros: `${this.teamMembersFor(team.id, members).length}`,
      cobertura: this.teamMembersFor(team.id, members).length ? 'Coberta' : 'Pendente',
      situacao: this.toBoolean(team.active) ? 'Ativo' : 'Inativo'
    }));

    this.columns = [
      { field: 'equipe', headerText: 'Equipe', width: 220 },
      { field: 'obra', headerText: 'Obra', width: 220 },
      { field: 'membros', headerText: 'Membros', width: 130 },
      { field: 'cobertura', headerText: 'Cobertura de EPI', width: 170, type: 'badge' },
      { field: 'situacao', headerText: 'Situação', width: 150, type: 'badge' }
    ];
  }

  private mapWhatsapp(payload: SnapshotPayload): void {
    const users = this.items<BusinessUser>(payload.users?.data);
    const withPhone = users.filter((item) => !!item.phone);
    const activeWithPhone = withPhone.filter((item) => this.toBoolean(item.active)).length;

    this.cards = [
      { label: 'Usuários com telefone', value: `${withPhone.length}`, detail: `${users.length} usuários cadastrados` },
      { label: 'Prontos para WhatsApp', value: `${activeWithPhone}`, detail: 'Contatos ativos com número informado', tone: 'success' },
      { label: 'Sem contato', value: `${users.length - withPhone.length}`, detail: 'Exigem cadastro do telefone', tone: 'warning' },
      { label: 'Obras com comunicação', value: `${this.items<BusinessProject>(payload.projects?.data).length}`, detail: 'Base para comunicação operacional' }
    ];

    this.rows = users.map((user) => ({
      usuario: user.name,
      email: user.email,
      telefone: user.phone || 'Não informado',
      canal: user.phone ? 'Pronto para WhatsApp' : 'Pendente',
      situacao: this.toBoolean(user.active) ? 'Ativo' : 'Inativo'
    }));

    this.columns = [
      { field: 'usuario', headerText: 'Usuário', width: 220 },
      { field: 'email', headerText: 'E-mail', width: 260 },
      { field: 'telefone', headerText: 'Telefone', width: 170 },
      { field: 'canal', headerText: 'Canal', width: 180, type: 'badge' },
      { field: 'situacao', headerText: 'Situação', width: 150, type: 'badge' }
    ];

    this.buildQuickFilters([
      ['all', 'Todos'],
      ['phone_ready', 'Prontos'],
      ['no_contact', 'Sem contato'],
      ['active', 'Ativos']
    ]);

    this.panels = [
      {
        title: 'Cobertura de comunicação',
        lines: [
          `${activeWithPhone} usuários ativos já podem receber comunicação rápida por WhatsApp`,
          `${users.length - withPhone.length} registros ainda precisam de telefone para uso operacional`,
          'A base atual já sustenta avisos de campo, confirmações e comunicação com responsáveis'
        ]
      },
      {
        title: 'Fila de saneamento',
        lines: this.rows
          .filter((row) => row.telefone === 'Não informado')
          .slice(0, 5)
          .map((row) => `${row.usuario} • ${row.email} • ${row.situacao}`)
      },
      {
        title: 'Próximas ações',
        lines: [
          `${activeWithPhone} contatos já estão prontos para rotinas rápidas de comunicação em campo`,
          `${this.rows.filter((row) => row.situacao === 'Ativo' && row.telefone === 'Não informado').length} usuários ativos ainda exigem cadastro de telefone`,
          'Use esta base para avisos operacionais, confirmações de diário e alinhamento com responsáveis'
        ]
      }
    ];
  }

  private mapApprovalFlow(payload: SnapshotPayload): void {
    const diaries = this.items<BusinessDiary>(payload.diaries?.data);
    const approved = diaries.filter((item) => this.diaryStatus(item.status) === 'Aprovado').length;
    const pending = diaries.filter((item) => this.diaryStatus(item.status) === 'Pendente').length;
    const rejected = diaries.filter((item) => this.diaryStatus(item.status) === 'Reprovado').length;
    this.cards = [
      { label: 'Pendentes de aprovação', value: `${pending}`, detail: 'Fila da gestão', tone: 'warning' },
      { label: 'Aprovados', value: `${approved}`, detail: 'Fluxo concluído', tone: 'success' },
      { label: 'Reprovados', value: `${rejected}`, detail: 'Exigem correção', tone: 'danger' },
      { label: 'Cobertura do fluxo', value: `${diaries.length}`, detail: 'Registros avaliados' }
    ];

    this.rows = diaries.map((diary) => ({
      data: this.formatDate(diary.work_date),
      obra: this.projectName(payload, diary.project_id),
      fluxo: this.signatureStage(this.diaryStatus(diary.status)),
      situacao: this.diaryStatus(diary.status),
      resumo: diary.summary || 'Sem resumo',
      bloqueio:
        this.diaryStatus(diary.status) === 'Reprovado'
          ? 'Correção necessária'
          : this.diaryStatus(diary.status) === 'Pendente'
            ? 'Aguardando validação'
            : 'Liberado'
    }));

    this.columns = [
      { field: 'data', headerText: 'Data', width: 140 },
      { field: 'obra', headerText: 'Obra', width: 240 },
      { field: 'fluxo', headerText: 'Etapa do fluxo', width: 180, type: 'badge' },
      { field: 'situacao', headerText: 'Situação', width: 150, type: 'badge' },
      { field: 'bloqueio', headerText: 'Bloqueio', width: 180, type: 'badge' },
      { field: 'resumo', headerText: 'Resumo', width: 300 }
    ];

    this.buildQuickFilters([
      ['all', 'Todos'],
      ['approved', 'Aprovados'],
      ['pending', 'Pendentes'],
      ['rejected', 'Reprovados'],
      ['blocked', 'Bloqueados'],
      ['with_summary', 'Com resumo']
    ]);

    this.panels = [
      {
        title: 'Fluxo atual',
        lines: [
          'A aprovação do diário já representa o estágio operacional da assinatura e do aceite de campo.',
          'Pendências e reprovações alimentam a fila de revisão do responsável e da gestão.',
          'Esta base já sustenta uma evolução para aprovação por fluxo e assinatura mais forte.'
        ]
      },
      {
        title: 'Fila de validação',
        lines: this.rows
          .filter((row) => row.situacao === 'Pendente' || row.situacao === 'Reprovado')
          .slice(0, 5)
          .map((row) => `${row.obra} • ${row.data} • ${row.bloqueio}`)
      },
      {
        title: 'Prontos para avanço',
        lines: this.rows
          .filter((row) => row.situacao === 'Aprovado')
          .slice(0, 4)
          .map((row) => `${row.obra} • ${row.data} • ${row.fluxo}`)
      },
      {
        title: 'Próximas ações',
        lines: [
          `${pending} diários ainda aguardam validação antes de seguir para aceite formal`,
          `${rejected} registros exigem correção antes de liberar a próxima etapa`,
          `${this.rows.filter((row) => row.resumo !== 'Sem resumo').length} diários já têm resumo forte para revisão`
        ]
      },
      {
        title: 'Maturidade do fluxo',
        lines: [
          `${approved} registros já passaram por aprovação operacional`,
          `${this.rows.filter((row) => row.bloqueio === 'Correção necessária').length} itens estão bloqueados por correção`,
          'O próximo salto natural é formalizar a trilha com regras de aprovação e assinatura digital'
        ]
      }
    ];
  }

  private mapPdfAutomation(payload: SnapshotPayload): void {
    const reportsBase = this.items<BusinessDiary>(payload.diaries?.data);
    const documents = this.items<BusinessDocument>(payload.documents?.data);
    const approvedCount = reportsBase.filter((item) => this.diaryStatus(item.status) === 'Aprovado').length;
    const pendingCount = reportsBase.filter((item) => this.diaryStatus(item.status) === 'Pendente').length;
    const projectCoverage = new Set(reportsBase.map((item) => item.project_id)).size;

    this.cards = [
      { label: 'Diários prontos', value: `${reportsBase.length}`, detail: 'Base elegível para PDF' },
      { label: 'Anexos existentes', value: `${documents.length}`, detail: 'Podem compor relatórios', tone: 'success' },
      { label: 'Pendentes', value: `${pendingCount}`, detail: 'Antes do envio automático', tone: 'warning' },
      { label: 'Cobertura mensal', value: `${projectCoverage}`, detail: 'Obras com potencial de fechamento' }
    ];

    this.rows = reportsBase.map((diary) => ({
      data: this.formatDate(diary.work_date),
      obra: this.projectName(payload, diary.project_id),
      status: this.diaryStatus(diary.status),
      pdf: this.diaryStatus(diary.status) === 'Aprovado' ? 'Pronto para envio' : 'Aguardando',
      anexos: `${documents.filter((item) => Number(item.daily_log_id) === Number(diary.id)).length}`
    }));

    this.columns = [
      { field: 'data', headerText: 'Data', width: 140 },
      { field: 'obra', headerText: 'Obra', width: 240 },
      { field: 'status', headerText: 'Status', width: 150, type: 'badge' },
      { field: 'pdf', headerText: 'PDF', width: 180, type: 'badge' },
      { field: 'anexos', headerText: 'Anexos', width: 120 }
    ];

    this.buildQuickFilters([
      ['all', 'Todos'],
      ['approved', 'Aprovados'],
      ['pending', 'Pendentes'],
      ['available', 'Prontos para envio']
    ]);

    this.panels = [
      {
        title: 'Automação prevista',
        lines: [
          'Diários aprovados já estão no melhor estágio para virar PDF automaticamente.',
          'Os anexos existentes aumentam a qualidade do fechamento enviado por e-mail.',
          'A próxima evolução é agendamento por obra, responsável e período.'
        ]
      },
      {
        title: 'Prontidão para envio',
        lines: [
          `${approvedCount} diários já podem compor fechamento automático`,
          `${documents.length} anexos enriquecem o conteúdo enviado`,
          `${projectCoverage} obras já têm base para rotinas mensais`
        ]
      },
      {
        title: 'Cobertura documental do envio',
        lines: [
          `${this.rows.filter((row) => row.pdf === 'Pronto para envio').length} registros já estão no estágio ideal para PDF`,
          `${this.rows.filter((row) => Number(row.anexos || 0) > 0).length} diários já contam com anexos de apoio`,
          pendingCount ? `${pendingCount} itens ainda precisam de validação antes do disparo automático` : 'A fila atual já está pronta para automação formal'
        ]
      }
    ];
  }

  private mapBi(payload: SnapshotPayload): void {
    const projects = this.items<BusinessProject>(payload.projects?.data);
    const diaries = this.items<BusinessDiary>(payload.diaries?.data);
    const activities = this.items<BusinessActivity>(payload.activities?.data);
    const occurrences = this.items<BusinessOccurrence>(payload.occurrences?.data);

    const topProjects = projects.map((project) => ({
      obra: project.name,
      diarios: diaries.filter((item) => Number(item.project_id) === Number(project.id)).length,
      atividades: activities.filter((item) => Number(this.diaryProjectId(diaries, item.daily_log_id)) === Number(project.id)).length,
      ocorrencias: occurrences.filter((item) => Number(this.diaryProjectId(diaries, item.daily_log_id)) === Number(project.id)).length,
      produtividade: `${this.projectProgress(project.id, diaries, activities)}%`
    }));

    this.cards = [
      { label: 'Obras monitoradas', value: `${projects.length}`, detail: 'Base analítica ativa' },
      { label: 'Diários consolidados', value: `${diaries.length}`, detail: 'Dados para BI operacional', tone: 'success' },
      { label: 'Atividades registradas', value: `${activities.length}`, detail: 'Progresso executado' },
      { label: 'Ocorrências mapeadas', value: `${occurrences.length}`, detail: 'Leitura de risco e qualidade', tone: occurrences.length ? 'warning' : 'success' }
    ];

    this.rows = topProjects;
    this.columns = [
      { field: 'obra', headerText: 'Obra', width: 240 },
      { field: 'diarios', headerText: 'Diários', width: 120 },
      { field: 'atividades', headerText: 'Atividades', width: 130 },
      { field: 'ocorrencias', headerText: 'Ocorrências', width: 140 },
      { field: 'produtividade', headerText: 'Produtividade', width: 150, type: 'badge' }
    ];

    this.panels = [
      {
        title: 'Indicadores imediatos',
        lines: [
          'Esta visão cruza obras, diários, atividades e ocorrências para leitura gerencial rápida.',
          'O próximo passo natural é separar indicadores por período, obra e responsável.',
          'A base atual já sustenta painéis executivos e comparativos entre obras.'
        ]
      }
    ];
  }

  private mapMap(payload: SnapshotPayload): void {
    const projects = this.items<BusinessProject>(payload.projects?.data);
    this.cards = [
      { label: 'Obras georreferenciadas', value: `${projects.filter((item) => item.latitude && item.longitude).length}`, detail: `${projects.length} obras cadastradas`, tone: 'success' },
      { label: 'Com endereço', value: `${projects.filter((item) => item.address || item.city).length}`, detail: 'Base para mapa operacional' },
      { label: 'Cidades presentes', value: `${new Set(projects.map((item) => item.city).filter(Boolean)).size}`, detail: 'Cobertura territorial' },
      { label: 'Coordenadas pendentes', value: `${projects.filter((item) => !item.latitude || !item.longitude).length}`, detail: 'Exigem geolocalização', tone: 'warning' }
    ];

    this.rows = projects.map((project) => ({
      obra: project.name,
      cidade: project.city || 'Não informada',
      endereco: [project.address, project.number, project.district].filter(Boolean).join(', ') || 'Não informado',
      coordenadas: project.latitude && project.longitude ? `${project.latitude}, ${project.longitude}` : 'Pendente',
      situacao: this.projectStatus(project.status)
    }));

    this.columns = [
      { field: 'obra', headerText: 'Obra', width: 240 },
      { field: 'cidade', headerText: 'Cidade', width: 180 },
      { field: 'endereco', headerText: 'Endereço', width: 320 },
      { field: 'coordenadas', headerText: 'Coordenadas', width: 220 },
      { field: 'situacao', headerText: 'Situação', width: 150, type: 'badge' }
    ];

    this.panels = [
      {
        title: 'Leitura territorial',
        lines: [
          'O mapa das obras depende do endereço e das coordenadas informadas em cada projeto.',
          'Com essa base, a operação pode evoluir para visualização geográfica e roteamento.',
          'As obras sem coordenadas devem entrar na rotina de saneamento cadastral.'
        ]
      }
    ];
  }

  private mapIntegrations(payload: SnapshotPayload): void {
    const company = this.items<any>(payload.companies?.data)[0];
    const documents = this.items<BusinessDocument>(payload.documents?.data);
    this.cards = [
      { label: 'Documentos com link', value: `${documents.filter((item) => !!item.file_url).length}`, detail: 'Base para integração em nuvem', tone: 'success' },
      { label: 'Empresa conectável', value: company?.email ? 'Sim' : 'Não', detail: 'Contato principal cadastrado' },
      { label: 'Google Drive', value: 'Preparado', detail: 'Estrutura pronta para conector' },
      { label: 'OneDrive', value: 'Preparado', detail: 'Estrutura pronta para conector' }
    ];

    this.rows = documents.map((doc) => ({
      arquivo: doc.file_name,
      tipo: this.labelize(doc.file_type || 'Arquivo'),
      link: doc.file_url || 'Sem link',
      integracao: doc.file_url ? 'Elegível' : 'Pendente'
    }));

    this.columns = [
      { field: 'arquivo', headerText: 'Arquivo', width: 260 },
      { field: 'tipo', headerText: 'Tipo', width: 150 },
      { field: 'link', headerText: 'Link', width: 300 },
      { field: 'integracao', headerText: 'Integração', width: 160, type: 'badge' }
    ];

    this.panels = [
      {
        title: 'Conectores previstos',
        lines: [
          'Documentos com URL já têm a base necessária para integração documental.',
          'Google Drive e OneDrive podem ser conectados sem mudar a estrutura da tela.',
          'O próximo passo é versionamento, sincronização e regras por pasta ou obra.'
        ]
      }
    ];
  }

  private mapDigitalSignature(payload: SnapshotPayload): void {
    const diaries = this.items<BusinessDiary>(payload.diaries?.data);
    this.cards = [
      { label: 'Diários elegíveis', value: `${diaries.length}`, detail: 'Base para assinatura avançada' },
      { label: 'Prontos', value: `${diaries.filter((item) => this.diaryStatus(item.status) === 'Aprovado').length}`, detail: 'Mais próximos de assinatura digital', tone: 'success' },
      { label: 'Pendentes', value: `${diaries.filter((item) => this.diaryStatus(item.status) === 'Pendente').length}`, detail: 'Aguardando preparação', tone: 'warning' },
      { label: 'Reprovados', value: `${diaries.filter((item) => this.diaryStatus(item.status) === 'Reprovado').length}`, detail: 'Exigem correção', tone: 'danger' }
    ];

    this.rows = diaries.map((diary) => ({
      obra: this.projectName(payload, diary.project_id),
      data: this.formatDate(diary.work_date),
      status: this.diaryStatus(diary.status),
      assinatura: this.diaryStatus(diary.status) === 'Aprovado' ? 'Pronta para assinatura' : 'Em preparação',
      rastreio: diary.id ? `TR-${diary.id}` : '-'
    }));

    this.columns = [
      { field: 'obra', headerText: 'Obra', width: 240 },
      { field: 'data', headerText: 'Data', width: 140 },
      { field: 'status', headerText: 'Status', width: 150, type: 'badge' },
      { field: 'assinatura', headerText: 'Assinatura', width: 190, type: 'badge' },
      { field: 'rastreio', headerText: 'Rastreio', width: 160 }
    ];

    this.panels = [
      {
        title: 'Preparação para assinatura digital',
        lines: [
          'Diários aprovados já estão no melhor estágio para assinatura avançada.',
          'Pendências e reprovações precisam ser resolvidas antes de formalizar a assinatura.',
          'A próxima evolução é integrar trilha de auditoria e provedores externos de assinatura.'
        ]
      }
    ];
  }

  private buildQuickFilters(filters: Array<[string, string]>): void {
    this.quickFilters = filters.map(([id, label]) => ({
      id,
      label,
      count: this.countQuickFilter(id)
    }));
  }

  private countQuickFilter(filterId: string): number {
    if (filterId === 'all') {
      return this.rows.length;
    }

    return this.rows.filter((row) => this.matchesQuickFilter(row, filterId)).length;
  }

  private matchesQuickFilter(row: any, filterId: string): boolean {
    if (filterId === 'all') {
      return true;
    }

    const status = String(row?.status || row?.situacao || '').toLowerCase();
    const approval = String(row?.aprovacao || '').toLowerCase();
    const availability = String(row?.disponibilidade || '').toLowerCase();
    const size = String(row?.tamanho || '').toLowerCase();
    const value = String(row?.valor || '').toLowerCase();
      const pdf = String(row?.pdf || '').toLowerCase();
      const signature = String(row?.assinatura || '').toLowerCase();
      const blockage = String(row?.bloqueio || '').toLowerCase();
      const weather = String(row?.clima || '').toLowerCase();
      const summary = String(row?.resumo || '').toLowerCase();
      const phone = String(row?.telefone || '').toLowerCase();
      const diaries = Number(row?.diarios || 0);
      const occurrences = Number(row?.ocorrencias || 0);
      const budget = Number(row?.orcamento_valor || 0);
      const balance = Number(row?.saldo_valor || 0);

    switch (filterId) {
      case 'approved':
        return status.includes('aprov') || approval.includes('sim') || signature.includes('conclu');
      case 'pending':
        return status.includes('pend') || status.includes('aguard') || availability.includes('pend') || pdf.includes('aguard');
      case 'attention':
        return status.includes('aten') || status.includes('alert') || status.includes('crít') || status.includes('crit');
      case 'high_volume':
        return diaries >= 3;
      case 'risk':
        return occurrences >= 1 || status.includes('aten') || status.includes('pause');
      case 'editing':
        return String(row?.edicao || '').toLowerCase().includes('editar');
      case 'active':
        return status.includes('ativo') || status.includes('ativa');
      case 'branding':
        return String(row?.grupo || '').toLowerCase().includes('identidade');
      case 'contact':
        return String(row?.grupo || '').toLowerCase().includes('contato');
      case 'configured':
        return !(value.includes('não informado') || value.includes('nao informado') || value.includes('logo pendente') || status.includes('pend'));
      case 'available':
        return availability.includes('dispon');
      case 'large':
        return size.includes('mb') || size.includes('gb');
      case 'critical':
        return weather.includes('chuva') || weather.includes('tempestade') || weather.includes('vento') || status.includes('aten');
      case 'stable':
        return status.includes('estável') || status.includes('estavel') || status.includes('ok') || status.includes('normal');
        case 'with_summary':
          return !summary.includes('sem resumo');
        case 'missing_summary':
          return summary.includes('sem resumo');
        case 'blocked':
          return blockage.includes('bloque') || status.includes('bloque');
        case 'rejected':
          return status.includes('reprov');
          case 'healthy':
            return status.includes('saud') || balance >= 0;
          case 'high_budget':
            return budget >= 100000;
          case 'phone_ready':
            return !phone.includes('não informado') && !phone.includes('nao informado');
          case 'no_contact':
            return phone.includes('não informado') || phone.includes('nao informado');
          default:
            return true;
        }
  }

  private applyFilter(): void {
    const term = this.searchTerm.trim().toLowerCase();
    const quickFiltered = this.rows.filter((row) => this.matchesQuickFilter(row, this.activeQuickFilter));
    if (!term) {
      this.filteredRows = [...quickFiltered];
      this.syncSelection();
      return;
    }

    this.filteredRows = quickFiltered.filter((row) =>
      Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(term))
    );
    this.syncSelection();
  }

  private syncSelection(): void {
    if (!this.filteredRows.length) {
      this.selectedRow = null;
      return;
    }

    const match = this.filteredRows.find((row) => this.trackRow(row) === this.trackRow(this.selectedRow));
    this.selectedRow = match || this.filteredRows[0];
  }

  private items<T>(data: T[] | null | undefined): T[] {
    return Array.isArray(data) ? data : [];
  }

  private projectName(payload: SnapshotPayload, projectId?: number | null): string {
    if (!projectId) {
      return 'Sem obra vinculada';
    }
    const projects = this.items<BusinessProject>(payload.projects?.data);
    return projects.find((item) => Number(item.id) === Number(projectId))?.name || `Obra #${projectId}`;
  }

  private userName(payload: SnapshotPayload, userId?: number | null): string {
    if (!userId) {
      return 'Sem responsável definido';
    }
    const users = this.items<BusinessUser>(payload.users?.data);
    return users.find((item) => Number(item.id) === Number(userId))?.name || `Usuário #${userId}`;
  }

  private diaryProjectId(diaries: BusinessDiary[], dailyLogId?: number | null): number | null {
    return diaries.find((item) => Number(item.id) === Number(dailyLogId))?.project_id ?? null;
  }

  private teamMembersFor(teamId: number, members: any[]): any[] {
    return members.filter((item) => Number(item.team_id) === Number(teamId));
  }

  private projectProgress(projectId: number, diaries: BusinessDiary[], activities: BusinessActivity[]): number {
    const projectDiaries = diaries.filter((item) => Number(item.project_id) === Number(projectId));
    const projectActivities = activities.filter((item) => projectDiaries.some((diary) => Number(diary.id) === Number(item.daily_log_id)));
    if (!projectDiaries.length && !projectActivities.length) {
      return 0;
    }
    return Math.min(100, Math.max(18, Math.round(projectActivities.length * 8 + projectDiaries.length * 5)));
  }

  private estimatedMaterialCost(projectId: number, diaries: BusinessDiary[], materials: BusinessMaterial[]): number {
    const projectDiaries = diaries.filter((item) => Number(item.project_id) === Number(projectId));
    return materials
      .filter((item) => projectDiaries.some((diary) => Number(diary.id) === Number(item.daily_log_id)))
      .reduce((sum, item) => sum + Number(item.quantity || 0) * 18, 0);
  }

  private estimatedEquipmentCost(projectId: number, diaries: BusinessDiary[], equipments: BusinessEquipment[]): number {
    const projectDiaries = diaries.filter((item) => Number(item.project_id) === Number(projectId));
    return equipments
      .filter((item) => projectDiaries.some((diary) => Number(diary.id) === Number(item.daily_log_id)))
      .reduce((sum, item) => sum + Number(item.hours_used || 0) * 120, 0);
  }

  private isImage(fileName?: string, fileType?: string, url?: string): boolean {
    const value = `${fileName || ''} ${fileType || ''} ${url || ''}`.toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.webp', '.gif', 'image', 'foto'].some((marker) => value.includes(marker));
  }

  private isCriticalWeather(weather?: string): boolean {
    const value = String(weather || '').toLowerCase();
    return value.includes('chuva') || value.includes('tempestade') || value.includes('vento forte');
  }

  private isCriticalSeverity(severity?: string): boolean {
    const value = String(severity || '').toLowerCase();
    return value.includes('alta') || value.includes('crit');
  }

  private signatureStage(status: string): string {
    if (status === 'Aprovado') return 'Concluída';
    if (status === 'Reprovado') return 'Revisão necessária';
    return 'Aguardando aprovação';
  }

  private formatDate(value: any): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('pt-BR').format(date);
  }

  private formatNumber(value: any): string {
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(Number(value || 0));
  }

  private formatCurrency(value: any): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
  }

  private formatFileSize(value: any): string {
    const bytes = Number(value || 0);
    if (!bytes) return '0 KB';
    if (bytes >= 1024 * 1024) return `${this.formatNumber(bytes / (1024 * 1024))} MB`;
    return `${this.formatNumber(bytes / 1024)} KB`;
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

  private projectNearDeadline(endDate?: string | null): boolean {
    if (!endDate) {
      return false;
    }
    const end = new Date(endDate).getTime();
    if (Number.isNaN(end)) {
      return false;
    }
    const now = Date.now();
    const days = (end - now) / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 45;
  }

  private labelize(value: any): string {
    const raw = String(value ?? '').replace(/_/g, ' ').trim();
    if (!raw) return '-';
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  private toBoolean(value: any): boolean {
    return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
  }

  private trackRow(row: any): string {
    if (!row) {
      return '';
    }

    return (
      [row.codigo, row.obra, row.usuario, row.arquivo, row.data, row.configuracao, row.titulo, row.equipe].find((value) => !!value) ||
      JSON.stringify(row)
    );
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

  private openExternalUrl(url?: string): void {
    if (!url) {
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  private async copyToClipboard(value: string | undefined, title: string, message: string): Promise<void> {
    if (!value) {
      return;
    }
    try {
      await navigator.clipboard.writeText(String(value));
    } catch {
      return;
    }
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
    this.selectedRow = null;
    this.flushView();
  }

  private flushView(): void {
    queueMicrotask(() => this.cdr.detectChanges());
  }
}



