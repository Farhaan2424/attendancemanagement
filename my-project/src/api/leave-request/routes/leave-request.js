'use strict';

/**
 * leave-request router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

// This creates a router for the 'leave-request' content type and applies
// the custom 'is-owner-leave-request' policy to its main endpoints.
module.exports = createCoreRouter('api::leave-request.leave-request', {
  config: {
    find: {
      policies: ['api::leave-request.is-owner-leave-request'],
    },
    findOne: {
      policies: ['api::leave-request.is-owner-leave-request'],
    },
    create: {
      policies: ['api::leave-request.is-owner-leave-request'],
    },
    update: {
      policies: ['api::leave-request.is-owner-leave-request'],
    },
    delete: {
      policies: ['api::leave-request.is-owner-leave-request'],
    },
  },
});
