
import { Injectable, signal, inject, computed } from '@angular/core';
import { User, UserRole } from '../models/user.model';
import { DbService } from './db.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  dbService = inject(DbService);
  
  currentUser = signal<User | null>(null);
  
  isAdmin = computed(() => this.currentUser()?.role === 'admin');
  isModerator = computed(() => this.currentUser()?.role === 'admin' || this.currentUser()?.role === 'moderator');
  isLoggedIn = computed(() => this.currentUser() !== null);

  constructor() {
      // Restore session if possible (simplified)
      const savedId = localStorage.getItem('cnc_session_user_id');
      if (savedId) {
          const user = this.dbService.getAllUsers().find(u => u.id === savedId);
          if (user) this.currentUser.set(user);
      }
  }

  login(username: string, password: string): boolean {
      const user = this.dbService.getUserByUsername(username);
      if (user && user.passwordHash === password) {
          // Update login stats
          const updatedUser: User = { 
              ...user, 
              lastLoginAt: Date.now(),
              lastLoginIp: this.getMockIp() 
          };
          this.dbService.updateUser(updatedUser);
          this.currentUser.set(updatedUser);
          localStorage.setItem('cnc_session_user_id', user.id);
          return true;
      }
      return false;
  }

  register(username: string, password: string): boolean {
      try {
          const user = this.dbService.createUser(username, password);
          // Auto login after register
           const updatedUser: User = { 
              ...user, 
              lastLoginAt: Date.now(),
              lastLoginIp: this.getMockIp() 
          };
          this.dbService.updateUser(updatedUser);
          this.currentUser.set(updatedUser);
          localStorage.setItem('cnc_session_user_id', user.id);
          return true;
      } catch (e) {
          return false;
      }
  }

  logout() {
      this.currentUser.set(null);
      localStorage.removeItem('cnc_session_user_id');
  }
  
  private getMockIp(): string {
      // Mock IP since we are client-side
      return '192.168.1.' + Math.floor(Math.random() * 255);
  }
}
