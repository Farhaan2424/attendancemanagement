'use strict';

module.exports = {
  async index(ctx) {
    const employees = await strapi.entityService.count('api::employee.employee');

    // Assuming attendance model with today's entries
    const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
    const attendance = await strapi.entityService.findMany('api::attendance.attendance', {
      filters: { date: today },
      populate: ['employee'],
    });

    const presentToday = attendance.filter(a => a.status === 'present').length;
    const absentToday = attendance.filter(a => a.status === 'absent').length;
    const lateArrivals = attendance.filter(a => a.status === 'late').length;

    const recentAttendance = await strapi.entityService.findMany(
      'api::attendance.attendance',
      {
        sort: ['date:desc'],
        populate: {
          employee: {
            populate: ['user', 'department'], // Also fetch the linked auth user if needed
          },
        },
        limit: 10000000000,
      }
    );



    const leaveRequestsCount = await strapi.entityService.count('api::leave-request.leave-request', {
      filters: { status: 'pending' },
    });

    const justificationsCount = await strapi.entityService.count('api::justification.justification', {
      filters: { status: 'pending' },
    });

    const lateEntriesCount = await strapi.entityService.count('api::attendance.attendance', {
      filters: {
        date: today,
        status: 'late',
      },
    });

    const pendingActions = [
      { label: "Leave Requests", count: leaveRequestsCount },
      { label: "Justifications", count: justificationsCount },
      { label: "Late Entries", count: lateEntriesCount },
    ];


    ctx.send({
      totalEmployees: employees,
      presentToday,
      absentToday,
      lateArrivals,
      attendance: recentAttendance,
      pendingActions,
    });
  },
};
