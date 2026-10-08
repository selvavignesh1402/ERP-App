const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = true;
// Let Metro choose concurrency. A constrained runner can opt in explicitly.
if (process.env.METRO_MAX_WORKERS) {
    const workers = Number(process.env.METRO_MAX_WORKERS);
    if (!Number.isInteger(workers) || workers < 1) throw new Error('METRO_MAX_WORKERS must be a positive integer');
    config.maxWorkers = workers;
}

module.exports = config;
