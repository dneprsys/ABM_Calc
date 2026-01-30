
import { Component, ChangeDetectionStrategy, output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DbService } from '../../services/db.service';
import { AuthService } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';
import { PartPreset, ChecklistItem } from '../../models/machine.model';

declare var XLSX: any;

@Component({
  selector: 'app-cloud-files-modal',
  templateUrl: './cloud-files-modal.component.html',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CloudFilesModalComponent {
  closeModal = output<void>();
  editFile = output<PartPreset>(); 
  createFile = output<void>();

  dbService = inject(DbService);
  authService = inject(AuthService);
  langService = inject(LanguageService);
  t = this.langService.t;
  
  isUploading = signal(false);
  activeTab = signal<'all' | 'user'>('all');

  get files() {
      let all = this.dbService.getFiles().sort((a,b) => b.updatedAt - a.updatedAt);
      
      if (this.activeTab() === 'user') {
          const uid = this.authService.currentUser()?.id;
          if (uid) {
              all = all.filter(f => f.ownerId === uid);
          } else {
              return [];
          }
      }
      
      return all;
  }

  onCreate() {
      this.createFile.emit();
  }

  deleteFile(id: string) {
      // Allow user to delete their own files, or mod/admin to delete any
      const file = this.dbService.getFiles().find(f => f.id === id);
      if (!file) return;
      
      const user = this.authService.currentUser();
      const canDelete = this.authService.isModerator() || (user && file.ownerId === user.id);

      if (!canDelete) return;

      if(confirm(this.t().common.delete + '?')) {
          this.dbService.deleteFile(id);
      }
  }

  onEdit(data: PartPreset) {
      this.editFile.emit(data);
  }

  onDownload(name: string, preset: PartPreset) {
      const checklist = preset.checklist;
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

  uploadFile(fileInput: HTMLInputElement) {
      fileInput.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    const fileName = file.name.replace(/\.[^/.]+$/, ""); // remove extension
    
    this.isUploading.set(true);

    const reader = new FileReader();
    reader.onload = (e: any) => {
        try {
            if (file.name.endsWith('.json')) {
                 const data = JSON.parse(e.target.result);
                 if (data.checklist && Array.isArray(data.checklist)) {
                     this.dbService.saveFile(fileName, data, this.authService.currentUser()!.id);
                     alert(this.t().cloud.upload_success);
                 } else {
                     throw new Error('Invalid JSON format');
                 }
                 return;
            }

            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const json = XLSX.utils.sheet_to_json(worksheet);

            if (!json || json.length === 0) throw new Error('Empty XLSX');

            const checklist: ChecklistItem[] = json.map((row: any, index: number) => ({
                id: row['ID'] || index + 1,
                name: row['Dimension Name'] || row['Name'] || `Dim ${index+1}`,
                nominal: parseFloat(row['Nominal (mm)'] || row['Nominal']) || 0,
                tol_plus: parseFloat(row['Tol (+)'] || row['Tol +']) || 0.1,
                tol_minus: parseFloat(row['Tol (-)'] || row['Tol -']) || 0.1
            }));

            if (checklist.length === 0) throw new Error('No data found in XLSX');

            const preset: PartPreset = {
                inputs: { qty: '100', min: '1', sec: '00', barTime: '40' }, 
                material: { stockLen: 3000, partLen: 10, cutWidth: 2, barEndRem: 100 }, 
                checklist: checklist
            };

            this.dbService.saveFile(fileName, preset, this.authService.currentUser()!.id);
            alert(this.t().cloud.upload_success);

        } catch (err) {
            console.error(err);
            alert(this.t().cloud.upload_err);
        } finally {
             this.isUploading.set(false);
             input.value = ''; 
        }
    };

    if (file.name.endsWith('.json')) {
        reader.readAsText(file);
    } else {
        reader.readAsArrayBuffer(file);
    }
  }
}
