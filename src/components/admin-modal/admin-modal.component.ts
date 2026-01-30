
import { Component, ChangeDetectionStrategy, output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DbService } from '../../services/db.service';
import { LanguageService } from '../../services/language.service';
import { UserRole } from '../../models/user.model';

@Component({
  selector: 'app-admin-modal',
  templateUrl: './admin-modal.component.html',
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminModalComponent {
  closeModal = output<void>();
  dbService = inject(DbService);
  langService = inject(LanguageService);
  t = this.langService.t;

  activeTab = signal<'users' | 'integrations'>('users');

  // Integrations State
  dockerHost = signal('');
  googleDriveToken = signal('');
  
  constructor() {
      // Load saved integration settings
      if(typeof localStorage !== 'undefined') {
          this.dockerHost.set(localStorage.getItem('admin_docker_host') || '');
          this.googleDriveToken.set(localStorage.getItem('admin_gdrive_token') || '');
      }
  }

  get users() {
      return this.dbService.getAllUsers();
  }

  toggleRole(userId: string, currentRole: UserRole) {
      if (userId === 'u_admin') return; 
      
      // Cycle: User -> Moderator -> Admin -> User
      let newRole: UserRole = 'user';
      if (currentRole === 'user') newRole = 'moderator';
      else if (currentRole === 'moderator') newRole = 'admin';
      else newRole = 'user';

      this.dbService.updateUserRole(userId, newRole);
  }

  deleteUser(userId: string) {
      if (userId === 'u_admin') return;
      if (confirm(this.t().common.delete + '?')) {
          this.dbService.deleteUser(userId);
      }
  }

  saveIntegrations() {
      localStorage.setItem('admin_docker_host', this.dockerHost());
      localStorage.setItem('admin_gdrive_token', this.googleDriveToken());
      alert('Integrations saved (Mock)!');
  }
}
