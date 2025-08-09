'use strict';

/**
 * justification router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::justification.justification', {
  config: {
    find: {
      policies: ['is-owner-justification'],
    },
    findOne: {
      policies: ['is-owner-justification'],
    },
    update: {
      policies: ['is-owner-justification'],
    },
    delete: {
      policies: ['is-owner-justification'],
    },
  },
});
