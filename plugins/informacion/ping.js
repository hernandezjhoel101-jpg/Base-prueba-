import os from "os";
import { exec } from "child_process";

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "—";
  const gb = bytes / (1024 ** 3);
  return `${gb.toFixed(2)} GB`;
}
function pct(used, total) {
  if (!total) return "—";
  return `${((used / total) * 100).toFixed(1)}%`;
}
function num(n) {
  return Number(n || 0).toLocaleString("es-ES", { maximumFractionDigits: 2 });
}

function sampleCpuPercent(ms = 400) {
  return new Promise((resolve) => {
    const snap = () => os.cpus().map(c => c.times);
    const a = snap();
    setTimeout(() => {
      const b = snap();
      let idle = 0, total = 0;
      for (let i = 0; i < a.length; i++) {
        const at = a[i], bt = b[i];
        const idleDelta = bt.idle - at.idle;
        const totalDelta =
          (bt.user - at.user) +
          (bt.nice - at.nice) +
          (bt.sys - at.sys) +
          (bt.irq - at.irq) +
          idleDelta;
        idle += idleDelta;
        total += totalDelta;
      }
      const usage = total > 0 ? (1 - idle / total) * 100 : 0;
      resolve(Math.max(0, Math.min(100, usage)));
    }, ms);
  });
}

function getDisksInfo() {
  return new Promise((resolve) => {
    exec("df -kP -x tmpfs -x devtmpfs", (err, stdout) => {
      if (err || !stdout) return resolve([]);
      const lines = stdout.trim().split("\n");
      if (lines.length < 2) return resolve([]);
      const disks = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].trim().split(/\s+/);
        if (parts.length < 6) continue;
        const fs = parts[0];
        const totalKB = parseInt(parts[1], 10);
        const usedKB = parseInt(parts[2], 10);
        const availKB = parseInt(parts[3], 10);
        const usedPct = parts[4];
        const mount = parts[5];
        disks.push({
          fs,
          mount,
          total: totalKB * 1024,
          used: usedKB * 1024,
          avail: availKB * 1024,
          usedPct: usedPct && usedPct.includes("%") ? usedPct : null,
        });
      }
      resolve(disks);
    });
  });
}

const handler = async (msg, { conn }) => {
  const chatId = msg.key.remoteJid;

  await conn.sendMessage(chatId, { react: { text: "🛰️", key: msg.key } });

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  const cpus = os.cpus() || [];
  const cpuModel = cpus[0]?.model || "Desconocido";
  const cpuCores = cpus.length;

  const [l1, l5, l15] = os.loadavg();
  const cpuPercent = await sampleCpuPercent(400);
  const disks = await getDisksInfo();

  const upSec = os.uptime();
  const d = Math.floor(upSec / 86400);
  const h = Math.floor((upSec % 86400) / 3600);
  const m = Math.floor((upSec % 3600) / 60);
  const s = Math.floor(upSec % 60);
  const uptimeStr = `${d}d ${h}h ${m}m ${s}s`;

  const host = os.hostname();
  const platform = `${os.platform()} ${os.release()}`;
  const nodev = process.version;

  let texto =
`🖥️ *Estado del Servidor* (Sky Ultra Plus)
🏷️ Host: *${host}*
🧩 SO: *${platform}*
🟢 Uptime: *${uptimeStr}*
────────────────
🧠 *RAM*
• Total: ${formatBytes(totalMem)}
• Usada: ${formatBytes(usedMem)}  (${pct(usedMem, totalMem)})
• Libre: ${formatBytes(freeMem)}
────────────────
⚙️ *CPU*
• Modelo: ${cpuModel}
• Núcleos: ${cpuCores}
• Carga (1/5/15m): ${num(l1)} / ${num(l5)} / ${num(l15)}
• Uso aprox.: ${num(cpuPercent)}%
────────────────
💾 *Discos (df)*`;

  if (disks.length > 0) {
    for (const dsk of disks) {
      const t = dsk.total;
      const u = dsk.used;
      const a = dsk.avail;
      const p = dsk.usedPct || pct(u, t);
      texto += `\n• *${dsk.mount}* (${dsk.fs})
  - Capacidad: ${formatBytes(t)}
  - Usado: ${formatBytes(u)}  (${p})
  - Libre: ${formatBytes(a)}`;
    }
  } else {
    texto += `\n• No disponible`;
  }

  texto += `\n────────────────
🔧 Node.js: ${nodev}`;

  await conn.sendMessage(chatId, { text: texto, quoted: msg });
  await conn.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
};


handler.command = ['p', 'ping'];
export default handler;