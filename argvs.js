module.exports = argvs => {
  const result = {};
  for (let i = 0; i < argvs.length; i++) {
    resolve(argvs[i], result);
  }
  return result;
}

function resolve(str, res) {
  if (/^\-\-/.test(str)) {
    str = str.replace(/^\-\-/, '');
    resolveArguments(str, res);
  }
}

function resolveArguments(str, res) {
  const colums = str.split('=');
  if (colums.length === 2) {
    const dots = colums[0].split('.');
    if (dots.length === 1) {
      res[dots[0]] = colums[1];
    } else {
      const l = dots.slice(0, -1);
      const r = dots.slice(-1)[0];
      let i = 0, t = res;
      while (i < l.length) {
        const v = l[i];
        if (!t[v]) t[v] = {};
        t = t[v];
        ++i;
      }
      t[r] = colums[1];
    }
  }
}