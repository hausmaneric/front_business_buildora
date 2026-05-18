import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { DropDownListModule } from '@syncfusion/ej2-angular-dropdowns';
import { filter } from 'rxjs/operators';
import { LayoutService } from '../../../app.layout.service';
import { defaultDateRange } from '../../../resources';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, DropDownListModule],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss'
})
export class TopbarComponent {
  title = 'Dashboard';
  subtitle = 'Visão geral da empresa';
  currentDateRange = localStorage.getItem('obrax.business.date-range') || defaultDateRange;

  readonly dateRanges = [
    { id: defaultDateRange, text: defaultDateRange },
    { id: '01/04/2024 - 30/04/2024', text: '01/04/2024 - 30/04/2024' },
    { id: '01/03/2024 - 31/03/2024', text: '01/03/2024 - 31/03/2024' }
  ];

  constructor(
    public layoutService: LayoutService,
    private router: Router
  ) {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.syncTitle());
  }

  ngOnInit(): void {
    this.syncTitle();
  }

  focusPageSearch(): void {
    const input = document.querySelector('input[placeholder=\"Buscar registros...\"]') as HTMLInputElement | null;
    if (input) {
      input.focus();
      input.select();
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    void this.router.navigate(['/main/projects']);
  }

  openNotifications(): void {
    void this.router.navigate(['/main/occurrences']);
  }

  openNewDiary(): void {
    void this.router.navigate(['/main/diaries']);
  }

  onDateRangeChange(value: string): void {
    this.currentDateRange = value || defaultDateRange;
    localStorage.setItem('obrax.business.date-range', this.currentDateRange);
  }

  private syncTitle(): void {
    const current = this.router.routerState.snapshot.root.firstChild?.firstChild;
    this.title = current?.data?.['title'] ?? 'Dashboard';
    this.subtitle = current?.data?.['subtitle'] ?? 'Visão geral da empresa';
  }
}
