const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const configPath = path.join(rootDir, "config.json");

const defaults = {
  botName: "Discord Bot",
  embedColor: "#f59e0b",
  playing: "Bckertost Bot",
  ownerId: "1292715845939630100",
  tickets: {
    enabled: true,
    categoryId: "1530230138225168487",
    supportRoleId: "1531395509628178583",
    devRoleIds: ["1516466724160147607"],
    transcriptChannelId: "1532353532655570974",
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
    reviewChannelId: "1523069494044524736",
    staffRoleId: "1516473442042380398",
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
		"roles": [
			{
				"key": "supporter",
				"label": "Supporter",
				"roleId": "1528175395587756123"
			},
			{
				"key": "mod",
				"label": "Mod",
				"roleId": "1528176134515196115"
			}
		],
  },
  modLogs: {
    channelId: "1515807384294002719"
  },
  serverStats: {
    enabled: true,
    categoryId: "",
    channelIds: {
      "members": "1542189768920801453",
			"bots": "1542189770233352202",
			"boosts": "1542189772498403369"
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
