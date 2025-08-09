'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/dashboard-metrics',
      handler: 'dashboard-metrics.index',
      config: {
        auth: false, // Set to true if you want token-based protection
      },
    },
  ],
};
