const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::attendance.attendance', ({ strapi }) => ({
  async find(ctx) {
    const { data, meta } = await super.find(ctx);
    const enrichedData = await Promise.all(data.map(async (item) => {
      const fullItem = await strapi.entityService.findOne('api::attendance.attendance', item.id, {
        populate: {
          employee: {
            populate: ['department'],
          },
        },
      });
      return { ...item, ...fullItem };
    }));

    return { data: enrichedData, meta };
  },
}));