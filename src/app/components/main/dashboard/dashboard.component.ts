import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AdminDashboardViewModel, SummaryCard } from '../../../models/admin-dashboard';
import { AdminDashboardService } from '../../../services/admin-dashboard.service';
import { LoginService } from '../../../services/login.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  loading = true;
  errorMessage = '';
  viewModel: AdminDashboardViewModel = {
    cards: [],
    planDistribution: [],
    subscriptionDistribution: [],
    storageTrend: [],
    recentAccess: [],
    recentLogs: [],
    alerts: [],
    footerStats: []
  };

  constructor(
    private loginService: LoginService,
    private dashboardService: AdminDashboardService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const token = this.loginService.getToken();
    if (!token) {
      this.redirectToLogin();
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    this.dashboardService.load(token)
      .pipe(finalize(() => {
        this.loading = false;
        queueMicrotask(() => {
          window.dispatchEvent(new Event('resize'));
          this.cdr.detectChanges();
        });
      }))
      .subscribe({
        next: (viewModel) => {
          this.viewModel = viewModel;
          this.cdr.detectChanges();
        },
        error: (error) => {
          const message = error?.error?.message || error?.message || 'Falha ao carregar o dashboard da empresa.';
          if (this.isAuthenticationFailure(message)) {
            this.redirectToLogin();
            return;
          }
          this.errorMessage = message;
          this.cdr.detectChanges();
        }
      });
  }

  trackByTitle(_: number, item: SummaryCard): string {
    return item.title;
  }

  statGlyph(title: string): string {
    const normalized = title.toLowerCase();
    if (normalized.includes('obra')) {
      return '▥';
    }
    if (normalized.includes('diário')) {
      return '☰';
    }
    if (normalized.includes('ocorr')) {
      return '!';
    }
    if (normalized.includes('funcion') || normalized.includes('usu')) {
      return '◔';
    }
    if (normalized.includes('produt')) {
      return '↗';
    }
    return '•';
  }

  openSection(section: 'projects' | 'diaries' | 'occurrences' | 'reports' | 'documents'): void {
    if (section === 'projects') {
      void this.router.navigate(['/main/projects']);
      return;
    }
    if (section === 'diaries') {
      void this.router.navigate(['/main/diaries']);
      return;
    }
    if (section === 'occurrences') {
      void this.router.navigate(['/main/occurrences']);
      return;
    }
    if (section === 'documents') {
      void this.router.navigate(['/main/documents']);
      return;
    }
    void this.router.navigate(['/main/reports']);
  }

  distributionPercent(total: number, value: number): string {
    if (!total) {
      return '0,0%';
    }
    return `${((value / total) * 100).toFixed(1).replace('.', ',')}%`;
  }

  linePoints(values: number[]): string {
    const width = 188;
    const height = 52;
    const max = Math.max(...values, 1);
    const step = width / Math.max(values.length - 1, 1);

    return values
      .map((value, index) => {
        const x = index * step;
        const y = height - (value / max) * height;
        return `${x},${y}`;
      })
      .join(' ');
  }

  donutBackground(items: Array<{ color: string; value: number }>): string {
    const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
    let start = 0;
    const segments = items.map((item) => {
      const size = (item.value / total) * 100;
      const segment = `${item.color} ${start}% ${start + size}%`;
      start += size;
      return segment;
    });

    return `conic-gradient(${segments.join(', ')})`;
  }

  areaPath(): string {
    const points = this.viewModel.storageTrend;
    if (!points.length) {
      return '';
    }

    const width = 420;
    const height = 210;
    const max = Math.max(...points.map((item) => item.value), 1);
    const step = width / Math.max(points.length - 1, 1);

    const line = points
      .map((point, index) => {
        const x = index * step;
        const y = height - (point.value / max) * height;
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');

    return `${line} L ${width} ${height} L 0 ${height} Z`;
  }

  areaLine(): string {
    const points = this.viewModel.storageTrend;
    if (!points.length) {
      return '';
    }

    const width = 420;
    const height = 210;
    const max = Math.max(...points.map((item) => item.value), 1);
    const step = width / Math.max(points.length - 1, 1);

    return points
      .map((point, index) => {
        const x = index * step;
        const y = height - (point.value / max) * height;
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  }

  private isAuthenticationFailure(message?: string): boolean {
    const normalized = String(message ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return normalized.includes('autentic') || normalized.includes('sessao') || normalized.includes('token');
  }

  private redirectToLogin(): void {
    this.loginService.clearToken();
    void this.router.navigate(['/login']);
  }
}
