import { Component, ChangeDetectionStrategy, input, output, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HistoryItem } from '../../models/machine.model';
import { MachineService } from '../../services/machine.service';

declare var XLSX: any;

@Component({
  selector: 'app-history-modal',
  templateUrl: './history-modal.component.html',
  imports: [CommonModule, FormsModule],
})
export class HistoryModalComponent {
  history = input.required<HistoryItem[]>();
  closeModal = output<void>();
  machineService = inject(MachineService);

  // Filters
  filterMachine = signal<string>('all');
  filterType = signal<string>('all');
  sortOrder = signal<'asc' | 'desc'>('desc');

  // Unique lists for dropdowns
  uniqueMachines = computed(() => {
    const machines = new Set(this.history().map(h => h.machine));
    return Array.from(machines).sort((a, b) => Number(a) - Number(b));
  });

  filteredHistory = computed(() => {
    let data = [...this.history()];
    const m = this.filterMachine();
    const t = this.filterType();
    const order = this.sortOrder();

    if (m !== 'all') {
        data = data.filter(h => h.machine.toString() === m);
    }
    
    if (t !== 'all') {
        data = data.filter(h => h.type === t);
    }

    return data.sort((a, b) => {
        const parseDate = (d: string, t: string) => {
             const [day, month, year] = d.split('.').map(Number);
             const [hour, minute, second] = t.split(':').map(Number);
             return new Date(year, month - 1, day, hour, minute, second || 0).getTime();
        };
        
        const timeA = parseDate(a.date, a.time);
        const timeB = parseDate(b.date, b.time);
        
        return order === 'asc' ? timeA - timeB : timeB - timeA;
    });
  });

  getTypeColor(type: HistoryItem['type']): string {
    switch (type) {
        case 'pause': return 'bg-amber-500';
        case 'done': return 'bg-emerald-500';
        case 'work': return 'bg-indigo-500';
        case 'check': return 'bg-cyan-500';
        case 'bar': return 'bg-orange-500';
        case 'bar-reload': return 'bg-orange-400';
        case 'start': return 'bg-blue-500';
        default: return 'bg-indigo-500';
    }
  }
  
  getTypeLabel(type: string): string {
      const t = this.machineService.languageService.t().history.event;
      const map: Record<string, string> = {
          'start': t.start, 'pause': t.pause, 'done': t.done, 'check': t.check,
          'bar': t.bar, 'bar-reload': t.bar_reload, 'work': t.work, 'info': t.info
      };
      return map[type] || type;
  }

  toggleSort() {
      this.sortOrder.update(o => o === 'asc' ? 'desc' : 'asc');
  }

  clearHistory() {
      this.machineService.clearHistory();
  }

  downloadHistory() {
    const data = this.filteredHistory();
    const t = this.machineService.languageService.t();
    if (data.length === 0) {
        alert(t.history.no_data);
        return;
    }

    const exportData = data.map(item => ({
        'Machine': `${t.history.machine_prefix} #${item.machine}`,
        'Event': this.getTypeLabel(item.type || 'info'),
        'Date': item.date,
        'Time': item.time,
        'Qty': item.qty || '',
        'Remaining': item.remaining || '',
        'MK': item.mapNumber || '',
        'Note': item.note
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wscols = [
        {wch: 15}, {wch: 20}, {wch: 12}, {wch: 10}, {wch: 10}, {wch: 10}, {wch: 15}, {wch: 50}
    ];
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "History");
    const fileName = `cnc_report_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }
}
