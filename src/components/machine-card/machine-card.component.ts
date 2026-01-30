
import { Component, ChangeDetectionStrategy, input, computed, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Machine, MachineInputs, Material, PartPreset } from '../../models/machine.model';
import { MachineService } from '../../services/machine.service';

@Component({
  selector: 'app-machine-card',
  templateUrl: './machine-card.component.html',
  imports: [CommonModule, FormsModule],
})
export class MachineCardComponent {
  machine = input.required<Machine>();
  openChecklist = output<void>();

  machineService = inject(MachineService);
  partNames = this.machineService.partNames;
  
  isDetailsOpen = signal(false);
  activeTab = signal<'general' | 'material'>('general');
  isChecklistExpanded = signal(false);
  
  commonDiameters = [3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 25, 30, 32, 35, 40, 45, 50, 60, 80, 100];

  formattedTimeLeft = computed(() => {
    const m = this.machine();
    const t = this.machineService.languageService.t();
    const time = Math.max(0, m.timeLeft);
    if (m.status === 'done' && time <= 0) return t.machine_card.ready;
    if (time <= 0) return '00:00:00';
    const h = Math.floor(time / 3600).toString().padStart(2, '0');
    const mn = Math.floor((time % 3600) / 60).toString().padStart(2, '0');
    const sc = Math.floor(time % 60).toString().padStart(2, '0');
    return `${h}:${mn}:${sc}`;
  });
  
  formattedBarTimeLeft = computed(() => {
    const m = this.machine();
    const time = Math.max(0, m.barLeft);
    if(time <= 0) return '00:00:00';
    const h = Math.floor(time / 3600).toString().padStart(2, '0');
    const mn = Math.floor((time % 3600) / 60).toString().padStart(2, '0');
    const sc = Math.floor(time % 60).toString().padStart(2, '0');
    return `${h}:${mn}:${sc}`;
  });
  
  formattedBarTotalTime = computed(() => {
    const m = this.machine();
    const parts = m.material.partsPerBar || 0;
    const min = parseInt(m.inputs.min, 10) || 0;
    const sec = parseInt(m.inputs.sec, 10) || 0;
    const onePartSec = min * 60 + sec;
    const totalSec = parts * onePartSec;
    
    if (totalSec <= 0) return '00:00:00';
    
    const h = Math.floor(totalSec / 3600).toString().padStart(2, '0');
    const mn = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(totalSec % 60).toString().padStart(2, '0');
    
    return `${h}:${mn}:${s}`;
  });

  formattedTimeUntilStop = computed(() => {
    const m = this.machine();
    if (m.status === 'done' || m.status === 'bar') return '00:00:00';
    const candidates: number[] = [];
    if (m.timeLeft > 0) candidates.push(m.timeLeft);
    if (m.barLeft > 0) candidates.push(m.barLeft);
    if (candidates.length === 0) return '00:00:00';
    const minSeconds = Math.max(0, Math.min(...candidates));
    const h = Math.floor(minSeconds / 3600).toString().padStart(2, '0');
    const mn = Math.floor((minSeconds % 3600) / 60).toString().padStart(2, '0');
    const sc = Math.floor(minSeconds % 60).toString().padStart(2, '0');
    return `${h}:${mn}:${sc}`;
  });

  qcTimerDisplay = computed(() => {
    const t = Math.max(0, this.machine().qcTimer);
    const mn = Math.floor(t / 60).toString().padStart(2, '0');
    const sc = Math.floor(t % 60).toString().padStart(2, '0');
    return `${mn}:${sc}`;
  });

  qcTimerClass = computed(() => {
     const t = this.machine().qcTimer;
     if (t <= 0) {
         return 'text-red-500 border-red-500 bg-red-100 dark:bg-red-500/20 animate-pulse font-bold shadow-md';
     }
     return 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10';
  });

  lastCheckTime = computed(() => {
      const t = this.machine().lastChecklistSaveTime;
      if (!t) return null;
      return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });

  endLabel = computed(() => this.machineService.languageService.t().machine_card.end_series);

  endTime = computed(() => {
    const m = this.machine();
    let targetTime = 0;
    if (m.status === 'done' && m.finishTime) {
        targetTime = m.finishTime;
    } else if (m.status === 'work' && m.timeLeft > 0) {
        targetTime = Date.now() + m.timeLeft * 1000;
    }
    if (targetTime > 0) {
        const date = new Date(targetTime);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const weekday = date.toLocaleDateString(this.machineService.languageService.currentLang(), { weekday: 'short' });
        const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
        return `${day} / ${capitalizedWeekday} / ${month} ${time}`;
    }
    return '-- / -- / -- --:--';
  });
  
