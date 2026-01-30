
import { Component, ChangeDetectionStrategy, input, output, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GoogleGenAI, Type } from "@google/genai";
import { Machine, ChecklistItem } from '../../models/machine.model';
import { MachineService } from '../../services/machine.service';
import { NetworkService } from '../../services/network.service';
import { DbService } from '../../services/db.service';

@Component({
  selector: 'app-checklist-modal',
  templateUrl: './checklist-modal.component.html',
  imports: [CommonModule, FormsModule],
})
export class ChecklistModalComponent implements OnInit {
  machine = input.required<Machine>();
  closeModal = output<void>();

  machineService = inject(MachineService);
  networkService = inject(NetworkService);
  dbService = inject(DbService);
  
  checklistTemplate: ChecklistItem[] = [];
  measurements: (string|number)[] = [];
  
  searchTerm: string = '';
  mapNumber: string = '';
  isGenerating: boolean = false;
  
  comment: string = '';
  isCommentVisible: boolean = false;

  lastCheckTimeDisplay = computed(() => {
     const t = this.machine().lastChecklistSaveTime;
     if (!t) return null;
     return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });

  ngOnInit() {
    // Use the machine's specific checklist if available, otherwise fallback
    this.checklistTemplate = this.machine().checklist && this.machine().checklist.length > 0
        ? JSON.parse(JSON.stringify(this.machine().checklist)) // Deep copy to allow editing without immediate save
        : this.machineService.getChecklistTemplate();
        
    this.measurements = new Array(this.checklistTemplate.length).fill('');
    if (this.machine().note) this.searchTerm = this.machine().note;
    if (this.machine().mapNumber) this.mapNumber = this.machine().mapNumber || '';
  }

  async generateChecklist() {
    if (!this.searchTerm.trim()) return;
    
    // 1. Try finding in Database first (Cloud Folder)
    const localFile = this.dbService.getFileByName(this.searchTerm.trim());
    if (localFile) {
        this.checklistTemplate = JSON.parse(JSON.stringify(localFile.data.checklist));
        this.measurements = new Array(this.checklistTemplate.length).fill('');
        return;
    }

    // 2. Fallback to AI
    if (!this.networkService.isOnline()) {
        alert("No local file found. Internet connection required for AI generation.");
        return;
    }

    this.isGenerating = true;
    try {
        const lang = this.machineService.languageService.currentLang() === 'uk' ? 'UKRAINIAN' : 'RUSSIAN';
        const ai = new GoogleGenAI({ apiKey: process.env['API_KEY'] });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate a manufacturing quality control checklist for a mechanical part described as: "${this.searchTerm}".
            OUTPUT LANGUAGE: ${lang}.
            Provide 3 to 6 critical physical dimensions or checks (e.g., Diameter, Length).
            For 'nominal', provide a standard numeric value in mm if the part is standard. If unknown, estimate reasonable values.
            For 'tol_plus' and 'tol_minus', provide typical machining tolerances (e.g. 0.05, 0.1).`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING, description: "Name of the dimension" },
                            nominal: { type: Type.NUMBER, description: "Nominal value in mm" },
                            tol_plus: { type: Type.NUMBER, description: "Positive tolerance" },
                            tol_minus: { type: Type.NUMBER, description: "Negative tolerance (positive number)" }
                        },
                        required: ['name', 'nominal', 'tol_plus', 'tol_minus']
                    }
                }
            }
        });

        const items = JSON.parse(response.text);
        if (Array.isArray(items) && items.length > 0) {
            this.checklistTemplate = items.map((item: any, index: number) => ({
                id: index + 1, name: item.name, nominal: item.nominal, tol_plus: item.tol_plus, tol_minus: item.tol_minus
            }));
            this.measurements = new Array(this.checklistTemplate.length).fill('');
        }
    } catch (e) {
        alert(this.machineService.languageService.t().checklist.gen_error);
    } finally {
        this.isGenerating = false;
    }
  }

  validateQC(target: EventTarget | null, min: number, max: number) {
    if (!target) return;
    const inputEl = target as HTMLInputElement;
    const value = inputEl.value;
    inputEl.classList.remove('border-emerald-500', 'bg-emerald-500/20', 'border-red-500', 'bg-red-500/20');
    inputEl.classList.add('border-slate-600');
    if (!value) return;
    const val = parseFloat(value);
    const minFixed = parseFloat(min.toFixed(3));
    const maxFixed = parseFloat(max.toFixed(3));
    inputEl.classList.remove('border-slate-600');
    if (val >= minFixed && val <= maxFixed) {
      inputEl.classList.add('border-emerald-500', 'bg-emerald-500/20');
    } else {
      inputEl.classList.add('border-red-500', 'bg-red-500/20');
    }
  }

  toggleComment() {
      this.isCommentVisible = !this.isCommentVisible;
  }

  saveChecklist() {
    // Save metadata
    this.machineService.updateMachine(this.machine().id, { mapNumber: this.mapNumber });
    
    // Update the machine's checklist template with any edits or AI generated changes
    this.machineService.updateMachine(this.machine().id, { checklist: this.checklistTemplate });

    // Save the measurements to history
    this.machineService.saveChecklist(this.machine().id, this.measurements, this.checklistTemplate, this.isCommentVisible ? this.comment : undefined);
    
    this.closeModal.emit();
  }
}
