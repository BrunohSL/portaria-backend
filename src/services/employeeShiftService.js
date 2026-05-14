const Employee = require('../models/Employee');
const EmployeeShift = require('../models/EmployeeShift');
const EmployeeRole = require('../models/EmployeeRole');
const logger = require('../config/logger');

const VALID_TYPES = ['WEEKLY', 'ROTATION'];

class EmployeeShiftService {
  async list(condominiumId, employeeId) {
    await this._assertEmployeeBelongsToCondominium(condominiumId, employeeId);

    return EmployeeShift.findAll({
      where: { employee_id: employeeId },
      order: [['type', 'ASC'], ['start_time', 'ASC']]
    });
  }

  async create(condominiumId, employeeId, data) {
    await this._assertEmployeeBelongsToCondominium(condominiumId, employeeId);

    if (!VALID_TYPES.includes(data.type)) {
      const error = new Error(`Tipo invalido. Use: ${VALID_TYPES.join(', ')}`);
      error.statusCode = 400;
      throw error;
    }
    if (!data.start_time || !data.end_time) {
      const error = new Error('start_time e end_time obrigatorios');
      error.statusCode = 400;
      throw error;
    }

    if (data.type === 'WEEKLY') {
      if (!Array.isArray(data.days_of_week) || data.days_of_week.length === 0) {
        const error = new Error('days_of_week obrigatorio para shift WEEKLY');
        error.statusCode = 400;
        throw error;
      }
      const valid = data.days_of_week.every((d) => Number.isInteger(d) && d >= 0 && d <= 6);
      if (!valid) {
        const error = new Error('days_of_week deve conter inteiros de 0 a 6 (0=domingo)');
        error.statusCode = 400;
        throw error;
      }
    }

    if (data.type === 'ROTATION') {
      if (!data.rotation_start_date) {
        const error = new Error('rotation_start_date obrigatorio para shift ROTATION');
        error.statusCode = 400;
        throw error;
      }
      if (!data.rotation_period_days || data.rotation_period_days < 1) {
        const error = new Error('rotation_period_days deve ser maior ou igual a 1');
        error.statusCode = 400;
        throw error;
      }
    }

    const shift = await EmployeeShift.create({
      employee_id: employeeId,
      type: data.type,
      start_time: data.start_time,
      end_time: data.end_time,
      days_of_week: data.type === 'WEEKLY' ? data.days_of_week : null,
      rotation_start_date: data.type === 'ROTATION' ? data.rotation_start_date : null,
      rotation_period_days: data.type === 'ROTATION' ? data.rotation_period_days : null
    });

    logger.info({ msg: 'Shift criado', shiftId: shift.id, employeeId });
    return shift;
  }

  async delete(condominiumId, employeeId, shiftId) {
    await this._assertEmployeeBelongsToCondominium(condominiumId, employeeId);

    const shift = await EmployeeShift.findOne({
      where: { id: shiftId, employee_id: employeeId }
    });
    if (!shift) {
      const error = new Error('Shift nao encontrado');
      error.statusCode = 404;
      throw error;
    }

    await shift.destroy();
    logger.info({ msg: 'Shift excluido', shiftId, employeeId });
    return { message: 'Shift excluido' };
  }

  /**
   * Retorna funcionarios de um determinado cargo que estao no plantao no momento dado.
   * Retornados na ordem de id ASC (use .name pra ordenar diferente se quiser).
   */
  async findOnDuty(condominiumId, roleKey, datetime = new Date()) {
    const role = await EmployeeRole.findOne({ where: { key: roleKey, active: true } });
    if (!role) return [];

    const employees = await Employee.findAll({
      where: { condominium_id: condominiumId, role_id: role.id, active: true },
      include: [{ model: EmployeeShift, as: 'shifts' }],
      order: [['id', 'ASC']]
    });

    return employees.filter((emp) =>
      (emp.shifts || []).some((shift) => isShiftActive(shift, datetime))
    );
  }

  async _assertEmployeeBelongsToCondominium(condominiumId, employeeId) {
    const employee = await Employee.findOne({
      where: { id: employeeId, condominium_id: condominiumId }
    });
    if (!employee) {
      const error = new Error('Funcionario nao encontrado neste condominio');
      error.statusCode = 404;
      throw error;
    }
  }
}

/**
 * Verifica se um shift esta ativo num dado datetime.
 * Lida com turnos que viram o dia (ex: 19:00-07:00).
 */
function isShiftActive(shift, datetime) {
  const inWindow = isTimeInWindow(datetime, shift.start_time, shift.end_time);
  if (!inWindow) return false;

  // Se o turno vira o dia, a "data efetiva" do turno pode ser ontem
  // Ex: turno 19:00-07:00 que comeca dia 1, se for 03:00 do dia 2 ainda e do turno do dia 1
  const effectiveDate = getEffectiveDate(datetime, shift.start_time, shift.end_time);

  if (shift.type === 'WEEKLY') {
    const weekday = effectiveDate.getDay(); // 0=domingo
    return Array.isArray(shift.days_of_week) && shift.days_of_week.includes(weekday);
  }

  if (shift.type === 'ROTATION') {
    if (!shift.rotation_start_date || !shift.rotation_period_days) return false;
    const startDate = parseDateOnly(shift.rotation_start_date);
    const diffDays = Math.floor((effectiveDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return false;
    return diffDays % shift.rotation_period_days === 0;
  }

  return false;
}

function isTimeInWindow(datetime, startTimeStr, endTimeStr) {
  const cur = datetime.getHours() * 60 + datetime.getMinutes();
  const start = timeStringToMinutes(startTimeStr);
  const end = timeStringToMinutes(endTimeStr);

  if (start === end) return false;

  if (start < end) {
    // Janela normal (ex: 08:00-17:00)
    return cur >= start && cur < end;
  }
  // Janela que vira o dia (ex: 19:00-07:00) — ativo se cur >= start OU cur < end
  return cur >= start || cur < end;
}

/**
 * Quando o turno vira o dia, e "estamos" antes do horario de fim,
 * a data efetiva e a do dia anterior.
 * Ex: turno 19h-07h, sao 03h do dia 2 → data efetiva = dia 1.
 */
function getEffectiveDate(datetime, startTimeStr, endTimeStr) {
  const start = timeStringToMinutes(startTimeStr);
  const end = timeStringToMinutes(endTimeStr);
  const cur = datetime.getHours() * 60 + datetime.getMinutes();

  const date = new Date(datetime);
  date.setHours(0, 0, 0, 0);

  if (start > end && cur < end) {
    // Vira o dia — estamos na "manha seguinte" do turno
    date.setDate(date.getDate() - 1);
  }
  return date;
}

function timeStringToMinutes(timeStr) {
  // Aceita "HH:MM" ou "HH:MM:SS"
  const parts = String(timeStr).split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

function parseDateOnly(dateStr) {
  // dateStr no formato 'YYYY-MM-DD'
  const [y, m, d] = String(dateStr).split('-').map((n) => parseInt(n, 10));
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

module.exports = new EmployeeShiftService();
module.exports.isShiftActive = isShiftActive;
