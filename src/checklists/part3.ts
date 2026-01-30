import { PartPreset } from '../models/machine.model';

export const PART_3: PartPreset = {
    inputs: { qty: '300', min: '1', sec: '15', barTime: '60' },
    material: { stockLen: 3000, partLen: 56, cutWidth: 3, barEndRem: 100 },
    checklist: [
       { id: 1, name: "Шестигранник", nominal: 17.0, tol_plus: 0.1, tol_minus: 0.1 },
       { id: 2, name: "Длина резьбы", nominal: 30.0, tol_plus: 1.0, tol_minus: 0.0 },
       { id: 3, name: "Длина тела", nominal: 50.0, tol_plus: 0.5, tol_minus: 0.5 }
    ]
};
