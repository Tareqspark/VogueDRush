// Socket.IO rooms that routes emit to. Membership is assigned server-side at
// connect time from the authenticated user — the client cannot pick its rooms.
//
//   kitchen — everyone who works the kitchen display
//   floor   — staff who need table updates
//
// Every room is split per branch, since each branch is a standalone café.
// Admins are cross-branch, so they join the ':all' variant and receive every
// branch's events. A non-admin with no branch joins nothing (fail closed).

const ROOMS_BY_ROLE = {
  admin:   ['kitchen', 'floor'],
  manager: ['kitchen', 'floor'],
  waiter:  ['kitchen', 'floor'],
  kitchen: ['kitchen'],
};

// Rooms a connecting user joins.
const roomsFor = (user) => {
  const scope = user.role === 'admin' ? 'all' : user.branch_id;
  if (!scope) return [];
  return (ROOMS_BY_ROLE[user.role] || []).map((room) => `${room}:${scope}`);
};

// Rooms to emit one branch's event to: that branch's staff plus the admins.
const branchRooms = (room, branchId) => [`${room}:${branchId}`, `${room}:all`];

module.exports = { roomsFor, branchRooms };
