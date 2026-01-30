
import { Component, ChangeDetectionStrategy, output, inject, signal, input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MachineService } from '../../services/machine.service';
import { DbService } from '../../services/db.service';
import { AuthService } from '../../services/auth.service';
import { ChecklistItem, PartPreset, Material } from '../../models/machine.model';
import { GoogleGenAI, Type } from "@google/genai";
import { NetworkService } from '../../services/network.service';

declare var XLSX: any;

@Component({
  selector: 'app-create-part-modal',
  templateUrl: './create-part-modal.component.html',
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreatePartModalComponent implements OnInit {
  // Input for editing existing data
  initialData = input<PartPreset | null>(null);
  
  closeModal = output<void>();
  machineService = inject(MachineService);
  dbService = inject(DbService);
  authService = inject(AuthService);
  networkService = inject(NetworkService);
  
  partName = signal('');
  isGenerating = signal(false);
  
  // Default structure
  checklist = signal<ChecklistItem[]>([
      { id: 1, name: 'Dimension 1', nominal: 0, tol_plus: 0.1, tol_minus: 0.1 }
  ]);
  
  // Basic inputs for preset
  qty = signal('100');
  min = signal('1');
  sec = signal('00');
  barTime = signal('40');

  // Material Defaults
  material = signal<Partial<Material>>({
      stockLen: 3000,
      partLen: 50,
      cutWidth: 3,
      barEndRem: 100
  });

  ngOnInit() {
      const data = this.initialData();
      if (data) {
          // If editing, load data
          this.qty.set(data.inputs.qty);
          this.min.set(data.inputs.min);
          this.sec.set(data.inputs.sec);
          this.barTime.set(data.inputs.barTime);
          this.checklist.set(data.checklist);
          if (data.material) {
              this.material.set({ ...this.material(), ...data.material });
          }
      }
  }
  
  generateName() {
      // Generates a part name like "Part_20231025"
      const date = new Date();
      const str = date.toISOString().slice(0,10).replace(/-/g, '');
      const time = date.toTimeString().slice(0,5).replace(':', '');
      this.partName.set(`Part_${str}_${time}`);
  }

  async generateWithAI() {
      const name = this.partName().trim();
      if (!name) { 
          alert(this.machineService.languageService.t().create_part.err_name); 
          return; 
      }
      if (!this.networkService.isOnline()) { 
          alert("Internet connection required for AI."); 
          return; 
      }

      this.isGenerating.set(true);
      try {
          const lang = this.machineService.languageService.currentLang() === 'uk' ? 'UKRAINIAN' : 'RUSSIAN';
          const ai = new GoogleGenAI({ apiKey: process.env['API_KEY'] });
          
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate technical specifications for a mechanical part named "${name}".
            OUTPUT LANGUAGE: ${lang}.
            1. Create a checklist of 3-5 critical dimensions (names, nominals in mm, tolerances).
            2. Estimate material settings: part length (mm), cut width (mm, usually 2-4), bar remainder (mm).
            `,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        checklist: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    nominal: { type: Type.NUMBER },
                                    tol_plus: { type: Type.NUMBER },
                                    tol_minus: { type: Type.NUMBER }
                                },
                                required: ['name', 'nominal', 'tol_plus', 'tol_minus']
                            }
                        },
                        material: {
                            type: Type.OBJECT,
                            properties: {
                                partLen: { type: Type.NUMBER },
                                cutWidth: { type: Type.NUMBER },
                                barEndRem: { type: Type.NUMBER }
                            }
                        }
                    }
                }
            }
          });

          const result = JSON.parse(response.text);
          
          if (result.checklist && Array.isArray(result.checklist)) {
              const newChecklist = result.checklist.map((item: any, idx: number) => ({
                  id: idx + 1,
                  name: item.name,
                  nominal: item.nominal,
                  tol_plus: item.tol_plus,
                  tol_minus: item.tol_minus
              }));
              this.checklist.set(newChecklist);
          }

          if (result.material) {
              this.material.update(m => ({
                  ...m,
                  partLen: result.material.partLen || m.partLen,
                  cutWidth: result.material.cutWidth || m.cutWidth,
                  barEndRem: result.material.barEndRem || m.barEndRem
              }));
          }

      } catch (e) {
          console.error(e);
          alert(this.machineService.languageService.t().checklist.gen_error);
      } finally {
          this.isGenerating.set(false);
      }
  }

  addParam() {
      const current = this.checklist();
      const newId = current.length > 0 ? Math.max(...current.map(i => i.id)) + 1 : 1;
      
      // Smart naming: "PartName 1", "PartName 2" if PartName is set, otherwise "Dimension N"
      let newName = `Dimension ${newId}`;
      const pName = this.partName().trim();
      if(pName) {
          newName = `${pName} ${newId}`;
      }

      this.checklist.update(list => [...list, { id: newId, name: newName, nominal: 0, tol_plus: 0.1, tol_minus: 0.1 }]);
  }

  removeParam(id: number) {
      this.checklist.update(list => list.filter(i => i.id !== id));
  }

  getPreset(): PartPreset {
      return {
          inputs: { qty: this.qty(), min: this.min(), sec: this.sec(), barTime: this.barTime() },
          material: this.material(),
          checklist: this.checklist()
      };
  }

  saveAndDownload() {
      const name = this.partName().trim();
      const t = this.machineService.languageService.t();
      if (!name) { alert(t.create_part.err_name); return; }
      
      if (!confirm(`${t.common.save} "${name}" & ${t.common.download}?`)) return;

      const preset = this.getPreset();
      // Local App DB (Session based)
      this.machineService.saveCustomPart(name, preset);
      // XLSX
      this.downloadXlsx(name, preset.checklist);
      
      alert(t.create_part.success);
      this.closeModal.emit();
  }
  
  saveToCloud() {
      const name = this.partName().trim();
      const t = this.machineService.languageService.t();
      if (!name) { alert(t.create_part.err_name); return; }

      const user = this.authService.currentUser();
      if (!user) return;

      if (!confirm(`${t.common.save} "${name}" -> ${t.header.cloud}?`)) return;

      const preset = this.getPreset();
      this.dbService.saveFile(name, preset, user.id);
      
      alert(t.create_part.success_cloud);
      this.closeModal.emit();
  }
  
  private downloadXlsx(name: string, checklist: ChecklistItem[]) {
      const data = checklist.map(item => ({
          'ID': item.id,
          'Dimension Name': item.name,
          'Nominal (mm)': item.nominal,
          'Tol (+)': item.tol_plus,
          'Tol (-)': item.tol_minus,
          'Min Limit': (item.nominal - item.tol_minus).toFixed(3),
          'Max Limit': (item.nominal + item.tol_plus).toFixed(3)
      }));
      
      const ws = XLSX.utils.json_to_sheet(data);
      const wscols = [{wch:5}, {wch:30}, {wch:12}, {wch:10}, {wch:10}, {wch:12}, {wch:12}];
      ws['!cols'] = wscols;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Checklist");
      
      const cleanName = name.replace(/[^a-z0-9а-яё ]/gi, '_');
      const fileName = `Checklist_${cleanName}.xlsx`;
      
      XLSX.writeFile(wb, fileName);
  }
}
