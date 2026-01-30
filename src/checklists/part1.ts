import { PartPreset } from '../models/machine.model';

export const PART_1: PartPreset = {
    inputs: { qty: '500', min: '2', sec: '30', barTime: '45' },
    material: { stockLen: 3000, partLen: 145, cutWidth: 4, barEndRem: 200 },
    checklist: [
       { id: 1, name: "Диаметр шейки", nominal: 25.0, tol_plus: 0.02, tol_minus: 0.02 },
       { id: 2, name: "Длина общая", nominal: 145.0, tol_plus: 0.5, tol_minus: 0.5 },
       { id: 3, name: "Резьба М20", nominal: 20.0, tol_plus: 0.1, tol_minus: 0.1 },
       { id: 4, name: "Шероховатость Ra", nominal: 0.8, tol_plus: 0.4, tol_minus: 0.0 },
       { id: 5, name: "Биение", nominal: 0.0, tol_plus: 0.05, tol_minus: 0.0 }
    ]
};
