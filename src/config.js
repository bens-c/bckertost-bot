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
    devRoleIds: [],
    transcriptChannelId: "",
    panelTitle: "Support Tickets",
    panelDescription: "Click the button below to open a ticket.",
    channelNamePrefix: "ticket",
    types: [
      {
        "key": "claim-giveaway",
        "label": "Claim Giveaway"
      },
      {
        "key": "report-someone",
        "label": "Report Someone"
      },
      {
        "key": "sponsor-giveaway",
        "label": "Sponsor Giveaway"
      },
      {
        "key": "partner-request",
        "label": "Partner Request"
      },
      {
        "key": "support",
        "label": "Support"
      }
    ]
  },
  applications: {
    enabled: true,
    reviewChannelId: "",
    staffRoleId: "",
    panelTitle: "Staff Application",
    panelDescription: "Start your application here via DM.",
    questions: [],
    roles: []
  },
  giveaways: {
    enabled: true,
    sponsorPings: {
      qdRoleId: "",
      extraRoleId: "",
      dailyRoleId: "",
      weeklyRoleId: ""
    }
  },
  selfRoles: {
    panelTitle: "Self Roles",
    panelDescription: "Click the buttons below to toggle your roles.",
    roles: []
  },
  modLogs: {
    channelId: ""
  },
  serverStats: {
    enabled: false,
    categoryId: "",
    channelIds: {
      members: "",
      bots: "",
      boosts: ""
    }
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
      "config.json is missing. Copy config.example.json to config.json and fill in your IDs."
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
