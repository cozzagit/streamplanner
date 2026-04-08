import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtps.aruba.it",
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

const FROM_NAME = "StreamPlanner";
const FROM_EMAIL = process.env.SMTP_USER || "streamplanner@vibecanyon.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://streamplanner.vibecanyon.com";

// ─── Base HTML wrapper ──────────────────────────────────────

function wrapHtml(content: string): string {
  return `<!DOCTYPE html>
<html lang="it">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;background:#6366f1;border-radius:12px;padding:12px 16px;">
        <span style="color:#fff;font-size:20px;font-weight:700;">StreamPlanner</span>
      </div>
    </div>
    <!-- Content -->
    <div style="background:#1a1a2e;border:1px solid #2a2a3e;border-radius:16px;padding:28px 24px;color:#e4e4ef;">
      ${content}
    </div>
    <!-- Footer -->
    <div style="text-align:center;margin-top:24px;color:#8888a0;font-size:11px;">
      <p style="margin:0;">StreamPlanner &mdash; Il tuo palinsesto streaming intelligente</p>
      <p style="margin:4px 0 0;"><a href="${APP_URL}" style="color:#818cf8;text-decoration:none;">streamplanner.vibecanyon.com</a></p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Email Templates ────────────────────────────────────────

export function welcomeEmail(userName: string): { subject: string; html: string } {
  return {
    subject: "Benvenuto su StreamPlanner!",
    html: wrapHtml(`
      <h2 style="margin:0 0 16px;color:#e4e4ef;font-size:20px;">Ciao ${userName}!</h2>
      <p style="color:#8888a0;line-height:1.6;margin:0 0 16px;">
        Benvenuto su StreamPlanner, il tool che ti aiuta a ottimizzare i tuoi abbonamenti streaming.
      </p>
      <p style="color:#8888a0;line-height:1.6;margin:0 0 20px;">
        Ecco come iniziare:
      </p>
      <div style="margin:0 0 12px;padding:12px 16px;background:#12121a;border-radius:10px;border-left:3px solid #6366f1;">
        <strong style="color:#e4e4ef;">1.</strong>
        <span style="color:#8888a0;"> Cerca le serie che vuoi guardare e aggiungile alla watchlist</span>
      </div>
      <div style="margin:0 0 12px;padding:12px 16px;background:#12121a;border-radius:10px;border-left:3px solid #6366f1;">
        <strong style="color:#e4e4ef;">2.</strong>
        <span style="color:#8888a0;"> Imposta le tue preferenze e il budget mensile</span>
      </div>
      <div style="margin:0 0 20px;padding:12px 16px;background:#12121a;border-radius:10px;border-left:3px solid #6366f1;">
        <strong style="color:#e4e4ef;">3.</strong>
        <span style="color:#8888a0;"> Scopri il piano di rotazione ottimale e risparmia!</span>
      </div>
      <div style="text-align:center;margin-top:24px;">
        <a href="${APP_URL}/esplora" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:600;font-size:14px;">
          Inizia ad Esplorare
        </a>
      </div>
    `),
  };
}

export function monthlyPlanEmail(
  userName: string,
  monthName: string,
  platform: { name: string; color: string; price: number },
  seriesList: string[],
  savingsPerMonth: number
): { subject: string; html: string } {
  const seriesHtml = seriesList
    .map(
      (s) =>
        `<div style="padding:8px 12px;background:#12121a;border-radius:8px;margin:4px 0;color:#e4e4ef;font-size:13px;">&#127902; ${s}</div>`
    )
    .join("");

  return {
    subject: `Il tuo piano streaming per ${monthName}`,
    html: wrapHtml(`
      <h2 style="margin:0 0 16px;color:#e4e4ef;font-size:20px;">Ciao ${userName}!</h2>
      <p style="color:#8888a0;line-height:1.6;margin:0 0 20px;">
        Ecco il tuo piano streaming per <strong style="color:#e4e4ef;">${monthName}</strong>:
      </p>
      <div style="padding:16px;background:#12121a;border-radius:12px;border:1px solid ${platform.color}40;margin:0 0 16px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
          <div style="background:${platform.color};color:#fff;padding:8px 14px;border-radius:8px;font-weight:700;font-size:14px;">
            ${platform.name}
          </div>
          <span style="color:#8888a0;font-size:13px;">&euro;${platform.price.toFixed(2)}/mese</span>
        </div>
        <p style="color:#8888a0;font-size:12px;margin:0 0 8px;">Serie da guardare questo mese:</p>
        ${seriesHtml}
      </div>
      ${savingsPerMonth > 0 ? `
      <div style="padding:14px 16px;background:#22c55e15;border:1px solid #22c55e30;border-radius:10px;margin:0 0 16px;">
        <span style="color:#22c55e;font-weight:600;">Risparmio: &euro;${savingsPerMonth.toFixed(2)}/mese</span>
        <span style="color:#8888a0;font-size:12px;"> rispetto ad avere tutti gli abbonamenti attivi</span>
      </div>` : ""}
      <div style="text-align:center;margin-top:24px;">
        <a href="${APP_URL}/planner" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:600;font-size:14px;">
          Vedi il Piano Completo
        </a>
      </div>
    `),
  };
}

