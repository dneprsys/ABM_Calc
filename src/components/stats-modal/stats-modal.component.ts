
import { Component, ChangeDetectionStrategy, output, AfterViewInit, ElementRef, viewChild, OnDestroy, inject, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../services/language.service';
import { MachineService } from '../../services/machine.service';

declare var ApexCharts: any;

@Component({
  selector: 'app-stats-modal',
  templateUrl: './stats-modal.component.html',
  imports: [CommonModule, FormsModule],
})
export class StatsModalComponent implements AfterViewInit, OnDestroy {
  closeModal = output<void>();
  
  chartProductionRef = viewChild<ElementRef>('chartProduction');
  chartDowntimeRef = viewChild<ElementRef>('chartDowntime');
  chartMaterialRef = viewChild<ElementRef>('chartMaterial');
  chartMachineDistRef = viewChild<ElementRef>('chartMachineDist');
  
  langService = inject(LanguageService);
  machineService = inject(MachineService);
  t = this.langService.t;
  
  // Date Range (Defaults to last 7 days)
  startDate = signal<string>(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  endDate = signal<string>(new Date().toISOString().split('T')[0]);

  // Computed Summary Data
  summary = computed(() => {
      const history = this.filteredHistory();
      let totalParts = 0;
      let totalMaterial = 0;
      const machineCounts: Record<string, number> = {};

      history.forEach(h => {
          if (h.type === 'done' || h.type === 'work') {
              const qty = parseInt(h.qty) || 0;
              totalParts += qty;
              
              // Count for top machine
              machineCounts[h.machine] = (machineCounts[h.machine] || 0) + qty;

              // Material estimation (rough)
              const m = this.machineService.machines()[h.machine];
              if (m) {
                  const usage = (qty * (m.material.partLen + m.material.cutWidth)) / 1000;
                  totalMaterial += usage;
              }
          }
      });

      let topMachine = '-';
      let maxCount = 0;
      for(const [id, count] of Object.entries(machineCounts)) {
          if (count > maxCount) {
              maxCount = count;
              topMachine = `St #${id}`;
              const mName = this.machineService.machines()[parseInt(id)]?.name;
              if(mName) topMachine = mName;
          }
      }

      return { totalParts, materialUsage: totalMaterial, topMachine };
  });

  private charts: any[] = [];

  constructor() {
      // Re-render charts when dates change
      effect(() => {
          this.startDate();
          this.endDate();
          // Defer render to ensure view is ready
          setTimeout(() => this.renderCharts(), 50);
      });
  }

  ngAfterViewInit() {
    this.renderCharts();
  }

  // Filter history by date range
  private filteredHistory() {
      const start = new Date(this.startDate()).getTime();
      const end = new Date(this.endDate()).getTime() + (24 * 60 * 60 * 1000); // End of day
      
      return this.machineService.historyLog().filter(h => {
          const [day, month, year] = h.date.split('.').map(Number);
          const itemTime = new Date(year, month - 1, day).getTime();
          return itemTime >= start && itemTime < end;
      });
  }

  renderCharts() {
    this.charts.forEach(c => c.destroy());
    this.charts = [];

    const history = this.filteredHistory();
    const machines = this.machineService.machines();

    // 1. Production Over Time
    const prodByDate: Record<string, number> = {};
    // Initialize dates in range
    let curr = new Date(this.startDate());
    const end = new Date(this.endDate());
    while(curr <= end) {
        prodByDate[curr.toLocaleDateString()] = 0;
        curr.setDate(curr.getDate() + 1);
    }

    history.forEach(h => {
        if ((h.type === 'done' || h.type === 'work') && prodByDate[h.date] !== undefined) {
            prodByDate[h.date] += (parseInt(h.qty) || 0);
        }
    });
    
    const dates = Object.keys(prodByDate);
    const prodValues = Object.values(prodByDate);

    // 2. Downtime Reasons
    const downtimeReasons: Record<string, number> = {};
    history.filter(h => h.type === 'pause').forEach(h => {
        let reason = 'Прочее';
        if (h.note.includes(':')) {
            const parts = h.note.split(':');
            if (parts.length > 1) {
                reason = parts[1].split('(')[0].trim();
            }
        }
        downtimeReasons[reason] = (downtimeReasons[reason] || 0) + 1;
    });

    // 3. Machine Distribution (Pie)
    const machineDist: Record<string, number> = {};
    history.forEach(h => {
        if (h.type === 'done' || h.type === 'work') {
            const mName = machines[h.machine]?.name || `St #${h.machine}`;
            machineDist[mName] = (machineDist[mName] || 0) + (parseInt(h.qty) || 0);
        }
    });

    // 4. Material Usage
    const materialUsage: Record<string, number> = {};
    history.filter(h => h.type === 'done').forEach(h => {
        const m = machines[h.machine];
        if (m) {
            const matName = m.materialType || 'Сталь';
            const qty = parseInt(h.qty) || 0;
            const usageMeters = (qty * (m.material.partLen + m.material.cutWidth)) / 1000; 
            materialUsage[matName] = (materialUsage[matName] || 0) + usageMeters;
        }
    });

    // --- RENDER ---

    if (this.chartProductionRef()) {
        const optProd = this.getBaseOptions('area', [{ name: 'Деталей', data: prodValues }], dates, '#6366f1');
        const c1 = new ApexCharts(this.chartProductionRef()!.nativeElement, optProd);
        c1.render();
        this.charts.push(c1);
    }

    if (this.chartDowntimeRef()) {
        const optDown = {
            chart: { type: 'donut', height: '100%', foreColor: '#94a3b8', background: 'transparent' },
            series: Object.values(downtimeReasons),
            labels: Object.keys(downtimeReasons),
            stroke: { show: false },
            legend: { position: 'bottom' },
            tooltip: { theme: 'dark' },
            dataLabels: { enabled: true },
            colors: ['#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6']
        };
        const c2 = new ApexCharts(this.chartDowntimeRef()!.nativeElement, optDown);
        c2.render();
        this.charts.push(c2);
    }

    if (this.chartMachineDistRef()) {
        const optDist = {
            chart: { type: 'pie', height: '100%', foreColor: '#94a3b8', background: 'transparent' },
            series: Object.values(machineDist),
            labels: Object.keys(machineDist),
            stroke: { show: false },
            legend: { position: 'bottom' },
            tooltip: { theme: 'dark' },
            dataLabels: { enabled: true, dropShadow: { enabled: false } }
        };
        const c3 = new ApexCharts(this.chartMachineDistRef()!.nativeElement, optDist);
        c3.render();
        this.charts.push(c3);
    }

    if (this.chartMaterialRef()) {
        const optMat = this.getBaseOptions('bar', [{ name: 'Метров', data: Object.values(materialUsage).map(v => parseFloat(v.toFixed(2))) }], Object.keys(materialUsage), '#10b981');
        const c4 = new ApexCharts(this.chartMaterialRef()!.nativeElement, optMat);
        c4.render();
        this.charts.push(c4);
    }
  }

  getBaseOptions(type: string, series: any[], categories: string[], color: string) {
      return {
        chart: { type: type, height: '100%', toolbar: { show: false }, foreColor: '#94a3b8', background: 'transparent', zoom: { enabled: false } },
        series: series,
        xaxis: {
            categories: categories,
            labels: { style: { colors: '#94a3b8' } },
            axisBorder: { show: false },
            axisTicks: { show: false }
        },
        grid: { borderColor: '#334155' },
        fill: { colors: [color], opacity: type === 'area' ? 0.3 : 1 },
        stroke: { curve: 'smooth', width: 2, colors: [color] },
        dataLabels: { enabled: false },
        tooltip: { theme: 'dark' },
        plotOptions: { bar: { borderRadius: 4, horizontal: false } }
      };
  }

  ngOnDestroy() {
    this.charts.forEach(c => c.destroy());
  }
}
