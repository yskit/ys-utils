const fs = require('fs');
const path = require('path');
const { load } = require('./file');
const { assertAndReturn } = require('./framework');

exports.checkPortCanUse = checkPortCanUse;
exports.loadFileWorker = loadFileWorker;
exports.installPlugin = installPlugin;

exports.delay = delay;

async function delay(time) {
  await new Promise(resolve => setTimeout(resolve, time));
}

function checkPortCanUse(port, logger) {
  return new Promise((resolve, reject) => {
    const args = [];
    if (port) {
      args.push(port);
    }
    args.push((err, port) => {
      if (err) {
        err.name = 'ClusterPortConflictError';
        err.message = '[master] try get free port error, ' + err.message;
        // TODO: this.logger.error(err);
        if (logger) {
          logger.error(err);
        }
        reject(err);
        process.exit(1);
      }
      resolve(port);
    });
    detectPort(...args);
  });
}

async function loadFileWorker(file, object) {
  if (file && fs.existsSync(file)) {
    const exports = load(file);
    if (typeof exports === 'function') {
      await exports(object);
    }
  }
}

function installPlugin(configs, env, agent, baseDir, framework) {
  const tree = {};
  const file = agent ? 'agent.js' : 'app.js';
  for (const plugin in configs) {
    const config = configs[plugin];
    if (config.enable === undefined) config.enable = true;
    if (!config.env) config.env = [];
    if (!Array.isArray(config.env)) config.env = [config.env];
    if (!config.agent) config.agent = [];
    if (!Array.isArray(config.agent)) config.agent = [config.agent];
    if (!config.enable) continue;
    if (env && config.env.length && config.env.indexOf(env) === -1) continue;
    if (agent) {
      if (!config.agent.length) continue;
      if (config.agent.length && config.agent.indexOf(agent) === -1) continue;
    }

    const pluginPackageName = config.package;
    const pluginPathName = config.path;

    if (!pluginPackageName && !pluginPathName) {
      throw new Error(`plugin of ${plugin} miss 'package' or 'path'`);
    }

    let pkgPath, modal, exportsPath;

    if (pluginPathName) {
      pkgPath = path.resolve(baseDir, pluginPathName, 'package.json');
      if (!fs.existsSync(pkgPath)) {
        throw new Error(`plugin of ${plugin} miss 'package.json' in ${pkgPath}`);
      }
      modal = load(pkgPath);
      exportsPath = path.resolve(baseDir, pluginPathName, file);
    } else {
      const dir = assertAndReturn(pluginPackageName, path.resolve(baseDir, 'node_modules'));
      modal = load(dir + '/package.json');
      exportsPath = path.resolve(dir, file);
    }

    if (!modal.plugin) {
      throw new Error(`plugin of ${plugin}'s package.json miss 'plugin' property in ${pkgPath}`);
    }
    if (modal.plugin.name !== plugin) {
      throw new Error(`plugin of ${plugin}'s package.json which name is not matched in ${pkgPath}`);
    }
    
    if (!modal.plugin.framework) modal.plugin.framework = [];
    if (!Array.isArray(modal.plugin.framework)) modal.plugin.framework = [modal.plugin.framework];
    modal.plugin.framework = modal.plugin.framework.map(
      fw => fw.indexOf('ys-fw-') === -1 
        ? 'ys-fw-' + fw 
        : fw
    )
    if (modal.plugin.framework.length) {
      const index = modal.plugin.framework.indexOf(framework);
      if (index === -1) continue;
    }

    if (fs.existsSync(exportsPath)) {
      tree[plugin] = {
        dependencies: modal.plugin.dependencies || [],
        exports: load(exportsPath),
        dir: path.dirname(exportsPath)
      }
      if (config.dependencies) {
        if (!Array.isArray(config.dependencies)) {
          config.dependencies = [config.dependencies];
        }
      } else {
        config.dependencies = [];
      }
      tree[plugin].dependencies = tree[plugin].dependencies.concat(config.dependencies);
    }
  }
  return sortDependencies(tree);
}

function sortDependencies(tree) {
  const s = Object.keys(tree);
  const m = [];
  let j = s.length;
  while (j--) {
    const obj = tree[s[j]];
    Object.defineProperty(obj, 'deep', {
      get() {
        if (!obj.dependencies.length) return 0;
        return Math.max(...obj.dependencies.map(d => tree[d].deep)) + 1;
      }
    });
  }

  for (const i in tree) {
    tree[i].name = i;
    m.push(tree[i]);
  }
  return m.sort((a, b) => a.deep - b.deep);
}