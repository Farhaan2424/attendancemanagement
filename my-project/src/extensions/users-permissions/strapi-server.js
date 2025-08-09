'use strict';

module.exports = (plugin) => {
  const sanitizeOutput = (user) => {
    const { password, resetPasswordToken, confirmationToken, ...rest } = user;
    return rest;
  };

  plugin.controllers.auth.callback = async (ctx) => {
    const { identifier, password } = ctx.request.body;

    const user = await strapi.query('plugin::users-permissions.user').findOne({
      where: { email: identifier },
      populate: ['role'], // this 'role' is your custom relation
    });

    if (!user) {
      return ctx.badRequest('Invalid identifier or password');
    }

    const validPassword = await strapi.plugins['users-permissions'].services.user.validatePassword(password, user.password);

    if (!validPassword) {
      return ctx.badRequest('Invalid identifier or password');
    }

    const token = strapi.plugins['users-permissions'].services.jwt.issue({ id: user.id });

    ctx.send({
      jwt: token,
      user: sanitizeOutput(user),
    });
  };

  return plugin;
};
