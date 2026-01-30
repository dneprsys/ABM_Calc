
import { Component, ChangeDetectionStrategy, output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MachineService } from '../../services/machine.service';

@Component({
  selector: 'app-report-modal',
  templateUrl: './report-modal.component.html',
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportModalComponent {
  closeModal = output<void>();
  machineService = inject(MachineService);
  t = this.machineService.languageService.t;
  
  startDate = signal<string>(new Date().toISOString().split('T')[0]);
  endDate = signal<string>(new Date().toISOString().split('T')[0]);
  
  isSending = signal(false);

  async generateReport() {
      this.isSending.set(true);
      const success = await this.machineService.sendExcelReportToTelegram(this.startDate(), this.endDate());
      this.isSending.set(false);
      
      if(success) {
          alert(this.t().msg.report_sent);
          this.closeModal.emit();
      }
  }
}
