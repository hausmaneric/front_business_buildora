import { Component, ViewChild, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  GridModule,
  GridComponent,
  SelectionSettingsModel,
  RowSelectEventArgs,
  RecordDoubleClickEventArgs,
  SortSettingsModel,
  PageService,
  SortService,
  FilterService
} from '@syncfusion/ej2-angular-grids';
import { ActionToolbarComponent } from '../action-toolbar/action-toolbar';
import { GridSearchService } from '../../../services/grid-search.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-departments',
  standalone: true,
  imports: [ActionToolbarComponent, GridModule],
  providers: [PageService, SortService, FilterService],
  templateUrl: './departments.html',
  styleUrl: './departments.scss',
})
export class Departments implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild('grid') grid!: GridComponent;

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private gridSearchService: GridSearchService
  ) {}

  selectedRow: any = null;
  itemToSelect: any = null;
  selectionDone = false;

  moduleTitle = '';
  moduleIcon = '';

  selectionOptions: SelectionSettingsModel = {
    type: 'Single',
    mode: 'Row'
  };

  sortOptions: SortSettingsModel = {
    columns: [{ field: 'name', direction: 'Ascending' }]
  };

  data = [
    { id: 1, name: 'Financeiro', email: 'financeiro@empresa.com' },
    { id: 2, name: 'RH', email: 'rh@empresa.com' },
    { id: 3, name: 'TI', email: 'ti@empresa.com' }
  ];

  toolbarButtons = [
    { id: 'add', text: '', icon: 'e-plus', visible: true },
    { id: 'update', text: 'Alterar', icon: 'e-edit', visible: true, disabled: true },
    { id: 'delete', text: 'Excluir', icon: 'e-trash', visible: true, disabled: true }
  ];

  ngOnInit() {

    const state = history.state;

    this.moduleTitle = state?.moduleTitle ?? 'Departamentos';
    this.moduleIcon  = state?.moduleIcon  ?? 'e-folder';

    const returnedItem = state?.returnedItem;

    if (returnedItem) {

      const index = this.data.findIndex(d => d.id === returnedItem.id);

      if (index !== -1) {
        this.data[index] = returnedItem;
      } else {
        this.data.push(returnedItem);
      }

      this.itemToSelect = returnedItem;
    }

    // 🔥 SUBSCRIBE SEGURO
    this.gridSearchService.search$
      .pipe(takeUntil(this.destroy$))
      .subscribe(text => {
        if (this.grid) {
          this.grid.search(text);
        }
      });
  }

  // 🔥 REAPLICA FILTRO AO VOLTAR
  ngAfterViewInit(): void {
    const currentSearch = this.gridSearchService.getCurrentSearch();
    if (currentSearch && this.grid) {
      setTimeout(() => {
        this.grid.search(currentSearch);
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onDataBound() {

    if (!this.itemToSelect || this.selectionDone) return;

    const viewData = this.grid.getCurrentViewRecords() as any[];

    const rowIndex = viewData.findIndex(d => d.id === this.itemToSelect.id);

    if (rowIndex !== -1) {
      this.grid.selectRow(rowIndex);
      this.selectionDone = true;
    }
  }

  onRowSelected(args: RowSelectEventArgs) {
    this.selectedRow = args.data;
    this.enableActionButtons();
  }

  onDoubleClick(args: RecordDoubleClickEventArgs) {
    this.openEdit(args.rowData);
  }

  handleToolbarAction(action: string) {

    switch (action) {

      case 'add':
        this.router.navigate(['/main/departments-edit'], {
          state: {
            mode: 'add',
            moduleTitle: this.moduleTitle,
            moduleIcon: this.moduleIcon
          }
        });
        break;

      case 'update':
        if (this.selectedRow) {
          this.openEdit(this.selectedRow);
        }
        break;
    }
  }

  openEdit(item: any) {
    this.router.navigate(['/main/departments-edit'], {
      state: {
        item,
        moduleTitle: this.moduleTitle,
        moduleIcon: this.moduleIcon
      }
    });
  }

  enableActionButtons() {
    this.setButtonState('update', false);
    this.setButtonState('delete', false);
  }

  disableActionButtons() {
    this.setButtonState('update', true);
    this.setButtonState('delete', true);
  }

  setButtonState(id: string, disabled: boolean) {
    const btn = this.toolbarButtons.find(b => b.id === id);
    if (btn) btn.disabled = disabled;
  }
}