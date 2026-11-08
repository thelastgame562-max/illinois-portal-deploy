const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const dataDir = process.env.DATA_DIR || __dirname;
fs.mkdirSync(dataDir, { recursive: true });

const children = ['server.js', 'bot.js'].map(file => {
  const child = spawn(process.execPath, [path.join(__dirname, file)], {
    cwd: __dirname,
    env: process.env,
    stdio: 'inherit'
  });
  child.on('error', error => {
    console.error(`Could not start ${file}:`, error.message);
    shutdown(1);
  });
  child.on('exit', code => {
    if (!stopping) {
      console.error(`${file} exited (${code ?? 'signal'}); stopping the combined service.`);
      shutdown(code || 1);
    }
  });
  return child;
});

let stopping = false;
function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (child.exitCode === null) child.kill('SIGTERM');
  const forceStop = setTimeout(() => {
    for (const child of children) if (child.exitCode === null) child.kill('SIGKILL');
  }, 10000);
  forceStop.unref();
  Promise.all(children.map(child => new Promise(resolve => child.once('exit', resolve))))
    .finally(() => process.exit(code));
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
