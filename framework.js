const path = require('path');
const fs = require('fs');
const utility = require('utility');

const initCwd = process.cwd();
// const defaultFramework = path.resolve(__dirname, '../framework');

exports.getFrameworkPath = getFrameworkPath;
exports.assertAndReturn = assertAndReturn;

/**
 * Find the framework directory, lookup order
 * - specify framework path
 * - get framework name from
 * - use egg by default
 * @param {Object} options - options
 * @param  {String} options.baseDir - the current directory of application
 * @param  {String} [options.framework] - the directory of framework
 * @return {String} frameworkPath
 */
function getFrameworkPath(framework, baseDir) {
  const pkgPath = path.join(baseDir, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    throw new Error(`${pkgPath} should exist`);
  }

  const moduleDir = path.join(baseDir, 'node_modules');
  const pkg = utility.readJSONSync(pkgPath);

  if (framework) {
    if (path.isAbsolute(framework)) {
      if (!fs.existsSync(framework)) {
        throw new Error(`${framework} should exist`);
      }
      return framework;
    }
    return assertAndReturn(framework, moduleDir);
  }

  if (pkg.framework) {
    return assertAndReturn(pkg.framework, moduleDir);
  }

  throw new Error('you should set framework first, then listen the server');
}

function assertAndReturn(frameworkName, moduleDir) {
  const moduleDirs = new Set([
    moduleDir,
    // find framework from process.cwd, especially for test,
    // the application is in test/fixtures/app,
    // and framework is install in ${cwd}/node_modules
    path.join(process.cwd(), 'node_modules'),
    // prevent from mocking process.cwd
    path.join(initCwd, 'node_modules'),
  ]);

  for (const moduleDir of moduleDirs) {
    const frameworkPath = path.join(moduleDir, frameworkName);
    if (fs.existsSync(frameworkPath)) return frameworkPath;
  }

  throw new Error(`${frameworkName} is not found in ${Array.from(moduleDirs)}`);
}