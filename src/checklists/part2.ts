import { PartPreset } from '../models/machine.model';

export const PART_2: PartPreset = {
    inputs: { qty: '1000', min: '0', sec: '45', barTime: '30' },
    material: { stockLen: 3000, partLen: 15, cutWidth: 2, barEndRem: 150 },
    checklist: [
       { id: 1, name: "Внутр. диаметр", nominal: 12.0, tol_plus: 0.05, tol_minus: 0.0 },
       { id: 2, name: "Внеш. диаметр", nominal: 20.0, tol_plus: 0.1, tol_minus: 0.1 },
       { id: 3, name: "Длина", nominal: 15.0, tol_plus: 0.1, tol_minus: 0.1 }
    ]
};
