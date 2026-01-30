
import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MachineCardComponent } from './components/machine-card/machine-card.component';
import { ChecklistModalComponent } from './components/checklist-modal/checklist-modal.component';
import { HistoryModalComponent } from './components/history-modal/history-modal.component';
import { StatsModalComponent } from './components/stats-modal/stats-modal.component';
import { SettingsModalComponent } from './components/settings-modal/settings-modal.component';
import { ReferenceModalComponent } from './components/reference-modal/reference-modal.component';
import { CreatePartModalComponent } from './components/create-part-modal/create-part-modal.component';
import { AuthModalComponent } from './components/auth-modal/auth-modal.component';
import { AdminModalComponent } from './components/admin-modal/admin-modal.component';
import { CloudFilesModalComponent } from './components/cloud-files-modal/cloud-files-modal.component';
import { ReportModalComponent } from './components/report-modal/report-modal.component';
import { MachineService } from './services/machine.service';
import { AuthService } from './services/auth.service';
import { NetworkService } from './services/network.service';
import { ThemeService } from './services/theme.service';
import { Machine, PartPreset } from './models/machine.model';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MachineCardComponent,
    ChecklistModalComponent,
    HistoryModalComponent,
    StatsModalComponent,
    SettingsModalComponent,
    ReferenceModalComponent,
    CreatePartModalComponent,
    AuthModalComponent,
    AdminModalComponent,
    CloudFilesModalComponent,
    ReportModalComponent
  ],
})
export class AppComponent implements OnInit, OnDestroy {
  machineService = inject(MachineService);
  authService = inject(AuthService);
  networkService = inject(NetworkService);
  themeService = inject(ThemeService);
  
  machines = this.machineService.machines;
  
  // Filter State
  statusFilter = signal<'all' | 'work' | 'idle' | 'pause' | 'bar' | 'done'>('all');
  
  // Mobile Menu
  isMobileMenuOpen = signal(false);

  // Computed property to filter visible machines based on role AND status filter
  machineIds = computed(() => {
    const allMachines = this.machineService.machines();
    const allIds = Object.keys(allMachines).map(Number).sort((a,b) => a - b);
    const user = this.authService.currentUser();
    const filter = this.statusFilter();
    
    // Step 1: Role Based Filter
    let visibleIds: number[] = [];

    if (this.authService.isModerator()) {
        visibleIds = allIds;
    } else if (user) {
        visibleIds = allIds.filter(id => {
            const m = allMachines[id];
            // Show if I am the operator
            if (m.operatorId === user.id) return true;
            // Show if it is idle (available to take)
            if (m.status === 'idle') return true;
            // Hide if someone else is running it
            return false;
        });
    }

    // Step 2: Status Based Filter
    if (filter !== 'all') {
        visibleIds = visibleIds.filter(id => allMachines[id].status === filter);
    }

    return visibleIds;
  });

  isStatsModalOpen = signal(false);
  isHistoryModalOpen = signal(false);
  isChecklistModalOpen = signal(false);
  isSettingsModalOpen = signal(false);
  isReferenceModalOpen = signal(false);
  isCreatePartModalOpen = signal(false);
  isAdminModalOpen = signal(false);
  isCloudModalOpen = signal(false);
  isReportModalOpen = signal(false);

  // Data to edit when opening Create Part Modal from Cloud
  editingPartData = signal<PartPreset | null>(null);

  selectedMachineForQc = signal<Machine | null>(null);
  
  // Clock Signals
  currentTime = signal(new Date());
  
  formattedTime = computed(() => {
      return this.currentTime().toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  });

