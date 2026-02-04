
import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { Machine, HistoryItem, ChecklistItem, MachineInputs, Material, AppSettings, PartPreset } from '../models/machine.model';
import { LanguageService } from './language.service';
import { DbService } from './db.service';
import { AuthService } from './auth.service';
import { NetworkService } from './network.service';

declare var XLSX: any;

@Injectable({
  providedIn: 'root',
})
export class MachineService {
  private readonly MACHINES_KEY = 'cnc_machines_v3';
  private readonly HISTORY_KEY = 'cnc_history_v3';
  private readonly SETTINGS_KEY = 'cnc_settings_v1';
  private readonly OFFLINE_QUEUE_KEY = 'cnc_offline_queue_v1';
  
  languageService = inject(LanguageService);
  dbService = inject(DbService);
  authService = inject(AuthService);
  networkService = inject(NetworkService);

  machines = signal<{ [id: number]: Machine }>({});
  historyLog = signal<HistoryItem[]>([]);
  
  settings = signal<AppSettings>({
      language: 'ru',
      telegramBotToken: '',
      telegramChatId: '',
      reportTime: '',
      notifications: { onDone: true, onPause: true, onCheck: false, onStart: true, onBar: true, onReminder: true },
      telegramEvents: { onStart: true, onPause: true, onDone: true, onBar: true, onCheck: true, onReminder: true }
  });
  
  // Offline Queue for Telegram Messages
  private offlineQueue = signal<string[]>([]);
  
  machineIds = computed(() => Object.keys(this.machines()).map(Number));
  
  // Fetch available parts dynamically from DB
  partNames = computed(() => {
     return this.dbService.getFiles().map(f => f.name).sort();
  });
  
  private audioContext: AudioContext | null = null;
  private lastTgMsg: { text: string, time: number } | null = null;
  private isProcessingQueue = false;

  constructor() {
    this.loadData();
    
    effect(() => {
      localStorage.setItem(this.MACHINES_KEY, JSON.stringify(this.machines()));
    });
    effect(() => {
        localStorage.setItem(this.HISTORY_KEY, JSON.stringify(this.historyLog()));
    });
    effect(() => {
        localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(this.settings()));
    });
    effect(() => {
        localStorage.setItem(this.OFFLINE_QUEUE_KEY, JSON.stringify(this.offlineQueue()));
    });

    // Monitor Network Status to flush queue
    effect(() => {
        if (this.networkService.isOnline() && this.offlineQueue().length > 0) {
            this.processOfflineQueue();
        }
    });
    
    setInterval(() => this.globalTick(), 1000);

