const dayjs = require('dayjs');

module.exports = {
  async beforeCreate(event) {
    const { data } = event.params;

    const checkIn = data.checkIn;
    const checkOut = data.checkOut;

    if (checkIn && checkOut) {
      const start = dayjs(`2023-01-01T${checkIn}`);
      const end = dayjs(`2023-01-01T${checkOut}`);

      if (start.isValid() && end.isValid() && end.isAfter(start)) {
        const diff = end.diff(start, 'minute');
        const hours = Math.floor(diff / 60);
        const minutes = diff % 60;
        data.workingHours = `${hours}h ${minutes}min`;
      } else {
        data.workingHours = '0h 0min';
      }
    }
  },

  async beforeUpdate(event) {
    const { data } = event.params;

    const checkIn = data.checkIn;
    const checkOut = data.checkOut;

    if (checkIn && checkOut) {
      const start = dayjs(`2023-01-01T${checkIn}`);
      const end = dayjs(`2023-01-01T${checkOut}`);

      if (start.isValid() && end.isValid() && end.isAfter(start)) {
        const diff = end.diff(start, 'minute');
        const hours = Math.floor(diff / 60);
        const minutes = diff % 60;
        data.workingHours = `${hours}h ${minutes}min`;
      } else {
        data.workingHours = '0h 0min';
      }
    }
  }
};
