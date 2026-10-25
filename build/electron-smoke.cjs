// Test packages inherit release files/targets but have no updater feed or signing.
const { build } = require('../package.json');

module.exports = {
  ...build,
  publish: null,
  mac: { ...build.mac, identity: null, notarize: false },
};
