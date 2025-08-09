'use strict';

/**
 * payroll service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::payroll.payroll');
