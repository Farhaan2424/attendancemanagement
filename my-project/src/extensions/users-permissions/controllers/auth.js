const utils = require('@strapi/utils');
const { getService } = require('@strapi/plugin-users-permissions/server/utils');
const { ApplicationError } = utils.errors;

module.exports = {
  async callback(ctx) {
    const { identifier, password } = ctx.request.body;

    const user = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { email: identifier.toLowerCase() },
      populate: ['role'],
    });

    if (!user) {
      throw new ApplicationError('Invalid identifier or password');
    }

    const validPassword = await getService('user').validatePassword(password, user.password);

    if (!validPassword) {
      throw new ApplicationError('Invalid identifier or password');
    }

    const sanitizedUser = await getService('user').sanitizeUser(user);

    const jwt = getService('jwt').issue({
      id: user.id,
    });

    ctx.send({
      jwt,
      user: sanitizedUser,
    });
  },
};
