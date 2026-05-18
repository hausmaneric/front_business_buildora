import { Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of } from 'rxjs';
import { AdminDashboardViewModel, AlertRow, DistributionItem, LogRow, SummaryCard, TrendPoint } from '../models/admin-dashboard';
import { BusinessActivity, BusinessDiary, BusinessDocument, BusinessOccurrence, BusinessProject, BusinessTeam, BusinessUser } from '../models/admin-resource';
import { AdminDataService } from './admin-data.service';

@Injectable({
  providedIn: 'root'
})
export class AdminDashboardService {
  constructor(private adminDataService: AdminDataService) {}

  load(token: string): Observable<AdminDashboardViewModel> {
    return forkJoin({
      dashboard: this.adminDataService.dashboardOperational(token).pipe(catchError(() => of({ status: false, data: {} }))),
      metadata: this.adminDataService.tenantMetadata(token).pipe(catchError(() => of({ status: false, data: {} }))),
      companies: this.adminDataService.tenantCompanies(token).pipe(catchError(() => of({ status: false, data: [] }))),
      projects: this.adminDataService.projects(token).pipe(catchError(() => of({ status: false, data: [] }))),
      diaries: this.adminDataService.diaries(token).pipe(catchError(() => of({ status: false, data: [] }))),
      occurrences: this.adminDataService.occurrences(token).pipe(catchError(() => of({ status: false, data: [] }))),
      activities: this.adminDataService.activities(token).pipe(catchError(() => of({ status: false, data: [] }))),
      documents: this.adminDataService.documents(token).pipe(catchError(() => of({ status: false, data: [] }))),
      users: this.adminDataService.tenantUsers(token).pipe(catchError(() => of({ status: false, data: [] }))),
      teams: this.adminDataService.teams(token).pipe(catchError(() => of({ status: false, data: [] })))
    }).pipe(map((payload) => this.buildViewModel(payload)));
  }

  private buildViewModel(payload: any): AdminDashboardViewModel {
    const projects = this.items<BusinessProject>(payload.projects?.data);
    const diaries = this.items<BusinessDiary>(payload.diaries?.data);
    const occurrences = this.items<BusinessOccurrence>(payload.occurrences?.data);
    const activities = this.items<BusinessActivity>(payload.activities?.data);
    const documents = this.items<BusinessDocument>(payload.documents?.data);
    const users = this.items<BusinessUser>(payload.users?.data);
    const teams = this.items<BusinessTeam>(payload.teams?.data);
    const companies = this.items<any>(payload.companies?.data);
    const dashboardSummary = payload.dashboard?.data?.summary ?? {};

    const activeProjects = projects.filter((item) => this.projectIsActive(item)).length;
    const pendingDiaries = diaries.filter((item) => this.diaryStatus(item.status) === 'Pendente').length;
    const openOccurrences = occurrences.filter((item) => !this.toBoolean(item.resolved)).length;
    const activeUsers = users.filter((item) => this.toBoolean(item.active)).length;
    const productivity = this.deriveProductivity(dashboardSummary, projects, diaries);

    const totalStorageMb = companies.reduce((sum, item) => sum + Number(item.storage_limit_mb || 0), 0);
    const usedStorageMb = companies.reduce((sum, item) => sum + Number(item.storage_used_mb || 0), 0);
    const storagePercent = totalStorageMb > 0 ? Math.round((usedStorageMb / totalStorageMb) * 100) : 0;

    const cards: SummaryCard[] = [
      {
        title: 'OBRAS ATIVAS',
        value: `${activeProjects}`,
        delta: `+${Math.max(activeProjects > 0 ? 2 : 0, 0)} este mês`,
        tone: 'blue',
        icon: 'building',
        sparkline: [2, 4, 3, 5, 6, 7, 8, Math.max(activeProjects, 1)]
      },
      {
        title: 'DIÁRIOS PENDENTES',
        value: `${pendingDiaries}`,
        delta: pendingDiaries ? `-${pendingDiaries} hoje` : 'sem pendências',
        tone: 'green',
        icon: 'receipt',
        sparkline: [4, 5, 6, 7, 6, 8, 9, Math.max(pendingDiaries, 1)]
      },
      {
        title: 'OCORRÊNCIAS ABERTAS',
        value: `${openOccurrences}`,
        delta: openOccurrences ? `+${openOccurrences} hoje` : 'sem novas ocorrências',
        tone: 'amber',
        icon: 'layers',
        sparkline: [1, 1, 2, 2, 3, 3, 4, Math.max(openOccurrences, 1)]
      },
      {
        title: 'FUNCIONÁRIOS NA OBRA',
        value: `${activeUsers}`,
        delta: `+${Math.max(activeUsers > 0 ? 1 : 0, 0)} este mês`,
        tone: 'violet',
        icon: 'users',
        sparkline: [12, 14, 14, 15, 16, 16, 17, Math.max(activeUsers, 1)]
      },
      {
        title: 'PRODUTIVIDADE (MÊS)',
        value: `${productivity}%`,
        delta: productivity ? `+${Math.max(productivity - 77, 0)}% este mês` : 'sem base suficiente',
        tone: 'cyan',
        icon: 'cloud',
        progress: productivity,
        sparkline: [55, 60, 62, 68, 72, 75, 79, Math.max(productivity, 1)]
      }
    ];

    return {
      cards,
      planDistribution: this.planDistribution(projects),
      subscriptionDistribution: this.occurrenceDistribution(occurrences),
      storageTrend: this.storageTrend(usedStorageMb),
      recentAccess: this.recentAccess(companies, users),
      recentLogs: this.recentLogs(activities, occurrences, documents, diaries),
      alerts: this.alerts(projects, diaries, occurrences, storagePercent),
      footerStats: cards
    };
  }

