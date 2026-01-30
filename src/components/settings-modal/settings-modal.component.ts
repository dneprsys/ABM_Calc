import { Component, ChangeDetectionStrategy, output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MachineService } from '../../services/machine.service';
import { AppSettings } from '../../models/machine.model';
import { Language } from '../../services/language.service';

@Component({
  selector: 'app-settings-modal',
  templateUrl: './settings-modal.component.html',
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsModalComponent implements OnInit {
  closeModal = output<void>();
  machineService = inject(MachineService);

  settings: AppSettings = {
      language: 'ru',
      telegramChatId: '',
      reportTime: '',
      notifications: { onDone: true, onPause: true, onCheck: false, onStart: true, onBar: true, onReminder: true },
      telegramEvents: { onStart: true, onPause: true, onDone: true, onBar: true, onCheck: true, onReminder: true }
  };

  machineIds = this.machineService.machineIds;

  ngOnInit() {
      this.settings = JSON.parse(JSON.stringify(this.machineService.settings()));
      if(!this.settings.telegramEvents) {
          this.settings.telegramEvents = { onStart: true, onPause: true, onDone: true, onBar: true, onCheck: true, onReminder: true };
      }
      if(!this.settings.language) {
          this.settings.language = 'ru';
      }
  }

  setLanguage(lang: Language) {
      this.settings.language = lang;
      this.machineService.languageService.setLanguage(lang);
  }

  save() {
      this.machineService.updateSettings(this.settings);
      this.closeModal.emit();
  }
  
  addMachine() {
      this.machineService.addNewMachine();
  }

  deleteMachine(id: number, event?: Event) {
      if(event) {
          event.stopPropagation();
          event.preventDefault();
      }
      const t = this.machineService.languageService.t();
      if(confirm(t.settings.delete_machine_confirm.replace('{{id}}', id.toString()))) {
          this.machineService.removeMachine(id);
      }
  }

  testTelegram() {
      this.machineService.testTelegram();
  }
}
