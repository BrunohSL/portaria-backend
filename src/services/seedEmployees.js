// Funcionários + turnos do condomínio de teste.
// Roles ('sindico'|'faxineira'|'porteiro'|'zelador') vêm do seed da migration inicial,
// não são recriadas aqui — só referenciadas por `key` → id.

const Employee = require('../models/Employee');
const EmployeeRole = require('../models/EmployeeRole');
const EmployeeShift = require('../models/EmployeeShift');

// Datas fixas pra ROTATION ficarem reproduzíveis. Period 2 com offsets de 0/1
// dia faz dois pares (dia/noite) cobrirem 24h alternando dia sim, dia não.
const ROTATION_START_A = '2026-05-06'; // ímpares cobrem
const ROTATION_START_B = '2026-05-07'; // pares cobrem

const EMPLOYEES = [
  {
    key: 'sindico',
    role: 'sindico',
    name: 'Sindico teste',
    phone: '19999594949',
    can_authorize_access: true,
    shifts: [
      { type: 'WEEKLY', start_time: '08:00:00', end_time: '17:00:00', days_of_week: [1, 2, 3, 4, 5] },
      { type: 'WEEKLY', start_time: '08:00:00', end_time: '12:00:00', days_of_week: [6] }
    ]
  },
  {
    key: 'zelador',
    role: 'zelador',
    name: 'Zelador teste',
    phone: '12351234623',
    can_authorize_access: true,
    shifts: [
      { type: 'WEEKLY', start_time: '08:00:00', end_time: '17:00:00', days_of_week: [1, 2, 3, 4, 5] },
      { type: 'WEEKLY', start_time: '08:00:00', end_time: '12:00:00', days_of_week: [6] }
    ]
  },
  {
    key: 'porteiro1',
    role: 'porteiro',
    name: 'Porteiro teste 1',
    phone: '19993216314',
    can_authorize_access: true,
    shifts: [
      { type: 'ROTATION', start_time: '07:00:00', end_time: '19:00:00', rotation_start_date: ROTATION_START_A, rotation_period_days: 2 }
    ]
  },
  {
    key: 'porteiro2',
    role: 'porteiro',
    name: 'Porteiro teste 2',
    phone: '19993216314',
    can_authorize_access: true,
    shifts: [
      { type: 'ROTATION', start_time: '19:00:00', end_time: '07:00:00', rotation_start_date: ROTATION_START_A, rotation_period_days: 2 }
    ]
  },
  {
    key: 'porteiro3',
    role: 'porteiro',
    name: 'Porteiro teste 3',
    phone: '19993216314',
    can_authorize_access: true,
    shifts: [
      { type: 'ROTATION', start_time: '07:00:00', end_time: '19:00:00', rotation_start_date: ROTATION_START_B, rotation_period_days: 2 }
    ]
  },
  {
    key: 'porteiro4',
    role: 'porteiro',
    name: 'Porteiro teste 4',
    phone: '19993216314',
    can_authorize_access: true,
    shifts: [
      { type: 'ROTATION', start_time: '19:00:00', end_time: '07:00:00', rotation_start_date: ROTATION_START_B, rotation_period_days: 2 }
    ]
  }
];

async function buildSeedEmployees(condominiumId, { transaction }) {
  // Resolve role keys → ids
  const roles = await EmployeeRole.findAll({ transaction });
  const roleIdByKey = Object.fromEntries(roles.map((r) => [r.key, r.id]));

  let totalShifts = 0;
  for (const e of EMPLOYEES) {
    if (!roleIdByKey[e.role]) {
      throw new Error(`EmployeeRole '${e.role}' não encontrada — verifique o seed da migration inicial`);
    }
    const employee = await Employee.create({
      condominium_id: condominiumId,
      role_id: roleIdByKey[e.role],
      name: e.name,
      phone: e.phone,
      can_authorize_access: !!e.can_authorize_access,
      active: true,
      emergency_active: false
    }, { transaction });

    for (const s of e.shifts) {
      await EmployeeShift.create({
        employee_id: employee.id,
        type: s.type,
        start_time: s.start_time,
        end_time: s.end_time,
        days_of_week: s.days_of_week ?? null,
        rotation_start_date: s.rotation_start_date ?? null,
        rotation_period_days: s.rotation_period_days ?? null
      }, { transaction });
      totalShifts += 1;
    }
  }

  return { employeesCreated: EMPLOYEES.length, shiftsCreated: totalShifts };
}

module.exports = { buildSeedEmployees };