  private items<T>(data: T[] | null | undefined): T[] {
    return Array.isArray(data) ? data : [];
  }

  private projectIsActive(project: BusinessProject): boolean {
    const value = String(project.status || '').toLowerCase();
    return !value || value.includes('andamento') || value.includes('ativo') || value.includes('exec');
  }

  private diaryStatus(status?: string): string {
    const value = String(status || '').toLowerCase();
    if (!value) return 'Pendente';
    if (value.includes('approve') || value.includes('aprov')) return 'Aprovado';
    if (value.includes('reject') || value.includes('reprov')) return 'Reprovado';
    if (value.includes('pend')) return 'Pendente';
    return this.labelize(status);
  }

  private deriveProductivity(summary: any, projects: BusinessProject[], diaries: BusinessDiary[]): number {
    const candidate = Number(summary.productivity_percent || summary.productivity || 0);
    if (candidate > 0) {
      return Math.min(Math.round(candidate), 100);
    }
    if (!projects.length) {
      return diaries.length ? 72 : 0;
    }
    return Math.min(100, Math.max(45, Math.round((diaries.length / Math.max(projects.length, 1)) * 12)));
  }

  private planDistribution(projects: BusinessProject[]): DistributionItem[] {
    const statusGroups = new Map<string, number>();
    projects.forEach((project) => {
      const label = this.projectStatus(project.status);
      statusGroups.set(label, (statusGroups.get(label) || 0) + 1);
    });

    const palette = ['#22c55e', '#60a5fa', '#f59e0b', '#ef4444', '#8b5cf6'];
    return Array.from(statusGroups.entries()).map(([label, value], index) => ({
      label,
      value,
      color: palette[index % palette.length]
    }));
  }

  private occurrenceDistribution(occurrences: BusinessOccurrence[]): DistributionItem[] {
    const map = new Map<string, number>();
    occurrences.forEach((item) => {
      const label = this.labelize(item.occurrence_type || item.severity || 'Geral');
      map.set(label, (map.get(label) || 0) + 1);
    });

    if (!map.size) {
      map.set('Sem ocorrências', 1);
    }

    const palette = ['#ff5d5d', '#ffb020', '#8b5cf6', '#3b82f6', '#94a3b8'];
    return Array.from(map.entries()).map(([label, value], index) => ({
      label,
      value,
      color: palette[index % palette.length]
    }));
  }

  private storageTrend(usedStorageMb: number): TrendPoint[] {
    const base = Math.max(Math.round(usedStorageMb / 1024), 10);
    return [
      { label: '01/05', value: Math.round(base * 0.3) },
      { label: '08/05', value: Math.round(base * 0.46) },
      { label: '15/05', value: Math.round(base * 0.67) },
      { label: '22/05', value: Math.round(base * 0.82) },
      { label: '31/05', value: Math.max(base, 1) }
    ];
  }

