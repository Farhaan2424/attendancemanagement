'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/auth/local',
      handler: 'auth.login',
      config: {
        auth: false,
      },
    },
  ],
};