  barEndTime = computed(() => {
      const m = this.machine();
      if(m.barLeft <= 0) return '00:00';
      const now = Date.now();
      const end = now + (m.barLeft * 1000);
      return new Date(end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });
  
  partsRemaining = computed(() => {
    const m = this.machine();
    if (m.status === 'done') return 0;
    if (m.status === 'idle') {
        const qty = parseInt(m.inputs.qty, 10);
        return isNaN(qty) ? 0 : qty;
    }
    const min = parseInt(m.inputs.min, 10) || 0;
    const sec = parseInt(m.inputs.sec, 10) || 0;
    const cycleTime = min * 60 + sec;
    if (cycleTime <= 0) return 0;
    return Math.ceil(m.timeLeft / cycleTime);
  });

  partsDone = computed(() => {
    const m = this.machine();
    const qty = parseInt(m.inputs.qty, 10);
    if (isNaN(qty) || qty <= 0) return 0;
    return Math.max(0, qty - this.partsRemaining());
  });

  progressPercent = computed(() => {
      const m = this.machine();
      const qty = parseInt(m.inputs.qty, 10);
      if (isNaN(qty) || qty <= 0) return 0;
      const done = this.partsDone();
      return Math.min(100, Math.floor((done / qty) * 100));
  });

  cycleTimeDecimal = computed(() => {
    const m = this.machine();
    const min = parseInt(m.inputs.min, 10) || 0;
    const sec = parseInt(m.inputs.sec, 10) || 0;
    return (min + sec / 60).toFixed(2);
  });

  cardClasses = computed(() => {
    const status = this.machine().status;
    // Base adaptive styling: light mode is white with shadow, dark mode is glass
    const base = 'rounded-3xl p-5 transition-all duration-500 border-l-4 relative overflow-hidden fade-in shadow-md dark:shadow-none bg-white dark:bg-slate-800/50 dark:backdrop-blur-sm';
    
    let colorClass = 'border-slate-300 dark:border-slate-700';
    if (status === 'work') colorClass = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/5';
    else if (status === 'pause') colorClass = 'border-amber-500 bg-amber-50 dark:bg-amber-500/5';
    else if (status === 'bar') colorClass = 'border-orange-500 bg-orange-50 dark:bg-orange-500/10 shadow-[0_0_15px_rgba(249,115,22,0.15)]'; 
    else if (status === 'done') colorClass = 'border-rose-500 bg-rose-50 dark:bg-rose-500/10';
    
    return `${base} ${colorClass}`;
  });

  mainButtonText = computed(() => {
    const status = this.machine().status;
    const t = this.machineService.languageService.t().machine_card;
    if (status === 'idle' || status === 'done') return t.start;
    if (status === 'pause') return t.continue;
    if (status === 'bar') return t.bar_replaced;
    return t.pause;
  });

  mainButtonClasses = computed(() => {
    const status = this.machine().status;
    const base = "flex-1 font-bold py-3 rounded-xl active:scale-95 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed";
    if (status === 'idle' || status === 'done') return `${base} bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20`;
    if (status === 'pause') return `${base} bg-emerald-600 hover:bg-emerald-500 text-white`;
    if (status === 'bar') return `${base} bg-orange-600 hover:bg-orange-500 text-white animate-pulse`;
    return `${base} bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200`;
  });

  isMainButtonDisabled = computed(() => {
     const m = this.machine();
     if (m.status === 'pause') {
         return !m.pauseNote || m.pauseNote.trim() === '';
     }
     return false;
  });

  updateNote(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.machineService.updateMachine(this.machine().id, { note: value });
  }

  updateMapNumber(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.machineService.updateMachine(this.machine().id, { mapNumber: value });
  }

  onPartSelect(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.machineService.updateMachine(this.machine().id, { note: value });
    this.machineService.loadPartPreset(this.machine().id, value);
  }
  
  updatePauseNote(event: Event) {
    const value = (event.target as HTMLTextAreaElement).value;
    this.machineService.updateMachine(this.machine().id, { pauseNote: value });
  }

  updateName(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.machineService.updateMachine(this.machine().id, { name: value });
  }

  onInputChange(field: keyof MachineInputs, value: string) {
      this.machineService.updateMachineInput(this.machine().id, field, value);
  }

  onMaterialChange(field: keyof Material, value: number | null) {
      this.machineService.updateMachineMaterial(this.machine().id, field, value ?? 0);
  }
  
  updateMaterialType(event: Event) {
      const value = (event.target as HTMLSelectElement).value;
      this.machineService.updateMachine(this.machine().id, { materialType: value });
  }

  toggleDetails() {
    this.isDetailsOpen.update(v => !v);
  }

  toggleNotification() {
    const enabled = this.machine().notificationEnabled !== false;
    this.machineService.updateMachine(this.machine().id, { notificationEnabled: !enabled });
    if (!enabled && typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
        Notification.requestPermission();
    }
  }
  
  toggleChecklist() {
      this.isChecklistExpanded.update(v => !v);
  }

  toggleMachine() { 
      if(this.machine().status === 'bar') {
          this.machineService.reloadBar(this.machine().id);
      } else {
          this.machineService.toggleMachine(this.machine().id); 
      }
  }
  
  resetMachine() { 
    if (confirm(this.machineService.languageService.t().machine_card.reset_confirm)) {
      this.machineService.resetMachine(this.machine().id); 
    }
  }

  deleteMachine(event?: Event) {
      if(event) {
          event.stopPropagation();
      }
      if(confirm(this.machineService.languageService.t().machine_card.delete_confirm)) {
          this.machineService.removeMachine(this.machine().id);
      }
  }

  exportToJson() {
      const m = this.machine();
      const preset: PartPreset = {
          inputs: m.inputs,
          material: m.material,
          checklist: m.checklist
      };
      
      const dataStr = JSON.stringify(preset, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const cleanName = (m.note || 'machine_data').replace(/[^a-z0-9а-яё ]/gi, '_');
      const exportFileDefaultName = `${cleanName}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
  }
}
