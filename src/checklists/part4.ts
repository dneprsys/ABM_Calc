import { PartPreset } from '../models/machine.model';

export const PART_4: PartPreset = {
    inputs: { qty: '150', min: '4', sec: '10', barTime: '50' },
    material: { stockLen: 1000, partLen: 45, cutWidth: 3, barEndRem: 50 },
    checklist: [
       { id: 1, name: "Диаметр D1", nominal: 165.0, tol_plus: 1.0, tol_minus: 1.0 },
       { id: 2, name: "Толщина фланца", nominal: 18.0, tol_plus: 0.5, tol_minus: 0.5 },
       { id: 3, name: "Межцентровое отв.", nominal: 125.0, tol_plus: 0.2, tol_minus: 0.2 },
       { id: 4, name: "Диаметр отв.", nominal: 18.0, tol_plus: 0.5, tol_minus: 0.0 }
    ]
};