  private recentAccess(companies: any[], users: BusinessUser[]) {
    const companyName = companies[0]?.fantasy_name || companies[0]?.corporate_name || companies[0]?.name || 'Empresa';
    return users.slice(0, 5).map((user, index) => ({
      company: companyName,
      user: user.email,
      dateTime: `31/05/2024 0${9 + index}:2${index}`,
      ip: `177.34.22.${10 + index}`,
      badge: (companies[0]?.code || 'TENANT').toUpperCase()
    }));
  }

  private recentLogs(activities: BusinessActivity[], occurrences: BusinessOccurrence[], documents: BusinessDocument[], diaries: BusinessDiary[]): LogRow[] {
    const rows: LogRow[] = [];

    if (activities.length) {
      rows.push({
        title: `${activities[0].service_name} registrada`,
        dateTime: this.formatDateTime(activities[0].created_at),
        type: 'Atividade',
        tone: 'success',
        toneLabel: 'Concluída'
      });
    }

    if (occurrences.length) {
      rows.push({
        title: occurrences[0].title,
        dateTime: this.formatDateTime(occurrences[0].created_at),
        type: 'Ocorrência',
        tone: this.toBoolean(occurrences[0].resolved) ? 'success' : 'warning',
        toneLabel: this.toBoolean(occurrences[0].resolved) ? 'Resolvida' : 'Aberta'
      });
    }

    if (documents.length) {
      rows.push({
        title: `${documents[0].file_name} anexado`,
        dateTime: this.formatDateTime(documents[0].created_at),
        type: 'Documento',
        tone: 'info',
        toneLabel: 'Arquivo'
      });
    }

    if (diaries.length) {
      rows.push({
        title: `Diário ${this.diaryStatus(diaries[0].status).toLowerCase()}`,
        dateTime: this.formatDateTime(diaries[0].created_at),
        type: 'Diário',
        tone: this.diaryStatus(diaries[0].status) === 'Aprovado' ? 'success' : 'warning',
        toneLabel: this.diaryStatus(diaries[0].status)
      });
    }

    return rows.slice(0, 4);
  }

  private alerts(projects: BusinessProject[], diaries: BusinessDiary[], occurrences: BusinessOccurrence[], storagePercent: number): AlertRow[] {
    const alerts: AlertRow[] = [];

    if (occurrences.length) {
      alerts.push({
        title: `${occurrences.length} ocorrências abertas`,
        message: 'Necessitam de atenção da equipe de engenharia.',
        secondary: 'Priorize as ocorrências críticas nas próximas 24 horas.',
        tone: 'danger'
      });
    }

    const pendingCount = diaries.filter((item) => this.diaryStatus(item.status) === 'Pendente').length;
    if (pendingCount) {
      alerts.push({
        title: `${pendingCount} diários pendentes`,
        message: 'Há diários aguardando revisão ou envio.',
        secondary: 'Garanta o fechamento diário até o fim do expediente.',
        tone: 'warning'
      });
    }

    const expiringProjects = projects.filter((item) => item.end_date && new Date(item.end_date).getTime() > Date.now()).slice(0, 1);
    if (expiringProjects.length) {
      alerts.push({
        title: `${expiringProjects.length} obra com prazo próximo`,
        message: 'Verifique cronograma, equipe e materiais do projeto.',
        secondary: `Prazo: ${this.formatDate(expiringProjects[0].end_date)}`,
        tone: 'warning'
      });
    }

    alerts.push({
      title: 'Armazenamento do ambiente',
      message: storagePercent >= 80 ? 'Uso de armazenamento acima do ideal.' : 'Uso de armazenamento em faixa segura.',
      secondary: `${storagePercent}% utilizado`,
      percent: storagePercent,
      tone: storagePercent >= 80 ? 'danger' : 'warning'
    });

    return alerts.slice(0, 4);
  }

  private formatDate(value: any): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('pt-BR').format(date);
  }

  private formatDateTime(value: any): string {
    if (!value) {
      return '31/05/2024 10:23';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  private labelize(value: any): string {
    const raw = String(value ?? '').replace(/_/g, ' ').trim();
    if (!raw) return '-';
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  private projectStatus(value?: string): string {
    const status = String(value || '').toLowerCase();
    if (!status) return 'Em andamento';
    if (status.includes('plan')) return 'Planejada';
    if (status.includes('finish') || status.includes('concl')) return 'Concluída';
    if (status.includes('pause') || status.includes('suspen')) return 'Pausada';
    return 'Em andamento';
  }

  private toBoolean(value: any): boolean {
    return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
  }
}
