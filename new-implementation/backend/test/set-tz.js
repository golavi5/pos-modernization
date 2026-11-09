// Run the e2e suite as a non-UTC host (Bogota, UTC−5, no DST). Jest hands tests a
// copy of process.env, so this has to be set here, in the real process.
module.exports = async () => {
  process.env.TZ = 'America/Bogota';
};
