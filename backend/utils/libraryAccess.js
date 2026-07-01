const {
  isPrivilegedCourseViewer,
  canAccessCourseByPackage,
  buildCoursePackageFilter,
  getUserPackagePrice,
} = require('./coursePackageAccess');

async function canAccessLibraryItem(user, item) {
  if (!item || !user) return false;

  const { userPackagePrice, isPrivileged } = await getUserPackagePrice(user);
  if (isPrivileged || isPrivilegedCourseViewer(user.role)) return true;

  return canAccessCourseByPackage(item, userPackagePrice, { isPrivileged: false });
}

function buildLibraryPackageFilter(access) {
  return buildCoursePackageFilter(access);
}

function applyPackageFilterToQuery(query, access) {
  const pkgFilter = buildLibraryPackageFilter(access);
  if (!pkgFilter) return query;

  if (query.$or && !query.$and) {
    const searchOr = query.$or;
    delete query.$or;
    query.$and = [{ $or: searchOr }, pkgFilter];
  } else if (query.$and) {
    query.$and.push(pkgFilter);
  } else {
    Object.assign(query, pkgFilter);
  }

  return query;
}

function formatAllowedPackagesLabel(allowedPackages, packageNameByPrice = {}) {
  if (allowedPackages == null || (Array.isArray(allowedPackages) && allowedPackages.length === 0)) {
    return 'All packages';
  }
  if (!Array.isArray(allowedPackages)) return 'All packages';
  return allowedPackages
    .map((price) => packageNameByPrice[price] || `$${price}`)
    .join(', ');
}

function toPublicLibraryItem(item, hasAccess) {
  const base = {
    itemId: item.itemId,
    title: item.title,
    description: item.description,
    resourceType: item.resourceType,
    category: item.category,
    tags: item.tags || [],
    allowedPackages: item.allowedPackages ?? null,
    packageLabel: formatAllowedPackagesLabel(item.allowedPackages),
    coverImage: item.coverImage,
    author: item.author,
    sortOrder: item.sortOrder,
    updatedAt: item.updatedAt,
    hasAccess: !!hasAccess,
    locked: !hasAccess,
  };

  if (hasAccess) {
    base.externalUrl = item.externalUrl || '';
    base.fileUrl = item.fileUrl || '';
  }

  return base;
}

module.exports = {
  canAccessLibraryItem,
  buildLibraryPackageFilter,
  applyPackageFilterToQuery,
  formatAllowedPackagesLabel,
  toPublicLibraryItem,
  getUserPackagePrice,
};
