'use strict';

/**
 * `is-owner-or-privileged` policy
 */
module.exports = async (policyContext, config, { strapi }) => {
  let { user } = policyContext.state;

  // If no user is authenticated, deny access.
  if (!user) {
    return false;
  }

  // Check if the user's role is populated. If not, fetch the user with their role.
  if (!user.role || typeof user.role === "string" || typeof user.role === "number") {
    const userWithRole = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { id: user.id },
      populate: ['role'],
    });
    user = userWithRole;
  }

  // Define the roles that have full access to all attendance records.
  const privilegedRoles = ['Admin', 'HR', 'Manager'];
  const hasPrivilegedRole = privilegedRoles.includes(user.role?.name);

  // If the user has a privileged role, they can access all data.
  if (hasPrivilegedRole) {
    return true;
  }

  // Get the filters from the request query.
  const { query } = policyContext.request;
  const filters = query?.filters;

  // Check if the request is filtered by the current user's ID.
  // The filter path should match the structure used in the frontend:
  // filters[employee][users_permissions_user][id][$eq]
  const isOwnerFilter =
    filters?.employee?.users_permissions_user?.id?.$eq &&
    String(filters.employee.users_permissions_user.id.$eq) === String(user.id);

  // If the user is an employee and is trying to view only their own records,
  // allow the request.
  if (isOwnerFilter) {
    return true;
  }

  // Deny access in all other cases (e.g., trying to view another employee's records without a privileged role).
  return false;
};
