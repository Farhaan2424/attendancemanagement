'use strict';

module.exports = {
  async attendanceSummary(ctx) {
    try {
      const { from, to } = ctx.query;

      let dateFilter = {};
      if (from && to) {
        dateFilter = { $between: [from, to] };
      } else {
        const today = new Date().toISOString().split('T')[0];
        dateFilter = today;
      }

      const totalEmployees = await strapi.db.query('api::employee.employee').count();

      const presentCount = await strapi.db.query('api::attendance.attendance').count({
        where: { date: dateFilter, status: 'present' },
      });

      const absentCount = await strapi.db.query('api::attendance.attendance').count({
        where: { date: dateFilter, status: 'absent' },
      });

      const lateCount = await strapi.db.query('api::attendance.attendance').count({
        where: { date: dateFilter, status: 'late' },
      });

      ctx.body = {
        data: {
          range: from && to ? `${from} to ${to}` : 'today',
          totalEmployees,
          present: presentCount,
          absent: absentCount,
          late: lateCount,
        },
      };
    } catch (err) {
      ctx.throw(500, err);
    }
  },

  async pendingLeaves(ctx) {
    ctx.body = { message: 'Pending leaves works!' };
  },

  async pendingJustifications(ctx) {
    ctx.body = { message: 'Pending justifications works!' };
  },
};
