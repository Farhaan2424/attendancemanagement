'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/dashboard/attendance-summary',
      handler: 'dashboard.attendanceSummary',
      config: {
        auth: { required: true },
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/dashboard/pending-leaves',
      handler: 'dashboard.pendingLeaves',
      config: {
        auth: { required: true },
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/dashboard/pending-justifications',
      handler: 'dashboard.pendingJustifications',
      config: {
        auth: { required: true },
        policies: [],
      },
    },
  ],
};
