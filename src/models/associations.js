const User = require('./User');
const Condominium = require('./Condominium');
const Unit = require('./Unit');
const Contact = require('./Contact');
const Flow = require('./Flow');
const FlowNode = require('./FlowNode');
const FlowEdge = require('./FlowEdge');
const CallSession = require('./CallSession');
const CallLog = require('./CallLog');
const Employee = require('./Employee');
const EmployeeRole = require('./EmployeeRole');
const EmployeeShift = require('./EmployeeShift');
const Gate = require('./Gate');
const Extension = require('./Extension');
const VisitorDataField = require('./VisitorDataField');
const FlowType = require('./FlowType');
const UnitIdentificationLevel = require('./UnitIdentificationLevel');
const PhoneNumber = require('./PhoneNumber');
const Visitor = require('./Visitor');
const UnitVisitor = require('./UnitVisitor');

// Condominium <-> User (1:N)
Condominium.hasMany(User, { as: 'users', foreignKey: 'condominium_id' });
User.belongsTo(Condominium, { as: 'condominium', foreignKey: 'condominium_id' });

// Condominium <-> Unit (1:N)
Condominium.hasMany(Unit, { as: 'units', foreignKey: 'condominium_id' });
Unit.belongsTo(Condominium, { as: 'condominium', foreignKey: 'condominium_id' });

// Condominium <-> Contact (1:N)
Condominium.hasMany(Contact, { as: 'contacts', foreignKey: 'condominium_id' });
Contact.belongsTo(Condominium, { as: 'condominium', foreignKey: 'condominium_id' });

// Unit <-> Contact (1:N)
Unit.hasMany(Contact, { as: 'contacts', foreignKey: 'unit_id' });
Contact.belongsTo(Unit, { as: 'unit', foreignKey: 'unit_id' });

// Condominium <-> Gate (1:N)
Condominium.hasMany(Gate, { as: 'gates', foreignKey: 'condominium_id' });
Gate.belongsTo(Condominium, { as: 'condominium', foreignKey: 'condominium_id' });

// Condominium <-> Extension (1:N)
Condominium.hasMany(Extension, { as: 'extensions', foreignKey: 'condominium_id' });
Extension.belongsTo(Condominium, { as: 'condominium', foreignKey: 'condominium_id' });

// Condominium <-> PhoneNumber (1:N)
Condominium.hasMany(PhoneNumber, { as: 'phoneNumbers', foreignKey: 'condominium_id' });
PhoneNumber.belongsTo(Condominium, { as: 'condominium', foreignKey: 'condominium_id' });

// Condominium <-> Flow (1:N)
Condominium.hasMany(Flow, { as: 'flows', foreignKey: 'condominium_id' });
Flow.belongsTo(Condominium, { as: 'condominium', foreignKey: 'condominium_id' });

// FlowType <-> Flow (1:N) — type por chave
FlowType.hasMany(Flow, { as: 'flows', foreignKey: 'type', sourceKey: 'key' });
Flow.belongsTo(FlowType, { as: 'flowType', foreignKey: 'type', targetKey: 'key' });

// Flow <-> FlowNode (1:N)
Flow.hasMany(FlowNode, { as: 'nodes', foreignKey: 'flow_id' });
FlowNode.belongsTo(Flow, { as: 'flow', foreignKey: 'flow_id' });

// Flow.entry_node_id -> FlowNode
Flow.belongsTo(FlowNode, { as: 'entryNode', foreignKey: 'entry_node_id', constraints: false });

// Condominium <-> FlowNode (1:N) — desnormalizado para queries por tenant
Condominium.hasMany(FlowNode, { as: 'flowNodes', foreignKey: 'condominium_id' });
FlowNode.belongsTo(Condominium, { as: 'condominium', foreignKey: 'condominium_id' });

// Flow <-> FlowEdge (1:N)
Flow.hasMany(FlowEdge, { as: 'edges', foreignKey: 'flow_id' });
FlowEdge.belongsTo(Flow, { as: 'flow', foreignKey: 'flow_id' });

