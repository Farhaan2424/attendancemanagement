'use strict';

/**
 * is-owner policy
 *
 * This policy ensures that a user can only access or update their own employee record,
 * while allowing privileged roles (Admin, HR, Manager) full access.
 */

module.exports = async (policyContext, config, { strapi }) => {
  const { user } = policyContext.state;

  if (!user) {
    return false; // Deny if no user is authenticated.
  }

  // Fetch the user's role to determine their permissions.
  const userWithRole = await strapi.db.query('plugin::users-permissions.user').findOne({
    where: { id: user.id },
    populate: { role: true },
  });

  // Define roles that have full access to all records.
  const privilegedRoles = ['Admin', 'HR', 'Manager'];
  
  // Check if the user has a privileged role.
  if (privilegedRoles.includes(userWithRole.role?.name)) {
    return true; // Grant full access immediately for these roles.
  }

  // --- Start of logic for non-privileged users (e.g., 'Authenticated' employees) ---

  const { method, params, query } = policyContext.request;
  const { id } = params;

  // Find the employee record linked to the logged-in user.
  const employee = await strapi.db.query('api::employee.employee').findOne({
    where: { users_permissions_user: { id: user.id } },
  });

  if (!employee) {
    // A regular authenticated user without an employee profile should not have access.
    // However, this might also indicate a data inconsistency, but for this policy, we deny access.
    return false;
  }

  // Handle the 'find' (list) action.
  if (method === 'GET' && !id) {
    // Ensure the query filter is for their own employee ID.
    // If a non-privileged user tries to access a list without a filter or with a different filter, deny.
    const employeeFilter = query?.filters?.users_permissions_user?.id?.$eq;
    if (employeeFilter && parseInt(employeeFilter) === user.id) {
      return true;
    }
    // Deny if no filter is provided or the filter is incorrect.
    return false;
  }

  // Handle the 'findOne' (single record) and 'update' actions.
  if ((method === 'GET' || method === 'PUT') && id) {
    // Check if the requested employee ID belongs to the logged-in user.
    return parseInt(id) === employee.id;
  }

  // Explicitly deny 'create' and 'delete' for regular authenticated users.
  // This is a safety measure in addition to what's configured in the router.
  if (method === 'POST' || method === 'DELETE') {
    return false;
  }

  // Deny all other request types by default for non-privileged users.
  return false;
};