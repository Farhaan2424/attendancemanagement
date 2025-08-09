'use strict';

/**
 * is-owner-leave-request policy
 *
 * This policy ensures that a user can only access and modify their own
 * leave request records, unless they have an 'Admin', 'HR', or 'Manager' role.
 */

module.exports = async (policyContext, config, { strapi }) => {
  let { user } = policyContext.state;
  if (!user) {
    // User is not authenticated, deny access.
    return false;
  }

  // Re-fetch user with their role populated if it's not already loaded.
  if (!user.role || typeof user.role !== 'object') {
    const userWithRole = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { id: user.id },
      populate: { role: true },
    });
    user = userWithRole;
  }

  // Find the employee profile associated with the logged-in user.
  const employee = await strapi.db.query('api::employee.employee').findOne({
    where: { users_permissions_user: { id: user.id } },
  });

  if (!employee) {
    // No employee profile found for this user, deny access.
    return false;
  }

  // Define roles that have full access to all records.
  const privilegedRoles = ['Admin', 'HR', 'Manager'];
  const hasPrivilegedRole = privilegedRoles.includes(user.role?.name);
  
  // If the user has a privileged role, grant access immediately.
  if (hasPrivilegedRole) {
    return true;
  }

  const { method, params, query } = policyContext.request;

  // For creating a new record (POST)
  if (method === 'POST') {
    const requestedEmployeeId = policyContext.request.body.data.employee;
    // Allow creation only if the request is for the user's own employee ID.
    return requestedEmployeeId && requestedEmployeeId === employee.id;
  }

  // For fetching records (GET)
  if (method === 'GET') {
    // For find (list) requests, ensure it's filtered by the user's employee ID.
    const employeeFilter = query?.filters?.employee?.id?.$eq;
    if (employeeFilter && parseInt(employeeFilter) === employee.id) {
      return true;
    }
    // For findOne (single record) requests.
    if (params?.id) {
      const leaveRequest = await strapi.db.query('api::leave-request.leave-request').findOne({
        where: { id: params.id },
        populate: ['employee'],
      });
      // Allow access if the record belongs to the user's employee.
      return leaveRequest && leaveRequest.employee?.id === employee.id;
    }
    // Deny access if trying to fetch all records without a privileged role.
    return false;
  }

  // For updating or deleting records (PUT, DELETE)
  if (method === 'PUT' || method === 'DELETE') {
    const { id } = params;
    const leaveRequest = await strapi.db.query('api::leave-request.leave-request').findOne({
      where: { id: id },
      populate: ['employee'],
    });
    // Allow action only if the record belongs to the user's employee.
    return leaveRequest && leaveRequest.employee?.id === employee.id;
  }
  
  // Deny all other types of requests by default.
  return false;
};
