const User = require('./User');
const Condominium = require('./Condominium');
const Unit = require('./Unit');
const Resident = require('./Resident');
const Flow = require('./Flow');
const FlowStep = require('./FlowStep');
const CallSession = require('./CallSession');
const CallLog = require('./CallLog');

// Condominium <-> User (1:N)
Condominium.hasMany(User, { as: 'users', foreignKey: 'condominium_id' });
User.belongsTo(Condominium, { as: 'condominium', foreignKey: 'condominium_id' });

// Condominium <-> Unit (1:N)
Condominium.hasMany(Unit, { as: 'units', foreignKey: 'condominium_id' });
Unit.belongsTo(Condominium, { as: 'condominium', foreignKey: 'condominium_id' });

// Condominium <-> Resident (1:N)
Condominium.hasMany(Resident, { as: 'residents', foreignKey: 'condominium_id' });
Resident.belongsTo(Condominium, { as: 'condominium', foreignKey: 'condominium_id' });

// Unit <-> Resident (1:N)
Unit.hasMany(Resident, { as: 'residents', foreignKey: 'unit_id' });
Resident.belongsTo(Unit, { as: 'unit', foreignKey: 'unit_id' });

// Condominium <-> Flow (1:N)
Condominium.hasMany(Flow, { as: 'flows', foreignKey: 'condominium_id' });
Flow.belongsTo(Condominium, { as: 'condominium', foreignKey: 'condominium_id' });

// Flow <-> FlowStep (1:N)
Flow.hasMany(FlowStep, { as: 'steps', foreignKey: 'flow_id' });
FlowStep.belongsTo(Flow, { as: 'flow', foreignKey: 'flow_id' });

// Condominium <-> FlowStep (1:N) — desnormalizado para queries por tenant
Condominium.hasMany(FlowStep, { as: 'flowSteps', foreignKey: 'condominium_id' });
FlowStep.belongsTo(Condominium, { as: 'condominium', foreignKey: 'condominium_id' });

// Condominium <-> CallSession (1:N)
Condominium.hasMany(CallSession, { as: 'callSessions', foreignKey: 'condominium_id' });
CallSession.belongsTo(Condominium, { as: 'condominium', foreignKey: 'condominium_id' });

// Flow <-> CallSession (1:N)
Flow.hasMany(CallSession, { as: 'callSessions', foreignKey: 'flow_id' });
CallSession.belongsTo(Flow, { as: 'flow', foreignKey: 'flow_id' });

// FlowStep <-> CallSession (current step)
FlowStep.hasMany(CallSession, { as: 'activeSessions', foreignKey: 'current_step_id' });
CallSession.belongsTo(FlowStep, { as: 'currentStep', foreignKey: 'current_step_id' });

// CallSession <-> CallLog (1:N)
CallSession.hasMany(CallLog, { as: 'logs', foreignKey: 'call_session_id' });
CallLog.belongsTo(CallSession, { as: 'callSession', foreignKey: 'call_session_id' });

// Condominium <-> CallLog (1:N)
Condominium.hasMany(CallLog, { as: 'callLogs', foreignKey: 'condominium_id' });
CallLog.belongsTo(Condominium, { as: 'condominium', foreignKey: 'condominium_id' });

// FlowStep <-> CallLog
FlowStep.hasMany(CallLog, { as: 'logs', foreignKey: 'step_id' });
CallLog.belongsTo(FlowStep, { as: 'step', foreignKey: 'step_id' });

module.exports = {
  User,
  Condominium,
  Unit,
  Resident,
  Flow,
  FlowStep,
  CallSession,
  CallLog
};
