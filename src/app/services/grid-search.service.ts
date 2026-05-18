import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GridSearchService {

  private searchSource = new BehaviorSubject<string>('');
  search$ = this.searchSource.asObservable();

  private currentValue: string = '';

  search(text: string) {
    this.currentValue = text;
    this.searchSource.next(text);
  }

  getCurrentSearch(): string {
    return this.currentValue;
  }
}