export function inactivityNudgeEmail(
  userName: string,
  daysSinceLastActivity: number,
  pendingSeries: string[]
): { subject: string; html: string } {
  const seriesHtml = pendingSeries
    .slice(0, 5)
    .map(
      (s) =>
        `<div style="padding:8px 12px;background:#12121a;border-radius:8px;margin:4px 0;color:#e4e4ef;font-size:13px;">&#127902; ${s}</div>`
    )
    .join("");

  return {
    subject: `Hai ${pendingSeries.length} serie che ti aspettano!`,
    html: wrapHtml(`
      <h2 style="margin:0 0 16px;color:#e4e4ef;font-size:20px;">Ci manchi, ${userName}!</h2>
      <p style="color:#8888a0;line-height:1.6;margin:0 0 20px;">
        Sono passati <strong style="color:#e4e4ef;">${daysSinceLastActivity} giorni</strong> dall'ultima volta che hai aggiornato la tua watchlist.
        Hai ancora <strong style="color:#e4e4ef;">${pendingSeries.length} serie</strong> da vedere:
      </p>
      ${seriesHtml}
      ${pendingSeries.length > 5 ? `<p style="color:#8888a0;font-size:12px;margin:8px 0 0;">...e altre ${pendingSeries.length - 5}</p>` : ""}
      <div style="text-align:center;margin-top:24px;">
        <a href="${APP_URL}/watchlist" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:600;font-size:14px;">
          Torna alla Watchlist
        </a>
      </div>
    `),
  };
}

const PLATFORM_COLORS: Record<string, string> = {
  netflix: "#E50914", "amazon-prime": "#00A8E1", "disney-plus": "#0063E5",
  "apple-tv-plus": "#a3a3a3", "paramount-plus": "#0064FF", "now-sky": "#00E054",
  crunchyroll: "#F47521", "discovery-plus": "#003BE5", mubi: "#001A22",
  raiplay: "#003CA6", "pluto-tv": "#2D2D2D", "mediaset-infinity": "#1428A0",
};
const PLATFORM_NAMES: Record<string, string> = {
  netflix: "Netflix", "amazon-prime": "Amazon Prime", "disney-plus": "Disney+",
  "apple-tv-plus": "Apple TV+", "paramount-plus": "Paramount+", "now-sky": "NOW",
  crunchyroll: "Crunchyroll", "discovery-plus": "Discovery+", mubi: "MUBI",
  raiplay: "RaiPlay", "pluto-tv": "Pluto TV", "mediaset-infinity": "Mediaset Infinity",
};
const PRIORITY_ICON: Record<string, string> = {
  high: '<span style="color:#ef4444;font-size:10px;">&#9650; ALTA</span>',
  medium: "",
  low: '<span style="color:#8888a0;font-size:10px;">&#9660; BASSA</span>',
};

