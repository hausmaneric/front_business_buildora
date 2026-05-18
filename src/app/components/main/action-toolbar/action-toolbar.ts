import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ToolbarButton {
  id: string;
  text: string;
  icon?: string;
  image?: string;
  visible?: boolean;
  disabled?: boolean;
}

@Component({
  selector: 'app-action-toolbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './action-toolbar.html',
  styleUrl: './action-toolbar.scss'
})
export class ActionToolbarComponent {

  /* 🔥 NOVOS INPUTS DO MÓDULO */
  @Input() moduleTitle: string = '';
  @Input() moduleIcon?: string;
  @Input() moduleImage?: string;

  @Input() buttons: ToolbarButton[] = [];

  @Output() action = new EventEmitter<string>();

  onClick(id: string) {
    this.action.emit(id);
  }
}