
import { Injectable, signal, effect } from '@angular/core';
import { User, StoredFile, UserRole } from '../models/user.model';
import { PartPreset } from '../models/machine.model';

// Default Data Migration
const SEED_PARTS: Record<string, PartPreset> = {
  'Вал приводной А-20': {
      inputs: { qty: '500', min: '2', sec: '30', barTime: '45' },
      material: { stockLen: 3000, partLen: 145, cutWidth: 4, barEndRem: 200 },
      checklist: [
         { id: 1, name: "Диаметр шейки", nominal: 25.0, tol_plus: 0.02, tol_minus: 0.02 },
         { id: 2, name: "Длина общая", nominal: 145.0, tol_plus: 0.5, tol_minus: 0.5 },
         { id: 3, name: "Резьба М20", nominal: 20.0, tol_plus: 0.1, tol_minus: 0.1 },
         { id: 4, name: "Шероховатость Ra", nominal: 0.8, tol_plus: 0.4, tol_minus: 0.0 },
         { id: 5, name: "Биение", nominal: 0.0, tol_plus: 0.05, tol_minus: 0.0 }
      ]
  },
  'Втулка распорная': {
      inputs: { qty: '1000', min: '0', sec: '45', barTime: '30' },
      material: { stockLen: 3000, partLen: 15, cutWidth: 2, barEndRem: 150 },
      checklist: [
         { id: 1, name: "Внутр. диаметр", nominal: 12.0, tol_plus: 0.05, tol_minus: 0.0 },
         { id: 2, name: "Внеш. диаметр", nominal: 20.0, tol_plus: 0.1, tol_minus: 0.1 },
         { id: 3, name: "Длина", nominal: 15.0, tol_plus: 0.1, tol_minus: 0.1 }
      ]
  },
  'Болт М10х50 спец': {
      inputs: { qty: '300', min: '1', sec: '15', barTime: '60' },
      material: { stockLen: 3000, partLen: 56, cutWidth: 3, barEndRem: 100 },
      checklist: [
         { id: 1, name: "Шестигранник", nominal: 17.0, tol_plus: 0.1, tol_minus: 0.1 },
         { id: 2, name: "Длина резьбы", nominal: 30.0, tol_plus: 1.0, tol_minus: 0.0 },
         { id: 3, name: "Длина тела", nominal: 50.0, tol_plus: 0.5, tol_minus: 0.5 }
      ]
  },
  'Фланец DN50': {
      inputs: { qty: '150', min: '4', sec: '10', barTime: '50' },
      material: { stockLen: 1000, partLen: 45, cutWidth: 3, barEndRem: 50 },
      checklist: [
         { id: 1, name: "Диаметр D1", nominal: 165.0, tol_plus: 1.0, tol_minus: 1.0 },
         { id: 2, name: "Толщина фланца", nominal: 18.0, tol_plus: 0.5, tol_minus: 0.5 },
         { id: 3, name: "Межцентровое отв.", nominal: 125.0, tol_plus: 0.2, tol_minus: 0.2 },
         { id: 4, name: "Диаметр отв.", nominal: 18.0, tol_plus: 0.5, tol_minus: 0.0 }
      ]
  },
  'Штифт закаленный': {
      inputs: { qty: '2000', min: '0', sec: '25', barTime: '20' },
      material: { stockLen: 3000, partLen: 40, cutWidth: 2, barEndRem: 100 },
      checklist: [
         { id: 1, name: "Диаметр h7", nominal: 10.0, tol_plus: 0.0, tol_minus: 0.015 },
         { id: 2, name: "Длина", nominal: 40.0, tol_plus: 0.2, tol_minus: 0.2 },
         { id: 3, name: "Твердость HRC", nominal: 52.0, tol_plus: 5.0, tol_minus: 0.0 }
      ]
  }
};

@Injectable({
  providedIn: 'root'
})
export class DbService {
  private readonly USERS_KEY = 'cnc_db_users_v2';
  private readonly FILES_KEY = 'cnc_db_files_v2';

  // "Tables"
  private users = signal<User[]>([]);
  private files = signal<StoredFile[]>([]);

  constructor() {
    this.loadDb();
    
    // Auto-save DB on changes
    effect(() => localStorage.setItem(this.USERS_KEY, JSON.stringify(this.users())));
    effect(() => localStorage.setItem(this.FILES_KEY, JSON.stringify(this.files())));
  }

  private loadDb() {
    const u = localStorage.getItem(this.USERS_KEY);
    const f = localStorage.getItem(this.FILES_KEY);

    if (u) this.users.set(JSON.parse(u));
    else this.seedAdmin(); 

    if (f) {
        this.files.set(JSON.parse(f));
    } else {
        this.seedParts();
    }
  }

  private seedAdmin() {
    const admin: User = {
      id: 'u_admin',
      username: 'admin',
      passwordHash: '9611814', 
      role: 'admin',
      createdAt: Date.now()
    };
    this.users.set([admin]);
  }

  private seedParts() {
      const parts: StoredFile[] = [];
      Object.entries(SEED_PARTS).forEach(([name, data]) => {
          parts.push({
              id: 'f_seed_' + Math.random().toString(36).substr(2,9),
              name: name,
              ownerId: 'u_admin',
              data: data,
              updatedAt: Date.now()
          });
      });
      this.files.set(parts);
  }

  // --- User Operations ---

  getAllUsers(): User[] {
    return this.users();
  }

  getUserByUsername(username: string): User | undefined {
    return this.users().find(u => u.username.toLowerCase() === username.toLowerCase());
  }

  createUser(username: string, password: string): User {
    if (this.getUserByUsername(username)) throw new Error('User exists');
    
    const newUser: User = {
      id: 'u_' + Date.now().toString(36),
      username,
      passwordHash: password,
      role: 'user',
      createdAt: Date.now()
    };
    
    this.users.update(list => [...list, newUser]);
    return newUser;
  }

  updateUserRole(userId: string, role: UserRole) {
    this.users.update(list => list.map(u => u.id === userId ? { ...u, role } : u));
  }
  
  updateUser(user: User) {
      this.users.update(list => list.map(u => u.id === user.id ? user : u));
  }

  deleteUser(userId: string) {
    if (userId === 'u_admin') return; // Cannot delete super admin
    this.users.update(list => list.filter(u => u.id !== userId));
  }

  // --- File Operations ---

  saveFile(name: string, data: PartPreset, ownerId: string): StoredFile {
    const existingIndex = this.files().findIndex(f => f.name === name);
    
    if (existingIndex >= 0) {
        // Update existing (overwrite)
        const updated = [...this.files()];
        updated[existingIndex] = {
            ...updated[existingIndex],
            data,
            updatedAt: Date.now()
        };
        this.files.set(updated);
        return updated[existingIndex];
    } else {
        // Create new
        const newFile: StoredFile = {
            id: 'f_' + Date.now().toString(36),
            name,
            ownerId,
            data,
            updatedAt: Date.now()
        };
        this.files.update(list => [...list, newFile]);
        return newFile;
    }
  }

  getFiles(): StoredFile[] {
      return this.files();
  }

  getFileByName(name: string): StoredFile | undefined {
      return this.files().find(f => f.name === name);
  }

  deleteFile(fileId: string) {
      this.files.update(list => list.filter(f => f.id !== fileId));
  }
}