    if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
        Notification.requestPermission();
    }
  }

  private initAudio() {
      if (typeof window !== 'undefined') {
          if (!this.audioContext) {
              this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          }
          if (this.audioContext.state === 'suspended') {
              this.audioContext.resume().catch(() => {});
          }
      }
  }

  private playAlertSound() {
      this.initAudio();
      if (!this.audioContext) return;
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      osc.connect(gain);
      gain.connect(this.audioContext.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, this.audioContext.currentTime);
      osc.frequency.linearRampToValueAtTime(880, this.audioContext.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.5);
      osc.start();
      osc.stop(this.audioContext.currentTime + 0.5);
  }

  private loadData(): void {
    const storedMachines = localStorage.getItem(this.MACHINES_KEY);
    const storedHistory = localStorage.getItem(this.HISTORY_KEY);
    const storedSettings = localStorage.getItem(this.SETTINGS_KEY);
    const storedQueue = localStorage.getItem(this.OFFLINE_QUEUE_KEY);
    const now = Date.now();

    if (storedMachines) {
      const parsed = JSON.parse(storedMachines);
      let updatedMachines = { ...parsed };
      
      for (const key in updatedMachines) {
          const m = updatedMachines[key] as Machine;
          if (m.material.barEndRem === undefined) m.material.barEndRem = 300;
          if (m.qcTimer === undefined) m.qcTimer = 0;
          if (m.checklist === undefined) m.checklist = this.getChecklistTemplate();
          if (m.notificationEnabled === undefined) m.notificationEnabled = true;
          
          // "Catch Up" Logic: Simulate missed time while browser was closed
          if (m.lastActivityTime) {
              const delta = (now - m.lastActivityTime) / 1000;
              
              if (delta > 0) {
                  // Catch up QC Timer
                  if (m.qcTimer > 0) {
                      const newQc = Math.max(0, m.qcTimer - delta);
                      if (m.qcTimer > 0 && newQc <= 0) {
                          // QC Expired while closed
                          m.qcTimer = 0;
                          this.sendTelegramQcAlert(m.id, m.note, m.mapNumber || 'N/A');
                      } else {
                          m.qcTimer = newQc;
                      }
                  }

                  // Catch up Work Timer
                  if (m.status === 'work') {
                      const newTimeLeft = m.timeLeft - delta;
                      const newBarLeft = m.barLeft - delta;

                      if (newTimeLeft <= 0) {
                          // Job finished while closed
                          m.status = 'done';
                          m.timeLeft = 0;
                          m.finishTime = now - (Math.abs(newTimeLeft) * 1000);
                          // Trigger Done Notification immediately
                          this.sendTelegramNotification(m.id, 'done'); 
                      } else if (newBarLeft <= 0) {
                          // Bar finished while closed
                          m.status = 'bar';
                          m.timeLeft = newTimeLeft; 
                          m.barLeft = 0;
                          this.sendTelegramNotification(m.id, 'bar');
                      } else {
                          m.timeLeft = newTimeLeft;
                          m.barLeft = newBarLeft;
                      }
                  }
              }
          }
          m.lastActivityTime = now;
      }
      this.machines.set(updatedMachines);
    }
    
    if (storedHistory) {
      this.historyLog.set(JSON.parse(storedHistory));
    }
    if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        if (parsedSettings.telegramBotToken === undefined) {
            parsedSettings.telegramBotToken = '';
        }
        if(!parsedSettings.telegramEvents) {
            parsedSettings.telegramEvents = { onStart: true, onPause: true, onDone: true, onBar: true, onCheck: true, onReminder: true };
        }
        if(parsedSettings.language) {
            this.languageService.setLanguage(parsedSettings.language);
        }
        this.settings.set(parsedSettings);
    }
    if (storedQueue) {
        this.offlineQueue.set(JSON.parse(storedQueue));
    }

    if (this.machineIds().length === 0) {
      this.addNewMachine();
    }
  }

  updateSettings(newSettings: AppSettings) {
      this.settings.set(newSettings);
      if(newSettings.language) {
          this.languageService.setLanguage(newSettings.language);
      }
      // If a user is logged in, sync the TG chat id to their profile
      const user = this.authService.currentUser();
      if (user && newSettings.telegramChatId) {
          this.dbService.updateUser({ ...user, telegramChatId: newSettings.telegramChatId });
      }
  }

  addNewMachine(): void {
    const ids = this.machineIds();
    const newId = ids.length > 0 ? Math.max(...ids) + 1 : 1;
    const lang = this.languageService.currentLang();
    const machineName = lang === 'uk' ? `Верстат #${newId}` : `Станок #${newId}`;
    
    const newMachine: Machine = {
      id: newId,
      name: machineName,
      mapNumber: '',
      materialType: 'Сталь',
      status: 'idle',
      timeLeft: 0,
      totalTime: 0,
      barLeft: 0,
      note: '',
      material: { stockLen: 3000, partLen: 10, cutWidth: 0.15, barEndRem: 300, partsPerBar: 0, barsNeeded: 0 },
      inputs: { qty: '', min: '', sec: '', barTime: '40' },
      qcTimer: 0,
      checklist: this.getChecklistTemplate(),
      notificationEnabled: true,
      lastActivityTime: Date.now()
    };
    
    this.machines.update(currentMachines => ({ ...currentMachines, [newId]: newMachine }));
  }

  removeMachine(id: number): void {
      this.machines.update(current => {
          const updated: { [key: number]: Machine } = {};
          for (const key in current) {
              if (parseInt(key, 10) !== id) {
                  updated[key] = current[key];
              }
          }
          return updated;
      });
  }
  
  saveCustomPart(name: string, preset: PartPreset) {
      // Forward to DB service
  }

  loadPartPreset(id: number, partName: string): void {
      const file = this.dbService.getFileByName(partName);
      if (file) {
          const preset = file.data;
          this.machines.update(machines => {
             const m = machines[id];
             if (!m) return machines;
             const newMaterial = { ...m.material, ...preset.material };
             let newMachine: Machine = {
                 ...m,
                 note: partName,
                 inputs: { ...preset.inputs },
                 material: newMaterial,
                 checklist: [...preset.checklist]
             };
             newMachine = this.recalculateMaterial(newMachine);
             return { ...machines, [id]: newMachine };
          });
      }
  }

  updateMachine(id: number, updatedProps: Partial<Machine>): void {
    this.machines.update(machines => {
      if (machines[id]) {
        return { ...machines, [id]: { ...machines[id], ...updatedProps } };
      }
      return machines;
    });
  }

  updateMachineInput(id: number, field: keyof MachineInputs, value: string) {
    this.machines.update(machines => {
      const machine = machines[id];
      if (machine) {
        const newInputs = { ...machine.inputs, [field]: value };
        let newMachine = { ...machine, inputs: newInputs };
        if (field === 'qty') {
            newMachine = this.recalculateMaterial(newMachine);
        }
        if (field === 'min' || field === 'sec') {
             newMachine = this.recalculateMaterial(newMachine);
        }
        return { ...machines, [id]: newMachine };
      }
      return machines;
    });
  }

  updateMachineMaterial(id: number, field: keyof Material, value: number) {
     this.machines.update(machines => {
        const machine = machines[id];
        if (machine) {
          const newMaterial = { ...machine.material, [field]: value };
          let newMachine = { ...machine, material: newMaterial };
          newMachine = this.recalculateMaterial(newMachine);
          return { ...machines, [id]: newMachine };
        }
        return machines;
    });
  }

  private recalculateMaterial(machine: Machine): Machine {
      const { material, inputs } = machine;
      const stock = material.stockLen;
      const onePart = material.partLen + material.cutWidth;
      const rem = material.barEndRem ?? 300;
      const qty = parseInt(inputs.qty, 10) || 0;
      const usableStock = stock - rem;
      
      if (usableStock > 0 && onePart > 0) {
          material.partsPerBar = Math.floor(usableStock / onePart);
          material.barsNeeded = material.partsPerBar > 0 ? Math.ceil(qty / material.partsPerBar) : 0;
          const min = parseInt(inputs.min, 10) || 0;
          const sec = parseInt(inputs.sec, 10) || 0;
          const cycleTimeSec = min * 60 + sec;
          const totalBarTimeSec = material.partsPerBar * cycleTimeSec;
          if(totalBarTimeSec > 0) {
             inputs.barTime = (Math.ceil(totalBarTimeSec / 60)).toString();
          }
      } else {
          material.partsPerBar = 0;
          material.barsNeeded = 0;
      }
      return { ...machine, material: { ...material }, inputs: { ...inputs } };
  }
  
  private calculateRemaining(machine: Machine): number {
    const min = parseInt(machine.inputs.min, 10) || 0;
    const sec = parseInt(machine.inputs.sec, 10) || 0;
    const cycleTime = min * 60 + sec;
    if (cycleTime <= 0) return 0;
    return Math.ceil(machine.timeLeft / cycleTime);
  }

  toggleMachine(id: number): void {
    this.initAudio();
    const machine = this.machines()[id];
    if (!machine) return;
    const t = this.languageService.t();

    if (machine.status === 'idle' || machine.status === 'done') {
      const qty = parseInt(machine.inputs.qty, 10) || 0;
      const min = parseInt(machine.inputs.min, 10) || 0;
      const sec = parseInt(machine.inputs.sec, 10) || 0;
      if (qty <= 0) {
          alert(t.machine_card.enter_qty);
          return;
      }
      const totalTime = qty * (min * 60 + sec);
      const barTime = (parseInt(machine.inputs.barTime, 10) || 0) * 60;
      
      // Assign operator on start
      const currentUser = this.authService.currentUser();
      
      this.updateMachine(id, {
          status: 'work',
          operatorId: currentUser ? currentUser.id : undefined,
          totalTime: totalTime,
          timeLeft: totalTime,
          barLeft: machine.barLeft <= 0 ? barTime : machine.barLeft,
          finishTime: undefined,
          lastActivityTime: Date.now()
      });
      
      const newHistoryItem: HistoryItem = {
        machine: id,
        note: `${t.history.event.start}: ${machine.note || '---'}`,
        qty: `${qty}`,
        remaining: qty,
        mapNumber: machine.mapNumber,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString(),
        type: 'start'
      };
      this.historyLog.update(log => [newHistoryItem, ...log]);
      
      this.sendTelegramNotification(id, 'start');
      this.sendBrowserNotification(id, t.msg.start_browser_title, t.msg.start_browser_body.replace('{{qty}}', qty.toString()));

    } else if (machine.status === 'work') {
      this.updateMachine(id, { status: 'pause', pauseStartTime: Date.now(), pauseNote: '', lastActivityTime: Date.now() });
    } else if (machine.status === 'pause') {
      if (!machine.pauseNote || machine.pauseNote.trim() === '') {
          alert(t.machine_card.enter_pause_reason);
          return;
      }
      const durationMs = machine.pauseStartTime ? Date.now() - machine.pauseStartTime : 0;
      const minutes = Math.floor(durationMs / 60000);
      const seconds = Math.floor((durationMs % 60000) / 1000);
      const durationStr = minutes > 0 ? `${minutes} ${t.machine_card.min}` : `${seconds} ${t.machine_card.sec}`;
      const pauseReason = machine.pauseNote;
      
      const remaining = this.calculateRemaining(machine);
      const newHistoryItem: HistoryItem = {
        machine: id,
        note: `${t.history.event.pause}: ${pauseReason} (${durationStr})`,
        qty: '-',
        remaining: remaining,
        mapNumber: machine.mapNumber,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString(),
        type: 'pause'
      };
      
      this.historyLog.update(log => [newHistoryItem, ...log]);
      this.updateMachine(id, { status: 'work', pauseStartTime: undefined, pauseNote: undefined, lastActivityTime: Date.now() });
      
      // Encode extra data for the detailed telegram message
      const extraData = JSON.stringify({ reason: pauseReason, duration: durationStr });
      this.sendTelegramNotification(id, 'pause', extraData);
      
      this.sendBrowserNotification(id, t.msg.pause_browser_title, t.msg.pause_browser_body.replace('{{reason}}', pauseReason));
    }
  }

  reloadBar(id: number): void {
    const machine = this.machines()[id];
    if (!machine) return;
    const t = this.languageService.t();
    const barTime = (parseInt(machine.inputs.barTime, 10) || 0) * 60;
    
    const remaining = this.calculateRemaining(machine);
    const newHistoryItem: HistoryItem = {
        machine: id,
        note: t.history.event.bar_reload,
        qty: '-',
        remaining: remaining,
        mapNumber: machine.mapNumber,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString(),
        type: 'bar-reload'
    };
    this.historyLog.update(log => [newHistoryItem, ...log]);

    this.updateMachine(id, {
        barLeft: barTime,
        status: machine.status === 'bar' ? 'work' : machine.status,
        lastActivityTime: Date.now()
    });
  }

  resetMachine(id: number): void {
    // Clear operator on reset so others can see/use it
    this.updateMachine(id, { status: 'idle', operatorId: undefined, timeLeft: 0, barLeft: 0, totalTime: 0, finishTime: undefined });
  }

  resetQcTimer(id: number): void {
      this.updateMachine(id, { qcTimer: 3600, lastActivityTime: Date.now() });
  }

  private globalTick(): void {
    const s = this.settings();
    const now = Date.now();
    
    if (s.reportTime && s.telegramChatId) {
        const currentTime = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;
        const todayStr = new Date().toLocaleDateString();

        if (currentTime === s.reportTime && s.lastReportDate !== todayStr) {
             this.sendTelegramReport().then(ok => {
                 if (ok) {
                     this.updateSettings({ ...s, lastReportDate: todayStr });
                 }
             });
        }
    }
    const t = this.languageService.t();

    this.machines.update(currentMachines => {
        let hasChanges = false;
        const updatedMachines = { ...currentMachines };

        for (const idStr in currentMachines) {
            const id = parseInt(idStr, 10);
            const m = currentMachines[id];
            
            // Calculate accurate delta time since last update
            const lastTime = m.lastActivityTime || now;
            const deltaSeconds = (now - lastTime) / 1000;
            
            // Update timestamp
            updatedMachines[id] = { ...updatedMachines[id], lastActivityTime: now };
            hasChanges = true;

            if (m.qcTimer > 0) {
                const newQcTimer = Math.max(0, m.qcTimer - deltaSeconds);
                updatedMachines[id] = { ...updatedMachines[id], qcTimer: newQcTimer };
                
                if (m.qcTimer > 0 && newQcTimer <= 0) {
                    this.sendTelegramQcAlert(id, m.note || t.msg.not_spec, m.mapNumber || t.msg.not_spec);
                    this.sendBrowserNotification(id, t.msg.qc_browser_title, t.msg.qc_browser_body);
                }
            }

            if (m.status === 'work') {
                const newTimeLeft = m.timeLeft - deltaSeconds;
                const newBarLeft = m.barLeft - deltaSeconds;
                let newStatus: Machine['status'] = m.status;

                if (newTimeLeft <= 0) {
                    newStatus = 'done';
                    // Calculate accurate finish time
                    const estimatedFinishTime = now - (Math.abs(newTimeLeft) * 1000);
                    updatedMachines[id] = { 
                        ...updatedMachines[id], 
                        status: 'done', // Ensure status is updated to stop timer
                        finishTime: estimatedFinishTime, 
                        timeLeft: 0, 
                        barLeft: Math.max(0, newBarLeft) 
                    };
                    this.finishJob(id);
                } else if (newBarLeft <= 0) { 
                     newStatus = 'bar'; 
                     updatedMachines[id] = { ...updatedMachines[id], status: newStatus, timeLeft: newTimeLeft, barLeft: 0 };

                     const remaining = this.calculateRemaining(updatedMachines[id]);
                     const newHistoryItem: HistoryItem = {
                        machine: id,
                        note: t.history.event.bar,
                        qty: '-',
                        remaining: remaining,
                        mapNumber: m.mapNumber,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        date: new Date().toLocaleDateString(),
                        type: 'bar'
                     };
                     this.historyLog.update(log => [newHistoryItem, ...log]);

                     this.sendTelegramNotification(id, 'bar');
                     this.sendBrowserNotification(id, t.msg.bar_browser_title, t.msg.bar_browser_body);
                     this.playAlertSound();
                } else {
                    updatedMachines[id] = { ...updatedMachines[id], timeLeft: newTimeLeft, barLeft: newBarLeft };
                }
            }
        }
        return hasChanges ? updatedMachines : currentMachines;
    });
  }

  private finishJob(id: number): void {
    const machine = this.machines()[id];
    if (!machine) return;
    const t = this.languageService.t();

    const newHistoryItem: HistoryItem = {
      machine: id,
      note: machine.note || `Станок #${id}`,
      qty: machine.inputs.qty,
      remaining: 0,
      mapNumber: machine.mapNumber,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString(),
      type: 'done'
    };
    
    this.historyLog.update(log => [newHistoryItem, ...log]);
    
    this.sendTelegramNotification(id, 'done');
    this.sendBrowserNotification(id, t.msg.done_browser_title, t.msg.done_browser_body.replace('{{note}}', machine.note || '---').replace('{{qty}}', machine.inputs.qty));
  }

  getChecklistTemplate(): ChecklistItem[] {
    return [
        { id: 1, name: "Диаметр A", nominal: 20.0, tol_plus: 0.05, tol_minus: 0.05 },
        { id: 2, name: "Длина", nominal: 150.0, tol_plus: 0.1, tol_minus: 0.1 },
        { id: 3, name: "Канавка", nominal: 3.0, tol_plus: 0.02, tol_minus: 0.02 }
    ];
  }

  saveChecklist(machineId: number, measurements: (string|number)[], template: ChecklistItem[], comment?: string): void {
    this.initAudio();
    this.updateMachine(machineId, { lastChecklistSaveTime: Date.now(), lastActivityTime: Date.now() });
    this.resetQcTimer(machineId);
    
    const machine = this.machines()[machineId];
    const remaining = this.calculateRemaining(machine);
    const qtyPlanned = parseInt(machine.inputs.qty, 10) || 0;
    
    let qtyDone = 0;
    if (machine.status === 'done') {
        qtyDone = qtyPlanned;
    } else if (machine.status !== 'idle') {
        qtyDone = Math.max(0, qtyPlanned - remaining);
    }
    const t = this.languageService.t();

    const noteLines: string[] = [];
    let hasError = false;
    template.forEach((item, index) => {
        const val = parseFloat(measurements[index] as string);
        const min = item.nominal - item.tol_minus;
        const max = item.nominal + item.tol_plus;
        let status = '⚠️';
        if (!isNaN(val)) {
            if (val >= parseFloat(min.toFixed(3)) && val <= parseFloat(max.toFixed(3))) {
                status = '✅';
            } else {
                status = '❌';
                hasError = true;
            }
        } else {
            status = '➖';
        }
        noteLines.push(`${item.name}: ${measurements[index]} ${status}`);
    });
    
    if (hasError) {
        this.playAlertSound();
    }
    
    const fullNote = noteLines.join('\n');
    
    // Create History Item (keeps existing history format)
    const historyNote = (comment && comment.trim()) ? `${fullNote}\n📝 ${comment.trim()}` : fullNote;
    const newHistoryItem: HistoryItem = {
      machine: machineId,
      note: `${t.history.event.check}:\n${historyNote}`,
      qty: '-',
      remaining: remaining,
      mapNumber: machine.mapNumber,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString(),
      type: 'check'
    };
    
    this.historyLog.update(log => [newHistoryItem, ...log]);
    
    // Construct Telegram Message using new template
    if (this.settings().telegramEvents.onCheck) {
        const operatorName = this.authService.currentUser()?.username || t.msg.not_spec;
        const material = machine.materialType || t.msg.not_spec;
        
        // Time left string
        const tLeft = Math.max(0, machine.timeLeft);
        const h = Math.floor(tLeft / 3600).toString().padStart(2, '0');
        const m = Math.floor((tLeft % 3600) / 60).toString().padStart(2, '0');
        const s = Math.floor(tLeft % 60).toString().padStart(2, '0');
        const timeLeftStr = `${h}:${m}:${s}`;
        
        const commentStr = (comment && comment.trim()) ? `\n\n💬 <b>Комментарий:</b> ${comment.trim()}` : '';
        const machineName = machine.name || (t.history.machine_prefix + ' #' + machineId);

        const text = t.msg.tg_check
            .replace('{{id}}', machineId.toString())
            .replace('{{machine}}', machineName)
            .replace('{{operator}}', operatorName)
            .replace('{{note}}', machine.note || t.msg.not_spec)
            .replace('{{mk}}', machine.mapNumber || t.msg.not_spec)
            .replace('{{material}}', material)
            .replace('{{timeLeft}}', timeLeftStr)
            .replace('{{rem}}', remaining.toString())
            .replace('{{results}}', fullNote)
            .replace('{{comment}}', commentStr);

        this.sendTelegramMessage(text);
    }
  }

  clearHistory(): void {
    const t = this.languageService.t();
    if(confirm(t.history.clear_confirm)) {
        this.historyLog.set([]);
    }
  }

  async testTelegram() {
      const t = this.languageService.t();
      const ok = await this.sendTelegramMessage(t.msg.test_msg);
      if(ok) alert(t.msg.sent_ok);
      else alert(t.msg.sent_err);
  }

  private async sendTelegramQcAlert(machineId: number, partName: string, mapNumber: string) {
       const t = this.languageService.t();
       const text = t.msg.qc_alert.replace('{{id}}', machineId.toString()).replace('{{part}}', partName).replace('{{mk}}', mapNumber);
       if(this.settings().telegramEvents.onReminder) {
           await this.sendTelegramMessage(text);
       }
  }

  private async sendTelegramNotification(machineId: number, type: 'start' | 'pause' | 'done' | 'bar', extra?: string) {
      const s = this.settings();
      const ev = s.telegramEvents;
      if (!s.telegramChatId) return;

      const m = this.machines()[machineId];
      if (!m || m.notificationEnabled === false) return; 

      const t = this.languageService.t();
      let text = '';
      
      // Common data fetch
      let operatorName = t.msg.not_spec;
      if (m.operatorId) {
          const op = this.dbService.getAllUsers().find(u => u.id === m.operatorId);
          if (op) operatorName = op.username;
      }
      const cycle = `${m.inputs.min}м ${m.inputs.sec}с`;
      const machineName = m.name || (t.history.machine_prefix + ' #' + machineId);

      if (type === 'start' && ev.onStart) {
          // Finish Time calculation (Estimated)
          const totalSeconds = (parseInt(m.inputs.min || '0')*60 + parseInt(m.inputs.sec || '0')) * parseInt(m.inputs.qty || '0');
          // Add Year to date format
          const finishTime = new Date(Date.now() + totalSeconds * 1000).toLocaleString('ru-RU', { 
              day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' 
          });

          text = t.msg.tg_start
            .replace('{{id}}', machineId.toString())
            .replace('{{machine}}', machineName)
            .replace('{{operator}}', operatorName)
            .replace('{{note}}', m.note || t.msg.not_spec)
            .replace('{{mk}}', m.mapNumber || t.msg.not_spec)
            .replace('{{material}}', m.materialType || t.msg.not_spec)
            .replace('{{qty}}', m.inputs.qty)
            .replace('{{cycle}}', cycle)
            .replace('{{finish}}', finishTime);

      } else if (type === 'pause' && ev.onPause) {
          // Extract extra data (reason + duration)
          let reason = t.msg.not_spec;
          let duration = t.msg.not_spec;
          
          try {
              if (extra) {
                  const data = JSON.parse(extra);
                  if (data.reason) reason = data.reason;
                  if (data.duration) duration = data.duration;
              }
          } catch(e) {
              reason = extra || t.msg.not_spec; // Fallback
          }

          const rem = this.calculateRemaining(m).toString();

          text = t.msg.tg_pause
                .replace('{{id}}', machineId.toString())
                .replace('{{machine}}', machineName)
                .replace('{{operator}}', operatorName)
                .replace('{{note}}', m.note || t.msg.not_spec)
                .replace('{{mk}}', m.mapNumber || t.msg.not_spec)
                .replace('{{cycle}}', cycle)
                .replace('{{rem}}', rem)
                .replace('{{duration}}', duration)
                .replace('{{reason}}', reason);

      } else if (type === 'done' && ev.onDone) {
           text = t.msg.tg_done
            .replace('{{id}}', machineId.toString())
            .replace('{{machine}}', machineName)
            .replace('{{note}}', m.note)
            .replace('{{qty}}', m.inputs.qty);
      } else if (type === 'bar' && ev.onBar) {
          text = t.msg.tg_bar
            .replace('{{id}}', machineId.toString())
            .replace('{{machine}}', machineName)
            .replace('{{note}}', m.note);
      }

      if (text) {
          await this.sendTelegramMessage(text);
      }
  }
  
  private sendBrowserNotification(machineId: number, title: string, body: string) {
      // machineId 0 means global system notification
      if (machineId !== 0) {
          const machine = this.machines()[machineId];
          if (!machine || machine.notificationEnabled === false) return;
      }

      const s = this.settings().notifications;
      let shouldSend = false;
      const t = this.languageService.t();
      
      // Basic event matching
      if (title.includes('ЗАПУЩЕ') || title.includes('ЗАПУСК')) { if(s.onStart) shouldSend = true; }
      else if (title.includes('ПАУЗ')) { if(s.onPause) shouldSend = true; }
      else if (title.includes('Готово')) { if(s.onDone) shouldSend = true; }
      else if (title.includes('ПРУТОК')) { if(s.onBar) shouldSend = true; }
      else if (title.includes('ВРЕМЯ') || title.includes('ЧАС') || title.includes('НАПОМИНАНИЕ') || title.includes('НАГАДУВАННЯ')) { if(s.onReminder) shouldSend = true; }

      if (shouldSend && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          const prefix = machineId === 0 ? 'CNC PRO' : `${t.history.machine_prefix} #${machineId}`;
          new Notification(`${prefix}: ${title}`, { body });
      }
  }

  public scheduleReminder(minutes: number, note: string) {
      const ms = minutes * 60 * 1000;
      setTimeout(() => {
          this.playAlertSound();
          const t = this.languageService.t();
          const title = t.settings.events.reminder; // "Нагадування" / "Напоминание"
          
          this.sendBrowserNotification(0, title, note);
          
          if (this.settings().telegramEvents.onReminder) {
              this.sendTelegramMessage(`⏰ <b>${title}:</b> ${note}`);
          }
      }, ms);
  }

  private async processOfflineQueue() {
      if (this.isProcessingQueue) return;
      this.isProcessingQueue = true;
      
      const queue = this.offlineQueue();
      if (queue.length === 0) {
          this.isProcessingQueue = false;
          return;
      }
      
      const currentMsg = queue[0];
      const success = await this.sendTelegramMessage(currentMsg, true);
      
      if (success) {
          // Remove first item
          this.offlineQueue.update(q => q.slice(1));
          this.isProcessingQueue = false;
          // Process next immediately
          if (this.offlineQueue().length > 0) {
              this.processOfflineQueue();
          }
      } else {
          // If failed (still offline?), wait before retry
          this.isProcessingQueue = false;
      }
  }

  private async sendTelegramMessage(text: string, isRetry = false): Promise<boolean> {
      const { telegramChatId, telegramBotToken } = this.settings();
      const token = telegramBotToken?.trim();
      if (!token || !telegramChatId) {
          return false;
      }

      // 1. Offline Check
      if (!this.networkService.isOnline() && !isRetry) {
          this.offlineQueue.update(q => [...q, text]);
          return true; // Return true so UI thinks it's handled
      }
      
      const now = Date.now();
      if (this.lastTgMsg && this.lastTgMsg.text === text && (now - this.lastTgMsg.time) < 2000) {
          console.warn('Telegram spam protection: filtered duplicate message');
          return true; // Pretend we sent it to avoid error flows
      }
      this.lastTgMsg = { text, time: now };

      try {
          const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: telegramChatId, text: text, parse_mode: 'HTML' })
          });
          if(!response.ok) {
              // If server error, maybe queue it too? For now, we only queue network errors.
               return false;
          }
          return true;
      } catch (e) {
          // Network Error catch
          if (!isRetry) {
              this.offlineQueue.update(q => [...q, text]);
              return true; // Queued successfully
          }
          return false;
      }
  }

  async sendTelegramReport(startDate?: string, endDate?: string): Promise<boolean> {
      return this.sendExcelReportToTelegram(startDate, endDate);
  }
  
  // Generates XLSX and sends as document
  async sendExcelReportToTelegram(startDate?: string, endDate?: string): Promise<boolean> {
      // Reports are large binary files, we don't queue them in localStorage.
      // We only allow sending if online.
      if (!this.networkService.isOnline()) {
          alert('No internet connection. Report cannot be sent.');
          return false;
      }

      const { telegramChatId } = this.settings();
      const token = this.settings().telegramBotToken?.trim();
      if (!token || !telegramChatId) return false;

      const t = this.languageService.t();
      const machines = this.machines();
      const today = new Date().toLocaleDateString();
      const wb = XLSX.utils.book_new();

      // --- SHEET 1: STATUS SUMMARY ---
      const statusData = Object.values(machines).map(m => {
          const progress = m.totalTime > 0 ? Math.floor(((m.totalTime - m.timeLeft) / m.totalTime) * 100) : 0;
          return {
              'Machine': `${t.history.machine_prefix} #${m.id}`,
              'Part Name': m.note || t.msg.not_spec,
              'MK': m.mapNumber || '',
              'Status': m.status.toUpperCase(),
              'Planned Qty': m.inputs.qty,
              'Progress %': `${progress}%`,
              'Time Left': new Date(m.timeLeft * 1000).toISOString().substr(11, 8)
          };
      });
      const wsStatus = XLSX.utils.json_to_sheet(statusData);
      XLSX.utils.book_append_sheet(wb, wsStatus, "Status");

      // --- SHEET 2: HISTORY LOG ---
      // Sort Oldest to Newest for report readability
      let sortedHistory = [...this.historyLog()].sort((a, b) => {
          const ta = new Date(a.date.split('.').reverse().join('-') + 'T' + a.time).getTime();
          const tb = new Date(b.date.split('.').reverse().join('-') + 'T' + b.time).getTime();
          return ta - tb;
      });

      // Filter by date range if provided
      if (startDate && endDate) {
          const start = new Date(startDate).getTime();
          const end = new Date(endDate).getTime() + (24 * 60 * 60 * 1000); // End of day
          sortedHistory = sortedHistory.filter(item => {
              const [day, month, year] = item.date.split('.').map(Number);
              const itemTime = new Date(year, month - 1, day).getTime();
              return itemTime >= start && itemTime < end;
          });
      }

      const historyData = sortedHistory.map(h => ({
          'Date': h.date,
          'Time': h.time,
          'Machine': `${t.history.machine_prefix} #${h.machine}`,
          'Event': h.type ? h.type.toUpperCase() : 'INFO',
          'Part Name': this.machines()[h.machine]?.note || '---',
          'Qty / Info': h.qty,
          'Remaining': h.remaining,
          'Note': h.note
      }));
      const wsHistory = XLSX.utils.json_to_sheet(historyData);
      
      // Adjust column widths
      wsHistory['!cols'] = [{wch:12}, {wch:10}, {wch:12}, {wch:10}, {wch:25}, {wch:10}, {wch:10}, {wch:50}];
      XLSX.utils.book_append_sheet(wb, wsHistory, "History Log");

      // --- SHEET 3: DETAILED MEASUREMENTS (QC) ---
      const measurementData: any[] = [];
      sortedHistory.filter(h => h.type === 'check').forEach(h => {
          const lines = h.note.split('\n');
          // Format is usually "DimName: Value Status"
          lines.forEach(line => {
              if(line.includes(':')) {
                  const parts = line.split(':');
                  const dimName = parts[0].trim();
                  // Remove status icons for clearer excel
                  const valRaw = parts.slice(1).join(':').trim().replace('✅','').replace('❌','').replace('⚠️','').replace('➖','').trim();
                  
                  // Skip header lines like "Checklist:" or "Result:"
                  if (dimName.includes(t.history.event.check) || dimName.includes('Результати')) return;

                  measurementData.push({
                      'Date': h.date,
                      'Time': h.time,
                      'Machine': `${t.history.machine_prefix} #${h.machine}`,
                      'Part': this.machines()[h.machine]?.note || '---',
                      'MK': h.mapNumber,
                      'Dimension': dimName,
                      'Value Entered': valRaw
                  });
              }
          });
      });
      
      if(measurementData.length > 0) {
          const wsQC = XLSX.utils.json_to_sheet(measurementData);
          wsQC['!cols'] = [{wch:12}, {wch:10}, {wch:12}, {wch:25}, {wch:10}, {wch:25}, {wch:15}];
          XLSX.utils.book_append_sheet(wb, wsQC, "QC Measurements");
      }

      // --- GENERATE & SEND ---
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
      const formData = new FormData();
      formData.append('chat_id', telegramChatId);
      formData.append('document', blob, `CNC_Report_${today}.xlsx`);

      try {
          // Sending brief text first
          let caption = `📊 <b>${t.msg.report_title}</b>\n${today}`;
          if(startDate && endDate) {
              caption += `\n(${startDate} - ${endDate})`;
          }
          await this.sendTelegramMessage(caption);
          
          // Sending Document
          const response = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
              method: 'POST',
              body: formData
          });
          
          return response.ok;
      } catch (e) {
          console.error('Telegram Upload Error', e);
          return false;
      }
  }
}
