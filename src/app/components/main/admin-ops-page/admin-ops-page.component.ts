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
      { label: 'Obras analisadas', value: `${projects.length}`, detail: 'Base ativa para relat?rios' },
      { label: 'Di?rios aprovados', value: `${approvedDiaries}`, detail: `${diaries.length} di?rios lan?ados`, tone: 'success' },
      { label: 'Di?rios pendentes', value: `${pendingDiaries}`, detail: 'Aguardando fechamento ou aprova??o', tone: pendingDiaries ? 'warning' : 'success' },
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
      { field: 'codigo', headerText: 'C?digo', width: 130 },
      { field: 'cliente', headerText: 'Cliente', width: 220 },
      { field: 'diarios', headerText: 'Di?rios', width: 110 },
      { field: 'atividades', headerText: 'Atividades', width: 120 },
      { field: 'ocorrencias', headerText: 'Ocorr?ncias', width: 130 },
      { field: 'prazo', headerText: 'Prazo', width: 140 },
      { field: 'situacao', headerText: 'Situa??o', width: 160, type: 'badge' }
    ];

    this.panels = [
      {
        title: 'Resumo executivo',
        lines: [
          `${users.filter((item) => this.toBoolean(item.active)).length} usu?rios ativos alimentam a opera??o`,
          `${documents.length} documentos podem compor anexos e consolidados`,
          `${activities.length} atividades formam a base para produtividade e avan?o f?sico`
        ]
      },
      {
        title: 'Leituras ?teis',
        lines: [
          approvedDiaries ? `${approvedDiaries} di?rios j? podem virar material de fechamento mensal` : 'Ainda n?o h? di?rios aprovados para fechamento',
          openOccurrences ? `${openOccurrences} ocorr?ncias seguem abertas e devem entrar nos relat?rios de risco` : 'N?o h? ocorr?ncias abertas no momento',
          productivity ? `A produtividade operacional estimada est? em ${productivity}%` : 'A produtividade ainda n?o tem base suficiente'
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
        detail: 'Perfis prontos para opera??o'
      },
      {
        label: 'Usu?rios ativos',
        value: `${users.filter((item) => this.toBoolean(item.active)).length}`,
        detail: `${users.length} usu?rios cadastrados`
      },
      {
        label: 'Equipes vinculadas',
        value: `${teams.length}`,
        detail: `${projects.length} obras relacionadas`
      }
    ];

    this.rows = users.map((user) => ({
      usuario: user.name,
      email: user.email,
      empresa: company?.fantasy_name || company?.corporate_name || 'Tenant principal',
      perfil: roles.find((role) => Number(role.id) === Number(user.role_id))?.name || 'Usu?rio',
      telefone: user.phone || 'N?o informado',
      situacao: this.toBoolean(user.active) ? 'Ativo' : 'Inativo'
    }));

    this.columns = [
      { field: 'usuario', headerText: 'Usu?rio', width: 220 },
      { field: 'email', headerText: 'E-mail', width: 280 },
      { field: 'empresa', headerText: 'Empresa', width: 220 },
      { field: 'perfil', headerText: 'Perfil', width: 180 },
      { field: 'telefone', headerText: 'Telefone', width: 160 },
      { field: 'situacao', headerText: 'Situa??o', width: 140, type: 'badge' }
    ];

    this.panels = [
      {
        title: 'Dados da empresa',
        lines: [
          `Nome fantasia: ${company?.fantasy_name || 'N?o informado'}`,
          `Raz?o social: ${company?.corporate_name || 'N?o informado'}`,
          `Documento: ${company?.document || 'N?o informado'}`,
          `Telefone: ${company?.phone || 'N?o informado'}`
        ]
      },
      {
        title: 'Padroniza??o recomendada',
        lines: roles.length
          ? [
              `Perfis atuais: ${roles.map((role) => role.name).join(', ')}`,
              'Revise o logo, os dados da empresa e os padr?es para relat?rios oficiais.',
              'Use esta base para alinhar comunica??o, acesso e branding do tenant.'
            ]
          : ['Nenhum perfil retornado pela API tenant.']
      }
    ];
  }

  private mapPermissions(payload: SnapshotPayload): void {
    const metadata = payload.metadata?.data ?? {};
    const users = this.items<BusinessUser>(payload.users?.data);
    const roles = Array.isArray(metadata.roles) ? (metadata.roles as TenantMetadataRole[]) : [];

    this.cards = [
      { label: 'Perfis dispon?veis', value: `${roles.length}`, detail: 'Perfis retornados pelo tenant' },
      { label: 'Usu?rios com perfil', value: `${users.filter((item) => item.role_id).length}`, detail: 'Controle de autoriza??o j? vinculado' },
      { label: 'Usu?rios ativos', value: `${users.filter((item) => this.toBoolean(item.active)).length}`, detail: 'Com acesso operacional', tone: 'success' },
      { label: 'Fluxos de aprova??o', value: `${users.filter((item) => item.role_id).length}`, detail: 'Base para aprova??o e visibilidade' }
    ];

    this.rows = users.map((user) => ({
      usuario: user.name,
      email: user.email,
      perfil: roles.find((role) => Number(role.id) === Number(user.role_id))?.name || 'Usu?rio',
      aprovacao: user.role_id ? 'Pode aprovar' : 'Consulta',
      edicao: this.toBoolean(user.active) ? 'Pode editar' : 'Somente leitura',
      situacao: this.toBoolean(user.active) ? 'Ativo' : 'Inativo'
    }));

    this.columns = [
      { field: 'usuario', headerText: 'Usu?rio', width: 220 },
      { field: 'email', headerText: 'E-mail', width: 260 },
      { field: 'perfil', headerText: 'Perfil', width: 180 },
      { field: 'aprovacao', headerText: 'Aprova??o', width: 160, type: 'badge' },
      { field: 'edicao', headerText: 'Edi??o', width: 160, type: 'badge' },
      { field: 'situacao', headerText: 'Situa??o', width: 140, type: 'badge' }
    ];

    this.panels = [
      {
        title: 'Governan?a de acesso',
        lines: [
          'Perfis controlam visibilidade, edi??o e aprova??o dos fluxos de obra.',
          'Usu?rios ativos entram na opera??o conforme o perfil vinculado.',
          'Esta leitura ajuda a revisar governan?a antes de abrir novos acessos.'
        ]
      },
      {
        title: 'A??es recomendadas',
        lines: [
          'Padronize perfis por fun??o: gestor, engenheiro, encarregado e campo.',
          'Garanta aprova??o formal para di?rios cr?ticos e ocorr?ncias graves.',
          'Revise usu?rios inativos antes de liberar novos acessos.'
        ]
      }
    ];
  }

  private mapPhotos(payload: SnapshotPayload): void {
    const documents = this.items<BusinessDocument>(payload.documents?.data);
    const diaries = this.items<BusinessDiary>(payload.diaries?.data);
    const imageDocs = documents.filter((doc) => this.isImage(doc.file_name, doc.file_type, doc.file_url));

    this.cards = [
      { label: 'Fotos localizadas', value: `${imageDocs.length}`, detail: 'Arquivos com tipo de imagem' },
      { label: 'Di?rios com foto', value: `${new Set(imageDocs.map((item) => item.daily_log_id)).size}`, detail: 'Base para galeria por di?rio', tone: 'success' },
      { label: 'Obras com foto', value: `${new Set(imageDocs.map((item) => this.diaryProjectId(diaries, item.daily_log_id))).size}`, detail: 'Cobertura visual das obras' },
      { label: '?ltimo upload', value: imageDocs[0] ? this.formatDate(imageDocs[0].created_at) : '-', detail: 'Data mais recente encontrada' }
    ];

    this.rows = imageDocs.map((doc) => {
      const diary = diaries.find((item) => Number(item.id) === Number(doc.daily_log_id));
      return {
        arquivo: doc.file_name,
        diario: diary ? this.formatDate(diary.work_date) : `Di?rio #${doc.daily_log_id}`,
        obra: this.projectName(payload, diary?.project_id),
        tipo: this.labelize(doc.file_type || 'Imagem'),
        tamanho: this.formatFileSize(doc.file_size_bytes),
        link: doc.file_url || 'Sem link'
      };
    });

    this.columns = [
      { field: 'arquivo', headerText: 'Arquivo', width: 240 },
      { field: 'diario', headerText: 'Di?rio', width: 150 },
      { field: 'obra', headerText: 'Obra', width: 240 },
      { field: 'tipo', headerText: 'Tipo', width: 140 },
      { field: 'tamanho', headerText: 'Tamanho', width: 140 },
      { field: 'link', headerText: 'Link', width: 260 }
    ];

    this.panels = [
      {
        title: 'Galeria operacional',
        lines: [
          'As fotos derivam dos anexos vinculados aos di?rios de obra.',
          'A base atual permite consulta por obra, di?rio e data de registro.',
          'A pr?xima evolu??o natural ? preview, organiza??o por ?lbum e upload dedicado.'
        ]
      }
    ];
  }

  private mapClimate(payload: SnapshotPayload): void {
    const diaries = this.items<BusinessDiary>(payload.diaries?.data);
    const weatherGroups = new Map<string, number>();
    diaries.forEach((diary) => {
      const key = diary.weather?.trim() || 'N?o informado';
      weatherGroups.set(key, (weatherGroups.get(key) || 0) + 1);
    });

    this.cards = [
      { label: 'Di?rios com clima', value: `${diaries.filter((item) => !!item.weather).length}`, detail: `${diaries.length} di?rios avaliados` },
      { label: 'Climas mapeados', value: `${weatherGroups.size}`, detail: 'Categorias encontradas' },
      { label: 'Maior incid?ncia', value: Array.from(weatherGroups.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Sem dados', detail: 'Clima mais informado', tone: 'success' },
      { label: 'Impacto potencial', value: `${diaries.filter((item) => this.isCriticalWeather(item.weather)).length}`, detail: 'Di?rios com clima cr?tico', tone: 'warning' }
    ];

    this.rows = diaries.map((diary) => ({
      data: this.formatDate(diary.work_date),
      obra: this.projectName(payload, diary.project_id),
      clima: diary.weather || 'N?o informado',
      resumo: diary.summary || 'Sem resumo',
      situacao: this.isCriticalWeather(diary.weather) ? 'Aten??o' : 'Est?vel'
    }));

    this.columns = [
      { field: 'data', headerText: 'Data', width: 140 },
      { field: 'obra', headerText: 'Obra', width: 240 },
      { field: 'clima', headerText: 'Clima', width: 180 },
      { field: 'resumo', headerText: 'Resumo', width: 320 },
      { field: 'situacao', headerText: 'Situa??o', width: 140, type: 'badge' }
    ];

    this.panels = [
      {
        title: 'Leitura clim?tica',
        lines: [
          'O clima informado nos di?rios j? pode ser consolidado por obra e data.',
          'Climas cr?ticos s?o marcados para apoiar produtividade e seguran?a.',
          'Esta base tamb?m alimenta relat?rios e leitura de risco de prazo.'
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
      { label: 'Aprovados', value: `${approved}`, detail: 'Di?rios com aceite operacional', tone: 'success' },
      { label: 'Pendentes', value: `${pending}`, detail: 'Aguardando revis?o ou assinatura', tone: 'warning' },
      { label: 'Reprovados', value: `${rejected}`, detail: 'Exigem ajuste ou reenvio', tone: 'danger' },
      { label: 'Cobertura', value: `${diaries.length}`, detail: 'Registros avaliados para assinatura' }
    ];

    this.rows = diaries.map((diary) => ({
      data: this.formatDate(diary.work_date),
      obra: this.projectName(payload, diary.project_id),
      status: this.diaryStatus(diary.status),
      responsavel: `Usu?rio #${diary.created_by || '-'}`,
      assinatura: this.signatureStage(this.diaryStatus(diary.status))
    }));

    this.columns = [
      { field: 'data', headerText: 'Data', width: 140 },
      { field: 'obra', headerText: 'Obra', width: 240 },
      { field: 'status', headerText: 'Status do di?rio', width: 160, type: 'badge' },
      { field: 'responsavel', headerText: 'Respons?vel', width: 180 },
      { field: 'assinatura', headerText: 'Fluxo de assinatura', width: 200, type: 'badge' }
    ];

    this.panels = [
      {
        title: 'Fluxo atual',
        lines: [
          'A aprova??o do di?rio j? representa o est?gio operacional da assinatura.',
          'Pend?ncias e reprova??es alimentam a fila de revis?o do respons?vel.',
          'A base est? pronta para evoluir para assinatura digital formal.'
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
      { label: 'Em andamento', value: `${projects.filter((item) => this.projectStatus(item.status) === 'Em andamento').length}`, detail: 'Execu??o ativa', tone: 'success' },
      { label: 'Com prazo cr?tico', value: `${projects.filter((item) => this.projectNearDeadline(item.end_date)).length}`, detail: 'Prazo nos pr?ximos 45 dias', tone: 'warning' },
      { label: 'Atividades vinculadas', value: `${activities.length}`, detail: `${diaries.length} di?rios alimentam o cronograma` }
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
      { field: 'codigo', headerText: 'C?digo', width: 130 },
      { field: 'obra', headerText: 'Obra', width: 240 },
      { field: 'inicio', headerText: 'In?cio', width: 140 },
      { field: 'fim', headerText: 'Fim', width: 140 },
      { field: 'progresso', headerText: 'Progresso', width: 140 },
      { field: 'situacao', headerText: 'Situa??o', width: 150, type: 'badge' }
    ];

    this.panels = [
      {
        title: 'Leitura do cronograma',
        lines: [
          'As obras usam prazo cadastrado, di?rios e atividades para estimar avan?o operacional.',
          'Os projetos com vencimento pr?ximo devem entrar na rotina semanal da gest?o.',
          'Esta base j? sustenta a evolu??o para cronograma f?sico detalhado.'
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
        custo: this.formatCurrency(estimated),
        saldo: this.formatCurrency(budget - estimated),
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

    this.cards = [
      { label: 'Usuários com telefone', value: `${withPhone.length}`, detail: `${users.length} usuários cadastrados` },
      { label: 'Prontos para WhatsApp', value: `${withPhone.length}`, detail: 'Contatos com número informado', tone: 'success' },
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
  }

  private mapApprovalFlow(payload: SnapshotPayload): void {
    const diaries = this.items<BusinessDiary>(payload.diaries?.data);
    this.cards = [
      { label: 'Pendentes de aprovação', value: `${diaries.filter((item) => this.diaryStatus(item.status) === 'Pendente').length}`, detail: 'Fila da gestão', tone: 'warning' },
      { label: 'Aprovados', value: `${diaries.filter((item) => this.diaryStatus(item.status) === 'Aprovado').length}`, detail: 'Fluxo concluído', tone: 'success' },
      { label: 'Reprovados', value: `${diaries.filter((item) => this.diaryStatus(item.status) === 'Reprovado').length}`, detail: 'Exigem correção', tone: 'danger' },
      { label: 'Cobertura do fluxo', value: `${diaries.length}`, detail: 'Registros avaliados' }
    ];

    this.rows = diaries.map((diary) => ({
      data: this.formatDate(diary.work_date),
      obra: this.projectName(payload, diary.project_id),
      fluxo: this.signatureStage(this.diaryStatus(diary.status)),
      situacao: this.diaryStatus(diary.status),
      resumo: diary.summary || 'Sem resumo'
    }));

    this.columns = [
      { field: 'data', headerText: 'Data', width: 140 },
      { field: 'obra', headerText: 'Obra', width: 240 },
      { field: 'fluxo', headerText: 'Etapa do fluxo', width: 180, type: 'badge' },
      { field: 'situacao', headerText: 'Situação', width: 150, type: 'badge' },
      { field: 'resumo', headerText: 'Resumo', width: 300 }
    ];
  }

  private mapPdfAutomation(payload: SnapshotPayload): void {
    const reportsBase = this.items<BusinessDiary>(payload.diaries?.data);
    const documents = this.items<BusinessDocument>(payload.documents?.data);

    this.cards = [
      { label: 'Di?rios prontos', value: `${reportsBase.length}`, detail: 'Base eleg?vel para PDF' },
      { label: 'Anexos existentes', value: `${documents.length}`, detail: 'Podem compor relat?rios', tone: 'success' },
      { label: 'Pendentes', value: `${reportsBase.filter((item) => this.diaryStatus(item.status) === 'Pendente').length}`, detail: 'Antes do envio autom?tico', tone: 'warning' },
      { label: 'Cobertura mensal', value: `${new Set(reportsBase.map((item) => item.project_id)).size}`, detail: 'Obras com potencial de fechamento' }
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

    this.panels = [
      {
        title: 'Automa??o prevista',
        lines: [
          'Di?rios aprovados j? est?o no melhor est?gio para virar PDF automaticamente.',
          'Os anexos existentes aumentam a qualidade do fechamento enviado por e-mail.',
          'A pr?xima evolu??o ? agendamento por obra, respons?vel e per?odo.'
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
      { label: 'Obras monitoradas', value: `${projects.length}`, detail: 'Base anal?tica ativa' },
      { label: 'Di?rios consolidados', value: `${diaries.length}`, detail: 'Dados para BI operacional', tone: 'success' },
      { label: 'Atividades registradas', value: `${activities.length}`, detail: 'Progresso executado' },
      { label: 'Ocorr?ncias mapeadas', value: `${occurrences.length}`, detail: 'Leitura de risco e qualidade', tone: occurrences.length ? 'warning' : 'success' }
    ];

    this.rows = topProjects;
    this.columns = [
      { field: 'obra', headerText: 'Obra', width: 240 },
      { field: 'diarios', headerText: 'Di?rios', width: 120 },
      { field: 'atividades', headerText: 'Atividades', width: 130 },
      { field: 'ocorrencias', headerText: 'Ocorr?ncias', width: 140 },
      { field: 'produtividade', headerText: 'Produtividade', width: 150, type: 'badge' }
    ];

    this.panels = [
      {
        title: 'Indicadores imediatos',
        lines: [
          'Esta vis?o cruza obras, di?rios, atividades e ocorr?ncias para leitura gerencial r?pida.',
          'O pr?ximo passo natural ? separar indicadores por per?odo, obra e respons?vel.',
          'A base atual j? sustenta pain?is executivos e comparativos entre obras.'
        ]
      }
    ];
  }

  private mapMap(payload: SnapshotPayload): void {
    const projects = this.items<BusinessProject>(payload.projects?.data);
    this.cards = [
      { label: 'Obras georreferenciadas', value: `${projects.filter((item) => item.latitude && item.longitude).length}`, detail: `${projects.length} obras cadastradas`, tone: 'success' },
      { label: 'Com endere?o', value: `${projects.filter((item) => item.address || item.city).length}`, detail: 'Base para mapa operacional' },
      { label: 'Cidades presentes', value: `${new Set(projects.map((item) => item.city).filter(Boolean)).size}`, detail: 'Cobertura territorial' },
      { label: 'Coordenadas pendentes', value: `${projects.filter((item) => !item.latitude || !item.longitude).length}`, detail: 'Exigem geolocaliza??o', tone: 'warning' }
    ];

    this.rows = projects.map((project) => ({
      obra: project.name,
      cidade: project.city || 'N?o informada',
      endereco: [project.address, project.number, project.district].filter(Boolean).join(', ') || 'N?o informado',
      coordenadas: project.latitude && project.longitude ? `${project.latitude}, ${project.longitude}` : 'Pendente',
      situacao: this.projectStatus(project.status)
    }));

    this.columns = [
      { field: 'obra', headerText: 'Obra', width: 240 },
      { field: 'cidade', headerText: 'Cidade', width: 180 },
      { field: 'endereco', headerText: 'Endere?o', width: 320 },
      { field: 'coordenadas', headerText: 'Coordenadas', width: 220 },
      { field: 'situacao', headerText: 'Situa??o', width: 150, type: 'badge' }
    ];

    this.panels = [
      {
        title: 'Leitura territorial',
        lines: [
          'O mapa das obras depende do endere?o e das coordenadas informadas em cada projeto.',
          'Com essa base, a opera??o pode evoluir para visualiza??o geogr?fica e roteamento.',
          'As obras sem coordenadas devem entrar na rotina de saneamento cadastral.'
        ]
      }
    ];
  }

  private mapIntegrations(payload: SnapshotPayload): void {
    const company = this.items<any>(payload.companies?.data)[0];
    const documents = this.items<BusinessDocument>(payload.documents?.data);
    this.cards = [
      { label: 'Documentos com link', value: `${documents.filter((item) => !!item.file_url).length}`, detail: 'Base para integra??o em nuvem', tone: 'success' },
      { label: 'Empresa conect?vel', value: company?.email ? 'Sim' : 'N?o', detail: 'Contato principal cadastrado' },
      { label: 'Google Drive', value: 'Preparado', detail: 'Estrutura pronta para conector' },
      { label: 'OneDrive', value: 'Preparado', detail: 'Estrutura pronta para conector' }
    ];

    this.rows = documents.map((doc) => ({
      arquivo: doc.file_name,
      tipo: this.labelize(doc.file_type || 'Arquivo'),
      link: doc.file_url || 'Sem link',
      integracao: doc.file_url ? 'Eleg?vel' : 'Pendente'
    }));

    this.columns = [
      { field: 'arquivo', headerText: 'Arquivo', width: 260 },
      { field: 'tipo', headerText: 'Tipo', width: 150 },
      { field: 'link', headerText: 'Link', width: 300 },
      { field: 'integracao', headerText: 'Integra??o', width: 160, type: 'badge' }
    ];

    this.panels = [
      {
        title: 'Conectores previstos',
        lines: [
          'Documentos com URL j? t?m a base necess?ria para integra??o documental.',
          'Google Drive e OneDrive podem ser conectados sem mudar a estrutura da tela.',
          'O pr?ximo passo ? versionamento, sincroniza??o e regras por pasta ou obra.'
        ]
      }
    ];
  }

  private mapDigitalSignature(payload: SnapshotPayload): void {
    const diaries = this.items<BusinessDiary>(payload.diaries?.data);
    this.cards = [
      { label: 'Di?rios eleg?veis', value: `${diaries.length}`, detail: 'Base para assinatura avan?ada' },
      { label: 'Prontos', value: `${diaries.filter((item) => this.diaryStatus(item.status) === 'Aprovado').length}`, detail: 'Mais pr?ximos de assinatura digital', tone: 'success' },
      { label: 'Pendentes', value: `${diaries.filter((item) => this.diaryStatus(item.status) === 'Pendente').length}`, detail: 'Aguardando prepara??o', tone: 'warning' },
      { label: 'Reprovados', value: `${diaries.filter((item) => this.diaryStatus(item.status) === 'Reprovado').length}`, detail: 'Exigem corre??o', tone: 'danger' }
    ];

    this.rows = diaries.map((diary) => ({
      obra: this.projectName(payload, diary.project_id),
      data: this.formatDate(diary.work_date),
      status: this.diaryStatus(diary.status),
      assinatura: this.diaryStatus(diary.status) === 'Aprovado' ? 'Pronta para assinatura' : 'Em prepara??o',
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
        title: 'Prepara??o para assinatura digital',
        lines: [
          'Di?rios aprovados j? est?o no melhor est?gio para assinatura avan?ada.',
          'Pend?ncias e reprova??es precisam ser resolvidas antes de formalizar a assinatura.',
          'A pr?xima evolu??o ? integrar trilha de auditoria e provedores externos de assinatura.'
        ]
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

  private projectName(payload: SnapshotPayload, projectId?: number | null): string {
    if (!projectId) {
      return 'Sem obra vinculada';
    }
    const projects = this.items<BusinessProject>(payload.projects?.data);
    return projects.find((item) => Number(item.id) === Number(projectId))?.name || `Obra #${projectId}`;
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
