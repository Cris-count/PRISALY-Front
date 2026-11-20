Object.defineProperty(process.versions, 'node', { value: '24.15.0', writable: true, configurable: true });
process.env.CHROME_BIN = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const fs = require('node:fs');
const origPromisesMkdir = fs.promises.mkdir;
const origMkdirSync = fs.mkdirSync;

fs.promises.mkdir = async function (p, options) {
  for (let i = 0; i < 5; i++) {
    try {
      return await origPromisesMkdir.call(this, p, options);
    } catch (err) {
      if (err && err.code === 'EPERM' && i < 4) {
        await new Promise((r) => setTimeout(r, 100));
        continue;
      }
      throw err;
    }
  }
};

fs.mkdirSync = function (p, options) {
  for (let i = 0; i < 5; i++) {
    try {
      return origMkdirSync.call(this, p, options);
    } catch (err) {
      if (err && err.code === 'EPERM' && i < 4) {
        const end = Date.now() + 100;
        while (Date.now() < end) {}
        continue;
      }
      throw err;
    }
  }
};
