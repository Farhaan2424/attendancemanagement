// File: src/api/leave-request/policies/is-employee.js

/**
 * Policy to check if the authenticated user has the 'Employee' role.
 * This is used to ensure only employees can create new leave requests.
 */
module.exports = async (policyContext, config, { strapi }) => {
  // Get the authenticated user from the context.
  const user = policyContext.state.user;

  // If there is no authenticated user, deny access.
  if (!user) {
    return false;
  }

  // Find the role of the user.
  const userRole = user.role.name;

  // If the user's role is 'Employee', grant access.
  if (userRole === 'Employee') {
    return true;
  }

  // For any other role, deny access.
  return false;
};