  formattedDate = computed(() => {
      const d = this.currentTime();
      const lang = this.machineService.languageService.currentLang() === 'uk' ? 'uk-UA' : 'ru-RU';
      // Returns format like "29 ЯНВ 2026"
      return d.toLocaleDateString(lang, { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase().replace('.', ''); 
  });

  shiftRemaining = computed(() => {
      const now = this.currentTime();
      const currentHour = now.getHours();
      
      // Shifts assume 08:00 start and 20:00 start (12h shifts)
      // If 08:00 <= now < 20:00 -> Target 20:00 today
      // If 20:00 <= now <= 23:59 -> Target 08:00 tomorrow
      // If 00:00 <= now < 08:00 -> Target 08:00 today
      
      let target = new Date(now);
      target.setSeconds(0);
      target.setMilliseconds(0);
      target.setMinutes(0);

      if (currentHour >= 8 && currentHour < 20) {
          target.setHours(20);
      } else if (currentHour >= 20) {
          target.setDate(target.getDate() + 1);
          target.setHours(8);
      } else {
          target.setHours(8);
      }

      const diff = target.getTime() - now.getTime();
      if (diff < 0) return "00:00:00";

      const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
      const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
      const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');

      return `${h}:${m}:${s}`;
  });

  private timer: any;

  ngOnInit() {
      this.timer = setInterval(() => {
          this.currentTime.set(new Date());
      }, 1000);
  }

  ngOnDestroy() {
      if (this.timer) {
          clearInterval(this.timer);
      }
  }

  toggleMobileMenu() {
      this.isMobileMenuOpen.update(v => !v);
  }

  toggleTheme() {
      this.themeService.toggle();
  }

  getMachine(id: number): Machine {
    return this.machines()[id];
  }

  setFilter(status: 'all' | 'work' | 'idle' | 'pause' | 'bar' | 'done') {
      this.statusFilter.set(status);
  }
  
  openChecklist(machine: Machine) {
    this.selectedMachineForQc.set(machine);
    this.isChecklistModalOpen.set(true);
  }

  openCreatePart(data: PartPreset | null = null) {
      this.editingPartData.set(data);
      this.isCreatePartModalOpen.set(true);
  }

  onEditCloudFile(data: PartPreset) {
      this.isCloudModalOpen.set(false);
      this.openCreatePart(data);
  }
  
  onCreateCloudFile() {
      this.isCloudModalOpen.set(false);
      this.openCreatePart(null);
  }

  addMachine() {
      this.machineService.addNewMachine();
  }

  scrollToMachine(id: number): void {
    const element = document.getElementById(`card-${id}`);
    if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  // Returns the style for the button container (Neutral/Glass)
  getStripIndicatorClass(status: Machine['status']): string {
    const base = "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200";
    
    switch (status) {
        case 'work': return `${base} border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.1)]`;
        case 'pause': return `${base} border-amber-500/50`;
        case 'bar': return `${base} border-orange-500/50`;
        case 'done': return `${base} border-rose-500/50`;
        default: return "bg-slate-100 dark:bg-slate-800/50 border-transparent text-slate-500 dark:text-slate-400";
    }
  }

  // Returns the style for the status dot
  getStripDotClass(status: Machine['status']): string {
    switch (status) {
        case 'work': return 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]';
        case 'pause': return 'bg-amber-500';
        case 'bar': return 'bg-orange-500 animate-pulse';
        case 'done': return 'bg-rose-500';
        default: return 'bg-slate-400';
    }
  }

  getFilterBtnClass(btnStatus: string, color: string): string {
      const isActive = this.statusFilter() === btnStatus;
      const base = "px-3 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap select-none ";
      
      if (isActive) {
          // Active Styles
          if(btnStatus === 'all') return base + "bg-slate-300 dark:bg-slate-200 text-slate-900 border-slate-300 dark:border-slate-200";
          if(btnStatus === 'work') return base + "bg-emerald-500 text-white border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]";
          if(btnStatus === 'idle') return base + "bg-indigo-500 text-white border-indigo-500";
          if(btnStatus === 'pause') return base + "bg-amber-500 text-white border-amber-500";
          if(btnStatus === 'bar') return base + "bg-orange-500 text-white border-orange-500";
          if(btnStatus === 'done') return base + "bg-rose-500 text-white border-rose-500";
          return base;
      } else {
          // Inactive Styles
          if(btnStatus === 'all') return base + "border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-400";
          
          return base + `border-${color}-500/30 text-${color}-600 dark:text-${color}-400/70 hover:text-${color}-500 dark:hover:text-${color}-400 hover:border-${color}-500/60 bg-${color}-500/5`;
      }
  }

  sendReport() {
      this.isReportModalOpen.set(true);
  }
  
  setGlobalReminder() {
      const input = prompt("Напоминание (минут):", "15");
      if (input) {
          const min = parseFloat(input.replace(',', '.'));
          if (!isNaN(min) && min > 0) {
              const note = prompt("Текст напоминания:", "Проверить станок");
              if (note !== null) {
                  this.machineService.scheduleReminder(min, note || "Напоминание");
                  alert(`Таймер установлен на ${min} мин.`);
              }
          }
      }
  }
}
