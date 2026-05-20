import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { DropDownListModule } from '@syncfusion/ej2-angular-dropdowns';
import { TextBoxModule } from '@syncfusion/ej2-angular-inputs';
import { DialogComponent, DialogModule } from '@syncfusion/ej2-angular-popups';
import { Observable, finalize } from 'rxjs';
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

type DialogMode = 'create' | 'edit' | 'duplicate';
type ResourceKey =
  | 'projects'
  | 'diaries'
  | 'activities'
  | 'teams'
  | 'materials'
  | 'equipments'
  | 'occurrences'
  | 'documents'
  | 'users';
type SelectBucket =
  | 'companies'
  | 'users'
  | 'roles'
  | 'projects'
  | 'diaries'
  | 'projectStatus'
  | 'diaryStatus'
  | 'movementType'
  | 'equipmentStatus'
  | 'occurrenceType'
  | 'severity';
type ResourceFieldType = 'text' | 'number' | 'textarea' | 'select' | 'date' | 'checkbox';

interface ResourceColumn {
  field: string;
  headerText: string;
  width: number;
  type?: 'badge' | 'date' | 'currency' | 'storage' | 'number';
}

interface ResourceField {
  controlName: string;
  label: string;
  type: ResourceFieldType;
  placeholder?: string;
  optionsKey?: SelectBucket;
  required?: boolean;
  min?: number;
  hideOnEdit?: boolean;
}

interface ResourceConfig {
  sortField: string;
  supportsCreate: boolean;
  supportsEdit: boolean;
  supportsDuplicate: boolean;
  supportsDelete: boolean;
  list: (token: string) => Observable<any>;
  create?: (token: string, payload: Record<string, any>) => Observable<any>;
  update?: (token: string, payload: Record<string, any>) => Observable<any>;
  remove?: (token: string, id: number) => Observable<any>;
  columns: ResourceColumn[];
  fields: ResourceField[];
}

interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

interface ResourceOverviewCard {
  label: string;
  value: string;
  detail: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}

interface ResourceInsightPanel {
  title: string;
  lines: string[];
}

interface QuickFilterChip {
  id: string;
  label: string;
  count: number;
}

@Component({
  selector: 'app-admin-resource-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TextBoxModule, DialogModule, ButtonModule, DropDownListModule],
  templateUrl: './admin-resource-page.component.html',
  styleUrl: './admin-resource-page.component.scss'
})
export class AdminResourcePageComponent {
  @ViewChild('createDialog') createDialog!: DialogComponent;

  title = 'Operação';
  subtitle = '';
  resource: ResourceKey = 'projects';
  loading = true;
  saving = false;
  placeholder = false;
  placeholderMessage = '';
  dialogMessage = '';
  rows: any[] = [];
  filteredRows: any[] = [];
  columns: ResourceColumn[] = [];
  createForm!: FormGroup;
  dialogMode: DialogMode = 'create';
  editingRow: any = null;
  searchTerm = '';
  appliedSearch = '';
  pageSize = 20;
  currentPage = 1;
  totalItems = 0;
  totalPages = 1;
  sortField = 'id';
  sortDirection: 'asc' | 'desc' = 'desc';
  sortOptions: Array<{ id: string; text: string }> = [];
  toasts: ToastMessage[] = [];
  overviewCards: ResourceOverviewCard[] = [];
  insightPanels: ResourceInsightPanel[] = [];
  quickFilters: QuickFilterChip[] = [];
  activeQuickFilter = 'all';
  selectedRow: any = null;

  readonly pageSizeOptions = [
    { id: 10, text: '10 por página' },
    { id: 20, text: '20 por página' },
    { id: 50, text: '50 por página' }
  ];

  readonly sortDirectionOptions = [
    { id: 'desc', text: 'Decrescente' },
    { id: 'asc', text: 'Crescente' }
  ];

  optionBuckets: Record<SelectBucket, Array<{ id: any; text: string }>> = {
    companies: [],
    users: [],
    roles: [],
    projects: [],
    diaries: [],
    projectStatus: [],
    diaryStatus: [],
    movementType: [],
    equipmentStatus: [],
    occurrenceType: [],
    severity: []
  };

