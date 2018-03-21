module.exports = async function fetch(action, data) {
  await new Promise((resolve, reject) => {
    const time = Date.now();
    const id = this.callbackId++;
    const timer = setInterval(() => {
      if (Date.now() - time > 3000) {
        clearInterval(timer);
        delete this.callbacks[id];
        reject(new Error(`${action} post to master, timeout`));
      }
    }, 5);
    this.callbacks[id] = () => {
      clearInterval(timer);
      delete this.callbacks[id];
      resolve();
    };
    this.send('master', action, Object.assign({
      callback_id: id
    }, data));
  });
}