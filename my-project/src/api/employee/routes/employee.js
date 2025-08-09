'use strict';

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::employee.employee', {
  config: {
    find: {
      policies: ['api::employee.is-owner'],
    },
    findOne: {
      policies: ['api::employee.is-owner'],
    },
    update: {
      policies: ['api::employee.is-owner'],
    },
    create: {
      policies: ['api::employee.is-owner'], // Apply policy to protect creation as well
    },
    delete: {
      policies: ['api::employee.is-owner'], // Apply policy to protect deletion
    },
  },
});