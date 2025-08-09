'use strict';

/**
 * payroll router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

// This configuration applies the custom 'is-owner-payroll' policy to the core
// endpoints of the payroll API. This is the mechanism that protects your data,
// ensuring only authorized users can perform actions.
module.exports = createCoreRouter('api::payroll.payroll', {
  config: {
    find: {
      policies: ['api::payroll.is-owner-payroll'],
    },
    findOne: {
      policies: ['api::payroll.is-owner-payroll'],
    },
    // By applying the policy here, we ensure that only users who pass the
    // policy check (i.e., Admin/HR) can create, update, or delete records.
    // The policy itself will return false for regular employees on these methods.
    create: {
      policies: ['api::payroll.is-owner-payroll'],
    },
    update: {
      policies: ['api::payroll.is-owner-payroll'],
    },
    delete: {
      policies: ['api::payroll.is-owner-payroll'],
    },
  },
});
