import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { DropDownListModule } from '@syncfusion/ej2-angular-dropdowns';
import { TextBoxModule } from '@syncfusion/ej2-angular-inputs';
import { finalize } from 'rxjs';
import { AdminPagedResponse } from '../../../models/admin-resource';
import { AdminDataService } from '../../../services/admin-data.service';
import { LoginService } from '../../../services/login.service';

@Component({
  selector: 'app-tenant-bootstrap-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TextBoxModule, DropDownListModule, ButtonModule],
  templateUrl: './tenant-bootstrap-page.component.html',
  styleUrl: './tenant-bootstrap-page.component.scss'
})
export class TenantBootstrapPageComponent {
  loading = true;
  saving = false;
  message = '';
  error = '';
  accounts: any[] = [];
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private loginService: LoginService,
    private adminDataService: AdminDataService,
    private router: Router
  ) {
    this.form = this.fb.group({
      account_code: [null, Validators.required],
      company_code: ['', Validators.required],
      company_document: ['', Validators.required],
      corporate_name: ['', Validators.required],
      fantasy_name: ['', Validators.required],
      phone: [''],
      email: ['', [Validators.required, Validators.email]],
      zipcode: [''],
      address: [''],
      number: [''],
      district: [''],
      city: [''],
      state: [''],
      admin_name: ['', Validators.required],
      admin_email: ['', [Validators.required, Validators.email]],
      admin_password: ['', Validators.required]
    });
  }

  private extractItems<T>(data: T[] | AdminPagedResponse<T> | null | undefined): T[] {
    if (!data) {
      return [];
    }
    return Array.isArray(data) ? data : data.items ?? [];
  }

  ngOnInit(): void {
    const token = this.loginService.getToken();
    if (!token) {
      this.redirectToLogin();
      this.loading = false;
      return;
    }

    this.adminDataService.tenantCompanies(token)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response: any) => {
          if (!response?.status) {
            if (this.isAuthenticationFailure(response?.message)) {
              this.redirectToLogin();
              return;
            }
            this.error = response?.message || 'Falha ao carregar contas para o onboarding.';
            return;
          }

          const rows = this.extractItems(response.data);
          this.accounts = rows.map((item: any) => ({
            id: item.code || item.account_code || 'buildora001',
            text: `${item.code || item.account_code || 'buildora001'} - ${item.fantasy_name || item.corporate_name || item.name || 'Empresa principal'}`,
            raw: item
          }));
        },
        error: (error: any) => {
          if (this.isAuthenticationFailure(error?.error?.message)) {
            this.redirectToLogin();
            return;
          }
          this.error = error?.error?.message || 'Falha ao carregar contas para o onboarding.';
        }
      });
  }

  submit(): void {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    const token = this.loginService.getToken();
    if (!token) {
      this.redirectToLogin();
      return;
    }

    const raw = this.form.getRawValue();
    const accountCode = raw.account_code;
    const payload = { ...raw };
    delete payload.account_code;

    this.error = '';
    this.message = '';
    this.saving = true;

    this.adminDataService.projectSetup(token, {
      account_code: accountCode,
      ...payload
    })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (response: any) => {
          if (!response.status) {
            if (this.isAuthenticationFailure(response?.message)) {
              this.redirectToLogin();
              return;
            }
            this.error = response.message || 'Falha ao executar o bootstrap do tenant.';
            return;
          }

          this.message = response.message || 'Bootstrap do tenant executado com sucesso.';
        },
        error: (error: any) => {
          if (this.isAuthenticationFailure(error?.error?.message)) {
            this.redirectToLogin();
            return;
          }
          this.error = error?.error?.message || 'Falha ao executar o bootstrap do tenant.';
        }
      });
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
}