export function monthlyDigestEmail(
  userName: string,
  watching: { name: string; watched: number; total: number; pct: number }[],
  toWatch: { name: string; episodes: number; priority: string }[],
  activeSubSlugs: string[]
): { subject: string; html: string } {
  const now = new Date();
  const monthName = now.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
  const monthCap = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  const activeBadges = activeSubSlugs
    .map((slug) => {
      const color = PLATFORM_COLORS[slug] || "#6366f1";
      const name = PLATFORM_NAMES[slug] || slug;
      return `<span style="background:${color};color:#fff;padding:5px 12px;border-radius:6px;font-size:12px;font-weight:600;display:inline-block;margin:2px;">${name}</span>`;
    })
    .join(" ");

  const watchingHtml = watching
    .map(
      (s) => `<div style="padding:8px 12px;background:#1a1a2e;border-radius:8px;margin:4px 0;color:#e4e4ef;font-size:13px;">
        ${s.name} <span style="color:#8888a0;">- ${s.watched}/${s.total} ep (${s.pct}%)</span>
        <div style="background:#2a2a3e;border-radius:4px;height:4px;margin-top:6px;">
          <div style="background:#6366f1;border-radius:4px;height:4px;width:${s.pct}%;"></div>
        </div>
      </div>`
    )
    .join("");

  const toWatchHtml = toWatch
    .slice(0, 8)
    .map(
      (s) => `<div style="padding:6px 12px;background:#1a1a2e;border-radius:8px;margin:4px 0;color:#e4e4ef;font-size:13px;">
        ${PRIORITY_ICON[s.priority] || ""} ${s.name} <span style="color:#8888a0;font-size:11px;">(${s.episodes} ep)</span>
      </div>`
    )
    .join("");

  return {
    subject: `Il tuo riepilogo streaming - ${monthCap}`,
    html: wrapHtml(`
      <h2 style="margin:0 0 6px;color:#e4e4ef;font-size:22px;">Ciao ${userName}!</h2>
      <p style="color:#8888a0;margin:0 0 24px;font-size:14px;">Ecco il tuo riepilogo streaming per <strong style="color:#e4e4ef;">${monthCap}</strong></p>

      ${activeSubSlugs.length > 0 ? `
      <div style="padding:16px;background:#12121a;border-radius:12px;margin:0 0 16px;">
        <p style="margin:0 0 10px;font-size:11px;color:#8888a0;text-transform:uppercase;letter-spacing:1px;">I tuoi abbonamenti attivi</p>
        ${activeBadges}
      </div>` : ""}

      <div style="padding:16px;background:#12121a;border-radius:12px;margin:0 0 16px;">
        <p style="margin:0 0 12px;font-size:11px;color:#8888a0;text-transform:uppercase;letter-spacing:1px;">La tua watchlist</p>
        ${watching.length > 0 ? `
          <p style="margin:0 0 6px;font-size:13px;color:#f59e0b;font-weight:600;">&#9654; In corso (${watching.length})</p>
          ${watchingHtml}
          <div style="height:12px;"></div>
        ` : ""}
        ${toWatch.length > 0 ? `
          <p style="margin:0 0 6px;font-size:13px;color:#818cf8;font-weight:600;">&#128205; Da vedere (${toWatch.length})</p>
          ${toWatchHtml}
          ${toWatch.length > 8 ? `<p style="color:#8888a0;font-size:12px;margin:8px 0 0;">...e altre ${toWatch.length - 8}</p>` : ""}
        ` : ""}
      </div>

      <div style="text-align:center;">
        <a href="${APP_URL}/planner" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:600;font-size:14px;">
          Apri il Planner
        </a>
      </div>
    `),
  };
}

export function testEmail(): { subject: string; html: string } {
  return {
    subject: "StreamPlanner - Test Email",
    html: wrapHtml(`
      <h2 style="margin:0 0 16px;color:#e4e4ef;font-size:20px;">Email configurata correttamente!</h2>
      <p style="color:#8888a0;line-height:1.6;margin:0 0 16px;">
        Se stai leggendo questa email, la configurazione SMTP di StreamPlanner funziona perfettamente.
      </p>
      <div style="padding:14px 16px;background:#22c55e15;border:1px solid #22c55e30;border-radius:10px;">
        <span style="color:#22c55e;font-weight:600;">&#9989; SMTP connesso</span>
      </div>
      <p style="color:#8888a0;font-size:12px;margin:16px 0 0;">
        Mittente: ${FROM_EMAIL}<br>
        Server: ${process.env.SMTP_HOST || "smtps.aruba.it"}
      </p>
    `),
  };
}

// ─── Send function ──────────────────────────────────────────

export async function sendEmail(
  to: string,
  template: { subject: string; html: string }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const info = await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to,
      subject: template.subject,
      html: template.html,
    });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Email send error:", message);
    return { success: false, error: message };
  }
}
