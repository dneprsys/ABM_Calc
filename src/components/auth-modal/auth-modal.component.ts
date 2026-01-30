
import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { LanguageService, Language } from '../../services/language.service';

@Component({
  selector: 'app-auth-modal',
  templateUrl: './auth-modal.component.html',
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuthModalComponent {
  authService = inject(AuthService);
  langService = inject(LanguageService);
  t = this.langService.t;

  isRegisterMode = signal(false);
  username = signal('');
  password = signal('');
  errorMsg = signal('');

  toggleMode() {
    this.isRegisterMode.update(v => !v);
    this.errorMsg.set('');
  }
  
  setLanguage(lang: Language) {
      this.langService.setLanguage(lang);
  }

  submit() {
    const user = this.username().trim();
    const pass = this.password().trim();
    if(!user || !pass) return;

    let success = false;
    if (this.isRegisterMode()) {
        success = this.authService.register(user, pass);
        if (!success) this.errorMsg.set(this.t().auth.err_exists);
    } else {
        success = this.authService.login(user, pass);
        if (!success) this.errorMsg.set(this.t().auth.err_login);
    }
  }
}
