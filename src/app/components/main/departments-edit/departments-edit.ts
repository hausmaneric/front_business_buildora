import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ActionToolbarComponent } from '../action-toolbar/action-toolbar';
import { TextBoxModule } from '@syncfusion/ej2-angular-inputs';

@Component({
  selector: 'app-departments-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ActionToolbarComponent, TextBoxModule],
  templateUrl: './departments-edit.html',
  styleUrl: './departments-edit.scss',
})
export class DepartmentsEdit implements OnInit {

  form!: FormGroup;
  originalData: any = null;
  editMode = false;
  isNew = false;
  savedItem: any = null;
  mode: string = '';

  moduleTitle = '';
  moduleIcon = '';

  constructor(
    private fb: FormBuilder,
    private router: Router
  ) {}

  toolbarButtons = [
    { id: 'back', text: 'Voltar', icon: 'e-arrow-left', visible: true },
    { id: 'add', text: 'Incluir', icon: 'e-plus', visible: true },
    { id: 'update', text: 'Alterar', icon: 'e-edit', visible: true },
    { id: 'save', text: 'Salvar', icon: 'e-save', visible: true, disabled: true },
    { id: 'undo', text: 'Desfazer', icon: 'e-undo', visible: true, disabled: true },
  ];

  ngOnInit(): void {

    const state = history.state;

    this.mode = state?.mode;

    // 🔥 SEMPRE GARANTE
    this.moduleTitle = state?.moduleTitle ?? 'Departamentos';
    this.moduleIcon  = state?.moduleIcon  ?? 'e-folder';

    const item = state?.item;

    this.form = this.fb.group({
      id: [{ value: '', disabled: true }],
      name: [{ value: '', disabled: true }],
      email: [{ value: '', disabled: true }]
    });

    if (item) {
      this.originalData = item;
      this.form.patchValue(item);
      this.updateButtons(false);
    }

    if (this.mode === 'add') {
      this.startAdd();
      return;
    }
  }

  handleToolbarAction(action: string) {

    switch (action) {

      case 'add':
        this.startAdd();
        break;

      case 'update':
        this.enableEdit();
        break;

      case 'save':
        this.save();
        break;

      case 'undo':
        this.undo();
        break;

      case 'back':
        this.goBack();
        break;
    }
  }

  startAdd() {
    this.form.enable();
    this.form.reset();
    this.form.get('id')?.disable();

    this.editMode = true;
    this.isNew = true;
    this.updateButtons(true);
  }

  enableEdit() {
    this.form.enable();
    this.form.get('id')?.disable();

    this.editMode = true;
    this.isNew = false;
    this.updateButtons(true);
  }

  save() {

    const updatedItem = this.form.getRawValue();

    if (this.isNew) {
      updatedItem.id = Date.now();
    }

    this.savedItem = updatedItem;
    this.originalData = updatedItem;

    this.form.disable();
    this.editMode = false;
    this.updateButtons(false);
  }

  undo() {

    this.form.patchValue(this.originalData);
    this.form.disable();
    this.editMode = false;
    this.updateButtons(false);

    if (this.mode === 'add' && !this.savedItem) {
      this.router.navigate(['/main/departments'], {
        state: {
          moduleTitle: this.moduleTitle,
          moduleIcon: this.moduleIcon
        }
      });
    }
  }

  goBack() {

    let returnedItem: any = null;

    if (this.isNew) {
      if (this.savedItem) {
        returnedItem = this.savedItem;
      }
    } else {
      returnedItem = this.savedItem ?? this.originalData;
    }

    this.router.navigate(['/main/departments'], {
      state: {
        returnedItem,
        moduleTitle: this.moduleTitle,
        moduleIcon: this.moduleIcon
      }
    });
  }

  updateButtons(editing: boolean) {
    this.setButtonState('add', editing);
    this.setButtonState('update', editing);
    this.setButtonState('save', !editing);
    this.setButtonState('undo', !editing);
  }

  setButtonState(id: string, disabled: boolean) {
    const btn = this.toolbarButtons.find(b => b.id === id);
    if (btn) btn.disabled = disabled;
  }
}