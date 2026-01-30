
import { Injectable, signal, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  isDark = signal(true);

  constructor() {
    if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('theme');
        // Default to dark if not set
        this.isDark.set(saved !== 'light');
    }

    effect(() => {
      const dark = this.isDark();
      if (typeof localStorage !== 'undefined') {
          localStorage.setItem('theme', dark ? 'dark' : 'light');
      }
      if (typeof document !== 'undefined') {
        if (dark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    });
  }

  toggle() {
    this.isDark.update(v => !v);
  }
}
