/**
 * Starts Expo dev client on LAN with REACT_NATIVE_PACKAGER_HOSTNAME set to a
 * reachable IPv4. On Windows, Metro sometimes advertises 127.0.0.1 to physical
 * devices; this avoids that without hardcoding a machine IP.
 */
const { spawn } = require("child_process");
const os = require("os");

function isIPv4(net) {
  return net.family === "IPv4" || net.family === 4;
}

function scoreAddress(addr) {
  if (addr.startsWith("192.168.")) return 100;
  if (addr.startsWith("10.")) return 80;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(addr)) return 60;
  return 10;
}

function pickLanIp() {
  const nets = os.networkInterfaces();
  const candidates = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (!isIPv4(net) || net.internal) continue;
      candidates.push({ address: net.address, score: scoreAddress(net.address) });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.address ?? null;
}

const ip = pickLanIp();
if (!ip) {
  console.error(
    "[start-dev-client-lan] No non-loopback IPv4 found. Set REACT_NATIVE_PACKAGER_HOSTNAME to your PC's LAN address (see apps/mobile/README.md)."
  );
  process.exit(1);
}

if (!process.env.REACT_NATIVE_PACKAGER_HOSTNAME) {
  process.env.REACT_NATIVE_PACKAGER_HOSTNAME = ip;
  console.log(`[start-dev-client-lan] REACT_NATIVE_PACKAGER_HOSTNAME=${ip}`);
} else {
  console.log(
    `[start-dev-client-lan] Using REACT_NATIVE_PACKAGER_HOSTNAME=${process.env.REACT_NATIVE_PACKAGER_HOSTNAME}`
  );
}

const child = spawn("npx", ["expo", "start", "--dev-client", "--lan"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