  private toastSeed = 1;
  private supportLoaded = false;
  private allRows: any[] = [];
  private teamMembersCache: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private loginService: LoginService,
    private adminDataService: AdminDataService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      this.title = data['title'] ?? 'Operação';
      this.subtitle = data['subtitle'] ?? '';
      this.resource = data['resource'] ?? 'projects';
      this.configurePage();
    });
  }

  get activeFields(): ResourceField[] {
    return this.config().fields.filter((field) => !(this.dialogMode === 'edit' && field.hideOnEdit));
  }

  get supportsCreate(): boolean {
    return this.config().supportsCreate;
  }

  openCreateDialog(): void {
    if (!this.config().supportsCreate) {
      return;
    }
    this.ensureSupportOptions();
    this.dialogMode = 'create';
    this.editingRow = null;
    this.createForm = this.buildForm();
    this.dialogMessage = '';
    this.createDialog.show();
  }

  openEditDialog(row: any): void {
    if (!this.canEdit(row)) {
      return;
    }
    this.ensureSupportOptions();
    this.dialogMode = 'edit';
    this.editingRow = row;
    this.createForm = this.buildForm();
    this.createForm.patchValue(this.toFormValue(row, 'edit'));
    this.dialogMessage = '';
    this.createDialog.show();
  }

  openDuplicateDialog(row: any): void {
    if (!this.canDuplicate(row)) {
      return;
    }
    this.ensureSupportOptions();
    this.dialogMode = 'duplicate';
    this.editingRow = row;
    this.createForm = this.buildForm();
    this.createForm.patchValue(this.toFormValue(row, 'duplicate'));
    this.dialogMessage = '';
    this.createDialog.show();
  }

  closeCreateDialog(): void {
    this.createDialog.hide();
  }

  submitCreate(): void {
    if (this.createForm.invalid || this.saving) {
      this.createForm.markAllAsTouched();
      return;
    }

    const token = this.loginService.getToken();
    if (!token) {
      this.redirectToLogin();
      return;
    }

    const config = this.config();
    const payload = this.createPayload();
    const request$ = this.dialogMode === 'edit' ? config.update?.(token, payload) : config.create?.(token, payload);
    if (!request$) {
      return;
    }

    this.saving = true;
    request$
      .pipe(finalize(() => {
        this.saving = false;
        this.flushView();
      }))
      .subscribe({
        next: (response) => {
          if (!response?.status) {
            if (this.isAuthenticationFailure(response?.message)) {
              this.redirectToLogin();
              return;
            }
            this.dialogMessage = response?.message || 'Não foi possível salvar o registro.';
            this.pushToast('error', 'Falha ao salvar', this.dialogMessage);
            return;
          }

          this.pushToast(
            'success',
            this.dialogMode === 'edit' ? 'Registro atualizado' : 'Registro salvo',
            response.message || 'Operação concluída com sucesso.'
          );
          this.closeCreateDialog();
          this.loadRows();
        },
        error: (error) => {
          const message = error?.error?.message || 'Não foi possível salvar o registro.';
          if (this.isAuthenticationFailure(message)) {
            this.redirectToLogin();
            return;
          }
          this.dialogMessage = message;
          this.pushToast('error', 'Erro de operação', message);
        }
      });
  }

  deleteRow(row: any): void {
    if (!this.canDelete(row)) {
      return;
    }

    const token = this.loginService.getToken();
    if (!token) {
      this.redirectToLogin();
      return;
    }

    if (!confirm(`Deseja remover ${this.rowIdentityLabel(row)} de ${this.title.toLowerCase()}? Esta ação não poderá ser desfeita.`)) {
      return;
    }

    const remove = this.config().remove;
    if (!remove) {
      return;
    }

    this.loading = true;
    remove(token, row.id)
      .pipe(finalize(() => {
        this.loading = false;
        this.flushView();
      }))
      .subscribe({
        next: (response) => {
          if (!response?.status) {
            if (this.isAuthenticationFailure(response?.message)) {
              this.redirectToLogin();
              return;
            }
            this.pushToast('error', 'Falha ao remover', response?.message || 'Não foi possível remover o registro.');
            return;
          }
          this.pushToast('success', 'Registro removido', response.message || 'Exclusão realizada com sucesso.');
          this.loadRows();
        },
        error: (error) => {
          const message = error?.error?.message || 'Não foi possível remover o registro.';
          if (this.isAuthenticationFailure(message)) {
            this.redirectToLogin();
            return;
          }
          this.pushToast('error', 'Erro de exclusão', message);
        }
      });
  }

  applySearch(): void {
    this.appliedSearch = this.searchTerm.trim();
    this.currentPage = 1;
    this.applyGridState();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.appliedSearch = '';
    this.currentPage = 1;
    this.applyGridState();
  }

  changePageSize(size: number): void {
    this.pageSize = Number(size) || 20;
    this.currentPage = 1;
    this.applyGridState();
  }

  previousPage(): void {
    if (this.currentPage <= 1) {
      return;
    }
    this.currentPage -= 1;
    this.applyGridState();
  }

  nextPage(): void {
    if (this.currentPage >= this.totalPages) {
      return;
    }
    this.currentPage += 1;
    this.applyGridState();
  }

  changeSortField(field: string): void {
    this.sortField = field;
    this.currentPage = 1;
    this.applyGridState();
  }

  changeSortDirection(direction: string): void {
    this.sortDirection = direction === 'asc' ? 'asc' : 'desc';
    this.currentPage = 1;
    this.applyGridState();
  }

  applyQuickFilter(filterId: string): void {
    this.activeQuickFilter = filterId;
    this.currentPage = 1;
    this.applyGridState();
  }


  trackRow(row: any, index: number): any {
    return row?.id || row?.code || index;
  }

  selectRow(row: any): void {
    this.selectedRow = row;
    this.flushView();
  }

  isSelectedRow(row: any): boolean {
    return this.trackRow(this.selectedRow, -1) === this.trackRow(row, -2);
  }

  displayCell(row: any, field: string): string {
    const value = row?.[field];
    return value === null || value === undefined || value === '' ? '-' : String(value);
  }

  totalRowsLabel(): string {
    if (!this.filteredRows.length) {
      return `0 de ${this.totalItems} registros`;
    }
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = start + this.filteredRows.length - 1;
    return `${start}-${end} de ${this.totalItems} registros`;
  }

  pageLabel(): string {
    return `Página ${this.currentPage} de ${this.totalPages}`;
  }

  totalRowsMinWidth(): number {
    return this.columns.reduce((sum, column) => sum + column.width, 0) + this.actionColumnWidth();
  }

  actionColumnWidth(): number {
    return this.resource === 'diaries' ? 280 : 184;
  }

  dialogTitle(): string {
    if (this.dialogMode === 'edit') {
      return `Editar ${this.title}`;
    }
    if (this.dialogMode === 'duplicate') {
      return `Duplicar ${this.title}`;
    }
    return `Novo cadastro de ${this.title}`;
  }

  showDetailPanel(): boolean {
    return !!this.selectedRow && ['projects', 'diaries', 'activities', 'teams', 'users', 'materials', 'equipments', 'occurrences', 'documents'].includes(this.resource);
  }

  detailEyebrow(): string {
    switch (this.resource) {
      case 'projects':
        return 'Obra selecionada';
      case 'diaries':
        return 'Diário selecionado';
      case 'activities':
        return 'Atividade selecionada';
      case 'teams':
        return 'Equipe selecionada';
      case 'users':
        return 'Usuário selecionado';
      case 'materials':
        return 'Material selecionado';
      case 'equipments':
        return 'Equipamento selecionado';
      case 'occurrences':
        return 'Ocorrência selecionada';
      case 'documents':
        return 'Documento selecionado';
      default:
        return 'Registro selecionado';
    }
  }

  detailPanelTitle(): string {
    if (!this.selectedRow) return '';
    switch (this.resource) {
      case 'projects':
        return this.selectedRow.name || 'Obra selecionada';
      case 'diaries':
        return `${this.selectedRow.projectDisplay} • ${this.selectedRow.workDateDisplay}`;
      case 'activities':
        return this.selectedRow.service_name || 'Atividade selecionada';
      case 'teams':
        return this.selectedRow.name || 'Equipe selecionada';
      case 'users':
        return this.selectedRow.name || 'Usuário selecionado';
      case 'materials':
        return this.selectedRow.material_name || 'Material selecionado';
      case 'equipments':
        return this.selectedRow.equipment_name || 'Equipamento selecionado';
      case 'occurrences':
        return this.selectedRow.title || 'Ocorrência selecionada';
      case 'documents':
        return this.selectedRow.file_name || 'Documento selecionado';
      default:
        return '';
    }
  }

  detailPanelSubtitle(): string {
    if (!this.selectedRow) return '';
    switch (this.resource) {
      case 'projects':
        return `${this.selectedRow.clientDisplay} • ${this.selectedRow.locationDisplay} • ${this.selectedRow.statusDisplay || 'Situação não informada'}`;
      case 'diaries':
        return `${this.selectedRow.statusDisplay} • ${this.selectedRow.weatherDisplay} • ${this.selectedRow.projectDisplay || 'Sem obra vinculada'}`;
      case 'activities':
        return `${this.selectedRow.diaryDisplay || 'Sem diário vinculado'} • ${this.selectedRow.workflowDisplay || 'Fluxo não informado'}`;
      case 'teams':
        return `${this.selectedRow.projectDisplay || 'Sem obra vinculada'} • ${this.selectedRow.activeDisplay || 'Situação não informada'}`;
      case 'users':
        return `${this.selectedRow.roleDisplay || 'Perfil não definido'} • ${this.selectedRow.activeDisplay || 'Situação não informada'}`;
      case 'materials':
        return `${this.selectedRow.movementDisplay || 'Movimentação não informada'} • ${this.selectedRow.quantityDisplay || 'Quantidade não informada'} ${this.selectedRow.unitDisplay || ''}`.trim();
      case 'equipments':
        return `${this.selectedRow.equipmentStatusDisplay || 'Situação não informada'} • ${this.selectedRow.hoursUsedDisplay || 'Horas não informadas'} • ${this.selectedRow.maintenanceDisplay || 'Sem alerta de manutenção'}`;
      case 'occurrences':
        return `${this.selectedRow.occurrenceTypeDisplay || 'Tipo não informado'} • ${this.selectedRow.severityDisplay || 'Gravidade não informada'} • ${this.selectedRow.resolvedDisplay || 'Situação não informada'}`;
      case 'documents':
        return `${this.selectedRow.fileTypeDisplay || 'Tipo não informado'} • ${this.selectedRow.fileSizeDisplay || 'Tamanho não informado'} • ${this.selectedRow.diaryDisplay || 'Sem diário vinculado'}`;
      default:
        return '';
    }
  }

  detailHighlights(): Array<{ label: string; value: string }> {
    if (!this.selectedRow) return [];
    switch (this.resource) {
      case 'projects':
        return [
          { label: 'Situação', value: this.selectedRow.statusDisplay || '-' },
          { label: 'Responsável', value: this.selectedRow.engineerDisplay || 'Não definido' },
          { label: 'Prazo', value: this.selectedRow.periodDisplay || '-' },
          { label: 'Orçamento', value: this.selectedRow.budgetDisplay || '-' }
        ];
      case 'diaries':
        return [
          { label: 'Situação', value: this.selectedRow.statusDisplay || '-' },
          { label: 'Obra', value: this.selectedRow.projectDisplay || '-' },
          { label: 'Clima', value: this.selectedRow.weatherDisplay || '-' },
          { label: 'Responsável', value: this.selectedRow.createdByDisplay || 'Sem responsável' }
        ];
      case 'activities':
        return [
          { label: 'Diário', value: this.selectedRow.diaryDisplay || '-' },
          { label: 'Etapa', value: this.selectedRow.stageDisplay || '-' },
          { label: 'Quantidade', value: this.selectedRow.quantityDisplay || '-' },
          { label: 'Fluxo', value: this.selectedRow.workflowDisplay || '-' }
        ];
      case 'teams':
        return [
          { label: 'Situação', value: this.selectedRow.activeDisplay || '-' },
          { label: 'Obra', value: this.selectedRow.projectDisplay || '-' },
          { label: 'Integrantes', value: `${this.selectedRow.memberCountDisplay || '0'}` },
          { label: 'Alocação', value: this.selectedRow.allocationDisplay || '-' }
        ];
      case 'users':
        return [
          { label: 'Perfil', value: this.selectedRow.roleDisplay || '-' },
          { label: 'Situação', value: this.selectedRow.activeDisplay || '-' },
          { label: 'Empresa', value: this.selectedRow.companyDisplay || '-' },
          { label: 'Telefone', value: this.selectedRow.phoneDisplay || 'Não informado' }
        ];
      case 'materials':
        return [
          { label: 'Movimento', value: this.selectedRow.movementDisplay || '-' },
          { label: 'Quantidade', value: this.selectedRow.quantityDisplay || '-' },
          { label: 'Unidade', value: this.selectedRow.unitDisplay || '-' },
          { label: 'Diário', value: this.selectedRow.diaryDisplay || '-' }
        ];
      case 'equipments':
        return [
          { label: 'Situação', value: this.selectedRow.equipmentStatusDisplay || '-' },
          { label: 'Horas de uso', value: this.selectedRow.hoursUsedDisplay || '-' },
          { label: 'Manutenção', value: this.selectedRow.maintenanceDisplay || '-' },
          { label: 'Diário', value: this.selectedRow.diaryDisplay || '-' }
        ];
      case 'occurrences':
        return [
          { label: 'Tipo', value: this.selectedRow.occurrenceTypeDisplay || '-' },
          { label: 'Gravidade', value: this.selectedRow.severityDisplay || '-' },
          { label: 'Situação', value: this.selectedRow.resolvedDisplay || '-' },
          { label: 'Diário', value: this.selectedRow.diaryDisplay || '-' }
        ];
      case 'documents':
        return [
          { label: 'Arquivo', value: this.selectedRow.file_name || '-' },
          { label: 'Tipo', value: this.selectedRow.fileTypeDisplay || '-' },
          { label: 'Tamanho', value: this.selectedRow.fileSizeDisplay || '-' },
          { label: 'Diário', value: this.selectedRow.diaryDisplay || '-' }
        ];
      default:
        return [];
    }
  }

  detailNotes(): string[] {
    if (!this.selectedRow) return [];
    switch (this.resource) {
      case 'projects':
        return [
          `Código da obra: ${this.selectedRow.code || '-'}`,
          `Endereço base: ${[this.selectedRow.address, this.selectedRow.number, this.selectedRow.district].filter(Boolean).join(', ') || 'Não informado'}`,
          `Cidade / UF: ${this.selectedRow.locationDisplay || 'Não informado'}`,
          `Cliente vinculado: ${this.selectedRow.clientDisplay || 'Não informado'}`
        ];
      case 'diaries':
        return [
          `Resumo: ${this.selectedRow.summaryDisplay || 'Sem resumo'}`,
          `Ocorrências: ${this.selectedRow.occurrences || 'Sem ocorrências registradas'}`,
          `Data de trabalho: ${this.selectedRow.workDateDisplay || '-'}`,
          `Fluxo atual: ${this.selectedRow.statusDisplay || 'Não informado'}`
        ];
      case 'activities':
        return [
          `Serviço executado: ${this.selectedRow.service_name || 'Não informado'}`,
          `Local informado: ${this.selectedRow.locationDisplay || 'Não informado'}`,
          `Observações: ${this.selectedRow.notesDisplay || 'Sem observações'}`
        ];
      case 'teams':
        return [
          `Descrição: ${this.selectedRow.descriptionDisplay || 'Sem descrição cadastrada'}`,
          `Equipe vinculada à obra: ${this.selectedRow.projectDisplay || 'Não vinculada'}`,
          `Integrantes mapeados nesta composição: ${this.selectedRow.memberCountDisplay || '0'}`,
          `Composição atual: ${this.selectedRow.compositionDisplay || 'Não informada'}`
        ];
      case 'users':
        return [
          `E-mail principal: ${this.selectedRow.email || 'Não informado'}`,
          `Perfil operacional: ${this.selectedRow.roleDisplay || 'Não definido'}`,
          `Empresa vinculada: ${this.selectedRow.companyDisplay || 'Não informada'}`,
          `Nível de aprovação: ${this.selectedRow.approvalDisplay || 'Não informado'}`
        ];
      case 'materials':
        return [
          `Material: ${this.selectedRow.material_name || 'Não informado'}`,
          `Quantidade lançada: ${this.selectedRow.quantityDisplay || 'Não informada'} ${this.selectedRow.unitDisplay || ''}`.trim(),
          `Observações: ${this.selectedRow.notesDisplay || 'Sem observações'}`,
          `Movimentação associada ao diário: ${this.selectedRow.diaryDisplay || 'Não vinculada'}`
        ];
      case 'equipments':
        return [
          `Equipamento: ${this.selectedRow.equipment_name || 'Não informado'}`,
          `Horas registradas: ${this.selectedRow.hoursUsedDisplay || 'Não informadas'}`,
          `Observações: ${this.selectedRow.notesDisplay || 'Sem observações'}`,
          `Status de manutenção: ${this.selectedRow.maintenanceDisplay || 'Sem alerta'}`
        ];
      case 'occurrences':
        return [
          `Título operacional: ${this.selectedRow.title || 'Sem título cadastrado'}`,
          `Descrição: ${this.selectedRow.descriptionDisplay || 'Sem descrição cadastrada'}`,
          `Registro diário: ${this.selectedRow.diaryDisplay || 'Não vinculado'}`,
          `Fechamento operacional: ${this.selectedRow.resolvedDisplay || 'Sem situação'}`
        ];
      case 'documents':
        return [
          `Arquivo registrado: ${this.selectedRow.file_name || 'Não informado'}`,
          `Observações: ${this.selectedRow.notesDisplay || 'Sem observações'}`,
          `URL disponível: ${this.selectedRow.urlDisplay || 'Sem link'}`,
          `Vínculo operacional: ${this.selectedRow.diaryDisplay || 'Sem diário vinculado'}`,
          `Tipo documental: ${this.selectedRow.fileTypeDisplay || 'Não informado'}`
        ];
      default:
        return [];
    }
  }

  fieldError(controlName: string): string {
    const control = this.createForm.get(controlName);
    if (!control || !control.touched || !control.errors) {
      return '';
    }
    if (control.errors['required']) return 'Campo obrigatório.';
    if (control.errors['email']) return 'Informe um e-mail válido.';
    if (control.errors['min']) return 'Valor abaixo do mínimo permitido.';
    if (control.errors['pattern']) return this.patternErrorMessage(controlName);
    return 'Valor inválido.';
  }

  dismissToast(id: number): void {
    this.toasts = this.toasts.filter((item) => item.id !== id);
  }

  exportJson(): void {
    this.downloadBlob('application/json', JSON.stringify(this.filteredRows, null, 2), `${this.resource}-pagina-${this.currentPage}.json`);
    this.pushToast('info', 'Exportação JSON', 'Página atual exportada com sucesso.');
  }

  exportCsv(): void {
    const headers = [...this.columns.map((item) => item.headerText), 'Ações'];
    const fields = this.columns.map((item) => item.field);
    const rows = this.filteredRows.map((row) => fields.map((field) => `"${String(row?.[field] ?? '').replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    this.downloadBlob('text/csv;charset=utf-8', csv, `${this.resource}-pagina-${this.currentPage}.csv`);
    this.pushToast('info', 'Exportação CSV', 'Página atual exportada com sucesso.');
  }

  canEdit(_row: any): boolean {
    return this.config().supportsEdit;
  }

  canDuplicate(_row: any): boolean {
    return this.config().supportsDuplicate;
  }

  canDelete(_row: any): boolean {
    return this.config().supportsDelete;
  }

  canApprove(row: any): boolean {
    return this.resource === 'diaries' && !this.isDiaryStatus(row?.status, 'aprovado');
  }

  canReject(row: any): boolean {
    return this.resource === 'diaries' && !this.isDiaryStatus(row?.status, 'reprovado');
  }

  approveDiary(row: any): void {
    this.updateDiaryStatus(row, 'aprovado', 'Diário aprovado', 'Diário de obra aprovado com sucesso.');
  }

  rejectDiary(row: any): void {
    this.updateDiaryStatus(row, 'reprovado', 'Diário reprovado', 'Diário de obra reprovado com sucesso.');
  }

  disabledReason(_row: any): string {
    if (!this.config().supportsEdit && !this.config().supportsDelete) {
      return 'Este módulo não expõe edição ou exclusão pela API.';
    }
    if (!this.config().supportsDelete) {
      return 'A API atual não permite exclusão neste módulo.';
    }
    return '';
  }

  isBadgeField(column: ResourceColumn): boolean {
    return column.type === 'badge';
  }

  badgeTone(value: any): string {
    const text = String(value ?? '').toLowerCase();
    if (text.includes('ativo') || text.includes('aprovado') || text.includes('conclu') || text.includes('resolvida')) return 'success';
    if (text.includes('pendente') || text.includes('andamento') || text.includes('planejada')) return 'warning';
    if (text.includes('reprovado') || text.includes('inativo') || text.includes('crítica') || text.includes('bloqueada') || text.includes('aberta')) return 'danger';
    return 'neutral';
  }

  inputType(field: ResourceField): string {
    if (field.type === 'number') return 'number';
    if (field.type === 'date') return 'date';
    return 'text';
  }

  controlOptions(field: ResourceField): Array<{ id: any; text: string }> {
    return field.optionsKey ? this.optionBuckets[field.optionsKey] || [] : [];
  }

  private configurePage(): void {
    const token = this.loginService.getToken();
    if (!token) {
      this.redirectToLogin();
      return;
    }

    this.loading = true;
    this.placeholder = false;
    this.placeholderMessage = '';
    this.columns = this.config().columns;
    this.sortField = this.config().sortField;
    this.sortDirection = 'desc';
    this.sortOptions = this.columns.map((column) => ({ id: column.field, text: column.headerText }));
    this.currentPage = 1;
    this.searchTerm = '';
    this.appliedSearch = '';
    this.activeQuickFilter = 'all';
    this.supportLoaded = false;
    this.createForm = this.buildForm();
    this.ensureSupportOptions();
    this.loadRows();
  }

  private config(): ResourceConfig {
    const baseColumns = {
      projects: [
        { field: 'code', headerText: 'Código', width: 130 },
        { field: 'name', headerText: 'Obra', width: 280 },
        { field: 'clientDisplay', headerText: 'Cliente', width: 220 },
        { field: 'locationDisplay', headerText: 'Cidade / UF', width: 180 },
        { field: 'budgetDisplay', headerText: 'Orçamento', width: 160, type: 'currency' as const },
        { field: 'statusDisplay', headerText: 'Situação', width: 160, type: 'badge' as const },
        { field: 'periodDisplay', headerText: 'Prazo', width: 200, type: 'date' as const }
      ],
      diaries: [
        { field: 'projectDisplay', headerText: 'Obra', width: 260 },
        { field: 'workDateDisplay', headerText: 'Data', width: 140, type: 'date' as const },
        { field: 'weatherDisplay', headerText: 'Clima', width: 180 },
        { field: 'statusDisplay', headerText: 'Situação', width: 160, type: 'badge' as const },
        { field: 'summaryDisplay', headerText: 'Resumo', width: 360 }
      ],
      activities: [
        { field: 'diaryDisplay', headerText: 'Diário', width: 220 },
        { field: 'service_name', headerText: 'Serviço', width: 260 },
        { field: 'stageDisplay', headerText: 'Etapa', width: 200 },
        { field: 'quantityDisplay', headerText: 'Quantidade', width: 150 },
        { field: 'workflowDisplay', headerText: 'Fluxo', width: 180, type: 'badge' as const },
        { field: 'locationDisplay', headerText: 'Local', width: 220 }
      ],
      teams: [
        { field: 'projectDisplay', headerText: 'Obra', width: 240 },
        { field: 'name', headerText: 'Equipe', width: 220 },
        { field: 'memberCountDisplay', headerText: 'Integrantes', width: 140, type: 'number' as const },
        { field: 'compositionDisplay', headerText: 'Composição', width: 240 },
        { field: 'activeDisplay', headerText: 'Situação', width: 150, type: 'badge' as const }
      ],
      materials: [
        { field: 'diaryDisplay', headerText: 'Diário', width: 220 },
        { field: 'material_name', headerText: 'Material', width: 260 },
        { field: 'movementDisplay', headerText: 'Movimento', width: 170, type: 'badge' as const },
        { field: 'quantityDisplay', headerText: 'Quantidade', width: 150 },
        { field: 'unitDisplay', headerText: 'Unidade', width: 130 },
        { field: 'notesDisplay', headerText: 'Observações', width: 280 }
      ],
      equipments: [
        { field: 'diaryDisplay', headerText: 'Diário', width: 220 },
        { field: 'equipment_name', headerText: 'Equipamento', width: 240 },
        { field: 'equipmentStatusDisplay', headerText: 'Situação', width: 160, type: 'badge' as const },
        { field: 'hoursUsedDisplay', headerText: 'Horas de uso', width: 150 },
        { field: 'maintenanceDisplay', headerText: 'Manutenção', width: 180, type: 'badge' as const },
        { field: 'notesDisplay', headerText: 'Observações', width: 280 }
      ],
      occurrences: [
        { field: 'diaryDisplay', headerText: 'Diário', width: 220 },
        { field: 'title', headerText: 'Título', width: 240 },
        { field: 'occurrenceTypeDisplay', headerText: 'Tipo', width: 160 },
        { field: 'severityDisplay', headerText: 'Gravidade', width: 150, type: 'badge' as const },
        { field: 'resolvedDisplay', headerText: 'Situação', width: 150, type: 'badge' as const },
        { field: 'descriptionDisplay', headerText: 'Descrição', width: 320 }
      ],
      documents: [
        { field: 'diaryDisplay', headerText: 'Diário', width: 220 },
        { field: 'file_name', headerText: 'Arquivo', width: 260 },
        { field: 'fileTypeDisplay', headerText: 'Tipo', width: 150, type: 'badge' as const },
        { field: 'fileSizeDisplay', headerText: 'Tamanho', width: 150, type: 'storage' as const },
        { field: 'notesDisplay', headerText: 'Observações', width: 260 },
        { field: 'urlDisplay', headerText: 'Link', width: 320 }
      ],
      users: [
        { field: 'companyDisplay', headerText: 'Empresa', width: 240 },
        { field: 'name', headerText: 'Usuário', width: 220 },
        { field: 'email', headerText: 'E-mail', width: 280 },
        { field: 'roleDisplay', headerText: 'Perfil', width: 180 },
        { field: 'approvalDisplay', headerText: 'Aprovação', width: 160, type: 'badge' as const },
        { field: 'editDisplay', headerText: 'Edição', width: 150, type: 'badge' as const },
        { field: 'activeDisplay', headerText: 'Situação', width: 150, type: 'badge' as const }
      ]
    };

    const map: Record<ResourceKey, ResourceConfig> = {
      projects: {
        sortField: 'name',
        supportsCreate: true,
        supportsEdit: true,
        supportsDuplicate: true,
        supportsDelete: true,
        list: (token) => this.adminDataService.projects(token),
        create: (token, payload) => this.adminDataService.createProject(token, payload),
        update: (token, payload) => this.adminDataService.updateProject(token, payload),
        remove: (token, id) => this.adminDataService.deleteProject(token, id),
        columns: baseColumns.projects,
        fields: [
          { controlName: 'code', label: 'Código', type: 'text', required: true },
          { controlName: 'name', label: 'Nome da obra', type: 'text', required: true },
          { controlName: 'client_name', label: 'Cliente', type: 'text' },
          { controlName: 'company_id', label: 'Empresa', type: 'select', optionsKey: 'companies', required: true },
          { controlName: 'engineer_user_id', label: 'Responsável', type: 'select', optionsKey: 'users' },
          { controlName: 'address', label: 'Endereço', type: 'text' },
          { controlName: 'number', label: 'Número', type: 'text' },
          { controlName: 'district', label: 'Bairro', type: 'text' },
          { controlName: 'city', label: 'Cidade', type: 'text' },
          { controlName: 'state', label: 'UF', type: 'text' },
          { controlName: 'zipcode', label: 'CEP', type: 'text' },
          { controlName: 'budget_amount', label: 'Orçamento', type: 'number', min: 0 },
          { controlName: 'start_date', label: 'Data de início', type: 'date' },
          { controlName: 'end_date', label: 'Data final', type: 'date' },
          { controlName: 'status', label: 'Situação', type: 'select', optionsKey: 'projectStatus' }
        ]
      },
      diaries: {
        sortField: 'workDateDisplay',
        supportsCreate: true,
        supportsEdit: true,
        supportsDuplicate: true,
        supportsDelete: false,
        list: (token) => this.adminDataService.diaries(token),
        create: (token, payload) => this.adminDataService.createDiary(token, payload),
        update: (token, payload) => this.adminDataService.updateDiary(token, payload),
        columns: baseColumns.diaries,
        fields: [
          { controlName: 'project_id', label: 'Obra', type: 'select', optionsKey: 'projects', required: true },
          { controlName: 'work_date', label: 'Data da obra', type: 'date', required: true },
          { controlName: 'weather', label: 'Clima', type: 'text' },
          { controlName: 'summary', label: 'Resumo', type: 'textarea' },
          { controlName: 'occurrences', label: 'Observações', type: 'textarea' },
          { controlName: 'status', label: 'Situação', type: 'select', optionsKey: 'diaryStatus' }
        ]
      },
      activities: {
        sortField: 'service_name',
        supportsCreate: true,
        supportsEdit: true,
        supportsDuplicate: true,
        supportsDelete: true,
        list: (token) => this.adminDataService.activities(token),
        create: (token, payload) => this.adminDataService.createActivity(token, payload),
        update: (token, payload) => this.adminDataService.updateActivity(token, payload),
        remove: (token, id) => this.adminDataService.deleteActivity(token, id),
        columns: baseColumns.activities,
        fields: [
          { controlName: 'daily_log_id', label: 'Diário', type: 'select', optionsKey: 'diaries', required: true },
          { controlName: 'service_name', label: 'Serviço', type: 'text', required: true },
          { controlName: 'quantity', label: 'Quantidade', type: 'number', min: 0 },
          { controlName: 'unit', label: 'Unidade', type: 'text' },
          { controlName: 'location', label: 'Local', type: 'text' },
          { controlName: 'notes', label: 'Observações', type: 'textarea' }
        ]
      },
      teams: {
        sortField: 'name',
        supportsCreate: true,
        supportsEdit: true,
        supportsDuplicate: true,
        supportsDelete: true,
        list: (token) => this.adminDataService.teams(token),
        create: (token, payload) => this.adminDataService.createTeam(token, payload),
        update: (token, payload) => this.adminDataService.updateTeam(token, payload),
        remove: (token, id) => this.adminDataService.deleteTeam(token, id),
        columns: baseColumns.teams,
        fields: [
          { controlName: 'project_id', label: 'Obra', type: 'select', optionsKey: 'projects', required: true },
          { controlName: 'name', label: 'Nome da equipe', type: 'text', required: true },
          { controlName: 'description', label: 'Descrição', type: 'textarea' },
          { controlName: 'active', label: 'Ativa', type: 'checkbox' }
        ]
      },
      materials: {
        sortField: 'material_name',
        supportsCreate: true,
        supportsEdit: true,
        supportsDuplicate: true,
        supportsDelete: true,
        list: (token) => this.adminDataService.materials(token),
        create: (token, payload) => this.adminDataService.createMaterial(token, payload),
        update: (token, payload) => this.adminDataService.updateMaterial(token, payload),
        remove: (token, id) => this.adminDataService.deleteMaterial(token, id),
        columns: baseColumns.materials,
        fields: [
          { controlName: 'daily_log_id', label: 'Diário', type: 'select', optionsKey: 'diaries', required: true },
          { controlName: 'material_name', label: 'Material', type: 'text', required: true },
          { controlName: 'movement_type', label: 'Movimento', type: 'select', optionsKey: 'movementType' },
          { controlName: 'quantity', label: 'Quantidade', type: 'number', min: 0 },
          { controlName: 'unit', label: 'Unidade', type: 'text' },
          { controlName: 'notes', label: 'Observações', type: 'textarea' }
        ]
      },
      equipments: {
        sortField: 'equipment_name',
        supportsCreate: true,
        supportsEdit: true,
        supportsDuplicate: true,
        supportsDelete: true,
        list: (token) => this.adminDataService.equipments(token),
        create: (token, payload) => this.adminDataService.createEquipment(token, payload),
        update: (token, payload) => this.adminDataService.updateEquipment(token, payload),
        remove: (token, id) => this.adminDataService.deleteEquipment(token, id),
        columns: baseColumns.equipments,
        fields: [
          { controlName: 'daily_log_id', label: 'Diário', type: 'select', optionsKey: 'diaries', required: true },
          { controlName: 'equipment_name', label: 'Equipamento', type: 'text', required: true },
          { controlName: 'status', label: 'Situação', type: 'select', optionsKey: 'equipmentStatus' },
          { controlName: 'hours_used', label: 'Horas de uso', type: 'number', min: 0 },
          { controlName: 'notes', label: 'Observações', type: 'textarea' }
        ]
      },
      occurrences: {
        sortField: 'title',
        supportsCreate: true,
        supportsEdit: true,
        supportsDuplicate: true,
        supportsDelete: true,
        list: (token) => this.adminDataService.occurrences(token),
        create: (token, payload) => this.adminDataService.createOccurrence(token, payload),
        update: (token, payload) => this.adminDataService.updateOccurrence(token, payload),
        remove: (token, id) => this.adminDataService.deleteOccurrence(token, id),
        columns: baseColumns.occurrences,
        fields: [
          { controlName: 'daily_log_id', label: 'Diário', type: 'select', optionsKey: 'diaries', required: true },
          { controlName: 'occurrence_type', label: 'Tipo', type: 'select', optionsKey: 'occurrenceType' },
          { controlName: 'title', label: 'Título', type: 'text', required: true },
          { controlName: 'description', label: 'Descrição', type: 'textarea' },
          { controlName: 'severity', label: 'Gravidade', type: 'select', optionsKey: 'severity' },
          { controlName: 'resolved', label: 'Resolvida', type: 'checkbox' }
        ]
      },
      documents: {
        sortField: 'file_name',
        supportsCreate: true,
        supportsEdit: true,
        supportsDuplicate: true,
        supportsDelete: true,
        list: (token) => this.adminDataService.documents(token),
        create: (token, payload) => this.adminDataService.createDocument(token, payload),
        update: (token, payload) => this.adminDataService.updateDocument(token, payload),
        remove: (token, id) => this.adminDataService.deleteDocument(token, id),
        columns: baseColumns.documents,
        fields: [
          { controlName: 'daily_log_id', label: 'Diário', type: 'select', optionsKey: 'diaries', required: true },
          { controlName: 'file_name', label: 'Nome do arquivo', type: 'text', required: true },
          { controlName: 'file_type', label: 'Tipo', type: 'text' },
          { controlName: 'file_url', label: 'URL do arquivo', type: 'text' },
          { controlName: 'file_size_bytes', label: 'Tamanho em bytes', type: 'number', min: 0 },
          { controlName: 'notes', label: 'Observações', type: 'textarea' }
        ]
      },
      users: {
        sortField: 'name',
        supportsCreate: true,
        supportsEdit: false,
        supportsDuplicate: false,
        supportsDelete: false,
        list: (token) => this.adminDataService.tenantUsers(token),
        create: (token, payload) => this.adminDataService.createTenantUser(token, payload),
        columns: baseColumns.users,
        fields: [
          { controlName: 'company_id', label: 'Empresa', type: 'select', optionsKey: 'companies', required: true },
          { controlName: 'name', label: 'Nome', type: 'text', required: true },
          { controlName: 'email', label: 'E-mail', type: 'text', required: true },
          { controlName: 'password', label: 'Senha', type: 'text', required: true, hideOnEdit: true },
          { controlName: 'role_id', label: 'Perfil', type: 'select', optionsKey: 'roles' },
          { controlName: 'phone', label: 'Telefone', type: 'text' },
          { controlName: 'active', label: 'Ativo', type: 'checkbox' }
        ]
      }
    };

    return map[this.resource];
  }

  private ensureSupportOptions(): void {
    if (this.supportLoaded) {
      return;
    }
    const token = this.loginService.getToken();
    if (!token) {
      return;
    }

    this.supportLoaded = true;
    this.optionBuckets.projectStatus = [
      { id: 'em_andamento', text: 'Em andamento' },
      { id: 'planejada', text: 'Planejada' },
      { id: 'concluida', text: 'Concluída' },
      { id: 'pausada', text: 'Pausada' }
    ];
    this.optionBuckets.diaryStatus = [
      { id: 'pendente', text: 'Pendente' },
      { id: 'aprovado', text: 'Aprovado' },
      { id: 'reprovado', text: 'Reprovado' }
    ];
    this.optionBuckets.movementType = [
      { id: 'entrada', text: 'Entrada' },
      { id: 'saida', text: 'Saída' },
      { id: 'consumo', text: 'Consumo' }
    ];
    this.optionBuckets.equipmentStatus = [
      { id: 'disponivel', text: 'Disponível' },
      { id: 'em_uso', text: 'Em uso' },
      { id: 'manutencao', text: 'Manutenção' }
    ];
    this.optionBuckets.occurrenceType = [
      { id: 'seguranca', text: 'Segurança' },
      { id: 'qualidade', text: 'Qualidade' },
      { id: 'material', text: 'Material' },
      { id: 'clima', text: 'Clima' },
      { id: 'geral', text: 'Geral' }
    ];
    this.optionBuckets.severity = [
      { id: 'baixa', text: 'Baixa' },
      { id: 'media', text: 'Média' },
      { id: 'alta', text: 'Alta' },
      { id: 'critica', text: 'Crítica' }
    ];

    this.adminDataService.projects(token).subscribe({
      next: (response) => {
        this.optionBuckets.projects = this.items<BusinessProject>(response?.data).map((item) => ({
          id: item.id,
          text: `${item.code} - ${item.name}`
        }));
      }
    });

    this.adminDataService.diaries(token).subscribe({
      next: (response) => {
        this.optionBuckets.diaries = this.items<BusinessDiary>(response?.data).map((item) => ({
          id: item.id,
          text: `${this.formatDate(item.work_date)} - Diário #${item.id}`
        }));
      }
    });

    this.adminDataService.tenantCompanies(token).subscribe({
      next: (response) => {
        this.optionBuckets.companies = this.items<any>(response?.data).map((item) => ({
          id: item.id,
          text: item.fantasy_name || item.corporate_name || item.name || `Empresa #${item.id}`
        }));
      }
    });

    this.adminDataService.tenantUsers(token).subscribe({
      next: (response) => {
        this.optionBuckets.users = this.items<BusinessUser>(response?.data).map((item) => ({
          id: item.id,
          text: `${item.name} - ${item.email}`
        }));
      }
    });

    this.adminDataService.tenantMetadata(token).subscribe({
      next: (response) => {
        const roles = Array.isArray(response?.data?.roles) ? (response.data.roles as TenantMetadataRole[]) : [];
        this.optionBuckets.roles = roles.map((item) => ({ id: item.id, text: item.name }));
      }
    });

    this.adminDataService.teamMembers(token).subscribe({
      next: (response) => {
        this.teamMembersCache = this.items<any>(response?.data);
        if (this.resource === 'teams' && this.allRows.length) {
          this.allRows = this.mapRowsForView(this.rows.length ? this.rows : this.allRows);
          this.rebuildOverview();
          this.applyGridState();
        }
      }
    });
  }

  private loadRows(): void {
    const token = this.loginService.getToken();
    if (!token) {
      this.redirectToLogin();
      return;
    }

    this.loading = true;
    this.placeholder = false;
    this.placeholderMessage = '';

    this.config()
      .list(token)
      .pipe(finalize(() => {
        this.loading = false;
        this.flushView();
      }))
      .subscribe({
        next: (response) => {
          if (!response?.status) {
            if (this.isAuthenticationFailure(response?.message)) {
              this.redirectToLogin();
              return;
            }
            this.placeholder = true;
            this.placeholderMessage = response?.message || 'Falha ao carregar os dados do módulo.';
            this.allRows = [];
            this.rows = [];
            this.filteredRows = [];
            this.totalItems = 0;
            return;
          }

          this.allRows = this.mapRowsForView(this.items(response?.data));
          this.rebuildOverview();
          this.applyGridState();
        },
        error: (error) => {
          const message = error?.error?.message || 'Falha na conexão com a API tenant.';
          if (this.isAuthenticationFailure(message)) {
            this.redirectToLogin();
            return;
          }
          this.placeholder = true;
          this.placeholderMessage = message;
          this.allRows = [];
          this.rows = [];
          this.filteredRows = [];
          this.totalItems = 0;
          this.overviewCards = [];
          this.insightPanels = [];
        }
      });
  }

  private applyGridState(): void {
    let rows = [...this.allRows];

    if (this.activeQuickFilter !== 'all') {
      rows = rows.filter((row) => this.matchesQuickFilter(row, this.activeQuickFilter));
    }

    if (this.appliedSearch) {
      const term = this.appliedSearch.toLowerCase();
      rows = rows.filter((row) => Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(term)));
    }

    rows.sort((left, right) => this.compareRows(left?.[this.sortField], right?.[this.sortField], this.sortDirection));

    this.totalItems = rows.length;
    this.totalPages = Math.max(1, Math.ceil(Math.max(rows.length, 1) / this.pageSize));
    this.currentPage = Math.min(this.currentPage, this.totalPages);
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;

    this.rows = rows;
    this.filteredRows = rows.slice(start, end);
    this.selectedRow =
      this.filteredRows.find((row) => this.trackRow(row, -1) === this.trackRow(this.selectedRow, -2)) ||
      this.filteredRows[0] ||
      null;
    this.flushView();
  }

  private buildQuickFilters(filters: Array<[string, string]>): QuickFilterChip[] {
    return filters.map(([id, label]) => ({
      id,
      label,
      count: id === 'all' ? this.allRows.length : this.allRows.filter((row) => this.matchesQuickFilter(row, id)).length
    }));
  }

  private matchesQuickFilter(row: any, filterId: string): boolean {
    switch (this.resource) {
      case 'projects':
        if (filterId === 'prazo') return this.isDueSoon(row?.end_date);
        if (filterId === 'orcada') return Number(row?.budget_amount || 0) > 0;
        return this.matchText(row?.statusDisplay, filterId);
      case 'diaries':
        if (filterId === 'clima_critico') return this.matchText(row?.weatherDisplay, 'chuva') || this.matchText(row?.weatherDisplay, 'tempestade') || this.matchText(row?.weatherDisplay, 'vento');
        return this.matchText(row?.statusDisplay, filterId);
      case 'materials':
        if (filterId === 'saida') {
          return this.matchText(row?.movementDisplay, 'saida') || this.matchText(row?.movementDisplay, 'consumo');
        }
        if (filterId === 'alto_volume') {
          return Number(row?.quantity || 0) >= 100;
        }
        return this.matchText(row?.movementDisplay, filterId);
      case 'equipments':
        if (filterId === 'uso_intenso') {
          return Number(row?.hours_used || 0) >= 100;
        }
        if (filterId === 'manutencao') {
          return this.matchText(row?.maintenanceDisplay, 'manuten');
        }
        return this.matchText(row?.equipmentStatusDisplay, filterId);
      case 'documents':
        if (filterId === 'jpg') {
          return this.matchText(row?.fileTypeDisplay, 'jpg') || this.matchText(row?.fileTypeDisplay, 'jpeg') || this.matchText(row?.fileTypeDisplay, 'png');
        }
        if (filterId === 'com_link') {
          return !!row?.urlDisplay && row.urlDisplay !== 'Sem link';
        }
        if (filterId === 'grande') {
          return Number(row?.file_size_bytes || 0) >= 5 * 1024 * 1024;
        }
        return this.matchText(row?.fileTypeDisplay, filterId);
      case 'occurrences':
        if (filterId === 'aberta') return this.matchText(row?.resolvedDisplay, 'aberta');
        if (filterId === 'resolvida') return this.matchText(row?.resolvedDisplay, 'resolvida');
        if (filterId === 'critica') return this.matchText(row?.severityDisplay, 'critica');
        if (filterId === 'alta') return this.matchText(row?.severityDisplay, 'alta');
        return false;
      case 'users':
        if (filterId === 'aprovador') return this.matchText(row?.approvalDisplay, 'pode aprovar');
        return this.matchText(row?.activeDisplay, filterId);
      case 'teams':
        if (filterId === 'grande') return Number(row?.memberCountDisplay || 0) >= 5;
        return this.matchText(row?.activeDisplay, filterId);
      default:
        return true;
    }
  }

  private matchText(value: any, term: string): boolean {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .includes(
        String(term)
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
      );
  }

  private buildForm(): FormGroup {
    const group: Record<string, FormControl> = {};
    for (const field of this.config().fields) {
      const validators = [];
      if (field.required) validators.push(Validators.required);
      if (field.min !== undefined) validators.push(Validators.min(field.min));
      if (field.controlName === 'email') validators.push(Validators.email);
      if (field.controlName === 'file_url') validators.push(Validators.pattern(/^https?:\/\/.+/i));
      if (field.controlName === 'phone') validators.push(Validators.pattern(/^[0-9()+\-\s]{8,20}$/));
      if (field.controlName === 'document') validators.push(Validators.pattern(/^[0-9./-]{8,20}$/));
      if (field.controlName === 'zipcode') validators.push(Validators.pattern(/^[0-9-]{8,10}$/));
      const initial = field.type === 'checkbox' ? false : '';
      group[field.controlName] = new FormControl(initial, validators);
    }
    group['id'] = new FormControl(null);
    return this.fb.group(group);
  }

  private patternErrorMessage(controlName: string): string {
    switch (controlName) {
      case 'file_url':
        return 'Informe uma URL válida iniciando com http:// ou https://.';
      case 'phone':
        return 'Informe um telefone válido.';
      case 'document':
        return 'Informe um documento válido.';
      case 'zipcode':
        return 'Informe um CEP válido.';
      default:
        return 'Formato inválido.';
    }
  }

  private rowIdentityLabel(row: any): string {
    const label =
      row?.name ||
      row?.title ||
      row?.material_name ||
      row?.equipment_name ||
      row?.file_name ||
      row?.code ||
      row?.id;
    return label ? `"${label}"` : 'este registro';
  }

  private createPayload(): Record<string, any> {
    const raw = { ...this.createForm.getRawValue() };
    ['active', 'resolved'].forEach((field) => {
      if (field in raw) {
        raw[field] = this.toBoolean(raw[field]);
      }
    });

    const numericFields = ['company_id', 'engineer_user_id', 'project_id', 'daily_log_id', 'role_id', 'quantity', 'hours_used', 'file_size_bytes', 'budget_amount'];
    numericFields.forEach((field) => {
      if (field in raw && raw[field] !== '' && raw[field] !== null && raw[field] !== undefined) {
        raw[field] = Number(raw[field]);
      }
    });

    if (this.dialogMode !== 'edit') {
      delete raw.id;
    }

    if (this.resource === 'diaries' && this.dialogMode !== 'edit') {
      raw.created_by = this.loginService.getLocalToken()?.user?.id ?? 1;
    }

    return raw;
  }

  private toFormValue(row: any, mode: DialogMode): Record<string, any> {
    if (this.resource === 'projects') {
      return {
        id: mode === 'edit' ? row.id : null,
        code: mode === 'duplicate' ? `${row.code}-copy` : row.code,
        name: mode === 'duplicate' ? `${row.name} - Cópia` : row.name,
        client_name: row.client_name || '',
        company_id: row.company_id || '',
        engineer_user_id: row.engineer_user_id || '',
        address: row.address || '',
        number: row.number || '',
        district: row.district || '',
        city: row.city || '',
        state: row.state || '',
        zipcode: row.zipcode || '',
        budget_amount: row.budget_amount || '',
        start_date: row.start_date || '',
        end_date: row.end_date || '',
        status: row.status || 'em_andamento'
      };
    }

    if (this.resource === 'diaries') {
      return {
        id: mode === 'edit' ? row.id : null,
        project_id: row.project_id || '',
        work_date: row.work_date || '',
        weather: row.weather || '',
        summary: row.summary || '',
        occurrences: row.occurrences || '',
        status: row.status || 'pendente'
      };
    }

    if (this.resource === 'users') {
      return {
        id: null,
        company_id: row.company_id || '',
        name: row.name || '',
        email: mode === 'duplicate' ? `copy.${row.email}` : row.email,
        password: '',
        role_id: row.role_id || '',
        phone: row.phone || '',
        active: this.toBoolean(row.active)
      };
    }

    return {
      id: mode === 'edit' ? row.id : null,
      ...row
    };
  }

  private mapRowsForDisplay(rows: any[]): any[] {
    switch (this.resource) {
      case 'projects':
        return rows.map((row: BusinessProject) => ({
          ...row,
          clientDisplay: row.client_name || 'Sem cliente',
          locationDisplay: [row.city, row.state].filter(Boolean).join(' - ') || 'Não informado',
          budgetDisplay: this.formatCurrency(row.budget_amount),
          statusDisplay: this.projectStatus(row.status),
          periodDisplay: [this.formatDate(row.start_date), this.formatDate(row.end_date)].filter((item) => item !== '-').join(' até ') || '-'
        }));
      case 'diaries':
        return rows.map((row: BusinessDiary) => ({
          ...row,
          projectDisplay: this.optionLabel('projects', row.project_id, `Obra #${row.project_id}`),
          workDateDisplay: this.formatDate(row.work_date),
          weatherDisplay: row.weather || 'Não informado',
          statusDisplay: this.diaryStatus(row.status),
          summaryDisplay: row.summary || 'Sem resumo'
        }));
      case 'activities':
        return rows.map((row: BusinessActivity) => ({
          ...row,
          diaryDisplay: this.optionLabel('diaries', row.daily_log_id, `Diário #${row.daily_log_id}`),
          stageDisplay: this.inferActivityStage(row.service_name),
          workflowDisplay: this.inferActivityWorkflow(row.service_name, row.notes),
          quantityDisplay: row.quantity ? `${this.formatNumber(row.quantity)} ${row.unit || ''}`.trim() : 'Não informado',
          unitDisplay: row.unit || 'Unidade',
          locationDisplay: row.location || 'Não informado'
        }));
      case 'teams':
        return rows.map((row: BusinessTeam) => ({
          ...row,
          projectDisplay: this.optionLabel('projects', row.project_id, `Obra #${row.project_id}`),
          descriptionDisplay: row.description || 'Sem descrição',
          activeDisplay: this.activeDisplay(row.active)
        }));
      case 'materials':
        return rows.map((row: BusinessMaterial) => ({
          ...row,
          diaryDisplay: this.optionLabel('diaries', row.daily_log_id, `Diário #${row.daily_log_id}`),
          movementDisplay: this.labelize(row.movement_type || 'Movimentação'),
          quantityDisplay: row.quantity ? `${this.formatNumber(row.quantity)} ${row.unit || ''}`.trim() : 'Não informado',
          notesDisplay: row.notes || 'Sem observações'
        }));
      case 'equipments':
        return rows.map((row: BusinessEquipment) => ({
          ...row,
          diaryDisplay: this.optionLabel('diaries', row.daily_log_id, `Diário #${row.daily_log_id}`),
          equipmentStatusDisplay: this.labelize(row.status || 'Em uso'),
          hoursUsedDisplay: row.hours_used ? `${this.formatNumber(row.hours_used)} h` : '0 h',
          notesDisplay: row.notes || 'Sem observações'
        }));
      case 'occurrences':
        return rows.map((row: BusinessOccurrence) => ({
          ...row,
          diaryDisplay: this.optionLabel('diaries', row.daily_log_id, `Diário #${row.daily_log_id}`),
          occurrenceTypeDisplay: this.labelize(row.occurrence_type || 'Geral'),
          severityDisplay: this.labelize(row.severity || 'Média'),
          resolvedDisplay: this.toBoolean(row.resolved) ? 'Resolvida' : 'Aberta'
        }));
      case 'documents':
        return rows.map((row: BusinessDocument) => ({
          ...row,
          diaryDisplay: this.optionLabel('diaries', row.daily_log_id, `Diário #${row.daily_log_id}`),
          fileTypeDisplay: this.labelize(row.file_type || 'Arquivo'),
          fileSizeDisplay: this.formatFileSize(row.file_size_bytes),
          urlDisplay: row.file_url || 'Sem link'
        }));
      case 'users':
        return rows.map((row: BusinessUser) => ({
          ...row,
          companyDisplay: this.optionLabel('companies', row.company_id, `Empresa #${row.company_id}`),
          roleDisplay: this.optionLabel('roles', row.role_id, 'Usuário'),
          activeDisplay: this.activeDisplay(row.active)
        }));
      default:
        return rows;
    }
  }

  private rebuildOverview(): void {
    const rows = this.allRows;
    const total = rows.length;

    switch (this.resource) {
      case 'projects': {
        const active = rows.filter((row) => String(row.statusDisplay || '').toLowerCase().includes('andamento')).length;
        const dueSoon = rows.filter((row) => this.isDueSoon(row.end_date)).length;
        const budget = rows.reduce((sum, row) => sum + Number(row.budget_amount || 0), 0);
        this.overviewCards = [
          { label: 'Obras cadastradas', value: String(total), detail: `${active} em andamento` },
          { label: 'Prazo próximo', value: String(dueSoon), detail: 'Vencem em até 15 dias', tone: dueSoon ? 'warning' : 'success' },
          { label: 'Clientes ativos', value: String(new Set(rows.map((row) => row.client_name).filter(Boolean)).size), detail: 'Carteira vinculada' },
          { label: 'Orçamento total', value: this.formatCurrency(budget), detail: 'Base consolidada das obras', tone: 'success' }
        ];
        this.insightPanels = [
          { title: 'Obras com prazo sensível', lines: rows.filter((row) => this.isDueSoon(row.end_date)).slice(0, 4).map((row) => `${row.name} • ${this.formatDate(row.end_date)}`) },
          { title: 'Responsáveis', lines: rows.slice(0, 4).map((row) => `${row.name} • ${row.engineerDisplay || 'Não definido'}`) }
        ];
        this.quickFilters = this.buildQuickFilters([
          ['all', 'Todas'],
          ['andamento', 'Em andamento'],
          ['planejada', 'Planejadas'],
          ['concluida', 'Concluídas'],
          ['pausada', 'Pausadas'],
          ['prazo', 'Prazo próximo'],
          ['orcada', 'Com orçamento']
        ]);
        break;
      }
      case 'diaries': {
        const approved = rows.filter((row) => row.statusDisplay === 'Aprovado').length;
        const pending = rows.filter((row) => row.statusDisplay === 'Pendente').length;
        this.overviewCards = [
          { label: 'Diários lançados', value: String(total), detail: `${pending} aguardando análise` },
          { label: 'Aprovados', value: String(approved), detail: 'Prontos para histórico', tone: 'success' },
          { label: 'Climas distintos', value: String(new Set(rows.map((row) => row.weatherDisplay).filter(Boolean)).size), detail: 'Registro ambiental da operação' },
          { label: 'Obras com diário', value: String(new Set(rows.map((row) => row.project_id)).size), detail: 'Cobertura das frentes ativas' }
        ];
        this.insightPanels = [
          { title: 'Pendências do dia', lines: rows.filter((row) => row.statusDisplay === 'Pendente').slice(0, 5).map((row) => `${row.workDateDisplay} • ${row.projectDisplay}`) },
          { title: 'Condições de clima', lines: rows.slice(0, 4).map((row) => `${row.workDateDisplay} • ${row.weatherDisplay}`) },
          {
            title: 'Próximas ações',
            lines: [
              `${pending} diários ainda precisam de revisão ou aprovação formal`,
              `${rows.filter((row) => String(row.weatherDisplay || '').toLowerCase().includes('chuva') || String(row.weatherDisplay || '').toLowerCase().includes('tempestade')).length} registros têm clima com potencial de impacto`,
              approved ? `${approved} diários já podem seguir para histórico, assinatura ou fechamento` : 'Ainda não há diários prontos para fechamento'
            ]
          }
        ];
        this.quickFilters = this.buildQuickFilters([
          ['all', 'Todos'],
          ['pendente', 'Pendentes'],
          ['aprovado', 'Aprovados'],
          ['reprovado', 'Reprovados'],
          ['clima_critico', 'Clima crítico']
        ]);
        break;
      }
      case 'activities': {
        const quantity = rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
        this.overviewCards = [
          { label: 'Atividades registradas', value: String(total), detail: `${new Set(rows.map((row) => row.daily_log_id)).size} diários impactados` },
          { label: 'Serviços distintos', value: String(new Set(rows.map((row) => row.service_name)).size), detail: 'Frentes executadas' },
          { label: 'Quantidade acumulada', value: this.formatNumber(quantity), detail: 'Total declarado no período', tone: 'success' },
          { label: 'Com localização', value: String(rows.filter((row) => row.location).length), detail: 'Rastreáveis na obra' }
        ];
        this.insightPanels = [
          { title: 'Últimos serviços', lines: rows.slice(0, 5).map((row) => `${row.service_name} • ${row.diaryDisplay}`) },
          { title: 'Observações recentes', lines: rows.filter((row) => row.notes).slice(0, 4).map((row) => `${row.service_name} • ${row.notes}`) }
        ];
        this.quickFilters = this.buildQuickFilters([
          ['all', 'Todas'],
          ['instalacao', 'Instalações'],
          ['montagem', 'Montagens'],
          ['concretagem', 'Concretagens']
        ]);
        break;
      }
      case 'teams': {
        const members = rows.reduce((sum, row) => sum + Number(row.memberCountDisplay || 0), 0);
        const activeTeams = rows.filter((row) => row.activeDisplay === 'Ativo').length;
        this.overviewCards = [
          { label: 'Equipes cadastradas', value: String(total), detail: `${activeTeams} ativas` },
          { label: 'Integrantes alocados', value: String(members), detail: 'Vínculos ativos nas equipes', tone: 'success' },
          { label: 'Média por equipe', value: total ? this.formatNumber(members / total) : '0', detail: 'Composição média' },
          { label: 'Obras atendidas', value: String(new Set(rows.map((row) => row.project_id)).size), detail: 'Frentes com equipe formada' }
        ];
        this.insightPanels = [
          { title: 'Equipes com maior composição', lines: [...rows].sort((a, b) => Number(b.memberCountDisplay || 0) - Number(a.memberCountDisplay || 0)).slice(0, 4).map((row) => `${row.name} • ${row.memberCountDisplay} integrantes`) },
          { title: 'Distribuição por obra', lines: rows.slice(0, 4).map((row) => `${row.name} • ${row.projectDisplay}`) },
          { title: 'Equipes ativas', lines: rows.filter((row) => row.activeDisplay === 'Ativo').slice(0, 4).map((row) => `${row.name} • ${row.compositionDisplay}`) }
        ];
        this.quickFilters = this.buildQuickFilters([
          ['all', 'Todas'],
          ['ativo', 'Ativas'],
          ['inativo', 'Inativas'],
          ['grande', 'Com 5+ membros']
        ]);
        break;
      }
      case 'users': {
        const activeUsers = rows.filter((row) => row.activeDisplay === 'Ativo').length;
        const approvers = rows.filter((row) => row.approvalDisplay === 'Pode aprovar').length;
        this.overviewCards = [
          { label: 'Usuários cadastrados', value: String(total), detail: `${activeUsers} com acesso ativo` },
          { label: 'Perfis em uso', value: String(new Set(rows.map((row) => row.roleDisplay)).size), detail: 'Distribuição de permissões' },
          { label: 'Aprovadores', value: String(approvers), detail: 'Capacidade de validação', tone: approvers ? 'success' : 'warning' },
          { label: 'Com telefone', value: String(rows.filter((row) => row.phone).length), detail: 'Contato rápido disponível' }
        ];
        this.insightPanels = [
          { title: 'Perfis atribuídos', lines: rows.slice(0, 5).map((row) => `${row.name} • ${row.roleDisplay}`) },
          { title: 'Usuários ativos', lines: rows.filter((row) => row.activeDisplay === 'Ativo').slice(0, 5).map((row) => `${row.name} • ${row.email}`) },
          { title: 'Permissão de aprovação', lines: rows.slice(0, 5).map((row) => `${row.name} • ${row.approvalDisplay}`) }
        ];
        this.quickFilters = this.buildQuickFilters([
          ['all', 'Todos'],
          ['ativo', 'Ativos'],
          ['inativo', 'Inativos'],
          ['aprovador', 'Aprovadores']
        ]);
        break;
      }
      case 'documents': {
        this.overviewCards = [
          { label: 'Documentos cadastrados', value: String(total), detail: `${new Set(rows.map((row) => row.fileTypeDisplay)).size} tipos distintos` },
          { label: 'Com link válido', value: String(rows.filter((row) => row.urlDisplay && row.urlDisplay !== 'Sem link').length), detail: 'Prontos para consulta', tone: 'success' },
          { label: 'Diários com anexo', value: String(new Set(rows.map((row) => row.daily_log_id)).size), detail: 'Base documental da obra' },
          { label: 'Volume total', value: this.formatFileSize(rows.reduce((sum, row) => sum + Number(row.file_size_bytes || 0), 0)), detail: 'Armazenamento catalogado' }
        ];
        this.insightPanels = [
          { title: 'Tipos mais presentes', lines: rows.slice(0, 5).map((row) => `${row.file_name} • ${row.fileTypeDisplay}`) },
          { title: 'Últimos anexos', lines: rows.slice(0, 5).map((row) => `${row.diaryDisplay} • ${row.fileSizeDisplay}`) },
          {
            title: 'Organização recomendada',
            lines: [
              `${rows.filter((row) => !row.urlDisplay || row.urlDisplay === 'Sem link').length} arquivos ainda precisam de publicação ou vínculo`,
              `${rows.filter((row) => String(row.fileTypeDisplay || '').toLowerCase().includes('pdf')).length} documentos já estão prontos para leitura formal`,
              `${new Set(rows.map((row) => row.daily_log_id)).size} diários já contam com base documental associada`
            ]
          }
        ];
        this.quickFilters = this.buildQuickFilters([
          ['all', 'Todos'],
          ['pdf', 'PDF'],
          ['jpg', 'Imagens'],
          ['com_link', 'Com link'],
          ['grande', 'Arquivos grandes']
        ]);
        break;
      }
      case 'materials': {
        const entradas = rows.filter((row) => String(row.movementDisplay || '').toLowerCase().includes('entrada')).length;
        const consumo = rows.filter((row) => String(row.movementDisplay || '').toLowerCase().includes('consumo')).length;
        const quantidade = rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
        this.overviewCards = [
          { label: 'Movimentos lançados', value: String(total), detail: `${entradas} entradas registradas` },
          { label: 'Consumos apontados', value: String(consumo), detail: 'Saídas e uso na frente', tone: consumo ? 'warning' : 'success' },
          { label: 'Itens distintos', value: String(new Set(rows.map((row) => row.material_name)).size), detail: 'Catálogo em uso' },
          { label: 'Quantidade total', value: this.formatNumber(quantidade), detail: 'Volume apontado nos diários', tone: 'success' }
        ];
        this.insightPanels = [
          { title: 'Materiais mais frequentes', lines: rows.slice(0, 5).map((row) => `${row.material_name} • ${row.quantityDisplay}`) },
          { title: 'Últimas movimentações', lines: rows.slice(0, 5).map((row) => `${row.diaryDisplay} • ${row.movementDisplay}`) }
        ];
        this.quickFilters = this.buildQuickFilters([
          ['all', 'Todos'],
          ['entrada', 'Entradas'],
          ['saida', 'Saídas'],
          ['consumo', 'Consumos'],
          ['alto_volume', 'Alto volume']
        ]);
        break;
      }
      case 'equipments': {
        const emUso = rows.filter((row) => String(row.equipmentStatusDisplay || '').toLowerCase().includes('uso') || String(row.equipmentStatusDisplay || '').toLowerCase().includes('opera')).length;
        const manutencao = rows.filter((row) => String(row.maintenanceDisplay || '').toLowerCase().includes('manuten')).length;
        const horas = rows.reduce((sum, row) => sum + Number(row.hours_used || 0), 0);
        this.overviewCards = [
          { label: 'Equipamentos lançados', value: String(total), detail: `${emUso} em operação` },
          { label: 'Horas registradas', value: `${this.formatNumber(horas)} h`, detail: 'Uso acumulado no período', tone: 'success' },
          { label: 'Em manutenção', value: String(manutencao), detail: 'Acompanhar disponibilidade', tone: manutencao ? 'warning' : 'success' },
          { label: 'Diários impactados', value: String(new Set(rows.map((row) => row.daily_log_id)).size), detail: 'Cobertura operacional' }
        ];
        this.insightPanels = [
          { title: 'Uso por equipamento', lines: rows.slice(0, 5).map((row) => `${row.equipment_name} • ${row.hoursUsedDisplay}`) },
          { title: 'Situação operacional', lines: rows.slice(0, 5).map((row) => `${row.equipment_name} • ${row.equipmentStatusDisplay}`) }
        ];
        this.quickFilters = this.buildQuickFilters([
          ['all', 'Todos'],
          ['em_uso', 'Em uso'],
          ['disponivel', 'Disponíveis'],
          ['manutencao', 'Manutenção'],
          ['uso_intenso', 'Uso intenso']
        ]);
        break;
      }
      case 'occurrences': {
        const abertas = rows.filter((row) => row.resolvedDisplay === 'Aberta').length;
        const graves = rows.filter((row) => String(row.severityDisplay || '').toLowerCase().includes('alta')).length;
        this.overviewCards = [
          { label: 'Ocorrências abertas', value: String(abertas), detail: 'Demandam acompanhamento', tone: abertas ? 'warning' : 'success' },
          { label: 'Resolvidas', value: String(rows.filter((row) => row.resolvedDisplay === 'Resolvida').length), detail: 'Fechadas com registro', tone: 'success' },
          { label: 'Alta gravidade', value: String(graves), detail: 'Atenção imediata', tone: graves ? 'danger' : 'success' },
          { label: 'Tipos distintos', value: String(new Set(rows.map((row) => row.occurrenceTypeDisplay)).size), detail: 'Mapa de desvios' }
        ];
        this.insightPanels = [
          { title: 'Pendências críticas', lines: rows.filter((row) => row.resolvedDisplay === 'Aberta').slice(0, 5).map((row) => `${row.title} • ${row.severityDisplay}`) },
          { title: 'Distribuição por diário', lines: rows.slice(0, 5).map((row) => `${row.diaryDisplay} • ${row.occurrenceTypeDisplay}`) },
          {
            title: 'Próximos tratamentos',
            lines: [
              `${abertas} ocorrências abertas ainda exigem resposta da equipe`,
              `${graves} ocorrências de alta gravidade devem entrar na pauta imediata`,
              `${rows.filter((row) => row.resolvedDisplay === 'Resolvida').length} registros já têm fechamento operacional`
            ]
          }
        ];
        this.quickFilters = this.buildQuickFilters([
          ['all', 'Todas'],
          ['aberta', 'Abertas'],
          ['resolvida', 'Resolvidas'],
          ['critica', 'Críticas'],
          ['alta', 'Alta gravidade']
        ]);
        break;
      }
      default:
        this.overviewCards = [{ label: 'Registros carregados', value: String(total), detail: 'Base ativa neste módulo' }];
        this.insightPanels = [];
        this.quickFilters = this.buildQuickFilters([['all', 'Todos']]);
        break;
    }

    this.insightPanels = this.insightPanels.filter((panel) => panel.lines.length);
  }

  private mapRowsForView(rows: any[]): any[] {
    const mapped = this.mapRowsForDisplay(rows);

    if (this.resource === 'projects') {
      return mapped.map((row: any) => ({
        ...row,
        engineerDisplay: this.optionLabel('users', row.engineer_user_id, 'Não definido')
      }));
    }

    if (this.resource === 'diaries') {
      return mapped.map((row: any) => ({
        ...row,
        createdByDisplay: this.optionLabel('users', row.created_by, 'Sem responsável')
      }));
    }

    if (this.resource === 'activities') {
      return mapped.map((row: any) => ({
        ...row,
        notesDisplay: row.notes || 'Sem observações'
      }));
    }

    if (this.resource === 'teams') {
      return mapped.map((row: any) => ({
        ...row,
        memberCountDisplay: `${this.teamMembersCache.filter((item) => Number(item.team_id) === Number(row.id)).length}`,
        allocationDisplay: this.optionLabel('projects', row.project_id, `Obra #${row.project_id}`),
        compositionDisplay: `${this.teamMembersCache.filter((item) => Number(item.team_id) === Number(row.id)).length} integrantes ativos`
      }));
    }

    if (this.resource === 'materials') {
      return mapped.map((row: any) => ({
        ...row,
        unitDisplay: row.unit || 'Unidade'
      }));
    }

    if (this.resource === 'equipments') {
      return mapped.map((row: any) => ({
        ...row,
        maintenanceDisplay: this.equipmentMaintenanceLabel(row.status, row.hours_used)
      }));
    }

    if (this.resource === 'occurrences') {
      return mapped.map((row: any) => ({
        ...row,
        descriptionDisplay: row.description || 'Sem descrição'
      }));
    }

    if (this.resource === 'documents') {
      return mapped.map((row: any) => ({
        ...row,
        notesDisplay: row.notes || 'Sem observações'
      }));
    }

    if (this.resource === 'users') {
      return mapped.map((row: any) => ({
        ...row,
        phoneDisplay: row.phone || 'Não informado',
        approvalDisplay: this.userApprovalDisplay(row.roleDisplay),
        editDisplay: this.userEditDisplay(row.roleDisplay)
      }));
    }

    return mapped;
  }

  private inferActivityStage(serviceName: string | undefined): string {
    const label = String(serviceName || '').toLowerCase();
    if (label.includes('concret')) return 'Execução estrutural';
    if (label.includes('instala')) return 'Instalações';
    if (label.includes('montag')) return 'Montagem';
    if (label.includes('alvenar')) return 'Vedação';
    return 'Frente operacional';
  }

  private inferActivityWorkflow(serviceName: string | undefined, notes: string | undefined): string {
    const content = `${serviceName || ''} ${notes || ''}`.toLowerCase();
    if (content.includes('final') || content.includes('entreg')) return 'Concluída';
    if (content.includes('aguard') || content.includes('pend')) return 'Aguardando liberação';
    return 'Em execução';
  }

  private userApprovalDisplay(roleDisplay: string | undefined): string {
    const role = String(roleDisplay || '').toLowerCase();
    if (role.includes('admin') || role.includes('gestor') || role.includes('engenheiro')) {
      return 'Pode aprovar';
    }
    return 'Sem aprovação';
  }

  private userEditDisplay(roleDisplay: string | undefined): string {
    const role = String(roleDisplay || '').toLowerCase();
    if (role.includes('admin') || role.includes('gestor') || role.includes('engenheiro') || role.includes('técnico')) {
      return 'Pode editar';
    }
    return 'Consulta';
  }

  private equipmentMaintenanceLabel(status: string | undefined, hoursUsed: number | null | undefined): string {
    if (String(status || '').toLowerCase().includes('manut')) {
      return 'Em manutenção';
    }
    return Number(hoursUsed || 0) >= 120 ? 'Revisão sugerida' : 'Sem alerta';
  }

  private isDueSoon(value: any): boolean {
    if (!value) return false;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    const now = new Date();
    const diffDays = (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 15;
  }

  private compareRows(left: any, right: any, direction: 'asc' | 'desc'): number {
    const normalize = (value: any) => {
      if (value === null || value === undefined) return '';
      if (typeof value === 'number') return value;
      const parsedDate = Date.parse(String(value));
      if (!Number.isNaN(parsedDate) && String(value).includes('-')) return parsedDate;
      return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    };
    const a = normalize(left);
    const b = normalize(right);
    const order = a > b ? 1 : a < b ? -1 : 0;
    return direction === 'asc' ? order : order * -1;
  }

  private optionLabel(bucket: SelectBucket, id: any, fallback: string): string {
    const found = this.optionBuckets[bucket]?.find((item) => String(item.id) === String(id));
    return found?.text || fallback;
  }

  private items<T>(data: T[] | null | undefined): T[] {
    return Array.isArray(data) ? data : [];
  }

  private formatCurrency(value: any): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
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

  private formatFileSize(value: any): string {
    const bytes = Number(value || 0);
    if (!bytes) return '0 KB';
    if (bytes >= 1024 * 1024) return `${this.formatNumber(bytes / (1024 * 1024))} MB`;
    return `${this.formatNumber(bytes / 1024)} KB`;
  }

  private toBoolean(value: any): boolean {
    return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
  }

  private activeDisplay(value: any): string {
    return this.toBoolean(value) ? 'Ativo' : 'Inativo';
  }

  private updateDiaryStatus(row: any, status: string, successTitle: string, successMessage: string): void {
    const token = this.loginService.getToken();
    if (!token) {
      this.redirectToLogin();
      return;
    }

    if (this.resource != 'diaries') {
      return;
    }

    this.loading = true;
    this.adminDataService
      .updateDiary(token, {
        id: row.id,
        project_id: row.project_id,
        work_date: row.work_date,
        weather: row.weather,
        summary: row.summary,
        occurrences: row.occurrences,
        status
      })
      .pipe(finalize(() => {
        this.loading = false;
        this.flushView();
      }))
      .subscribe({
        next: (response) => {
          if (!response?.status) {
            if (this.isAuthenticationFailure(response?.message)) {
              this.redirectToLogin();
              return;
            }
            this.pushToast('error', 'Falha ao atualizar diário', response?.message || 'Não foi possível atualizar a situação do diário.');
            return;
          }

          this.pushToast('success', successTitle, response.message || successMessage);
          this.loadRows();
        },
        error: (error) => {
          const message = error?.error?.message || 'Não foi possível atualizar a situação do diário.';
          if (this.isAuthenticationFailure(message)) {
            this.redirectToLogin();
            return;
          }
          this.pushToast('error', 'Erro de atualização', message);
        }
      });
  }

  private isDiaryStatus(status: any, expected: 'aprovado' | 'reprovado'): boolean {
    const value = String(status || '').toLowerCase();
    if (expected == 'aprovado') {
      return value.includes('aprov');
    }
    return value.includes('reprov');
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

  private isAuthenticationFailure(message?: string): boolean {
    const normalized = String(message ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return normalized.includes('autentic') || normalized.includes('sessao') || normalized.includes('token');
  }

  private redirectToLogin(): void {
    this.adminDataService.clearCache();
    this.loginService.clearToken();
    void this.router.navigate(['/login']);
  }

  private pushToast(type: 'success' | 'error' | 'info', title: string, message: string): void {
    const id = this.toastSeed++;
    this.toasts = [...this.toasts, { id, type, title, message }];
    setTimeout(() => this.dismissToast(id), 4200);
  }

  private downloadBlob(type: string, content: string, filename: string): void {
    const blob = new Blob([content], { type });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  private flushView(): void {
    queueMicrotask(() => this.cdr.detectChanges());
  }
}


