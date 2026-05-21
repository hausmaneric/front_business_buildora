import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable } from 'rxjs';

import { TRANSLATION_EN_US } from './locales/en_us';
import { TRANSLATION_PT_BR } from './locales/pt_br';

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private translations: any;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      const userLocale = navigator?.languages?.length ? navigator.languages[0] : navigator.language;
      if (userLocale === 'pt-BR') {
        this.translations = TRANSLATION_PT_BR;
      } else if (userLocale === 'en-US') {
        this.translations = TRANSLATION_EN_US;
      } else {
        this.translations = TRANSLATION_EN_US;
      }
    } else {
      this.translations = TRANSLATION_EN_US;
    }
  }

  // Salva informação de idioma
  saveLocale(key: any) {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('locate', JSON.stringify(key));
    }
  }

  // Carrega informação de idioma
  loadLocale(): any {
    if (isPlatformBrowser(this.platformId)) {
      const isLoaded = localStorage.getItem('locate');
      return isLoaded ? JSON.parse(isLoaded) : null;
    }
    return null;
  }

  // Altera idioma
  setLocale(lang: string) {
    if (lang === 'pt-br') {
      this.saveLocale('pt_br');
      this.translations = TRANSLATION_PT_BR;
    } else if (lang === 'en-us') {
      this.saveLocale('en_us');
      this.translations = TRANSLATION_EN_US;
    } else {
      this.saveLocale('en_us');
      this.translations = TRANSLATION_EN_US;
    }
  }

  // Carrega idioma gravado localmente
  getLocale(key: any): Observable<any> {
    if (isPlatformBrowser(this.platformId)) {
      const savedLocale = this.loadLocale();
      if (savedLocale === 'pt_br') {
        this.translations = TRANSLATION_PT_BR;
      } else if (savedLocale === 'en_us') {
        this.translations = TRANSLATION_EN_US;
      }
    }

    const getValue = (obj: any, path: string) => {
      if (typeof path !== 'string') return undefined;
      return path.split('.').reduce((o, k) => (o ? o[k] : undefined), obj);
    };

    const translation = getValue(this.translations, key);
    return translation !== undefined ? translation : key;
  }
}
