'use strict';

/**
 * is-owner-justification policy
 *
 * This policy ensures that a user can only access and modify their own
 * justification records, unless they have an 'Admin', 'HR', or 'Manager' role.
 */

module.exports = async (policyContext, config, { strapi }) => {
  let { user } = policyContext.state;
  if (!user) {
    return false;
  }

  // Re-fetch user with role populated if missing
  if (!user.role || typeof user.role === "string" || typeof user.role === "number") {
    const userWithRole = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { id: user.id },
      populate: { role: true },
    });
    user = userWithRole;
  }

  // Find the employee associated with the logged-in user
  const employee = await strapi.db.query('api::employee.employee').findOne({
    where: { users_permissions_user: { id: user.id } },
  });

  if (!employee) {
    return false; // No employee profile found for this user
  }

  // Define the roles that have full access
  const privilegedRoles = ['Admin', 'HR', 'Manager'];
  const hasPrivilegedRole = privilegedRoles.includes(user.role?.name);
  
  if (hasPrivilegedRole) {
    return true;
  }

  const { method, params, query } = policyContext.request;

  if (method === 'POST') {
    // For a create request (POST), validate the employee ID in the payload
    const requestedEmployeeId = policyContext.request.body.data.employee;
    return requestedEmployeeId && requestedEmployeeId === employee.id;
  }

  if (method === 'GET') {
    // For GET requests, check if the request is explicitly filtering by the current employee's ID
    const employeeFilter = query?.filters?.employee?.id?.$eq;
    if (employeeFilter && parseInt(employeeFilter) === employee.id) {
        return true;
    }
    // Handle findOne requests where the ID is in the params, not the query
    if (params?.id) {
      const justification = await strapi.db.query('api::justification.justification').findOne({
        where: { id: params.id },
        populate: ['employee'],
      });
      return justification && justification.employee?.id === employee.id;
    }
    return false; // Unauthorized to view all justifications
  }

  if (method === 'PUT' || method === 'DELETE') {
    // For PUT and DELETE, check if the justification belongs to the current employee
    const { id } = params;
    const justification = await strapi.db.query('api::justification.justification').findOne({
      where: { id: id },
      populate: ['employee'],
    });
    return justification && justification.employee?.id === employee.id;
  }
  
  // All other cases are forbidden by default
  return false;
};
