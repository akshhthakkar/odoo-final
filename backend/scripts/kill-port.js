import { execSync } from 'child_process';

export function killExistingServer(port = 4000) {
  const targetPort = Number(port) || 4000;
  const currentPid = process.pid.toString();

  try {
    if (process.platform === 'win32') {
      let output = '';
      try {
        output = execSync(`netstat -ano | findstr :${targetPort}`, {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        });
      } catch {
        // No process on this port
        return;
      }

      if (!output) return;

      const lines = output.trim().split('\n');
      const pidsToKill = new Set();

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 4) {
          const localAddr = parts[1] || '';
          const state = parts[3] || '';
          const pid = parts[parts.length - 1];

          // Check if it's listening on the exact port or matching
          if (
            (localAddr.endsWith(`:${targetPort}`) || state === 'LISTENING') &&
            pid &&
            pid !== '0' &&
            pid !== currentPid
          ) {
            pidsToKill.add(pid);
          }
        }
      }

      for (const pid of pidsToKill) {
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
          console.log(`[server-kill] Force terminated previous server running on port ${targetPort} (PID: ${pid})`);
        } catch {
          // Process may have already exited
        }
      }
    } else {
      // Unix / macOS / Linux
      try {
        const output = execSync(`lsof -ti:${targetPort}`, {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        });
        const pids = output.trim().split('\n').filter((p) => p && p !== currentPid);
        for (const pid of pids) {
          execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
          console.log(`[server-kill] Force terminated previous server running on port ${targetPort} (PID: ${pid})`);
        }
      } catch {
        // No process on this port
      }
    }
  } catch (err) {
    console.warn(`[server-kill] Warning while checking port ${targetPort}:`, err?.message || err);
  }
}

// If executed directly from CLI: node scripts/kill-port.js [port]
const cliPort = process.argv[2] ? Number(process.argv[2]) : 4000;
if (process.argv[1] && process.argv[1].includes('kill-port.js')) {
  killExistingServer(cliPort);
}
