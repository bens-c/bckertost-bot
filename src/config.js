const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const configPath = path.join(rootDir, "config.json");

const defaults = {
  botName: "Discord Bot",
  embedColor: "#f59e0b",
  tickets: {
    enabled: true,
    categoryId: "",
    supportRoleId: "",
    transcriptChannelId: "",
    panelTitle: "Support Tickets",
    panelDescription: "Klicke auf den Button, um ein Ticket zu erstellen.",
    channelNamePrefix: "ticket"
  },
  applications: {
    enabled: true,
    reviewChannelId: "",
    staffRoleId: "",
    panelTitle: "Team Bewerbung",
    panelDescription: "Starte hier deine Bewerbung per DM.",
    questions: []
  },
  giveaways: {
    enabled: true
  },
  games: {
    enabled: true
  }
};

function mergeConfig(base, override) {
  if (!override || typeof override !== "object" || Array.isArray(override)) {
    return base;
  }

  const merged = { ...base };

  for (const [key, value] of Object.entries(override)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      base[key] &&
      typeof base[key] === "object" &&
      !Array.isArray(base[key])
    ) {
      merged[key] = mergeConfig(base[key], value);
      continue;
    }

    merged[key] = value;
  }

  return merged;
}

function loadConfig() {
  if (!fs.existsSync(configPath)) {
    throw new Error(
      "config.json fehlt. Kopiere config.example.json nach config.json und trage deine IDs ein."
    );
  }

  const raw = fs.readFileSync(configPath, "utf8");
  const parsed = JSON.parse(raw);
  return mergeConfig(defaults, parsed);
}

module.exports = {
  configPath,
  loadConfig
};
