import { PartPreset } from '../models/machine.model';

export const PART_5: PartPreset = {
    inputs: { qty: '2000', min: '0', sec: '25', barTime: '20' },
    material: { stockLen: 3000, partLen: 40, cutWidth: 2, barEndRem: 100 },
    checklist: [
       { id: 1, name: "Диаметр h7", nominal: 10.0, tol_plus: 0.0, tol_minus: 0.015 },
       { id: 2, name: "Длина", nominal: 40.0, tol_plus: 0.2, tol_minus: 0.2 },
       { id: 3, name: "Твердость HRC", nominal: 52.0, tol_plus: 5.0, tol_minus: 0.0 }
    ]
};
