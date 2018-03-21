const os = require('os');
const fs = require('fs');
const path = require('path');
const { load } = require('./file');
const { getFrameworkPath } = require('./framework');

/**
 * Master check options.
 * @param {*} options:
 * @param   - baseDir `string` 应用跟目录 默认`process.cwd()`
 * @param   - max `number` 开启最大的进程数 默认 `0` 表示根据服务器内核个数开启
 * @param   - framework `string` 使用应用的模型
 * @param   - agents `array|string` 开启的agent进程名称
 * @param   - worker_file worker启动文件地址 [此选项由系统自动生成]
 * @param   - plugin_file 插件列表文件地址 [此选项由系统自动生成]
 * @param   - plugin_config_file 插件配置文件地址 [此选项由系统自动生成]
 */
module.exports = async (options, config_file, env) => {
  options = Object.assign({
    baseDir: process.cwd(),
    max: 0,
    framework: null,
    plugin_file: null
  }, options);

  options.config_file = config_file;
  options.env = env;

  if (!options.max) {
    options.max = os.cpus().length;
  }

  options.framework = getFrameworkPath(options.framework, options.baseDir);
  const framework = load(options.framework);
  if (!framework.Application) {
    throw new Error('framework miss `Application` class module.');
  }
  if (!framework.Agent) {
    throw new Error('framework miss `Agent` class module.');
  }

  if (!options.agents) options.agents = ['agent'];
  if (typeof options.agents === 'string') {
    options.agents = [options.agents];
  }
  options.agents = options.agents.map(agent => {
    return {
      name: agent,
      path: path.resolve(options.baseDir, agent + '.js')
    }
  });

  options.worker_file = path.resolve(options.baseDir, 'app.js');
  options.plugin_file = path.resolve(options.config_file, 'plugin.js');
  options.plugin_config_file = path.resolve(options.config_file, `plugin.${options.env}.js`);

  const frameworkDetecter = options.framework + '/detect.js';
  if (fs.existsSync(frameworkDetecter)) {
    const frameworker = load(frameworkDetecter);
    const opts = await frameworker(options);
    if (opts) options = opts;
  }

  return options;
}