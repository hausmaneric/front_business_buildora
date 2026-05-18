import { Pipe, PipeTransform } from '@angular/core';
import { Observable } from 'rxjs';
import { TranslationService } from '../services/translation.service';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false
})
export class TranslatePipe implements PipeTransform {
  constructor(private localeService: TranslationService) {}

  transform(key: string): Observable<string> {
    return this.localeService.getLocale(key);
  }
}