// FlowNode <-> FlowEdge (source/target)
FlowNode.hasMany(FlowEdge, { as: 'outgoingEdges', foreignKey: 'source_node_id' });
FlowNode.hasMany(FlowEdge, { as: 'incomingEdges', foreignKey: 'target_node_id' });
FlowEdge.belongsTo(FlowNode, { as: 'sourceNode', foreignKey: 'source_node_id' });
FlowEdge.belongsTo(FlowNode, { as: 'targetNode', foreignKey: 'target_node_id' });

// Condominium <-> CallSession (1:N)
Condominium.hasMany(CallSession, { as: 'callSessions', foreignKey: 'condominium_id' });
CallSession.belongsTo(Condominium, { as: 'condominium', foreignKey: 'condominium_id' });

// Flow <-> CallSession (1:N)
Flow.hasMany(CallSession, { as: 'callSessions', foreignKey: 'flow_id' });
CallSession.belongsTo(Flow, { as: 'flow', foreignKey: 'flow_id' });

// FlowNode <-> CallSession (current node)
FlowNode.hasMany(CallSession, { as: 'activeSessions', foreignKey: 'current_node_id' });
CallSession.belongsTo(FlowNode, { as: 'currentNode', foreignKey: 'current_node_id' });

// CallSession <-> CallLog (1:N)
CallSession.hasMany(CallLog, { as: 'logs', foreignKey: 'call_session_id' });
CallLog.belongsTo(CallSession, { as: 'callSession', foreignKey: 'call_session_id' });

// Condominium <-> CallLog (1:N)
Condominium.hasMany(CallLog, { as: 'callLogs', foreignKey: 'condominium_id' });
CallLog.belongsTo(Condominium, { as: 'condominium', foreignKey: 'condominium_id' });

// FlowNode <-> CallLog
FlowNode.hasMany(CallLog, { as: 'logs', foreignKey: 'node_id' });
CallLog.belongsTo(FlowNode, { as: 'node', foreignKey: 'node_id' });

// Condominium <-> Employee (1:N)
Condominium.hasMany(Employee, { as: 'employees', foreignKey: 'condominium_id' });
Employee.belongsTo(Condominium, { as: 'condominium', foreignKey: 'condominium_id' });

// EmployeeRole <-> Employee (1:N)
EmployeeRole.hasMany(Employee, { as: 'employees', foreignKey: 'role_id' });
Employee.belongsTo(EmployeeRole, { as: 'role', foreignKey: 'role_id' });

// Employee <-> EmployeeShift (1:N)
Employee.hasMany(EmployeeShift, { as: 'shifts', foreignKey: 'employee_id' });
EmployeeShift.belongsTo(Employee, { as: 'employee', foreignKey: 'employee_id' });

// Condominium <-> Visitor (1:N)
Condominium.hasMany(Visitor, { as: 'visitors', foreignKey: 'condominium_id' });
Visitor.belongsTo(Condominium, { as: 'condominium', foreignKey: 'condominium_id' });

// Unit <-> Visitor (M:N) via unit_visitors
Unit.belongsToMany(Visitor, { through: UnitVisitor, as: 'visitors', foreignKey: 'unit_id', otherKey: 'visitor_id' });
Visitor.belongsToMany(Unit, { through: UnitVisitor, as: 'units', foreignKey: 'visitor_id', otherKey: 'unit_id' });

// UnitVisitor diretas (pra queries que precisam do registro do vínculo)
Unit.hasMany(UnitVisitor, { as: 'unitVisitors', foreignKey: 'unit_id' });
UnitVisitor.belongsTo(Unit, { as: 'unit', foreignKey: 'unit_id' });
Visitor.hasMany(UnitVisitor, { as: 'unitVisitors', foreignKey: 'visitor_id' });
UnitVisitor.belongsTo(Visitor, { as: 'visitor', foreignKey: 'visitor_id' });

module.exports = {
  User,
  Condominium,
  Unit,
  Contact,
  Flow,
  FlowNode,
  FlowEdge,
  CallSession,
  CallLog,
  Employee,
  EmployeeRole,
  EmployeeShift,
  Gate,
  Extension,
  VisitorDataField,
  FlowType,
  UnitIdentificationLevel,
  PhoneNumber,
  Visitor,
  UnitVisitor
};
