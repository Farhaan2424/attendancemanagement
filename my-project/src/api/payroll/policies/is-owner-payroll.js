'use strict';

/**
 * is-owner-payroll policy
 *
 * This policy ensures that a user can only access their own payroll records.
 * Admin and HR roles are granted full access, while other authenticated users
 * can only view records linked to their own employee profile.
 */

module.exports = async (policyContext, config, { strapi }) => {
  const { user } = policyContext.state;

  // Deny access if user is not authenticated.
  if (!user) {
    return false;
  }

  // Re-fetch user with their role populated to ensure we have the latest data.
  const userWithRole = await strapi.db.query('plugin::users-permissions.user').findOne({
    where: { id: user.id },
    populate: { role: true },
  });

  // Define roles that have full access to all records.
  const privilegedRoles = ['Admin', 'HR'];
  if (privilegedRoles.includes(userWithRole.role?.name)) {
    return true; // Grant access immediately for privileged roles.
  }

  // For regular users, find their associated employee profile.
  const employee = await strapi.db.query('api::employee.employee').findOne({
    where: { users_permissions_user: { id: user.id } },
  });

  // If no employee profile is linked to this user, deny access.
  if (!employee) {
    return false;
  }

  const { method, params, query } = policyContext.request;

  // Employees should only be able to read (GET) their own data.
  if (method === 'GET') {
    // For list view (find), enforce a filter to only show their own records.
    const employeeFilter = query?.filters?.employee?.id?.$eq;
    if (employeeFilter && parseInt(employeeFilter) === employee.id) {
      return true;
    }

    // For single record view (findOne).
    if (params?.id) {
      const payroll = await strapi.db.query('api::payroll.payroll').findOne({
        where: { id: params.id },
        populate: ['employee'],
      });
      // Allow access only if the requested payroll belongs to the user's employee profile.
      return payroll && payroll.employee?.id === employee.id;
    }

    // Deny access if a non-privileged user tries to fetch all records without a filter.
    return false;
  }

  // Explicitly deny employees from creating, updating, or deleting payrolls.
  if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
      return false;
  }

  // Deny all other request types by default.
  return false;
};
