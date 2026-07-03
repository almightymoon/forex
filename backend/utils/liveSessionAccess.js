const {
  courseOpenToAllPackages,
  canAccessCourseByPackage,
  getUserPackagePrice,
  isPrivilegedCourseViewer,
} = require('./coursePackageAccess');

const PACKAGE_LABELS = {
  100: 'Starter',
  250: 'Pro',
  1000: 'Elite',
};

function sessionOpenToAllPackages(allowedPackages) {
  return courseOpenToAllPackages(allowedPackages);
}

function canAccessLiveSessionByPackage(session, userPackagePrice, { isPrivileged = false } = {}) {
  return canAccessCourseByPackage(session, userPackagePrice, { isPrivileged });
}

function formatAllowedPackagesLabel(allowedPackages) {
  if (sessionOpenToAllPackages(allowedPackages)) return 'All packages';
  if (!Array.isArray(allowedPackages) || allowedPackages.length === 0) return 'All packages';
  return allowedPackages.map((p) => PACKAGE_LABELS[p] || `$${p}`).join(', ');
}

function isStudentBooked(session, userId) {
  if (!userId || !Array.isArray(session?.currentParticipants)) return false;
  return session.currentParticipants.some((participant) => {
    const student = participant.student;
    const id = student?._id?.toString?.() ?? student?.toString?.() ?? '';
    return id === userId.toString();
  });
}

function buildLiveSessionAccess(session, { user, userPackagePrice, isPrivileged }) {
  const isBooked = user ? isStudentBooked(session, user._id) : false;
  const hasPackageAccess = canAccessLiveSessionByPackage(session, userPackagePrice, { isPrivileged });
  const isFull = session.isFull ?? (
    Array.isArray(session.currentParticipants) &&
    session.maxParticipants != null &&
    session.currentParticipants.length >= session.maxParticipants
  );
  const isUpcoming = session.status === 'scheduled' || session.status === 'rescheduled';
  const isLive = session.status === 'live';
  const canReserve =
    !!user &&
    hasPackageAccess &&
    isUpcoming &&
    !isBooked &&
    !isFull;
  const canJoin =
    !!user &&
    hasPackageAccess &&
    isBooked &&
    (isLive || isUpcoming) &&
    !!session.meetingLink;
  const canCancel = !!user && isBooked && isUpcoming;

  return {
    canView: true,
    canReserve,
    canJoin,
    canCancel,
    isBooked,
    hasPackageAccess,
    upgradeRequired: !!user && !hasPackageAccess && !isPrivileged,
    packageLabel: formatAllowedPackagesLabel(session.allowedPackages),
    requiredPackages: sessionOpenToAllPackages(session.allowedPackages) ? null : session.allowedPackages,
  };
}

function serializeLiveSessionForClient(session, context = {}) {
  const doc = session.toObject ? session.toObject({ virtuals: true }) : { ...session };
  const access = buildLiveSessionAccess(doc, context);
  const { isPrivileged = false } = context;

  if (!isPrivileged && !access.canJoin) {
    delete doc.meetingLink;
  }

  return {
    ...doc,
    access,
  };
}

module.exports = {
  sessionOpenToAllPackages,
  canAccessLiveSessionByPackage,
  formatAllowedPackagesLabel,
  isStudentBooked,
  buildLiveSessionAccess,
  serializeLiveSessionForClient,
  getUserPackagePrice,
  isPrivilegedCourseViewer,
};
