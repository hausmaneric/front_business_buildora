import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, shareReplay, tap } from 'rxjs';
import {
  BusinessActivity,
  BusinessDiary,
  BusinessDocument,
  BusinessEquipment,
  BusinessMaterial,
  BusinessOccurrence,
  BusinessProject,
  BusinessTeam,
  BusinessUser
} from '../models/admin-resource';
import { NxResult } from '../models/login';
import * as resources from '../resources';
import { LoginService } from './login.service';

@Injectable({
  providedIn: 'root'
})
export class AdminDataService {
  private getCache = new Map<string, Observable<any>>();

  constructor(
    private http: HttpClient,
    private loginService: LoginService
  ) {}

  private tenantHeaders(accountCode?: string): HttpHeaders {
    const resolvedAccountCode = accountCode || this.loginService.getAccountCode() || 'buildora001';
    return new HttpHeaders({
      'X-Account-Code': resolvedAccountCode
    });
  }

  private queryParams(params: Record<string, any>): string {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        search.set(key, String(value));
      }
    });
    const query = search.toString();
    return query ? `?${query}` : '';
  }

  private cachedGet<T>(url: string, headers?: HttpHeaders): Observable<T> {
    const cacheKey = `${url}|${headers?.get('X-Account-Code') || ''}`;
    const cached = this.getCache.get(cacheKey);
    if (cached) {
      return cached as Observable<T>;
    }

    const request$ = this.http.get<T>(url, headers ? { headers } : {}).pipe(
      tap({
        error: () => this.getCache.delete(cacheKey)
      }),
      shareReplay(1)
    );

    this.getCache.set(cacheKey, request$);
    return request$;
  }

  private invalidate(prefixes: string[]): void {
    const keys = Array.from(this.getCache.keys());
    for (const key of keys) {
      if (prefixes.some((prefix) => key.includes(prefix))) {
        this.getCache.delete(key);
      }
    }
  }

  clearCache(): void {
    this.getCache.clear();
  }

  tenantMetadata(token: string): Observable<NxResult<any>> {
    const headers = this.tenantHeaders();
    const url = `${resources.apiURL}tenant/metadata/${token}`;
    return this.cachedGet<NxResult<any>>(url, headers);
  }

  tenantCompanies(token: string): Observable<NxResult<any>> {
    const headers = this.tenantHeaders();
    const url = `${resources.apiURL}tenant/companies/${token}`;
    return this.cachedGet<NxResult<any>>(url, headers);
  }

  tenantUsers(token: string): Observable<NxResult<BusinessUser[]>> {
    const headers = this.tenantHeaders();
    const url = `${resources.apiURL}tenant/users/${token}`;
    return this.cachedGet<NxResult<BusinessUser[]>>(url, headers);
  }

  createTenantUser(token: string, payload: Record<string, any>): Observable<NxResult<any>> {
    this.invalidate(['tenant/users/']);
    return this.http.post<NxResult<any>>(`${resources.apiURL}tenant/users/${token}`, payload, {
      headers: this.tenantHeaders()
    });
  }

  dashboardOperational(token: string): Observable<NxResult<any>> {
    const headers = this.tenantHeaders();
    const url = `${resources.apiURL}dashboard/operational/${token}`;
    return this.cachedGet<NxResult<any>>(url, headers);
  }

  projects(token: string): Observable<NxResult<BusinessProject[]>> {
    const headers = this.tenantHeaders();
    const url = `${resources.apiURL}projects/${token}`;
    return this.cachedGet<NxResult<BusinessProject[]>>(url, headers);
  }

  createProject(token: string, payload: Record<string, any>): Observable<NxResult<any>> {
    this.invalidate(['projects/', 'dashboard/operational/', 'reports/projects/']);
    return this.http.post<NxResult<any>>(`${resources.apiURL}projects/${token}`, payload, {
      headers: this.tenantHeaders()
    });
  }

  updateProject(token: string, payload: Record<string, any>): Observable<NxResult<any>> {
    this.invalidate(['projects/', 'dashboard/operational/', 'reports/projects/']);
    return this.http.put<NxResult<any>>(`${resources.apiURL}projects/${token}`, payload, {
      headers: this.tenantHeaders()
    });
  }

  deleteProject(token: string, id: number): Observable<NxResult<any>> {
    this.invalidate(['projects/', 'dashboard/operational/', 'reports/projects/']);
    return this.http.delete<NxResult<any>>(`${resources.apiURL}projects/${token}${this.queryParams({ id })}`, {
      headers: this.tenantHeaders()
    });
  }

  projectSetup(token: string, payload: Record<string, any>): Observable<NxResult<any>> {
    this.invalidate(['projects/', 'teams/', 'tenant/users/', 'dashboard/operational/']);
    return this.http.post<NxResult<any>>(`${resources.apiURL}projects/setup/${token}`, payload, {
      headers: this.tenantHeaders()
    });
  }

  teams(token: string): Observable<NxResult<BusinessTeam[]>> {
    const headers = this.tenantHeaders();
    const url = `${resources.apiURL}teams/${token}`;
    return this.cachedGet<NxResult<BusinessTeam[]>>(url, headers);
  }

  createTeam(token: string, payload: Record<string, any>): Observable<NxResult<any>> {
    this.invalidate(['teams/', 'dashboard/operational/']);
    return this.http.post<NxResult<any>>(`${resources.apiURL}teams/${token}`, payload, {
      headers: this.tenantHeaders()
    });
  }

  updateTeam(token: string, payload: Record<string, any>): Observable<NxResult<any>> {
    this.invalidate(['teams/', 'dashboard/operational/']);
    return this.http.put<NxResult<any>>(`${resources.apiURL}teams/${token}`, payload, {
      headers: this.tenantHeaders()
    });
  }

  deleteTeam(token: string, id: number): Observable<NxResult<any>> {
    this.invalidate(['teams/', 'dashboard/operational/']);
    return this.http.delete<NxResult<any>>(`${resources.apiURL}teams/${token}${this.queryParams({ id })}`, {
      headers: this.tenantHeaders()
    });
  }

  teamMembers(token: string): Observable<NxResult<any[]>> {
    const headers = this.tenantHeaders();
    const url = `${resources.apiURL}team_members/${token}`;
    return this.cachedGet<NxResult<any[]>>(url, headers);
  }

  createTeamMember(token: string, payload: Record<string, any>): Observable<NxResult<any>> {
    this.invalidate(['team_members/', 'teams/', 'tenant/users/', 'dashboard/operational/']);
    return this.http.post<NxResult<any>>(`${resources.apiURL}team_members/${token}`, payload, {
      headers: this.tenantHeaders()
    });
  }

  updateTeamMember(token: string, payload: Record<string, any>): Observable<NxResult<any>> {
    this.invalidate(['team_members/', 'teams/', 'tenant/users/', 'dashboard/operational/']);
    return this.http.put<NxResult<any>>(`${resources.apiURL}team_members/${token}`, payload, {
      headers: this.tenantHeaders()
    });
  }

  deleteTeamMember(token: string, id: number): Observable<NxResult<any>> {
    this.invalidate(['team_members/', 'teams/', 'tenant/users/', 'dashboard/operational/']);
    return this.http.delete<NxResult<any>>(`${resources.apiURL}team_members/${token}${this.queryParams({ id })}`, {
      headers: this.tenantHeaders()
    });
  }

  diaries(token: string, params: Record<string, any> = {}): Observable<NxResult<BusinessDiary[]>> {
    const headers = this.tenantHeaders();
    const url = `${resources.apiURL}diary/${token}${this.queryParams(params)}`;
    return Object.keys(params).length
      ? this.http.get<NxResult<BusinessDiary[]>>(url, { headers })
      : this.cachedGet<NxResult<BusinessDiary[]>>(url, headers);
  }

  createDiary(token: string, payload: Record<string, any>): Observable<NxResult<any>> {
    this.invalidate(['diary/', 'dashboard/operational/', 'reports/projects/']);
    return this.http.post<NxResult<any>>(`${resources.apiURL}diary/${token}`, payload, {
      headers: this.tenantHeaders()
    });
  }

  updateDiary(token: string, payload: Record<string, any>): Observable<NxResult<any>> {
    this.invalidate(['diary/', 'dashboard/operational/', 'reports/projects/']);
    return this.http.put<NxResult<any>>(`${resources.apiURL}diary/${token}`, payload, {
      headers: this.tenantHeaders()
    });
  }

  occurrences(token: string): Observable<NxResult<BusinessOccurrence[]>> {
    const headers = this.tenantHeaders();
    const url = `${resources.apiURL}daily/occurrences/${token}`;
    return this.cachedGet<NxResult<BusinessOccurrence[]>>(url, headers);
  }

  createOccurrence(token: string, payload: Record<string, any>): Observable<NxResult<any>> {
    this.invalidate(['daily/occurrences/', 'dashboard/operational/', 'diary/']);
    return this.http.post<NxResult<any>>(`${resources.apiURL}daily/occurrences/${token}`, payload, {
      headers: this.tenantHeaders()
    });
  }

  updateOccurrence(token: string, payload: Record<string, any>): Observable<NxResult<any>> {
    this.invalidate(['daily/occurrences/', 'dashboard/operational/', 'diary/']);
    return this.http.put<NxResult<any>>(`${resources.apiURL}daily/occurrences/${token}`, payload, {
      headers: this.tenantHeaders()
    });
  }

  deleteOccurrence(token: string, id: number): Observable<NxResult<any>> {
    this.invalidate(['daily/occurrences/', 'dashboard/operational/', 'diary/']);
    return this.http.delete<NxResult<any>>(`${resources.apiURL}daily/occurrences/${token}${this.queryParams({ id })}`, {
      headers: this.tenantHeaders()
    });
  }

  activities(token: string): Observable<NxResult<BusinessActivity[]>> {
    const headers = this.tenantHeaders();
    const url = `${resources.apiURL}daily/activities/${token}`;
    return this.cachedGet<NxResult<BusinessActivity[]>>(url, headers);
  }

  createActivity(token: string, payload: Record<string, any>): Observable<NxResult<any>> {
    this.invalidate(['daily/activities/', 'dashboard/operational/', 'diary/']);
    return this.http.post<NxResult<any>>(`${resources.apiURL}daily/activities/${token}`, payload, {
      headers: this.tenantHeaders()
    });
  }

  updateActivity(token: string, payload: Record<string, any>): Observable<NxResult<any>> {
    this.invalidate(['daily/activities/', 'dashboard/operational/', 'diary/']);
    return this.http.put<NxResult<any>>(`${resources.apiURL}daily/activities/${token}`, payload, {
      headers: this.tenantHeaders()
    });
  }

  deleteActivity(token: string, id: number): Observable<NxResult<any>> {
    this.invalidate(['daily/activities/', 'dashboard/operational/', 'diary/']);
    return this.http.delete<NxResult<any>>(`${resources.apiURL}daily/activities/${token}${this.queryParams({ id })}`, {
      headers: this.tenantHeaders()
    });
  }

  materials(token: string): Observable<NxResult<BusinessMaterial[]>> {
    const headers = this.tenantHeaders();
    const url = `${resources.apiURL}daily/materials/${token}`;
    return this.cachedGet<NxResult<BusinessMaterial[]>>(url, headers);
  }

  createMaterial(token: string, payload: Record<string, any>): Observable<NxResult<any>> {
    this.invalidate(['daily/materials/', 'dashboard/operational/', 'diary/']);
    return this.http.post<NxResult<any>>(`${resources.apiURL}daily/materials/${token}`, payload, {
      headers: this.tenantHeaders()
    });
  }

  updateMaterial(token: string, payload: Record<string, any>): Observable<NxResult<any>> {
    this.invalidate(['daily/materials/', 'dashboard/operational/', 'diary/']);
    return this.http.put<NxResult<any>>(`${resources.apiURL}daily/materials/${token}`, payload, {
      headers: this.tenantHeaders()
    });
  }

  deleteMaterial(token: string, id: number): Observable<NxResult<any>> {
    this.invalidate(['daily/materials/', 'dashboard/operational/', 'diary/']);
    return this.http.delete<NxResult<any>>(`${resources.apiURL}daily/materials/${token}${this.queryParams({ id })}`, {
      headers: this.tenantHeaders()
    });
  }

  equipments(token: string): Observable<NxResult<BusinessEquipment[]>> {
    const headers = this.tenantHeaders();
    const url = `${resources.apiURL}daily/equipments/${token}`;
    return this.cachedGet<NxResult<BusinessEquipment[]>>(url, headers);
  }

  createEquipment(token: string, payload: Record<string, any>): Observable<NxResult<any>> {
    this.invalidate(['daily/equipments/', 'dashboard/operational/', 'diary/']);
    return this.http.post<NxResult<any>>(`${resources.apiURL}daily/equipments/${token}`, payload, {
      headers: this.tenantHeaders()
    });
  }

  updateEquipment(token: string, payload: Record<string, any>): Observable<NxResult<any>> {
    this.invalidate(['daily/equipments/', 'dashboard/operational/', 'diary/']);
    return this.http.put<NxResult<any>>(`${resources.apiURL}daily/equipments/${token}`, payload, {
      headers: this.tenantHeaders()
    });
  }

  deleteEquipment(token: string, id: number): Observable<NxResult<any>> {
    this.invalidate(['daily/equipments/', 'dashboard/operational/', 'diary/']);
    return this.http.delete<NxResult<any>>(`${resources.apiURL}daily/equipments/${token}${this.queryParams({ id })}`, {
      headers: this.tenantHeaders()
    });
  }

  documents(token: string): Observable<NxResult<BusinessDocument[]>> {
    const headers = this.tenantHeaders();
    const url = `${resources.apiURL}daily/files/${token}`;
    return this.cachedGet<NxResult<BusinessDocument[]>>(url, headers);
  }

  createDocument(token: string, payload: Record<string, any>): Observable<NxResult<any>> {
    this.invalidate(['daily/files/', 'dashboard/operational/', 'diary/']);
    return this.http.post<NxResult<any>>(`${resources.apiURL}daily/files/${token}`, payload, {
      headers: this.tenantHeaders()
    });
  }

  updateDocument(token: string, payload: Record<string, any>): Observable<NxResult<any>> {
    this.invalidate(['daily/files/', 'dashboard/operational/', 'diary/']);
    return this.http.put<NxResult<any>>(`${resources.apiURL}daily/files/${token}`, payload, {
      headers: this.tenantHeaders()
    });
  }

  deleteDocument(token: string, id: number): Observable<NxResult<any>> {
    this.invalidate(['daily/files/', 'dashboard/operational/', 'diary/']);
    return this.http.delete<NxResult<any>>(`${resources.apiURL}daily/files/${token}${this.queryParams({ id })}`, {
      headers: this.tenantHeaders()
    });
  }

  reportProjectDiaries(token: string, params: Record<string, any> = {}): Observable<NxResult<any>> {
    const headers = this.tenantHeaders();
    const url = `${resources.apiURL}reports/projects/diaries/${token}${this.queryParams(params)}`;
    return this.http.get<NxResult<any>>(url, { headers });
  }

  reportProjectSummary(token: string, params: Record<string, any> = {}): Observable<NxResult<any>> {
    const headers = this.tenantHeaders();
    const url = `${resources.apiURL}reports/projects/summary/${token}${this.queryParams(params)}`;
    return this.http.get<NxResult<any>>(url, { headers });
  }
}
