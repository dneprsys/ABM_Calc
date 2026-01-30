
export interface MachineInputs {
  qty: string;
  min: string;
  sec: string;
  barTime: string; // in minutes
}

export interface Material {
  stockLen: number; // mm
  partLen: number; // mm
  cutWidth: number; // mm
  barEndRem: number; // mm - Remainder
  partsPerBar: number;
  barsNeeded: number;
  diameter?: number; // mm
}

export interface ChecklistItem {
  id: number;
  name: string;
  nominal: number;
  tol_plus: number;
  tol_minus: number;
}

export interface PartPreset {
    inputs: MachineInputs;
    material: Partial<Material>;
    checklist: ChecklistItem[];
}

export interface Machine {
  id: number;
  name?: string;
  mapNumber?: string;
  materialType?: string; // e.g. Steel, Aluminum
  status: 'idle' | 'work' | 'pause' | 'bar' | 'done';
  operatorId?: string; // ID of the user currently running the machine
  timeLeft: number; // seconds
  totalTime: number; // seconds
  finishTime?: number; // timestamp when done
  barLeft: number; // seconds for current bar
  note: string;
  pauseNote?: string;
  pauseStartTime?: number;
  material: Material;
  inputs: MachineInputs;
  qcTimer: number; // seconds
  checklist: ChecklistItem[];
  lastChecklistSaveTime?: number;
  notificationEnabled?: boolean;
  lastActivityTime?: number; // timestamp of last tick/update
}

export interface HistoryItem {
  machine: number;
  note: string;
  qty: string;
  remaining?: number; // Parts remaining at this point
  mapNumber?: string;
  time: string;
  date: string;
  type?: 'work' | 'pause' | 'done' | 'info' | 'check' | 'bar' | 'start' | 'bar-reload';
}

export interface AppSettings {
  language?: 'ru' | 'uk';
  telegramChatId: string;
  reportTime?: string; // HH:MM
  lastReportDate?: string; // YYYY-MM-DD to prevent duplicate sends
  notifications: {
    onDone: boolean;
    onPause: boolean;
    onCheck: boolean;
    onStart: boolean;
    onBar: boolean;
    onReminder: boolean;
  };
  telegramEvents: {
    onStart: boolean;
    onPause: boolean;
    onDone: boolean;
    onBar: boolean;
    onCheck: boolean;
    onReminder: boolean;
  };
}
