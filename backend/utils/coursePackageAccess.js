const Payment = require('../models/Payment');

const OPEN_TO_ALL_PACKAGES = [
  { allowedPackages: null },
  { allowedPackages: { $exists: false } },
  { allowedPackages: { $size: 0 } },
];

function isPrivilegedCourseViewer(role) {
  return role === 'admin' || role === 'teacher' || role === 'instructor';
}

function courseOpenToAllPackages(allowedPackages) {
  return (
    allowedPackages == null ||
    (Array.isArray(allowedPackages) && allowedPackages.length === 0)
  );
}

function canAccessCourseByPackage(course, userPackagePrice, { isPrivileged = false } = {}) {
  if (isPrivileged) return true;
  const allowedPackages = course?.allowedPackages;
  if (courseOpenToAllPackages(allowedPackages)) return true;
  if (userPackagePrice == null) return false;
  return Array.isArray(allowedPackages) && allowedPackages.includes(userPackagePrice);
}

/**
 * Build a MongoDB filter for course list queries based on the user's package.
 * Returns null when no package filter should be applied.
 */
function buildCoursePackageFilter({ isPrivileged, isAuthenticatedStudent, userPackagePrice }) {
  if (isPrivileged) return null;

  if (userPackagePrice != null) {
    return {
      $or: [...OPEN_TO_ALL_PACKAGES, { allowedPackages: userPackagePrice }],
    };
  }

  if (isAuthenticatedStudent) {
    return { $or: OPEN_TO_ALL_PACKAGES };
  }

  return null;
}

async function getUserPackagePrice(user) {
  if (!user || isPrivilegedCourseViewer(user.role)) {
    return { userPackagePrice: null, isPrivileged: true, isAuthenticatedStudent: false };
  }

  const completedPayment = await Payment.findOne({
    user: user._id,
    status: 'completed',
    type: 'package',
  }).sort({ createdAt: -1 });

  const price =
    completedPayment?.package?.price != null ? completedPayment.package.price : null;

  return {
    userPackagePrice: price,
    isPrivileged: false,
    isAuthenticatedStudent: true,
  };
}

module.exports = {
  OPEN_TO_ALL_PACKAGES,
  isPrivilegedCourseViewer,
  courseOpenToAllPackages,
  canAccessCourseByPackage,
  buildCoursePackageFilter,
  getUserPackagePrice,
};
