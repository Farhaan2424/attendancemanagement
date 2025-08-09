'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::leave-request.leave-request', ({ strapi }) => ({
  async create(ctx) {
    const user = ctx.state.user;

    const employee = await strapi.db.query('api::employee.employee').findOne({
      where: { user: user.id },
    });

    if (!employee) {
      return ctx.badRequest('No employee linked to this user');
    }

    ctx.request.body.data.employee = employee.id;

    const response = await super.create(ctx);
    return response;
  }
}));
