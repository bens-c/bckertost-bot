require("dotenv").config();
const fs = require("fs");
const { AsyncLocalStorage } = require("async_hooks");

const {
  ActionRowBuilder,
  ActivityType,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  MessageFlags,
  ModalBuilder,
  OverwriteType,
  Partials,
  PermissionFlagsBits,
  REST,
  Routes,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");
const crypto = require("crypto");
const path = require("path");

const { buildCommands } = require("./commands");
const { getGuildConfig, loadConfig } = require("./config");
const store = require("./store");

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildIds = (process.env.GUILD_ID || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);
const flaggedUserId = "1402323305788080239";
const investmentManagerId = "925014769252048937";
const giveawayTicketChannelId = "1525579929784422630";
const ticketPanelImagePath = path.join(__dirname, "..", "assets", "ticket-panel-thumb.jpeg");
const ticketPanelFooterImagePath = path.join(__dirname, "..", "assets", "ticket-panel-footer.png");

if (!token || !clientId) {
  console.error("Missing DISCORD_TOKEN or CLIENT_ID in .env");
  process.exit(1);
}

let config;
let loadedConfig;
const configContext = new AsyncLocalStorage();

try {
  loadedConfig = loadConfig();
  config = new Proxy(loadedConfig, {
    get(target, property) {
      return getGuildConfig(target, configContext.getStore())[property];
    },
    set(target, property, value) {
      getGuildConfig(target, configContext.getStore())[property] = value;
      return true;
    }
  });
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

let giveawaysStore;
let ticketsStore;
let applicationsStore;
let warningsStore;
let afkStore;
let economyStore;
const snipeStore = new Map();
let featureSettingsStore;
let reactionRollsStore;
let reactionRolesStore;
let moderationCasesStore;
let vouchesStore;
let marriagesStore;
let levelStore;
let starboardStore;
const applicationSessions = new Map();
const botStartedAt = Date.now();
const fastClickGames = new Map();
const rpsGames = new Map();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.User]
});

function color() {
  return parseInt(config.embedColor.replace("#", ""), 16);
}

function buildEmbed(title, description) {
  return new EmbedBuilder().setColor(color()).setTitle(title).setDescription(description);
}

function buildHelpLines(interaction) {
  const lines = [
    "`/help` - Shows this help message",
    "`/ping` - Checks if the bot is online",
    "`/coinflip` - Flips a coin",
    "`/userinfo` - Shows information about a user",
    "`/avatar` - Shows a user's avatar",
    "`/serverinfo` - Shows information about the server",
    "`/echo` - Repeats your text",
    "`/fastclick` - Starts a fast click game",
    "`/minigame` - Plays a small game"
  ];

  if (interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
    lines.push("`/mute` - Applies the maximum Discord timeout");
    lines.push("`/unmute` - Removes a timeout");
    lines.push("`/warn` - Warns a member");
    lines.push("`/warnings` - Shows member warnings");
  }

  if (interaction.memberPermissions?.has(PermissionFlagsBits.KickMembers)) {
    lines.push("`/kick` - Kicks a member");
  }

  if (interaction.memberPermissions?.has(PermissionFlagsBits.BanMembers)) {
    lines.push("`/ban` - Bans a user");
    lines.push("`/unban` - Unbans a user by ID");
  }

  if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
    lines.push("`/clear` - Deletes recent messages");
  }

  if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    lines.push("`/giveaway-create` - Creates a giveaway");
    lines.push("`/giveaway-reroll` - Rerolls a giveaway");
    lines.push("`/ticket-panel` - Sends the ticket panel");
    lines.push("`/onbehalf` - Opens any ticket type for another user");
    lines.push("`/invest-panel` - Sends the invest panel");
    lines.push("`/application-panel` - Sends the application panel");
  }

  if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
    lines.push("`/ticket-close` - Closes the current ticket");
    lines.push("`/ticket add` - Adds a user to the current ticket");
    lines.push("`/ticket remove` - Removes a user from the current ticket");
    lines.push("`/ticket rename` - Renames the current ticket");
    lines.push("`/ticket relode` - Reloads the current ticket panel");
    lines.push("`/slowmode` - Sets channel slowmode");
    lines.push("`/lock` - Locks the current channel");
    lines.push("`/unlock` - Unlocks the current channel");
  }

  if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
    lines.push("`/say` - Sends a plain message through the bot");
    lines.push("`/embed` - Sends a custom embed");
    lines.push("`/poll` - Creates a yes/no poll");
  }

  if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    lines.push("`/announce` - Sends an announcement embed");
  }

  if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
    lines.push("`/role` - Gives a role to a member");
    lines.push("`/removerole` - Removes a role from a member");
  }

  if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageNicknames)) {
    lines.push("`/nick` - Changes a member's nickname");
  }

  lines.push("`/remind` - Sets a personal reminder");
  lines.push("`/8ball` - Ask the magic 8-ball a question");
  lines.push("`/dice` - Rolls a dice with custom sides");
  lines.push("`/uptime` - Shows bot uptime");
  lines.push("`/botinfo` - Shows bot information");

  lines.push("\`/afk\` - Sets your AFK status");
  lines.push("\`/hug\` - Send a hug to another user");
  lines.push("\`/ship\` - Ships two users together");
  lines.push("\`/meme\` - Fetches a random meme");
  lines.push("\`/suggest\` - Posts a suggestion");
  lines.push("\`/daily\` - Collect your daily coins");
  lines.push("\`/work\` - Work for coins");
  lines.push("\`/beg\` - Beg for coins");
  lines.push("\`/balance\` - Shows a coin balance");
  lines.push("\`/leaderboard\` - Shows the server coin leaderboard");
  lines.push("\`/pay\` - Send coins to another user");
  lines.push("\`/snipe\` - Shows the latest deleted cached message");

  return lines;
}

function buildGiveawayEmbed(giveaway) {
  return buildEmbed(
    `Giveaway: ${giveaway.prize}`,
    [
      `Prize: **${giveaway.prize}**`,
      `Winners: **${giveaway.winnerCount}**`,
      `Ends: <t:${Math.floor(giveaway.endsAt / 1000)}:R>`,
      `Host: <@${giveaway.hostId}>`,
      `Participants: **${[...new Set(giveaway.participants)].length}**`
    ].join("\n")
  );
}

function buildSponsorPingMessage(type, overrideRoleId = null) {
  const channelMention = `<#${giveawayTicketChannelId}>`;
  const entry = getSponsorPingLayout(type);
  const roleId = overrideRoleId || entry.roleId;
  return [
    "━━━━━━━━━━━━━━━━━━━━━━━",
    `🎉 **${entry.title}**`,
    "━━━━━━━━━━━━━━━━━━━━━━━",
    "",
    "💖 Want to sponsor a giveaway?",
    `📩 Open a ${channelMention} channel`,
    "",
    "👑 Sponsored by:",
    "",
    roleId ? `<@&${roleId}>` : "No sponsor role configured."
  ].join("\n");
}

function getSponsorPingLayout(type) {
  const sponsorPings = config.giveaways?.sponsorPings || {};
  const layouts = {
    qd: {
      title: "QUICKDROP",
      roleId: sponsorPings.qdRoleId || ""
    },
    extra: {
      title: "EXTRA GIVEAWAY",
      roleId: sponsorPings.extraRoleId || ""
    },
    daily: {
      title: "DAILY GIVEAWAY",
      roleId: sponsorPings.dailyRoleId || ""
    },
    weekly: {
      title: "WEEKLY GIVEAWAY",
      roleId: sponsorPings.weeklyRoleId || ""
    }
  };

  return layouts[type];
}

async function replySponsorPing(interaction, type, overrideRoleId = null) {
  const entry = getSponsorPingLayout(type);
  const roleId = overrideRoleId || entry?.roleId || null;
  await interaction.reply({
    content: buildSponsorPingMessage(type, roleId),
    allowedMentions: roleId ? { roles: [roleId] } : { parse: [] }
  });
}

function buildGiveawayEndedEmbed(giveaway, winnerText, reroll = false) {
  return buildEmbed(
    reroll ? "🔁 Giveaway Rerolled" : "🎉 Giveaway Ended",
    [
      "━━━━━━━━━━━━━━━━━━━━━━━",
      reroll ? "A new winner has been drawn." : "This giveaway is now closed.",
      "━━━━━━━━━━━━━━━━━━━━━━━",
      "",
      `🎁 Prize: **${giveaway.prize}**`,
      `🏆 Winner(s): ${winnerText}`,
      `👑 Host: <@${giveaway.hostId}>`,
      `👥 Participants: **${[...new Set(giveaway.participants)].length}**`,
      "",
      `Open ticket in <#${giveawayTicketChannelId}>`
    ].join("\n")
  );
}

function buildGiveawayButton(id, disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`giveaway_join:${id}`)
      .setLabel("Join")
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled)
  );
}

function buildRpsButtons(gameId, disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`rps:${gameId}:rock`)
      .setLabel("Rock")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`rps:${gameId}:paper`)
      .setLabel("Paper")
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`rps:${gameId}:scissors`)
      .setLabel("Scissors")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled)
  );
}

function buildTicketButtons() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("ticket_type_select")
      .setPlaceholder("Choose a ticket category")
      .addOptions(
        config.tickets.types.map((ticketType) => ({
          label: ticketType.label,
          value: ticketType.key
        }))
      )
  );
}

function buildTicketActionButtons(ticket) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_close")
      .setLabel("Close Ticket")
      .setStyle(ButtonStyle.Danger)
  );

  if (isInvestmentTicket(ticket)) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId("investment_manage")
        .setLabel(ticket.details?.investmentBaseAmountValue ? "Edit Investment" : "Set Investment")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("investment_refresh")
        .setLabel("Refresh Investment")
        .setStyle(ButtonStyle.Secondary)
    );
  }

  return row;
}

function buildInvestPanelButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("invest_ticket_start")
      .setLabel("Create Support Ticket")
      .setStyle(ButtonStyle.Primary)
  );
}

function areApplicationsOpen() {
  return featureSettingsStore.applications?.isOpen !== false;
}

function buildApplicationButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("application_start")
      .setLabel("Start Application")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!areApplicationsOpen())
  );
}

function buildApplicationRoleSelect() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("application_role_select")
      .setPlaceholder("Choose the role you want to apply for")
      .addOptions(
        config.applications.roles.map((role) => ({
          label: role.label,
          value: role.key
        }))
      )
  );
}

function buildApplicationReviewButtons(applicationId, disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`application_interview:${applicationId}`)
      .setLabel("Interview")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`application_accept:${applicationId}`)
      .setLabel("Accept")
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`application_reject:${applicationId}`)
      .setLabel("Reject")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled)
  );
}

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(token);
  const commands = buildCommands();

  if (guildIds.length > 0) {
    try {
      for (const guildId of guildIds) {
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
          body: commands
        });
        console.log(`Registered guild commands for guild ${guildId}`);
      }
      await rest.put(Routes.applicationCommands(clientId), {
        body: []
      });
      console.log("Cleared global commands to avoid duplicates");
      return;
    } catch (error) {
      if (error.code === 50001) {
        console.error(
          [
            `Missing access while registering guild commands for GUILD_ID ${guildIds.join(", ")}.`,
            "Check that:",
            "- the bot is invited to that server",
            "- the GUILD_ID is the correct server ID",
            "- the invite used both `bot` and `applications.commands` scopes"
          ].join("\n")
        );
        console.error("Skipping global fallback to avoid duplicate commands.");
        return;
      } else {
        throw error;
      }
    }
  }

  await rest.put(Routes.applicationCommands(clientId), {
    body: commands
  });
  console.log("Registered global commands");
}

function persistGiveaways() {
  store.saveJson("giveaways.json", giveawaysStore).catch(() => null);
}

function persistTickets() {
  store.saveJson("tickets.json", ticketsStore).catch(() => null);
}

function persistReactionRolls() {
  store.saveJson("reaction-rolls.json", reactionRollsStore).catch(() => null);
}

function persistReactionRoles() {
  store.saveJson("reaction-roles.json", reactionRolesStore).catch(() => null);
}

async function handleStarboardReaction(reaction) {
  // Minimal noop implementation to avoid startup crash.
  // Extend this to implement starboard posting logic later.
  try {
    if (!reaction || !reaction.message) return;
    // If starboard not configured, skip
    if (!featureSettingsStore || !featureSettingsStore.community || !featureSettingsStore.community.starboardChannelId) return;
    return;
  } catch (err) {
    return;
  }
}

function persistApplications() {
  store.saveJson("applications.json", applicationsStore).catch(() => null);
}

function persistWarnings() {
  store.saveJson("warnings.json", warningsStore).catch(() => null);
}

function saveCurrentConfig() {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function findGiveawayByMessageId(messageId) {
  return giveawaysStore.find((entry) => entry.messageId === messageId);
}

function findApplicationById(applicationId) {
  return applicationsStore.find((entry) => entry.id === applicationId);
}

function findApplicationRole(roleKey) {
  return config.applications.roles.find((role) => role.key === roleKey);
}

function normalizeApplicationRoleKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getLatestApplicationForUser(userId) {
  return applicationsStore
    .filter((entry) => entry.userId === userId)
    .sort((left, right) => (right.createdAt || 0) - (left.createdAt || 0))[0] || null;
}

function getApplicationCooldownMs() {
  const cooldownDays = Number(featureSettingsStore.applications?.cooldownDays || 0);
  return cooldownDays > 0 ? cooldownDays * 24 * 60 * 60 * 1000 : 0;
}

function getTicketLimitPerUser() {
  const ticketLimit = Number(featureSettingsStore.tickets?.maxOpenPerUser || 1);
  return Number.isInteger(ticketLimit) && ticketLimit > 0 ? ticketLimit : 1;
}

function countOpenTicketsForUser(guildIdValue, userId) {
  return ticketsStore.filter((entry) => entry.guildId === guildIdValue && entry.ownerId === userId && !entry.closed).length;
}

function findOpenTicketForUserByType(guildIdValue, userId, typeKey) {
  return ticketsStore.find(
    (entry) => entry.guildId === guildIdValue && entry.ownerId === userId && entry.typeKey === typeKey && !entry.closed
  ) || null;
}

function findTicketType(ticketTypeKey) {
  return config.tickets.types.find((ticketType) => ticketType.key === ticketTypeKey);
}

function getWarningsForUser(guildIdValue, userId) {
  return warningsStore.filter((entry) => entry.guildId === guildIdValue && entry.userId === userId);
}

function sanitizeChannelSegment(value, fallback = "ticket") {
  const sanitized = value
    .toLowerCase()
    .replace(/<@!?(\d+)>/g, "$1")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 10);

  return sanitized || fallback;
}

function extractUserId(value) {
  const match = value.match(/^<@!?(\d+)>$|^(\d{15,20})$/);
  return match ? match[1] || match[2] : null;
}

function parseDurationToMs(value) {
  const normalized = value.trim().toLowerCase();
  const match = normalized.match(/^(\d+)\s*([smhd])$/);

  if (!match) {
    return null;
  }

  const amount = Number(match[1]);
  const unit = match[2];

  if (!Number.isInteger(amount) || amount < 1) {
    return null;
  }

  const unitMap = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };

  return amount * unitMap[unit];
}

function parseInvestmentAmount(value) {
  if (!value) {
    return null;
  }

  const normalized = value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/,/g, "")
    .replace(/\s+/g, "");
  const match = normalized.match(/^(\d+(?:\.\d+)?)([kmbt])?$/);

  if (!match) {
    return null;
  }

  const amount = Number(match[1]);
  const suffix = match[2] || "";
  const multipliers = {
    "": 1,
    k: 1e3,
    m: 1e6,
    b: 1e9,
    t: 1e12
  };

  return Number.isFinite(amount) ? amount * multipliers[suffix] : null;
}

function parseDailyPercent(value) {
  if (!value) {
    return null;
  }

  const amount = Number(value.toString().trim().replace(/%/g, ""));
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

function formatInvestmentAmount(value) {
  if (!Number.isFinite(value)) {
    return "-";
  }

  const abs = Math.abs(value);
  if (abs >= 1e12) {
    return `${(value / 1e12).toFixed(2).replace(/\.00$/, "")}T`;
  }

  if (abs >= 1e9) {
    return `${(value / 1e9).toFixed(2).replace(/\.00$/, "")}B`;
  }

  if (abs >= 1e6) {
    return `${(value / 1e6).toFixed(2).replace(/\.00$/, "")}M`;
  }

  if (abs >= 1e3) {
    return `${(value / 1e3).toFixed(2).replace(/\.00$/, "")}K`;
  }

  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function isInvestmentTicket(ticket) {
  return Boolean(
    ticket &&
    ticket.typeKey === "support" &&
    (ticket.details?.investAmount || ticket.details?.investDuration)
  );
}

function calculateInvestmentProjection(ticket) {
  const baseAmount = ticket?.details?.investmentBaseAmountValue;
  const dailyPercent = ticket?.details?.investmentDailyPercent;
  const startedAt = ticket?.details?.investmentStartedAt;

  if (!Number.isFinite(baseAmount) || !Number.isFinite(dailyPercent) || !startedAt) {
    return null;
  }

  const elapsedDays = Math.max(0, Math.floor((Date.now() - startedAt) / (24 * 60 * 60 * 1000)));
  const currentTotal = baseAmount * Math.pow(1 + dailyPercent / 100, elapsedDays);

  return {
    baseAmount,
    dailyPercent,
    elapsedDays,
    currentTotal,
    profit: currentTotal - baseAmount,
    startedAt
  };
}

function buildInvestmentSummaryText(ticket) {
  const projection = calculateInvestmentProjection(ticket);

  if (!projection) {
    return [
      `Manager: <@${investmentManagerId}>`,
      "Status: Waiting for the investment manager to set the start investment and daily percent."
    ].join("\n");
  }

  return [
    `Manager: <@${investmentManagerId}>`,
    `Start Investment: **${formatInvestmentAmount(projection.baseAmount)}**`,
    `Daily Percent: **${projection.dailyPercent}%**`,
    `Days Counted: **${projection.elapsedDays}**`,
    `Current Total: **${formatInvestmentAmount(projection.currentTotal)}**`,
    `Profit Added: **${formatInvestmentAmount(projection.profit)}**`,
    `Tracking Started: <t:${Math.floor(projection.startedAt / 1000)}:F>`,
    ticket.details?.investmentUpdatedById ? `Last edited by: <@${ticket.details.investmentUpdatedById}>` : null
  ].filter(Boolean).join("\n");
}

function buildInvestmentTicketEmbed(ticket) {
  return buildEmbed(
    "💸 Investment Ticket",
    [
      "**Title**",
      "",
      "📈 **Investment Request**",
      "",
      "**Description**",
      "",
      "This ticket tracks the investment automatically based on full days and the configured daily percent.",
      "",
      "**Creation Form**",
      buildCreationFormText({ key: "support" }, ticket.details || {}, ticket.reason),
      "",
      "**Investment Tracking**",
      buildInvestmentSummaryText(ticket)
    ].join("\n")
  );
}

function buildTicketPanelEmbed(ticket) {
  const ticketType = findTicketType(ticket.typeKey) || {
    key: ticket.typeKey || "",
    label: ticket.typeLabel || "Ticket"
  };
  const details = ticket.details || {};
  const reason = ticket.reason || "";

  const embedLines = [
    `User: <@${ticket.ownerId}>`,
    ticket.createdById && ticket.createdById !== ticket.ownerId ? `Opened by: <@${ticket.createdById}>` : null,
    `Category: **${ticket.typeLabel || ticketType.label || "Ticket"}**`
  ].filter(Boolean);

  if (ticketType.key === "claim-giveaway") {
    embedLines.push(`Giveaway Host: ${details.giveawayHostMention || details.giveawayHostRaw}`);
    embedLines.push(`Win Amount: ${details.winAmount}`);
    embedLines.push(`IGN: ${details.ign}`);
  }

  if (ticketType.key === "report-someone") {
    embedLines.push(`Reported User: ${details.reportTargetMention || details.reportTargetRaw}`);
    embedLines.push(`Proof: ${details.proof || "-"}`);
  }

  if (ticketType.key === "sponsor-giveaway") {
    embedLines.push(`Amount: ${details.amount}`);
  }

  if (ticketType.key === "partner-request") {
    embedLines.push(`DC Link: ${details.dcLink}`);
    embedLines.push(`Member: ${details.memberCount}`);
  }

  embedLines.push(`Creation Form:\n${buildCreationFormText(ticketType, details, reason)}`);

  if (ticketType.key === "claim-giveaway") {
    return buildEmbed(
      "🎁 Prize Claim Ticket",
      [
        "**Title**",
        "",
        "🏆 **Prize Claim**",
        "",
        "**Description**",
        "",
        "Congratulations! 🎉",
        "",
        "If you have won a giveaway, please open a ticket here and provide:",
        "",
        "👤 Your Minecraft Username",
        "🎁 The giveaway you won",
        "📸 A screenshot of your win (if required)",
        "",
        "A staff member will process your prize as soon as possible. (PS. if you ping the ticket wil be auto closed)",
        "",
        `Creation Form:
${buildCreationFormText(ticketType, details, reason)}`
      ].join("\n")
    );
  }

  if (ticketType.key === "report-someone") {
    return buildEmbed(
      "🚨 Report Ticket",
      [
        "**Title**",
        "",
        "🛠️ **Support Ticket**",
        "",
        "**Description**",
        "",
        "Please describe your issue in as much detail as possible.",
        "",
        "📌 **Please include:**",
        "• Dc Username",
        "• Player involved (if applicable)",
        "• Screenshots or evidence",
        "• A brief description of the issue",
        "",
        "Our team will assist you as soon as possible.",
        "",
        `Creation Form:
${buildCreationFormText(ticketType, details, reason)}`
      ].join("\n")
    );
  }

  if (ticketType.key === "sponsor-giveaway") {
    return buildEmbed(
      "💰 Sponsor Ticket",
      [
        "**Title**",
        "",
        "🎁 **Sponsor Giveaway**",
        "",
        "**Description**",
        "",
        "Thank you for wanting to sponsor a giveaway.",
        "",
        "Please provide the sponsor amount and any useful details below.",
        "",
        "Our staff team will review your request as soon as possible.",
        "",
        `Creation Form:
${buildCreationFormText(ticketType, details, reason)}`
      ].join("\n")
    );
  }

  if (ticketType.key === "partner-request") {
    return buildEmbed(
      "🤝 Partner Request Ticket",
      [
        "**Title**",
        "",
        "🤝 **Partner Request**",
        "",
        "**Description**",
        "",
        "Please send your server information so we can review your partnership request.",
        "",
        "**Requirements:**",
        "**<10 = we dont partner**",
        "**10-50 = we partner you member**",
        "**50-70 = we partner you partner**",
        "**70-100 = we partner+here you partner**",
        "**100+ = your reqs**",
        "",
        "Make sure your Discord link and member count are correct.",
        "",
        "Our team will get back to you as soon as possible.",
        "",
        `Creation Form:
${buildCreationFormText(ticketType, details, reason)}`
      ].join("\n")
    );
  }

  if (ticketType.key === "support") {
    return isInvestmentTicket(ticket)
      ? buildInvestmentTicketEmbed(ticket)
      : buildEmbed(
          "🛠️ Support Ticket",
          [
            "**Title**",
            "",
            "❓ **Support Request**",
            "",
            "**Description**",
            "",
            "Please explain your issue clearly so our staff can help you faster.",
            "",
            "Include all important details in your form below.",
            "",
            "Our support team will assist you as soon as possible.",
            "",
            `Creation Form:
${buildCreationFormText(ticketType, details, reason)}`
          ].join("\n")
        );
  }

  return buildEmbed("New Ticket", embedLines.join("\n"));
}

function buildTicketMentions(ticket) {
  const claimGiveawayRoleId = config.applications.staffRoleId || config.tickets.supportRoleId;
  return ticket.typeKey === "claim-giveaway"
    ? [`<@&${claimGiveawayRoleId}>`]
    : [`<@${ticket.ownerId}>`, `<@&${config.applications.staffRoleId}>`];
}

async function refreshTicketPanelMessage(ticket) {
  if (!ticket || ticket.closed) {
    return false;
  }

  const channel = await client.channels.fetch(ticket.channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    return false;
  }

  let panelMessage = null;
  if (ticket.panelMessageId) {
    panelMessage = await channel.messages.fetch(ticket.panelMessageId).catch(() => null);
  }

  if (!panelMessage) {
    const recentMessages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
    panelMessage = recentMessages?.find((entry) => entry.author.id === client.user.id && entry.embeds.length > 0) || null;
    if (panelMessage) {
      ticket.panelMessageId = panelMessage.id;
      persistTickets();
    }
  }

  if (!panelMessage) {
    return false;
  }

  await panelMessage.edit({
    content: buildTicketMentions(ticket).join(" "),
    embeds: [buildTicketPanelEmbed(ticket)],
    components: [buildTicketActionButtons(ticket)]
  }).catch(() => null);

  return true;
}

async function refreshInvestmentTicketMessage(ticket) {
  if (!isInvestmentTicket(ticket) || ticket.closed) {
    return;
  }

  await refreshTicketPanelMessage(ticket);
}

function createInvestmentManageModal(ticket) {
  const modal = new ModalBuilder()
    .setCustomId("investment_manage_modal")
    .setTitle(ticket.details?.investmentBaseAmountValue ? "Edit Investment" : "Set Investment");

  const amountInput = new TextInputBuilder()
    .setCustomId("investment_start_amount")
    .setLabel("Start investment")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100)
    .setPlaceholder("e.g. 10M");

  if (ticket.details?.investmentBaseAmountRaw) {
    amountInput.setValue(ticket.details.investmentBaseAmountRaw);
  }

  const percentInput = new TextInputBuilder()
    .setCustomId("investment_daily_percent")
    .setLabel("Daily percent")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(20)
    .setPlaceholder("e.g. 10 or 10%");

  if (Number.isFinite(ticket.details?.investmentDailyPercent)) {
    percentInput.setValue(String(ticket.details.investmentDailyPercent));
  }

  return modal.addComponents(
    new ActionRowBuilder().addComponents(amountInput),
    new ActionRowBuilder().addComponents(percentInput)
  );
}

function applyInvestmentValues(ticket, rawAmount, amountValue, percentValue, updatedById, resetStartedAt = true) {
  ticket.details.investmentBaseAmountRaw = rawAmount;
  ticket.details.investmentBaseAmountValue = amountValue;
  ticket.details.investmentDailyPercent = percentValue;
  if (resetStartedAt || !ticket.details.investmentStartedAt) {
    ticket.details.investmentStartedAt = Date.now();
  }
  ticket.details.investmentUpdatedById = updatedById;
  ticket.details.investmentUpdatedAt = Date.now();
}

async function updateInvestmentTicket(interaction, ticket) {
  const rawAmount = interaction.fields.getTextInputValue("investment_start_amount");
  const rawPercent = interaction.fields.getTextInputValue("investment_daily_percent");
  const amountValue = parseInvestmentAmount(rawAmount);
  const percentValue = parseDailyPercent(rawPercent);

  if (!Number.isFinite(amountValue) || !Number.isFinite(percentValue)) {
    await interaction.reply({
      content: "Please enter a valid start investment like `10M` and a valid daily percent like `5` or `5%`.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  applyInvestmentValues(ticket, rawAmount, amountValue, percentValue, interaction.user.id, true);
  persistTickets();

  await refreshInvestmentTicketMessage(ticket);
  await sendModLog("Investment Updated", [
    `Ticket: <#${ticket.channelId}>`,
    `Owner: <@${ticket.ownerId}>`,
    `Start Investment: ${rawAmount}`,
    `Daily Percent: ${percentValue}%`,
    `Updated by: ${interaction.user.tag}`
  ]);

  await interaction.reply({
    content: "Investment values updated.",
    flags: MessageFlags.Ephemeral
  });
}

async function handleInvestCommand(interaction) {
  const ticket = await ensureTicketManagementContext(interaction);
  if (!ticket) {
    return;
  }

  if (!isInvestmentTicket(ticket)) {
    await interaction.reply({
      content: "This channel is not an investment ticket.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "view") {
    await interaction.reply({
      embeds: [buildInvestmentTicketEmbed(ticket)],
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (subcommand === "refresh") {
    await refreshInvestmentTicketMessage(ticket);
    await interaction.reply({
      content: "Investment values refreshed.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (interaction.user.id !== investmentManagerId) {
    await interaction.reply({
      content: "Only the investment manager can edit the calculation amount.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (subcommand === "set") {
    const rawAmount = interaction.options.getString("amount", true);
    const rawPercent = interaction.options.getString("daily_percent", true);
    const amountValue = parseInvestmentAmount(rawAmount);
    const percentValue = parseDailyPercent(rawPercent);

    if (!Number.isFinite(amountValue) || !Number.isFinite(percentValue)) {
      await interaction.reply({
        content: "Please enter a valid start investment like `10M` and a valid daily percent like `5` or `5%`.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    applyInvestmentValues(ticket, rawAmount, amountValue, percentValue, interaction.user.id, true);
    persistTickets();
    await refreshInvestmentTicketMessage(ticket);
    await sendModLog("Investment Updated", [
      `Ticket: <#${ticket.channelId}>`,
      `Owner: <@${ticket.ownerId}>`,
      `Start Investment: ${rawAmount}`,
      `Daily Percent: ${percentValue}%`,
      `Updated by: ${interaction.user.tag}`
    ]);

    await interaction.reply({
      content: "Investment values updated.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (subcommand === "add") {
    const rawAddAmount = interaction.options.getString("amount", true);
    const addAmountValue = parseInvestmentAmount(rawAddAmount);

    if (!Number.isFinite(addAmountValue)) {
      await interaction.reply({
        content: "Please enter a valid amount to add like `1M`.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const projection = calculateInvestmentProjection(ticket);
    if (!projection) {
      await interaction.reply({
        content: "Set the start investment and daily percent first.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const newBaseAmount = projection.currentTotal + addAmountValue;
    applyInvestmentValues(
      ticket,
      formatInvestmentAmount(newBaseAmount),
      newBaseAmount,
      projection.dailyPercent,
      interaction.user.id,
      true
    );
    persistTickets();
    await refreshInvestmentTicketMessage(ticket);
    await sendModLog("Investment Added", [
      `Ticket: <#${ticket.channelId}>`,
      `Owner: <@${ticket.ownerId}>`,
      `Current Total Before Add: ${formatInvestmentAmount(projection.currentTotal)}`,
      `Added Amount: ${rawAddAmount}`,
      `New Start Investment: ${formatInvestmentAmount(newBaseAmount)}`,
      `Daily Percent: ${projection.dailyPercent}%`,
      `Updated by: ${interaction.user.tag}`
    ]);

    await interaction.reply({
      content: `Added **${rawAddAmount}**. New start investment is **${formatInvestmentAmount(newBaseAmount)}** and day tracking restarted from now.`,
      flags: MessageFlags.Ephemeral
    });
  }
}

function startInvestmentWatcher() {
  setInterval(async () => {
    const tickets = ticketsStore.filter((ticket) => isInvestmentTicket(ticket) && !ticket.closed);
    for (const ticket of tickets) {
      await refreshInvestmentTicketMessage(ticket);
    }
  }, 60 * 60 * 1000);
}

const serverStatsUpdateTimers = new Map();

function getServerStatsConfig() {
  if (!config.serverStats) {
    config.serverStats = {};
  }

  if (!config.serverStats.channelIds) {
    config.serverStats.channelIds = {};
  }

  return config.serverStats;
}

async function buildServerStatsChannelNames(guild) {
  const members = await guild.members.fetch().catch((error) => {
    console.error("Failed to fetch members for server stats:", error?.message || error);
    return guild.members.cache;
  });
  const botCount = members.filter((member) => member.user.bot).size;
  const memberCount = Math.max(guild.memberCount - botCount, 0);

  return {
    members: `Members: ${memberCount}`,
    bots: `Bots: ${botCount}`,
    boosts: `Boosts: ${guild.premiumSubscriptionCount || 0}`
  };
}

function findStatsChannel(guild, categoryId, key) {
  const statsConfig = getServerStatsConfig();
  const configuredId = statsConfig.channelIds[key];
  const configuredChannel = configuredId
    ? guild.channels.cache.get(configuredId) || null
    : null;

  if (configuredChannel && configuredChannel.parentId === categoryId) {
    return configuredChannel;
  }

  const prefixes = {
    members: "Members:",
    bots: "Bots:",
    boosts: "Boosts:"
  };

  return guild.channels.cache.find((channel) =>
    channel.parentId === categoryId &&
    channel.type === ChannelType.GuildVoice &&
    channel.name.startsWith(prefixes[key])
  ) || null;
}

async function ensureStatsChannel(guild, categoryId, key, name) {
  const statsConfig = getServerStatsConfig();
  let channel = findStatsChannel(guild, categoryId, key);

  if (!channel) {
    channel = await guild.channels.create({
      name,
      type: ChannelType.GuildVoice,
      parent: categoryId,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          type: OverwriteType.Role,
          deny: [PermissionFlagsBits.Connect]
        }
      ]
    });
  }

  statsConfig.channelIds[key] = channel.id;

  if (channel.name !== name) {
    await channel.setName(name).catch((error) => {
      console.error(`Failed to update server stat channel ${key}:`, error?.message || error);
    });
  }

  return channel;
}

async function updateServerStats(guild) {
  const statsConfig = getServerStatsConfig();

  if (!statsConfig.enabled || !statsConfig.categoryId || !guild) {
    return;
  }

  const category = guild.channels.cache.get(statsConfig.categoryId);
  if (!category || category.type !== ChannelType.GuildCategory) {
    console.error(`Server stats category not found: ${statsConfig.categoryId}`);
    return;
  }

  const names = await buildServerStatsChannelNames(guild);

  await ensureStatsChannel(guild, statsConfig.categoryId, "members", names.members);
  await ensureStatsChannel(guild, statsConfig.categoryId, "bots", names.bots);
  await ensureStatsChannel(guild, statsConfig.categoryId, "boosts", names.boosts);
  saveCurrentConfig();
}

function queueServerStatsUpdate(guild) {
  if (!guild) {
    return;
  }

  const existingTimer = serverStatsUpdateTimers.get(guild.id);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  serverStatsUpdateTimers.set(guild.id, setTimeout(async () => {
    await configContext.run(guild.id, async () => {
      serverStatsUpdateTimers.delete(guild.id);
      await updateServerStats(guild).catch((error) => {
        console.error("Failed to update server stats:", error);
      });
    });
  }, 5000));
}

function startServerStatsWatcher() {
  for (const guild of client.guilds.cache.values()) {
    queueServerStatsUpdate(guild);
  }

  setInterval(() => {
    for (const guild of client.guilds.cache.values()) {
      queueServerStatsUpdate(guild);
    }
  }, 10 * 60 * 1000);
}

function buildCreationFormText(ticketType, details, reason) {
  if (ticketType.key === "claim-giveaway") {
    return [
      `Who made the giveaway: ${details.giveawayHostMention || details.giveawayHostRaw || "-"}`,
      `How much did you win: ${details.winAmount || "-"}`,
      `IGN: ${details.ign || "-"}`,
      `Extra note: ${reason || "No extra details provided."}`
    ].join("\n");
  }

  if (ticketType.key === "report-someone") {
    return [
      `Who do you want to report: ${details.reportTargetMention || details.reportTargetRaw || "-"}`,
      `Why: ${reason || "-"}`,
      `Optional proof: ${details.proof || "-"}`
    ].join("\n");
  }

  if (ticketType.key === "sponsor-giveaway") {
    return `How much: ${details.amount || "-"}`;
  }

  if (ticketType.key === "partner-request") {
    return [
      `DC link: ${details.dcLink || "-"}`,
      `Member: ${details.memberCount || "-"}`
    ].join("\n");
  }

  if (ticketType.key === "support") {
    if (details.investAmount || details.investDuration) {
      return [
        `How much do you want to invest: ${details.investAmount || "-"}`,
        `In how long: ${details.investDuration || "-"}`,
        details.investmentBaseAmountRaw ? `Start investment: ${details.investmentBaseAmountRaw}` : null,
        Number.isFinite(details.investmentDailyPercent) ? `Daily percent: ${details.investmentDailyPercent}%` : null,
        `Extra note: ${reason || "No extra details provided."}`
      ].filter(Boolean).join("\n");
    }

    return `Why: ${reason || "-"}`;
  }

  return reason || "No extra details provided.";
}

async function buildChannelTranscript(channel) {
  if (!channel || !channel.isTextBased()) {
    return "No transcript available.";
  }

  const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
  if (!messages || messages.size === 0) {
    return "No messages found.";
  }

  return [...messages.values()]
    .reverse()
    .map((message) => {
      const timestamp = new Date(message.createdTimestamp).toISOString();
      const content = message.content || "[no text content]";
      return `[${timestamp}] ${message.author.tag}: ${content}`;
    })
    .join("\n")
    .slice(0, 3900);
}

async function sendModLog(title, lines) {
  const logChannelId = config.modLogs?.channelId || config.tickets.transcriptChannelId;
  if (!logChannelId) {
    return;
  }

  const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
  if (!logChannel || !logChannel.isTextBased()) {
    return;
  }

  await logChannel.send({
    embeds: [buildEmbed(title, lines.filter(Boolean).join("\n"))]
  }).catch(() => null);
}

async function sendTicketTranscriptDm(userId, channel, ticket, closeReason) {
  const user = await client.users.fetch(userId).catch(() => null);
  if (!user) {
    return;
  }

  const transcript = await buildChannelTranscript(channel);
  await user.send({
    embeds: [
      buildEmbed(
        "Ticket Transcript",
        [
          `Category: ${ticket.typeLabel || "Unknown"}`,
          `Close reason: ${closeReason}`,
          "",
          "Transcript:",
          transcript
        ].join("\n")
      )
    ]
  }).catch(() => null);
}

function scheduleChannelDelete(channelId, reason, delayMs = 1500) {
  setTimeout(async () => {
    try {
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel) {
        return;
      }

      await channel.delete(reason).catch((error) => {
        console.error(`Failed to delete channel ${channelId}:`, error?.message || error);
      });
    } catch (error) {
      console.error(`Failed to schedule delete for channel ${channelId}:`, error?.message || error);
    }
  }, delayMs);
}

function pickWinners(participants, amount) {
  const pool = [...participants];
  const winners = [];

  while (pool.length > 0 && winners.length < amount) {
    const index = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(index, 1)[0]);
  }

  return winners;
}

function pickGiveawayWinners(giveaway, amount) {
  const weightedPool = [];
  for (const userId of giveaway.participants) {
    const entries = giveaway.entryCounts?.[userId] || 1;
    for (let count = 0; count < entries; count += 1) {
      weightedPool.push(userId);
    }
  }

  const winners = [];
  const seen = new Set();
  while (weightedPool.length > 0 && winners.length < amount) {
    const index = Math.floor(Math.random() * weightedPool.length);
    const picked = weightedPool[index];
    weightedPool.splice(index, 1);
    if (seen.has(picked)) {
      continue;
    }
    seen.add(picked);
    winners.push(picked);
  }

  return winners;
}

async function finalizeGiveaway(giveaway, reroll = false) {
  if (!reroll && giveaway.ended) {
    return;
  }

  const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    return;
  }

  const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
  if (!message) {
    return;
  }

  const winners = pickGiveawayWinners(giveaway, giveaway.winnerCount);
  const winnerText =
    winners.length > 0
      ? winners.map((userId) => `<@${userId}>`).join(", ")
      : "No one joined.";

  const endEmbed = buildGiveawayEndedEmbed(giveaway, winnerText, reroll);

  if (!reroll) {
    giveaway.ended = true;
    giveaway.winners = winners;
    persistGiveaways();

    await sendModLog("Giveaway Ended", [
      `Prize: ${giveaway.prize}`,
      `Host: <@${giveaway.hostId}>`,
      `Winner(s): ${winnerText}`,
      `Participants: ${giveaway.participants.length}`
    ]);
  }

  await message.edit({
    embeds: [endEmbed],
    components: [buildGiveawayButton(giveaway.id, true)]
  });

  await channel.send({
    content: reroll
      ? `🔁 **REROLL DONE**
Prize: **${giveaway.prize}**
Winner(s): ${winnerText}
Open ticket in <#${giveawayTicketChannelId}>`
      : `🎉 **GIVEAWAY ENDED**
Prize: **${giveaway.prize}**
Winner(s): ${winnerText}
Open ticket in <#${giveawayTicketChannelId}>`
  });
}

async function rerollGiveawayByMessageId(interaction, messageId) {
  const giveaway = findGiveawayByMessageId(messageId);

  if (!giveaway) {
    await interaction.reply({
      content: "No giveaway found with that message ID.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  await finalizeGiveaway(giveaway, true);

  await sendModLog("Giveaway Reroll Requested", [
    `Prize: ${giveaway.prize}`,
    `Requested by: ${interaction.user.tag}`,
    `Message ID: ${giveaway.messageId}`
  ]);

  await interaction.reply({
    content: "Giveaway rerolled.",
    flags: MessageFlags.Ephemeral
  });
}

async function muteMember(interaction) {
  if (!interaction.guild) {
    await interaction.reply({
      content: "This command only works inside a server.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const targetUser = interaction.options.getUser("user", true);
  const reason = interaction.options.getString("reason") || "No reason provided.";
  const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

  if (!targetMember) {
    await interaction.reply({
      content: "That member could not be found in this server.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (targetMember.id === interaction.user.id) {
    await interaction.reply({
      content: "You cannot mute yourself.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (targetMember.id === client.user.id) {
    await interaction.reply({
      content: "You cannot mute the bot.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (!targetMember.moderatable) {
    await interaction.reply({
      content: "I cannot mute this member. Check role order and permissions.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const maxTimeoutMs = 28 * 24 * 60 * 60 * 1000;
  await targetMember.timeout(maxTimeoutMs, reason).catch(async () => {
    await interaction.reply({
      content: "Failed to mute that member.",
      flags: MessageFlags.Ephemeral
    });
  });

  if (interaction.replied) {
    return;
  }

  await sendModLog("Member Muted", [
    `User: <@${targetMember.id}>`,
    `Moderator: ${interaction.user.tag}`,
    "Timeout: 28 days (Discord maximum)",
    `Reason: ${reason}`
  ]);

  await interaction.reply({
    content: `${targetUser.tag} has been muted for 28 days (Discord maximum timeout).`,
    flags: MessageFlags.Ephemeral
  });
}

function startGiveawayWatcher() {
  setInterval(async () => {
    await startScheduledGiveaways();
    const dueGiveaways = giveawaysStore.filter(
      (entry) => !entry.ended && entry.endsAt <= Date.now()
    );

    for (const giveaway of dueGiveaways) {
      await finalizeGiveaway(giveaway);
    }
  }, 5000);
}

function createGiveawayModal() {
  const modal = new ModalBuilder()
    .setCustomId("giveaway_create_modal")
    .setTitle("Create Giveaway");

  const prizeInput = new TextInputBuilder()
    .setCustomId("prize")
    .setLabel("Prize")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100);

  const durationInput = new TextInputBuilder()
    .setCustomId("duration")
    .setLabel("Duration")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder("e.g. 30s, 15m, 2h, 1d");

  const winnerInput = new TextInputBuilder()
    .setCustomId("winners")
    .setLabel("Winner count")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder("e.g. 1");

  return modal.addComponents(
    new ActionRowBuilder().addComponents(prizeInput),
    new ActionRowBuilder().addComponents(durationInput),
    new ActionRowBuilder().addComponents(winnerInput)
  );
}

function createTicketReasonModal(ticketType) {
  const modal = new ModalBuilder()
    .setCustomId(`ticket_reason_modal:${ticketType.key}`)
    .setTitle(ticketType.label);

  if (ticketType.key === "claim-giveaway") {
    const hostInput = new TextInputBuilder()
      .setCustomId("giveaway_host")
      .setLabel("Who made the giveaway?")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(100)
      .setPlaceholder("@user or username");

    const amountInput = new TextInputBuilder()
      .setCustomId("win_amount")
      .setLabel("How much did you win?")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(100)
      .setPlaceholder("e.g. 1M");

    const ignInput = new TextInputBuilder()
      .setCustomId("ign")
      .setLabel("What is your IGN?")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(100)
      .setPlaceholder("Your in-game name");

    const reasonInput = new TextInputBuilder()
      .setCustomId("reason")
      .setLabel("Creation form")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setMaxLength(500);

    return modal.addComponents(
      new ActionRowBuilder().addComponents(hostInput),
      new ActionRowBuilder().addComponents(amountInput),
      new ActionRowBuilder().addComponents(ignInput),
      new ActionRowBuilder().addComponents(reasonInput)
    );
  }

  if (ticketType.key === "report-someone") {
    const reportUserInput = new TextInputBuilder()
      .setCustomId("report_target")
      .setLabel("Who do you want to report?")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(100)
      .setPlaceholder("@user or username");

    const whyInput = new TextInputBuilder()
      .setCustomId("reason")
      .setLabel("Why?")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(500);

    const proofInput = new TextInputBuilder()
      .setCustomId("proof")
      .setLabel("Optional proof")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setMaxLength(500);

    return modal.addComponents(
      new ActionRowBuilder().addComponents(reportUserInput),
      new ActionRowBuilder().addComponents(whyInput),
      new ActionRowBuilder().addComponents(proofInput)
    );
  }

  if (ticketType.key === "sponsor-giveaway") {
    const amountInput = new TextInputBuilder()
      .setCustomId("amount")
      .setLabel("How much")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(100)
      .setPlaceholder("e.g. 1M");

    return modal.addComponents(new ActionRowBuilder().addComponents(amountInput));
  }

  if (ticketType.key === "partner-request") {
    const linkInput = new TextInputBuilder()
      .setCustomId("dc_link")
      .setLabel("DC link")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(200);

    const memberInput = new TextInputBuilder()
      .setCustomId("member_count")
      .setLabel("Member")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(50)
      .setPlaceholder("e.g. 500");

    return modal.addComponents(
      new ActionRowBuilder().addComponents(linkInput),
      new ActionRowBuilder().addComponents(memberInput)
    );
  }

  if (ticketType.key === "support") {
    const whyInput = new TextInputBuilder()
      .setCustomId("reason")
      .setLabel("Why")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(500);

    return modal.addComponents(new ActionRowBuilder().addComponents(whyInput));
  }

  const reasonInput = new TextInputBuilder()
    .setCustomId("reason")
    .setLabel("What is this about?")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(500);

  return modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
}

function createInvestTicketModal() {
  const modal = new ModalBuilder()
    .setCustomId("invest_ticket_modal")
    .setTitle("Invest Ticket");

  const amountInput = new TextInputBuilder()
    .setCustomId("invest_amount")
    .setLabel("How much do you want to invest?")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100)
    .setPlaceholder("e.g. 10M");

  const durationInput = new TextInputBuilder()
    .setCustomId("invest_duration")
    .setLabel("In how long?")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100)
    .setPlaceholder("e.g. 7 days");

  return modal.addComponents(
    new ActionRowBuilder().addComponents(amountInput),
    new ActionRowBuilder().addComponents(durationInput)
  );
}

function createApplicationDecisionModal(applicationId, decision) {
  const modal = new ModalBuilder()
    .setCustomId(`application_decision_modal:${decision}:${applicationId}`)
    .setTitle(decision === "accept" ? "Accept Application" : "Reject Application");

  const reasonInput = new TextInputBuilder()
    .setCustomId("reason")
    .setLabel("Reason")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(600)
    .setPlaceholder("Explain the decision for the applicant.");

  return modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
}

function buildRejectPresetButtons(applicationId, disabled = false) {
  const rejectPresets = featureSettingsStore.applications?.rejectPresets || [];
  return new ActionRowBuilder().addComponents(
    rejectPresets.slice(0, 3).map((preset, index) =>
      new ButtonBuilder()
        .setCustomId(`application_rejectpreset:${applicationId}:${index}`)
        .setLabel(`Reject ${index + 1}`)
        .setStyle(ButtonStyle.Danger)
        .setDisabled(disabled)
    )
  );
}

function buildApplicationDescription(application) {
  const lines = application.questions.map((question, index) => {
    return `**${index + 1}. ${question}**\n${application.answers[index] || "-"}\n`;
  });

  const decisionLines = application.status !== "pending"
    ? [
        `Status: **${application.status}**`,
        application.reviewerId ? `Reviewed by: <@${application.reviewerId}>` : null,
        application.interviewedById ? `Interview reviewer: <@${application.interviewedById}>` : null,
        application.decisionReason ? `Reason: ${application.decisionReason}` : null
      ]
    : ["Status: **pending**"];

  return [
    `User: <@${application.userId}>`,
    `Role: **${application.roleLabel || "Unknown"}**`,
    `Applied: <t:${Math.floor(application.createdAt / 1000)}:F>`,
    ...decisionLines.filter(Boolean),
    "",
    lines.join("\n")
  ].join("\n");
}

async function unmuteMember(interaction) {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command only works inside a server.", flags: MessageFlags.Ephemeral });
    return;
  }

  const targetUser = interaction.options.getUser("user", true);
  const reason = interaction.options.getString("reason") || "No reason provided.";
  const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

  if (!targetMember) {
    await interaction.reply({ content: "That member could not be found in this server.", flags: MessageFlags.Ephemeral });
    return;
  }

  if (!targetMember.moderatable) {
    await interaction.reply({ content: "I cannot unmute this member. Check role order and permissions.", flags: MessageFlags.Ephemeral });
    return;
  }

  await targetMember.timeout(null, reason).catch(async () => {
    await interaction.reply({ content: "Failed to unmute that member.", flags: MessageFlags.Ephemeral });
  });

  if (interaction.replied) {
    return;
  }

  await sendModLog("Member Unmuted", [
    `User: <@${targetMember.id}>`,
    `Moderator: ${interaction.user.tag}`,
    `Reason: ${reason}`
  ]);

  await interaction.reply({
    content: `${targetUser.tag} has been unmuted.`,
    flags: MessageFlags.Ephemeral
  });
}

async function warnMember(interaction) {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command only works inside a server.", flags: MessageFlags.Ephemeral });
    return;
  }

  const targetUser = interaction.options.getUser("user", true);
  const reason = interaction.options.getString("reason", true);

  warningsStore.push({
    id: crypto.randomUUID(),
    guildId: interaction.guildId,
    userId: targetUser.id,
    moderatorId: interaction.user.id,
    reason,
    createdAt: Date.now()
  });
  persistWarnings();

  await sendModLog("Member Warned", [
    `User: <@${targetUser.id}>`,
    `Moderator: ${interaction.user.tag}`,
    `Reason: ${reason}`,
    `Total warnings: ${getWarningsForUser(interaction.guildId, targetUser.id).length}`
  ]);

  await interaction.reply({
    content: `${targetUser.tag} has been warned.`,
    flags: MessageFlags.Ephemeral
  });
}

async function showWarnings(interaction) {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command only works inside a server.", flags: MessageFlags.Ephemeral });
    return;
  }

  const targetUser = interaction.options.getUser("user", true);
  const entries = getWarningsForUser(interaction.guildId, targetUser.id);

  if (entries.length === 0) {
    await interaction.reply({
      content: `${targetUser.tag} has no warnings.`,
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  await interaction.reply({
    embeds: [
      buildEmbed(
        `Warnings for ${targetUser.tag}`,
        entries.slice(-10).map((entry, index) => {
          return `**${index + 1}.** <t:${Math.floor(entry.createdAt / 1000)}:F>\nModerator: <@${entry.moderatorId}>\nReason: ${entry.reason}`;
        }).join("\n\n")
      )
    ],
    flags: MessageFlags.Ephemeral
  });
}

async function kickMember(interaction) {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command only works inside a server.", flags: MessageFlags.Ephemeral });
    return;
  }

  const targetUser = interaction.options.getUser("user", true);
  const reason = interaction.options.getString("reason") || "No reason provided.";
  const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

  if (!targetMember) {
    await interaction.reply({ content: "That member could not be found in this server.", flags: MessageFlags.Ephemeral });
    return;
  }

  if (!targetMember.kickable) {
    await interaction.reply({ content: "I cannot kick this member. Check role order and permissions.", flags: MessageFlags.Ephemeral });
    return;
  }

  await targetMember.kick(reason).catch(async () => {
    await interaction.reply({ content: "Failed to kick that member.", flags: MessageFlags.Ephemeral });
  });

  if (interaction.replied) {
    return;
  }

  await sendModLog("Member Kicked", [
    `User: <@${targetUser.id}>`,
    `Moderator: ${interaction.user.tag}`,
    `Reason: ${reason}`
  ]);

  await interaction.reply({
    content: `${targetUser.tag} has been kicked.`,
    flags: MessageFlags.Ephemeral
  });
}

async function banUser(interaction) {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command only works inside a server.", flags: MessageFlags.Ephemeral });
    return;
  }

  const targetUser = interaction.options.getUser("user", true);
  const reason = interaction.options.getString("reason") || "No reason provided.";

  await interaction.guild.members.ban(targetUser.id, { reason }).catch(async () => {
    await interaction.reply({ content: "Failed to ban that user.", flags: MessageFlags.Ephemeral });
  });

  if (interaction.replied) {
    return;
  }

  await sendModLog("User Banned", [
    `User: <@${targetUser.id}>`,
    `Moderator: ${interaction.user.tag}`,
    `Reason: ${reason}`
  ]);

  await interaction.reply({
    content: `${targetUser.tag} has been banned.`,
    flags: MessageFlags.Ephemeral
  });
}

async function unbanUser(interaction) {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command only works inside a server.", flags: MessageFlags.Ephemeral });
    return;
  }

  const userId = interaction.options.getString("user_id", true).trim();
  const reason = interaction.options.getString("reason") || "No reason provided.";

  await interaction.guild.bans.remove(userId, reason).catch(async () => {
    await interaction.reply({ content: "Failed to unban that user ID.", flags: MessageFlags.Ephemeral });
  });

  if (interaction.replied) {
    return;
  }

  await sendModLog("User Unbanned", [
    `User ID: ${userId}`,
    `Moderator: ${interaction.user.tag}`,
    `Reason: ${reason}`
  ]);

  await interaction.reply({
    content: `User \`${userId}\` has been unbanned.`,
    flags: MessageFlags.Ephemeral
  });
}

async function clearMessages(interaction) {
  if (!interaction.channel || !interaction.channel.isTextBased()) {
    await interaction.reply({ content: "This command only works in text channels.", flags: MessageFlags.Ephemeral });
    return;
  }

  const amount = interaction.options.getInteger("amount", true);
  await interaction.channel.bulkDelete(amount, true).catch(async () => {
    await interaction.reply({ content: "Failed to delete messages. They may be older than 14 days.", flags: MessageFlags.Ephemeral });
  });

  if (interaction.replied) {
    return;
  }

  await sendModLog("Messages Cleared", [
    `Channel: <#${interaction.channelId}>`,
    `Moderator: ${interaction.user.tag}`,
    `Amount: ${amount}`
  ]);

  await interaction.reply({
    content: `Deleted ${amount} messages.`,
    flags: MessageFlags.Ephemeral
  });
}

async function setSlowmode(interaction) {
  if (!interaction.channel || !interaction.channel.isTextBased()) {
    await interaction.reply({ content: "This command only works in text channels.", flags: MessageFlags.Ephemeral });
    return;
  }

  const seconds = interaction.options.getInteger("seconds", true);
  await interaction.channel.setRateLimitPerUser(seconds).catch(async () => {
    await interaction.reply({ content: "Failed to update slowmode for this channel.", flags: MessageFlags.Ephemeral });
  });

  if (interaction.replied) {
    return;
  }

  await sendModLog("Slowmode Updated", [
    `Channel: <#${interaction.channelId}>`,
    `Moderator: ${interaction.user.tag}`,
    `Seconds: ${seconds}`
  ]);

  await interaction.reply({
    content: `Slowmode set to ${seconds} seconds.`,
    flags: MessageFlags.Ephemeral
  });
}

async function lockChannel(interaction, unlock = false) {
  if (!interaction.guild || !interaction.channel) {
    await interaction.reply({ content: "This command only works inside a server channel.", flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
    SendMessages: unlock ? null : false
  }).catch(async () => {
    await interaction.reply({ content: `Failed to ${unlock ? "unlock" : "lock"} this channel.`, flags: MessageFlags.Ephemeral });
  });

  if (interaction.replied) {
    return;
  }

  await sendModLog(unlock ? "Channel Unlocked" : "Channel Locked", [
    `Channel: <#${interaction.channelId}>`,
    `Moderator: ${interaction.user.tag}`
  ]);

  await interaction.reply({
    content: `Channel ${unlock ? "unlocked" : "locked"}.`,
    flags: MessageFlags.Ephemeral
  });
}

async function sendUserInfo(interaction) {
  const targetUser = interaction.options.getUser("user") || interaction.user;
  const member = interaction.guild ? await interaction.guild.members.fetch(targetUser.id).catch(() => null) : null;

  await interaction.reply({
    embeds: [
      buildEmbed(
        `User Info: ${targetUser.tag}`,
        [
          `User: ${targetUser}`,
          `ID: ${targetUser.id}`,
          `Created: <t:${Math.floor(targetUser.createdTimestamp / 1000)}:F>`,
          member ? `Joined: <t:${Math.floor(member.joinedTimestamp / 1000)}:F>` : null,
          member ? `Roles: ${member.roles.cache.filter((role) => role.id !== interaction.guild.roles.everyone.id).map((role) => role.toString()).join(", ") || "None"}` : null
        ].filter(Boolean).join("\n")
      ).setThumbnail(targetUser.displayAvatarURL({ size: 1024 }))
    ],
    flags: MessageFlags.Ephemeral
  });
}

async function sendAvatar(interaction) {
  const targetUser = interaction.options.getUser("user") || interaction.user;
  const avatarUrl = targetUser.displayAvatarURL({ size: 2048 });

  await interaction.reply({
    embeds: [
      buildEmbed(`Avatar: ${targetUser.tag}`, `[Open Avatar](${avatarUrl})`).setImage(avatarUrl)
    ],
    flags: MessageFlags.Ephemeral
  });
}

async function sendServerInfo(interaction) {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command only works inside a server.", flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.reply({
    embeds: [
      buildEmbed(
        `Server Info: ${interaction.guild.name}`,
        [
          `ID: ${interaction.guild.id}`,
          `Owner ID: ${interaction.guild.ownerId}`,
          `Members: ${interaction.guild.memberCount}`,
          `Channels: ${interaction.guild.channels.cache.size}`,
          `Roles: ${interaction.guild.roles.cache.size}`,
          `Created: <t:${Math.floor(interaction.guild.createdTimestamp / 1000)}:F>`
        ].join("\n")
      ).setThumbnail(interaction.guild.iconURL({ size: 1024 }))
    ],
    flags: MessageFlags.Ephemeral
  });
}

function formatDuration(ms) {
  const totalSeconds = Math.max(1, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [];

  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (seconds || parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(" ");
}

async function sendPlainMessage(interaction) {
  const text = interaction.options.getString("text", true);
  await interaction.reply({
    content: "Message sent.",
    flags: MessageFlags.Ephemeral
  });
  await interaction.channel.send(text);
}

async function sendEmbedMessage(interaction) {
  const title = interaction.options.getString("title", true);
  const description = interaction.options.getString("description", true);

  await interaction.reply({
    content: "Embed sent.",
    flags: MessageFlags.Ephemeral
  });

  await interaction.channel.send({
    embeds: [buildEmbed(title, description)]
  });
}

async function sendPoll(interaction) {
  const question = interaction.options.getString("question", true);

  await interaction.reply({
    content: "Poll created.",
    flags: MessageFlags.Ephemeral
  });

  const message = await interaction.channel.send({
    embeds: [buildEmbed("Poll", question)]
  });

  await message.react("?").catch(() => null);
  await message.react("?").catch(() => null);
}

async function sendAnnouncement(interaction) {
  const title = interaction.options.getString("title", true);
  const description = interaction.options.getString("description", true);

  await interaction.reply({
    content: "Announcement sent.",
    flags: MessageFlags.Ephemeral
  });

  await interaction.channel.send({
    embeds: [buildEmbed(`📢 ${title}`, description)]
  });
}

async function setReminder(interaction) {
  const time = interaction.options.getString("time", true);
  const text = interaction.options.getString("text", true);
  const duration = parseDurationToMs(time);

  if (!duration) {
    await interaction.reply({
      content: "Use a valid time like `30s`, `10m`, `2h` or `1d`.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  await interaction.reply({
    content: `Okay, I will remind you in **${formatDuration(duration)}**.`,
    flags: MessageFlags.Ephemeral
  });

  setTimeout(async () => {
    await interaction.user.send({
      embeds: [buildEmbed("Reminder", text)]
    }).catch(async () => {
      if (interaction.channel?.isTextBased()) {
        await interaction.channel.send({
          content: `<@${interaction.user.id}> reminder: ${text}`
        }).catch(() => null);
      }
    });
  }, duration);
}

async function addRoleToMember(interaction, remove = false) {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command only works inside a server.", flags: MessageFlags.Ephemeral });
    return;
  }

  const target = interaction.options.getMember("user");
  const role = interaction.options.getRole("role", true);

  if (!target) {
    await interaction.reply({ content: "I could not find that member.", flags: MessageFlags.Ephemeral });
    return;
  }

  if (role.managed) {
    await interaction.reply({ content: "I cannot manage that role.", flags: MessageFlags.Ephemeral });
    return;
  }

  if (interaction.guild.members.me.roles.highest.position <= role.position) {
    await interaction.reply({ content: "My role must be above that role.", flags: MessageFlags.Ephemeral });
    return;
  }

  if (interaction.member.roles.highest.position <= role.position && interaction.guild.ownerId !== interaction.user.id) {
    await interaction.reply({ content: "Your role must be above that role.", flags: MessageFlags.Ephemeral });
    return;
  }

  try {
    if (remove) {
      await target.roles.remove(role);
    } else {
      await target.roles.add(role);
    }
  } catch (error) {
    await interaction.reply({ content: "I could not update that role.", flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.reply({
    content: remove ? `Removed ${role} from ${target}.` : `Gave ${role} to ${target}.`,
    flags: MessageFlags.Ephemeral
  });
}

async function changeNickname(interaction) {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command only works inside a server.", flags: MessageFlags.Ephemeral });
    return;
  }

  const target = interaction.options.getMember("user");
  const nickname = interaction.options.getString("nickname", true);

  if (!target) {
    await interaction.reply({ content: "I could not find that member.", flags: MessageFlags.Ephemeral });
    return;
  }

  if (!target.manageable) {
    await interaction.reply({ content: "I cannot change that nickname.", flags: MessageFlags.Ephemeral });
    return;
  }

  try {
    await target.setNickname(nickname);
  } catch (error) {
    await interaction.reply({ content: "I could not change that nickname.", flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.reply({
    content: `Nickname updated for ${target}.`,
    flags: MessageFlags.Ephemeral
  });
}

function answerEightBall() {
  const answers = [
    "Yes.",
    "No.",
    "Definitely.",
    "Very likely.",
    "Ask again later.",
    "I would not count on it.",
    "Signs point to yes.",
    "Better not tell you now.",
    "Absolutely.",
    "Not today."
  ];

  return answers[Math.floor(Math.random() * answers.length)];
}

async function rollDice(interaction) {
  const sides = interaction.options.getInteger("sides") ?? 6;
  const result = Math.floor(Math.random() * sides) + 1;

  await interaction.reply(`🎲 You rolled **${result}** / **${sides}**`);
}

async function sendUptime(interaction) {
  await interaction.reply({
    embeds: [buildEmbed("Uptime", `The bot has been online for **${formatDuration(Date.now() - botStartedAt)}**.`)],
    flags: MessageFlags.Ephemeral
  });
}

async function sendBotInfo(interaction) {
  await interaction.reply({
    embeds: [
      buildEmbed(
        "Bot Info",
        [
          `Name: **${client.user?.tag || config.botName}**`,
          `Servers: **${client.guilds.cache.size}**`,
          `Users cached: **${client.users.cache.size}**`,
          `Uptime: **${formatDuration(Date.now() - botStartedAt)}**`,
          `Node.js: **${process.version}**`
        ].join("\n")
      )
    ],
    flags: MessageFlags.Ephemeral
  });
}


function persistAfk() {
  store.saveJson("afk.json", afkStore).catch(() => null);
}

function persistEconomy() {
  store.saveJson("economy.json", economyStore).catch(() => null);
}

function getAfkEntry(guildId, userId) {
  return afkStore.find((entry) => entry.guildId === guildId && entry.userId === userId) || null;
}

function removeAfkEntry(guildId, userId) {
  const index = afkStore.findIndex((entry) => entry.guildId === guildId && entry.userId === userId);
  if (index === -1) {
    return null;
  }

  const removed = afkStore.splice(index, 1)[0];
  persistAfk();
  return removed;
}

function upsertAfkEntry(guildId, userId, reason) {
  const existing = getAfkEntry(guildId, userId);

  if (existing) {
    existing.reason = reason;
    existing.createdAt = Date.now();
  } else {
    afkStore.push({ guildId, userId, reason, createdAt: Date.now() });
  }

  persistAfk();
}

function getEconomyProfile(guildId, userId) {
  if (!economyStore[guildId]) {
    economyStore[guildId] = {};
  }

  if (!economyStore[guildId][userId]) {
    economyStore[guildId][userId] = {
      balance: 0,
      dailyAt: 0,
      workAt: 0,
      begAt: 0
    };
  }

  return economyStore[guildId][userId];
}

function formatCoins(amount) {
  return amount.toLocaleString("en-US") + " coins";
}

function calculateShipPercentage(firstId, secondId) {
  const seed = [firstId, secondId].sort().join(":");
  let value = 0;

  for (const char of seed) {
    value = (value * 31 + char.charCodeAt(0)) % 101;
  }

  return value;
}

async function setAfkStatus(interaction) {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command only works inside a server.", flags: MessageFlags.Ephemeral });
    return;
  }

  const reason = interaction.options.getString("reason") || "AFK";
  upsertAfkEntry(interaction.guildId, interaction.user.id, reason);

  await interaction.reply({
    embeds: [buildEmbed("AFK Set", "You are now AFK: **" + reason + "**")],
    flags: MessageFlags.Ephemeral
  });
}

async function sendSnipe(interaction) {
  const channelSnipe = snipeStore.get(interaction.channelId);

  if (!channelSnipe) {
    await interaction.reply({
      content: "There is nothing to snipe in this channel yet.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const description = [
    "Author: " + channelSnipe.authorTag,
    "Deleted: <t:" + Math.floor(channelSnipe.deletedAt / 1000) + ":R>",
    "Content: " + (channelSnipe.content || "No cached text available."),
    channelSnipe.attachments ? "Attachments: " + channelSnipe.attachments : null
  ].filter(Boolean).join("\n");

  await interaction.reply({
    embeds: [buildEmbed("Sniped Message", description)],
    flags: MessageFlags.Ephemeral
  });
}

async function sendHug(interaction) {
  const user = interaction.options.getUser("user", true);
  await interaction.reply("🤗 " + interaction.user.toString() + " hugs " + user.toString() + "!");
}

async function sendShip(interaction) {
  const userOne = interaction.options.getUser("user_one", true);
  const userTwo = interaction.options.getUser("user_two") || interaction.user;
  const percent = calculateShipPercentage(userOne.id, userTwo.id);
  let rating = "Interesting match.";

  if (percent >= 90) {
    rating = "Soulmates.";
  } else if (percent >= 70) {
    rating = "Very cute together.";
  } else if (percent >= 50) {
    rating = "There is potential.";
  } else if (percent >= 25) {
    rating = "Could go either way.";
  } else {
    rating = "Maybe just friends.";
  }

  await interaction.reply({
    embeds: [
      buildEmbed("💘 Ship Result", userOne.toString() + " + " + userTwo.toString() + " = **" + percent + "%**\n" + rating)
    ]
  });
}

async function sendMeme(interaction) {
  await interaction.deferReply();

  try {
    const response = await fetch("https://meme-api.com/gimme");

    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }

    const data = await response.json();
    await interaction.editReply({
      embeds: [
        buildEmbed(data.title || "Random Meme", "[Open source](" + (data.postLink || data.url) + ")").setImage(data.url)
      ]
    });
  } catch (error) {
    await interaction.editReply("I could not fetch a meme right now. Try again in a bit.");
  }
}

async function sendSuggestion(interaction) {
  const text = interaction.options.getString("text", true);

  await interaction.reply({
    content: "Suggestion posted.",
    flags: MessageFlags.Ephemeral
  });

  const message = await interaction.channel.send({
    embeds: [buildEmbed("Suggestion", ["From: " + interaction.user.toString(), "Suggestion: " + text].join("\n"))]
  });

  await message.react("?").catch(() => null);
  await message.react("?").catch(() => null);
}

async function claimDaily(interaction) {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command only works inside a server.", flags: MessageFlags.Ephemeral });
    return;
  }

  const profile = getEconomyProfile(interaction.guildId, interaction.user.id);
  const now = Date.now();
  const cooldown = 24 * 60 * 60 * 1000;

  if (now - profile.dailyAt < cooldown) {
    const remaining = cooldown - (now - profile.dailyAt);
    await interaction.reply({
      content: "You already claimed your daily. Come back in **" + formatDuration(remaining) + "**.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const amount = 500;
  profile.balance += amount;
  profile.dailyAt = now;
  const todayKey = getDayKey(now);
  const previousDayKey = getDayKey(now - 24 * 60 * 60 * 1000);
  profile.streak = profile.streakDay === previousDayKey ? (profile.streak || 0) + 1 : 1;
  profile.streakDay = todayKey;
  persistEconomy();

  await interaction.reply({
    embeds: [buildEmbed("Daily Claimed", "You received **" + formatCoins(amount) + "**.\nNew balance: **" + formatCoins(profile.balance) + "**")]
  });
}

async function workForCoins(interaction) {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command only works inside a server.", flags: MessageFlags.Ephemeral });
    return;
  }

  const profile = getEconomyProfile(interaction.guildId, interaction.user.id);
  const now = Date.now();
  const cooldown = 60 * 60 * 1000;

  if (now - profile.workAt < cooldown) {
    const remaining = cooldown - (now - profile.workAt);
    await interaction.reply({
      content: "You are tired. Try working again in **" + formatDuration(remaining) + "**.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const jobs = ["moderated chat", "baked donuts", "hosted giveaways", "answered tickets", "cleaned the server"];
  const amount = 100 + Math.floor(Math.random() * 251);
  const job = jobs[Math.floor(Math.random() * jobs.length)];
  profile.balance += amount;
  profile.workAt = now;
  persistEconomy();

  await interaction.reply("💼 You " + job + " and earned **" + formatCoins(amount) + "**.");
}

async function begForCoins(interaction) {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command only works inside a server.", flags: MessageFlags.Ephemeral });
    return;
  }

  const profile = getEconomyProfile(interaction.guildId, interaction.user.id);
  const now = Date.now();
  const cooldown = 10 * 60 * 1000;

  if (now - profile.begAt < cooldown) {
    const remaining = cooldown - (now - profile.begAt);
    await interaction.reply({
      content: "Nobody wants to help again yet. Try in **" + formatDuration(remaining) + "**.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const amount = 25 + Math.floor(Math.random() * 76);
  profile.balance += amount;
  profile.begAt = now;
  persistEconomy();

  await interaction.reply("🙏 Someone gave you **" + formatCoins(amount) + "**.");
}

async function sendBalance(interaction) {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command only works inside a server.", flags: MessageFlags.Ephemeral });
    return;
  }

  const user = interaction.options.getUser("user") || interaction.user;
  const profile = getEconomyProfile(interaction.guildId, user.id);
  persistEconomy();

  await interaction.reply({
    embeds: [buildEmbed("Balance", user.toString() + " has **" + formatCoins(profile.balance) + "**.")]
  });
}

async function sendLeaderboard(interaction) {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command only works inside a server.", flags: MessageFlags.Ephemeral });
    return;
  }

  const guildProfiles = Object.entries(economyStore[interaction.guildId] || {});

  if (guildProfiles.length === 0) {
    await interaction.reply({ content: "Nobody has any coins yet.", flags: MessageFlags.Ephemeral });
    return;
  }

  const top = guildProfiles
    .sort((a, b) => (b[1].balance || 0) - (a[1].balance || 0))
    .slice(0, 10)
    .map(([userId, data], index) => (index + 1) + ". <@" + userId + "> - **" + formatCoins(data.balance || 0) + "**");

  await interaction.reply({
    embeds: [buildEmbed("Coin Leaderboard", top.join("\n"))]
  });
}

async function payCoins(interaction) {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command only works inside a server.", flags: MessageFlags.Ephemeral });
    return;
  }

  const target = interaction.options.getUser("user", true);
  const amount = interaction.options.getInteger("amount", true);

  if (target.bot || target.id === interaction.user.id) {
    await interaction.reply({ content: "Choose a real different user.", flags: MessageFlags.Ephemeral });
    return;
  }

  const sender = getEconomyProfile(interaction.guildId, interaction.user.id);
  const receiver = getEconomyProfile(interaction.guildId, target.id);

  if (sender.balance < amount) {
    await interaction.reply({ content: "You do not have enough coins.", flags: MessageFlags.Ephemeral });
    return;
  }

  sender.balance -= amount;
  receiver.balance += amount;
  persistEconomy();

  await interaction.reply("💸 You sent **" + formatCoins(amount) + "** to " + target.toString() + ".");
}

function persistFeatureSettings() {
  store.saveJson("feature-settings.json", featureSettingsStore).catch(() => null);
}

function persistModerationCases() {
  store.saveJson("mod-cases.json", moderationCasesStore).catch(() => null);
}

function persistVouches() {
  store.saveJson("vouches.json", vouchesStore).catch(() => null);
}

function persistMarriages() {
  store.saveJson("marriages.json", marriagesStore).catch(() => null);
}

function persistLevels() {
  store.saveJson("levels.json", levelStore).catch(() => null);
}

function ensureExtendedEconomyProfile(profile) {
  if (!Number.isFinite(profile.balance)) profile.balance = 0;
  if (!Number.isFinite(profile.bank)) profile.bank = 0;
  if (!Array.isArray(profile.inventory)) profile.inventory = [];
  if (!Number.isFinite(profile.interestAt)) profile.interestAt = 0;
  if (!Number.isFinite(profile.streak)) profile.streak = 0;
  if (typeof profile.streakDay !== "string") profile.streakDay = "";
}

function getMarriageForUser(userId) {
  return marriagesStore.find((entry) => entry.users.includes(userId)) || null;
}

function getLevelProfile(guildId, userId) {
  if (!levelStore[guildId]) levelStore[guildId] = {};
  if (!levelStore[guildId][userId]) levelStore[guildId][userId] = { xp: 0, messages: 0 };
  return levelStore[guildId][userId];
}

function getLevelFromXp(xp) {
  return Math.floor(Math.sqrt((xp || 0) / 100));
}

function createModerationCase(type, userId, moderatorId, reason) {
  moderationCasesStore.push({
    id: moderationCasesStore.length + 1,
    type,
    userId,
    moderatorId,
    reason,
    createdAt: Date.now()
  });
  persistModerationCases();
}

function getShopItems() {
  return featureSettingsStore.economy?.shopItems || [];
}

async function unwarnMember(interaction) {
  const targetUser = interaction.options.getUser("user", true);
  const index = interaction.options.getInteger("index", true) - 1;
  const warningEntries = warningsStore.filter((entry) => entry.guildId === interaction.guildId && entry.userId === targetUser.id);

  if (!warningEntries[index]) {
    await interaction.reply({ content: "That warning number does not exist.", flags: MessageFlags.Ephemeral });
    return;
  }

  const warningToRemove = warningEntries[index];
  const storeIndex = warningsStore.findIndex((entry) => entry === warningToRemove);
  warningsStore.splice(storeIndex, 1);
  persistWarnings();
  createModerationCase("unwarn", targetUser.id, interaction.user.id, warningToRemove.reason || "Warning removed");

  await interaction.reply({ content: `Removed warning #${index + 1} from ${targetUser.tag}.`, flags: MessageFlags.Ephemeral });
}

async function sendModerationHistory(interaction) {
  const targetUser = interaction.options.getUser("user", true);
  const warnings = warningsStore.filter((entry) => entry.guildId === interaction.guildId && entry.userId === targetUser.id);
  const cases = moderationCasesStore.filter((entry) => entry.userId === targetUser.id).slice(-10);
  const lines = [];

  if (warnings.length) {
    lines.push("**Warnings**");
    warnings.forEach((entry, warningIndex) => {
      lines.push(`${warningIndex + 1}. ${entry.reason || "No reason"} - <t:${Math.floor(entry.createdAt / 1000)}:R>`);
    });
  }

  if (cases.length) {
    lines.push("", "**Recent Cases**");
    cases.forEach((entry) => {
      lines.push(`#${entry.id} ${entry.type} - ${entry.reason || "No reason"} - <t:${Math.floor(entry.createdAt / 1000)}:R>`);
    });
  }

  await interaction.reply({
    embeds: [buildEmbed(`History: ${targetUser.tag}`, lines.join("\n") || "No moderation history found.")],
    flags: MessageFlags.Ephemeral
  });
}

async function resetNickname(interaction) {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command only works inside a server.", flags: MessageFlags.Ephemeral });
    return;
  }

  const member = await interaction.guild.members.fetch(interaction.options.getUser("user", true).id).catch(() => null);
  if (!member || !member.manageable) {
    await interaction.reply({ content: "I cannot reset that nickname.", flags: MessageFlags.Ephemeral });
    return;
  }

  await member.setNickname(null);
  createModerationCase("nickreset", member.id, interaction.user.id, "Nickname reset");
  await interaction.reply({ content: `Nickname reset for ${member.user.tag}.`, flags: MessageFlags.Ephemeral });
}

async function sendShop(interaction) {
  const lines = getShopItems().map((item) => `**${item.id}** - ${item.name} - ${formatCoins(item.price)}\n${item.description}`);
  await interaction.reply({ embeds: [buildEmbed("Shop", lines.join("\n\n") || "No items configured.")] });
}

async function buyShopItem(interaction) {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command only works inside a server.", flags: MessageFlags.Ephemeral });
    return;
  }

  const itemId = interaction.options.getString("item", true).toLowerCase();
  const amount = interaction.options.getInteger("amount") || 1;
  const item = getShopItems().find((entry) => entry.id.toLowerCase() === itemId);
  if (!item) {
    await interaction.reply({ content: "That shop item does not exist.", flags: MessageFlags.Ephemeral });
    return;
  }

  const profile = getEconomyProfile(interaction.guildId, interaction.user.id);
  ensureExtendedEconomyProfile(profile);
  const total = item.price * amount;
  if (profile.balance < total) {
    await interaction.reply({ content: `You need ${formatCoins(total)} but only have ${formatCoins(profile.balance)}.`, flags: MessageFlags.Ephemeral });
    return;
  }

  profile.balance -= total;
  for (let index = 0; index < amount; index += 1) profile.inventory.push(item.id);
  persistEconomy();
  await interaction.reply(`🛒 You bought **${amount}x ${item.name}** for **${formatCoins(total)}**.`);
}

async function sendInventory(interaction) {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command only works inside a server.", flags: MessageFlags.Ephemeral });
    return;
  }

  const user = interaction.options.getUser("user") || interaction.user;
  const profile = getEconomyProfile(interaction.guildId, user.id);
  ensureExtendedEconomyProfile(profile);
  const counts = profile.inventory.reduce((accumulator, itemId) => {
    accumulator[itemId] = (accumulator[itemId] || 0) + 1;
    return accumulator;
  }, {});
  const lines = Object.entries(counts).map(([itemId, amount]) => {
    const item = getShopItems().find((entry) => entry.id === itemId);
    return `**${item?.name || itemId}** x${amount}`;
  });

  await interaction.reply({ embeds: [buildEmbed(`Inventory: ${user.tag}`, lines.join("\n") || "Inventory is empty.")] });
}

async function sendBank(interaction) {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command only works inside a server.", flags: MessageFlags.Ephemeral });
    return;
  }

  const user = interaction.options.getUser("user") || interaction.user;
  const profile = getEconomyProfile(interaction.guildId, user.id);
  ensureExtendedEconomyProfile(profile);
  await interaction.reply({ embeds: [buildEmbed("Bank", `${user} has **${formatCoins(profile.bank)}** in the bank.`)] });
}

async function depositCoins(interaction) {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command only works inside a server.", flags: MessageFlags.Ephemeral });
    return;
  }
  const amount = interaction.options.getInteger("amount", true);
  const profile = getEconomyProfile(interaction.guildId, interaction.user.id);
  ensureExtendedEconomyProfile(profile);
  if (profile.balance < amount) {
    await interaction.reply({ content: "You do not have enough wallet coins.", flags: MessageFlags.Ephemeral });
    return;
  }
  profile.balance -= amount;
  profile.bank += amount;
  persistEconomy();
  await interaction.reply(`🏦 Deposited **${formatCoins(amount)}**.`);
}

async function withdrawCoins(interaction) {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command only works inside a server.", flags: MessageFlags.Ephemeral });
    return;
  }
  const amount = interaction.options.getInteger("amount", true);
  const profile = getEconomyProfile(interaction.guildId, interaction.user.id);
  ensureExtendedEconomyProfile(profile);
  if (profile.bank < amount) {
    await interaction.reply({ content: "You do not have enough bank coins.", flags: MessageFlags.Ephemeral });
    return;
  }
  profile.bank -= amount;
  profile.balance += amount;
  persistEconomy();
  await interaction.reply(`🏦 Withdrew **${formatCoins(amount)}**.`);
}

async function claimInterest(interaction) {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command only works inside a server.", flags: MessageFlags.Ephemeral });
    return;
  }
  const profile = getEconomyProfile(interaction.guildId, interaction.user.id);
  ensureExtendedEconomyProfile(profile);
  const cooldown = 24 * 60 * 60 * 1000;
  if (Date.now() - profile.interestAt < cooldown) {
    await interaction.reply({ content: `You can claim interest again in **${formatDuration(cooldown - (Date.now() - profile.interestAt))}**.`, flags: MessageFlags.Ephemeral });
    return;
  }
  const gain = Math.floor(profile.bank * 0.02);
  profile.bank += gain;
  profile.interestAt = Date.now();
  persistEconomy();
  await interaction.reply(`📈 You earned **${formatCoins(gain)}** bank interest.`);
}

async function economyAdmin(interaction) {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command only works inside a server.", flags: MessageFlags.Ephemeral });
    return;
  }
  const action = interaction.options.getString("action", true);
  const user = interaction.options.getUser("user", true);
  const amount = interaction.options.getInteger("amount", true);
  const profile = getEconomyProfile(interaction.guildId, user.id);
  ensureExtendedEconomyProfile(profile);
  if (action === "set_wallet") profile.balance = amount;
  if (action === "add_wallet") profile.balance += amount;
  if (action === "remove_wallet") profile.balance = Math.max(0, profile.balance - amount);
  if (action === "set_bank") profile.bank = amount;
  persistEconomy();
  await interaction.reply({ content: `Economy updated for ${user.tag}.`, flags: MessageFlags.Ephemeral });
}

async function sendProfile(interaction) {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command only works inside a server.", flags: MessageFlags.Ephemeral });
    return;
  }
  const user = interaction.options.getUser("user") || interaction.user;
  const economyProfile = getEconomyProfile(interaction.guildId, user.id);
  ensureExtendedEconomyProfile(economyProfile);
  const levelProfile = getLevelProfile(interaction.guildId, user.id);
  const marriage = getMarriageForUser(user.id);
  const spouseId = marriage ? marriage.users.find((id) => id !== user.id) : null;
  const vouchCount = vouchesStore.filter((entry) => entry.userId === user.id).length;
  await interaction.reply({
    embeds: [
      buildEmbed(`Profile: ${user.tag}`, [
        `Wallet: **${formatCoins(economyProfile.balance)}**`,
        `Bank: **${formatCoins(economyProfile.bank)}**`,
        `Daily streak: **${economyProfile.streak || 0}**`,
        `Level: **${getLevelFromXp(levelProfile.xp)}**`,
        `XP: **${levelProfile.xp}**`,
        `Messages: **${levelProfile.messages}**`,
        spouseId ? `Married to: <@${spouseId}>` : "Married to: **Nobody**",
        `Vouches: **${vouchCount}**`
      ].join("\n"))
    ]
  });
}

async function marryUser(interaction) {
  const target = interaction.options.getUser("user", true);
  if (target.bot || target.id === interaction.user.id) {
    await interaction.reply({ content: "Pick a real different user.", flags: MessageFlags.Ephemeral });
    return;
  }
  if (getMarriageForUser(interaction.user.id) || getMarriageForUser(target.id)) {
    await interaction.reply({ content: "One of you is already married.", flags: MessageFlags.Ephemeral });
    return;
  }
  marriagesStore.push({ users: [interaction.user.id, target.id], createdAt: Date.now() });
  persistMarriages();
  await interaction.reply(`💍 ${interaction.user} and ${target} are now married.`);
}

async function divorceUser(interaction) {
  const index = marriagesStore.findIndex((entry) => entry.users.includes(interaction.user.id));
  if (index === -1) {
    await interaction.reply({ content: "You are not married.", flags: MessageFlags.Ephemeral });
    return;
  }
  const partnerId = marriagesStore[index].users.find((id) => id !== interaction.user.id);
  marriagesStore.splice(index, 1);
  persistMarriages();
  await interaction.reply(`💔 Your marriage with <@${partnerId}> has ended.`);
}

async function sendStreak(interaction) {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command only works inside a server.", flags: MessageFlags.Ephemeral });
    return;
  }
  const user = interaction.options.getUser("user") || interaction.user;
  const profile = getEconomyProfile(interaction.guildId, user.id);
  ensureExtendedEconomyProfile(profile);
  await interaction.reply({ embeds: [buildEmbed("Daily Streak", `${user} has a streak of **${profile.streak || 0}** days.`)] });
}

async function createVouch(interaction) {
  const user = interaction.options.getUser("user", true);
  const text = interaction.options.getString("text", true);
  if (user.bot || user.id === interaction.user.id) {
    await interaction.reply({ content: "Pick a real different user.", flags: MessageFlags.Ephemeral });
    return;
  }
  vouchesStore.push({ userId: user.id, authorId: interaction.user.id, text, createdAt: Date.now() });
  persistVouches();
  await interaction.reply(`? Your vouch for ${user} was saved.`);
}

async function sendHealth(interaction) {
  await interaction.reply({
    embeds: [
      buildEmbed("Health", [
        `Guilds: **${client.guilds.cache.size}**`,
        `Users cached: **${client.users.cache.size}**`,
        `Open tickets: **${ticketsStore.filter((entry) => !entry.closed).length}**`,
        `Applications: **${applicationsStore.length}**`,
        `Giveaways: **${giveawaysStore.length}**`,
        `Uptime: **${formatDuration(Date.now() - botStartedAt)}**`
      ].join("\n"))
    ],
    flags: MessageFlags.Ephemeral
  });
}

async function exportBackup(interaction) {
  const dataFiles = ["applications.json", "giveaways.json", "tickets.json", "warnings.json", "economy.json", "feature-settings.json", "mod-cases.json", "vouches.json", "marriages.json", "levels.json"];
  const attachments = dataFiles
    .map((fileName) => path.join(__dirname, "..", "data", fileName))
    .filter((filePath) => fs.existsSync(filePath))
    .map((filePath) => new AttachmentBuilder(filePath));

  await interaction.reply({
    content: "Here is the current data export.",
    files: attachments,
    flags: MessageFlags.Ephemeral
  });
}

async function configureGiveawayBlacklist(interaction) {
  const action = interaction.options.getString("action", true);
  const user = interaction.options.getUser("user");

  if (action === "list") {
    const lines = featureSettingsStore.giveaway.blacklist.map((userId) => `<@${userId}>`);
    await interaction.reply({ embeds: [buildEmbed("Giveaway Blacklist", lines.join("\n") || "Blacklist is empty.")], flags: MessageFlags.Ephemeral });
    return;
  }

  if (!user) {
    await interaction.reply({ content: "Please choose a user.", flags: MessageFlags.Ephemeral });
    return;
  }

  if (action === "add" && !featureSettingsStore.giveaway.blacklist.includes(user.id)) {
    featureSettingsStore.giveaway.blacklist.push(user.id);
  }

  if (action === "remove") {
    featureSettingsStore.giveaway.blacklist = featureSettingsStore.giveaway.blacklist.filter((entry) => entry !== user.id);
  }

  persistFeatureSettings();
  await interaction.reply({ content: `Giveaway blacklist updated for ${user.tag}.`, flags: MessageFlags.Ephemeral });
}

async function configureGiveawaySettings(interaction) {
  const clear = interaction.options.getBoolean("clear") || false;
  if (clear) {
    featureSettingsStore.giveaway.requiredRoleId = "";
    featureSettingsStore.giveaway.bonusRoleId = "";
    featureSettingsStore.giveaway.bonusEntries = 0;
  } else {
    const requiredRole = interaction.options.getRole("required_role");
    const bonusRole = interaction.options.getRole("bonus_role");
    const bonusEntries = interaction.options.getInteger("bonus_entries");
    if (requiredRole) featureSettingsStore.giveaway.requiredRoleId = requiredRole.id;
    if (bonusRole) featureSettingsStore.giveaway.bonusRoleId = bonusRole.id;
    if (Number.isInteger(bonusEntries)) featureSettingsStore.giveaway.bonusEntries = bonusEntries;
  }
  persistFeatureSettings();
  await interaction.reply({ content: "Giveaway settings updated.", flags: MessageFlags.Ephemeral });
}

async function scheduleGiveaway(interaction) {
  const prize = interaction.options.getString("prize", true);
  const durationInput = interaction.options.getString("duration", true);
  const startInInput = interaction.options.getString("start_in", true);
  const winners = interaction.options.getInteger("winners", true);
  const durationMs = parseDurationToMs(durationInput);
  const startInMs = parseDurationToMs(startInInput);

  if (!durationMs || !startInMs) {
    await interaction.reply({ content: "Use valid times like `10m`, `2h`, or `1d`.", flags: MessageFlags.Ephemeral });
    return;
  }

  featureSettingsStore.giveaway.scheduled.push({
    id: crypto.randomUUID(),
    prize,
    winners,
    durationMs,
    startAt: Date.now() + startInMs,
    channelId: interaction.channelId,
    guildId: interaction.guildId,
    hostId: interaction.user.id
  });
  persistFeatureSettings();
  await interaction.reply({ content: `Giveaway scheduled to start in **${formatDuration(startInMs)}**.`, flags: MessageFlags.Ephemeral });
}

async function sendReactionRolePanel(interaction) {
  const role = interaction.options.getRole("role", true);
  const label = interaction.options.getString("label", true);
  const text = interaction.options.getString("text") || `Click the button to toggle ${role}.`;
  await interaction.channel.send({
    embeds: [buildEmbed("Reaction Role", text)],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`reactionrole:${role.id}`)
          .setLabel(label)
          .setStyle(ButtonStyle.Primary)
      )
    ]
  });
  await interaction.reply({ content: "Reaction role panel sent.", flags: MessageFlags.Ephemeral });
}

function resolveButtonStyle(value) {
  const styles = {
    primary: ButtonStyle.Primary,
    secondary: ButtonStyle.Secondary,
    success: ButtonStyle.Success,
    danger: ButtonStyle.Danger
  };
  return styles[String(value || "").toLowerCase()] || ButtonStyle.Primary;
}

function buildSelfRoleRows() {
  const configuredRoles = (config.selfRoles?.roles || []).filter((entry) => entry?.roleId && entry?.label);
  const rows = [];

  for (let index = 0; index < configuredRoles.length; index += 5) {
    const slice = configuredRoles.slice(index, index + 5);
    rows.push(
      new ActionRowBuilder().addComponents(
        slice.map((entry) => {
          const button = new ButtonBuilder()
            .setCustomId(`reactionrole:${entry.roleId}`)
            .setLabel(entry.label)
            .setStyle(resolveButtonStyle(entry.style));

          if (entry.emoji) {
            button.setEmoji(entry.emoji);
          }

          return button;
        })
      )
    );
  }

  return rows;
}

async function sendSelfRolePanel(interaction) {
  // If there are reaction-role mappings configured for this guild, create a reaction panel
  const guildMappings = (reactionRolesStore || []).filter((e) => e.guildId === interaction.guildId);

  if (guildMappings.length === 0) {
    // fallback to button-based self roles configured in config.json
    const rows = buildSelfRoleRows();
    if (rows.length === 0) {
      await interaction.reply({
        content: "No self roles are configured in `config.json` yet.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await interaction.channel.send({
      embeds: [
        buildEmbed(
          config.selfRoles?.panelTitle || "Self Roles",
          config.selfRoles?.panelDescription || "Click the buttons below to toggle your roles."
        )
      ],
      components: rows
    });

    await interaction.reply({ content: "Self-role panel sent.", flags: MessageFlags.Ephemeral });
    return;
  }

  // Build a unique list of emoji -> role mappings for this guild
  const pairs = [];
  const seen = new Set();
  for (const m of guildMappings) {
    const key = `${m.emoji}::${m.roleId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push({ emoji: m.emoji, roleId: m.roleId });
  }

  const lines = pairs.map((p) => `${p.emoji} — <@&${p.roleId}>`);

  const panel = await interaction.channel.send({
    embeds: [buildEmbed(config.selfRoles?.panelTitle || "Self Roles", (config.selfRoles?.panelDescription || "React to receive roles.") + "\n\n" + lines.join("\n"))]
  }).catch(() => null);

  if (!panel) {
    await interaction.reply({ content: "Failed to send panel message.", flags: MessageFlags.Ephemeral });
    return;
  }

  // Helper to normalize emoji for message.react
  function emojiForReact(emoji) {
    if (!emoji) return emoji;
    if (emoji.includes("<") && emoji.includes(":") && emoji.includes(">")) return emoji;
    if (emoji.includes(":")) {
      // formats like name:id or name:123
      const parts = emoji.split(":");
      const name = parts[0];
      const id = parts[1];
      if (/^\d+$/.test(id)) return `<:${name}:${id}>`;
    }
    return emoji;
  }

  for (const p of pairs) {
    const toReact = emojiForReact(p.emoji);
    try {
      // add reaction to panel message
      // eslint-disable-next-line no-await-in-loop
      await panel.react(toReact).catch(() => null);
    } catch (e) {
      // ignore
    }
  }

  // Create message-specific mappings so reaction events on this panel work
  for (const p of pairs) {
    reactionRolesStore.push({ guildId: interaction.guildId, channelId: interaction.channel.id, messageId: panel.id, emoji: p.emoji, roleId: p.roleId });
  }
  persistReactionRoles();

  await interaction.reply({ content: "Self-role reaction panel sent.", flags: MessageFlags.Ephemeral });
}

async function configureStarboard(interaction) {
  const channel = interaction.options.getChannel("channel", true);
  const threshold = interaction.options.getInteger("threshold", true);
  featureSettingsStore.community.starboardChannelId = channel.id;
  featureSettingsStore.community.starboardThreshold = threshold;
  persistFeatureSettings();
  await interaction.reply({ content: "Starboard configured.", flags: MessageFlags.Ephemeral });
}

async function startScheduledGiveaways() {
  const due = featureSettingsStore.giveaway.scheduled.filter((entry) => entry.startAt <= Date.now());
  if (!due.length) {
    return;
  }

  for (const scheduled of due) {
    const channel = await client.channels.fetch(scheduled.channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      continue;
    }

    const giveaway = {
      id: crypto.randomUUID(),
      prize: scheduled.prize,
      winnerCount: scheduled.winners,
      endsAt: Date.now() + scheduled.durationMs,
      channelId: channel.id,
      hostId: scheduled.hostId,
      participants: [],
      ended: false,
      messageId: null,
      requiredRoleId: featureSettingsStore.giveaway.requiredRoleId || "",
      bonusRoleId: featureSettingsStore.giveaway.bonusRoleId || "",
      bonusEntries: featureSettingsStore.giveaway.bonusEntries || 0,
      entryCounts: {}
    };

    const message = await channel.send({
      embeds: [buildGiveawayEmbed(giveaway)],
      components: [buildGiveawayButton(giveaway.id)]
    }).catch(() => null);

    if (message) {
      giveaway.messageId = message.id;
      giveawaysStore.push(giveaway);
      persistGiveaways();
    }
  }

  featureSettingsStore.giveaway.scheduled = featureSettingsStore.giveaway.scheduled.filter((entry) => entry.startAt > Date.now());
  persistFeatureSettings();
}

async function handleReactionRoleButton(interaction, roleId) {
  if (!interaction.guild) {
    await interaction.reply({ content: "This only works in a server.", flags: MessageFlags.Ephemeral });
    return;
  }

  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  const role = interaction.guild.roles.cache.get(roleId);
  if (!member || !role || role.managed || interaction.guild.members.me.roles.highest.position <= role.position) {
    await interaction.reply({ content: "I cannot toggle that role.", flags: MessageFlags.Ephemeral });
    return;
  }

  if (member.roles.cache.has(roleId)) {
    await member.roles.remove(roleId);
    await interaction.reply({ content: `Removed ${role} from you.`, flags: MessageFlags.Ephemeral });
  } else {
    await member.roles.add(roleId);
    await interaction.reply({ content: `Added ${role} to you.`, flags: MessageFlags.Ephemeral });
  }
}

async function handleReactionRoleEvent(reaction, user, added) {
  try {
    const msg = reaction.message;
    const guild = msg?.guild;
    if (!guild || !msg || !reaction.emoji) return;

    const mappings = (reactionRolesStore || []).filter((entry) => entry.guildId === guild.id && entry.messageId === msg.id);
    if (!mappings.length) return;

    const identifier = reaction.emoji.id ? `${reaction.emoji.name}:${reaction.emoji.id}` : reaction.emoji.name;

    const matched = mappings.find((m) => {
      if (!m || !m.emoji) return false;
      if (m.emoji === identifier) return true;
      if (m.emoji === reaction.emoji.name) return true;
      if (reaction.emoji.id && (m.emoji === `<:${reaction.emoji.name}:${reaction.emoji.id}>` || m.emoji === `<a:${reaction.emoji.name}:${reaction.emoji.id}>`)) return true;
      return false;
    });

    if (!matched) return;

    const role = guild.roles.cache.get(matched.roleId);
    if (!role || role.managed) return;

    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) return;

    // Ensure bot can manage the role
    if (guild.members.me.roles.highest.position <= role.position) return;

    if (added) {
      if (!member.roles.cache.has(role.id)) {
        await member.roles.add(role.id).catch(() => null);
      }
    } else {
      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role.id).catch(() => null);
      }
    }
  } catch (error) {
    // swallow errors silently
  }
}

async function finalizeApplicationDecision(interaction, decision, application, reason) {
  if (application.status === "accept" || application.status === "reject") {
    await interaction.reply({
      content: "This application has already been reviewed.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  application.status = decision;
  application.decisionReason = reason;
  application.reviewerId = interaction.user.id;
  application.reviewedAt = Date.now();

  let assignedRoleText = "No role assigned.";
  if (decision === "accept" && interaction.guild && application.targetRoleId) {
    const member = await interaction.guild.members.fetch(application.userId).catch(() => null);
    if (member) {
      await member.roles.add(application.targetRoleId).catch(() => null);
      assignedRoleText = `<@&${application.targetRoleId}>`;
    }
  }

  persistApplications();

  await sendModLog(decision === "accept" ? "Application Accepted" : "Application Rejected", [
    `User: <@${application.userId}>`,
    `Applied role: ${application.roleLabel}`,
    `Reviewer: ${interaction.user.tag}`,
    `Reason: ${reason}`,
    decision === "accept" ? `Assigned role: ${assignedRoleText}` : null
  ]);

  const applicant = await client.users.fetch(application.userId).catch(() => null);
  if (applicant) {
    const decisionTitle = decision === "accept" ? "✅ Application Accepted" : "Application Rejected";
    const decisionText =
      decision === "accept"
        ? [
            `Congratulations ${applicant}! 🎉`,
            "",
            "Your application has been successfully accepted.",
            "",
            "🥳 Welcome to **Bckertosts community**!",
            "",
            "An administrator will assign your roles and send you more information shortly.",
            "",
            "🍩 We look forward to working with you!"
          ].join("\n")
        : `Your application for **${config.botName}** has been rejected.`;

    await applicant.send({
      embeds: [
        buildEmbed(
          decisionTitle,
          [
            decisionText,
            ...(decision === "accept"
              ? []
              : [
                  `Applied role: ${application.roleLabel}`,
                  `Assigned role: ${assignedRoleText}`
                ]),
            `Reviewer: ${interaction.user.tag}`,
            `Reason: ${reason}`
          ].join("\n")
        )
      ]
    }).catch(() => null);
  }

  const updatedEmbed = buildEmbed(
    "Application Reviewed",
    buildApplicationDescription(application)
  );

  await interaction.message.edit({
    embeds: [updatedEmbed],
    components: [
      buildApplicationReviewButtons(application.id, true),
      buildRejectPresetButtons(application.id, true)
    ]
  });

  await interaction.reply({
    content: `Application ${decision}ed and applicant notified by DM.`,
    flags: MessageFlags.Ephemeral
  });
}

async function createTicket(interaction, reason, ticketType, details = {}, options = {}) {
  if (!interaction.guild) {
    await interaction.reply({
      content: "Tickets only work inside a server.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (!config.tickets.categoryId || !config.tickets.supportRoleId) {
    await interaction.reply({
      content: "The ticket system is not fully configured in `config.json` yet.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const ticketOwner = options.ownerUser || interaction.user;
  const openedBy = options.openedBy || interaction.user;

  const existingTicket = findOpenTicketForUserByType(interaction.guildId, ticketOwner.id, ticketType.key);

  if (existingTicket) {
    await interaction.reply({
      content: `${ticketOwner.id === interaction.user.id ? "You already have" : `${ticketOwner.tag} already has`} an open **${ticketType.label}** ticket: <#${existingTicket.channelId}>`,
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const openTicketCount = countOpenTicketsForUser(interaction.guildId, ticketOwner.id);
  const ticketLimit = getTicketLimitPerUser();
  if (openTicketCount >= ticketLimit) {
    await interaction.reply({
      content: `${ticketOwner.id === interaction.user.id ? "You have" : `${ticketOwner.tag} has`} reached the open ticket limit (**${ticketLimit}**).`,
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const safeName = ticketOwner.username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10);
  const typePrefix = ticketType.key.replace(/[^a-z0-9]/g, "").slice(0, 6);
  const extraSegment =
    ticketType.key === "claim-giveaway"
      ? sanitizeChannelSegment(details.giveawayHostRaw || details.giveawayHostId || "claim", "claim")
      : null;
  const amountSegment =
    ticketType.key === "claim-giveaway"
      ? sanitizeChannelSegment(details.winAmount || "win", "win")
      : null;
  const channelName = ticketType.key === "claim-giveaway"
    ? [amountSegment, config.tickets.channelNamePrefix, typePrefix, extraSegment]
    : [config.tickets.channelNamePrefix, typePrefix, extraSegment, safeName || interaction.user.id.slice(-4)];
  const finalChannelName = channelName
    .filter(Boolean)
    .join("-")
    .slice(0, 90);
  const ticketStaffRoleId = ticketType.key === "claim-giveaway"
    ? (config.applications.staffRoleId || config.tickets.supportRoleId)
    : config.tickets.supportRoleId;

  const permissionOverwrites = [
    {
      id: interaction.guild.roles.everyone.id,
      type: OverwriteType.Role,
      deny: [PermissionFlagsBits.ViewChannel]
    },
    {
      id: ticketOwner.id,
      type: OverwriteType.Member,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
    },
    {
      id: ticketStaffRoleId,
      type: OverwriteType.Role,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
    }
  ];

  for (const devRoleId of config.tickets.devRoleIds || []) {
    if (!devRoleId || devRoleId === ticketStaffRoleId) {
      continue;
    }

    permissionOverwrites.push({
      id: devRoleId,
      type: OverwriteType.Role,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
    });
  }

  const channel = await interaction.guild.channels.create({
    name: finalChannelName,
    type: ChannelType.GuildText,
    parent: config.tickets.categoryId,
    permissionOverwrites
  });

  ticketsStore.push({
    id: crypto.randomUUID(),
    guildId: interaction.guildId,
    channelId: channel.id,
    ownerId: ticketOwner.id,
    createdById: openedBy.id,
    typeKey: ticketType.key,
    typeLabel: ticketType.label,
    reason,
    details,
    closed: false,
    createdAt: Date.now()
  });
  persistTickets();
  const ticketRecord = ticketsStore[ticketsStore.length - 1];

  await sendModLog("Ticket Created", [
    `User: <@${ticketOwner.id}>`,
    openedBy.id !== ticketOwner.id ? `Opened by: ${openedBy.tag}` : null,
    `Category: ${ticketType.label}`,
    `Channel: <#${channel.id}>`,
    `Creation Form:`,
    buildCreationFormText(ticketType, details, reason)
  ]);

  const embed = buildTicketPanelEmbed(ticketRecord);
  const mentions = buildTicketMentions(ticketRecord);

  const panelMessage = await channel.send({
    content: mentions.join(" "),
    embeds: [embed],
    components: [buildTicketActionButtons(ticketRecord)]
  });

  if (ticketRecord) {
    ticketRecord.panelMessageId = panelMessage.id;
    persistTickets();
  }

  await interaction.reply({
    content: `${ticketOwner.id === interaction.user.id ? "Your" : `${ticketOwner.tag}'s`} ${ticketType.label} ticket has been created: ${channel}`,
    flags: MessageFlags.Ephemeral
  });
}

async function closeTicket(interaction) {
  if (!interaction.guild || !interaction.channel) {
    return;
  }

  const channelId = interaction.channelId;
  const channelName = interaction.channel.name;

  const ticket = ticketsStore.find(
    (entry) => entry.channelId === channelId && !entry.closed
  );

  if (!ticket) {
    const method = interaction.deferred || interaction.replied ? "followUp" : "reply";
    await interaction[method]({
      content: "This is not an open ticket.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  ticket.closed = true;
  ticket.closedAt = Date.now();
  persistTickets();

  await sendTicketTranscriptDm(
    ticket.ownerId,
    interaction.channel,
    ticket,
    "Closed manually"
  );

  if (config.tickets.transcriptChannelId) {
    const logChannel = await client.channels
      .fetch(config.tickets.transcriptChannelId)
      .catch(() => null);

    if (logChannel && logChannel.isTextBased()) {
      await logChannel.send({
        embeds: [
          buildEmbed(
            "Ticket Closed",
            [
              `Channel: ${channelName}`,
              `User: <@${ticket.ownerId}>`,
              `Category: ${ticket.typeLabel || "Unknown"}`,
              ticket.details?.giveawayHostRaw ? `Giveaway Host: ${ticket.details.giveawayHostMention || ticket.details.giveawayHostRaw}` : null,
              ticket.details?.winAmount ? `Win Amount: ${ticket.details.winAmount}` : null,
              ticket.details?.ign ? `IGN: ${ticket.details.ign}` : null,
              `Creation Form:\n${buildCreationFormText(
                { key: ticket.typeKey || "" },
                ticket.details || {},
                ticket.reason
              )}`
            ].filter(Boolean).join("\n")
          )
        ]
      });
    }
  }

  const method = interaction.deferred || interaction.replied ? "followUp" : "reply";
  await interaction[method]({
    content: "Ticket is being closed...",
    flags: MessageFlags.Ephemeral
  });

  scheduleChannelDelete(channelId, "Ticket closed by bot");
}

function findOpenTicketByChannelId(channelId) {
  return ticketsStore.find((entry) => entry.channelId === channelId && !entry.closed) || null;
}

async function ensureTicketManagementContext(interaction) {
  if (!interaction.guild || !interaction.channel) {
    await interaction.reply({
      content: "This command only works inside a server ticket channel.",
      flags: MessageFlags.Ephemeral
    });
    return null;
  }

  const ticket = findOpenTicketByChannelId(interaction.channelId);
  if (!ticket) {
    await interaction.reply({
      content: "This channel is not an open ticket.",
      flags: MessageFlags.Ephemeral
    });
    return null;
  }

  return ticket;
}

async function handleTicketCommand(interaction) {
  const ticket = await ensureTicketManagementContext(interaction);
  if (!ticket) {
    return;
  }

  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "add") {
    const user = interaction.options.getUser("user", true);

    await interaction.channel.permissionOverwrites.edit(user.id, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true
    }).catch(async () => {
      await interaction.reply({
        content: "I could not add that user to this ticket.",
        flags: MessageFlags.Ephemeral
      });
    });

    if (interaction.replied) {
      return;
    }

    await sendModLog("Ticket User Added", [
      `Channel: <#${interaction.channelId}>`,
      `User added: <@${user.id}>`,
      `Moderator: ${interaction.user.tag}`
    ]);

    await interaction.reply({
      content: `${user} was added to this ticket.`,
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (subcommand === "remove") {
    const user = interaction.options.getUser("user", true);

    if (user.id === ticket.ownerId) {
      await interaction.reply({
        content: "You cannot remove the ticket owner from their own ticket.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await interaction.channel.permissionOverwrites.delete(user.id).catch(async () => {
      await interaction.reply({
        content: "I could not remove that user from this ticket.",
        flags: MessageFlags.Ephemeral
      });
    });

    if (interaction.replied) {
      return;
    }

    await sendModLog("Ticket User Removed", [
      `Channel: <#${interaction.channelId}>`,
      `User removed: <@${user.id}>`,
      `Moderator: ${interaction.user.tag}`
    ]);

    await interaction.reply({
      content: `${user} was removed from this ticket.`,
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (subcommand === "claim") {
    ticket.details.claimedById = interaction.user.id;
    persistTickets();
    await refreshTicketPanelMessage(ticket).catch(() => null);
    await interaction.reply({ content: `Ticket claimed by ${interaction.user}.`, flags: MessageFlags.Ephemeral });
    return;
  }

  if (subcommand === "unclaim") {
    ticket.details.claimedById = null;
    persistTickets();
    await refreshTicketPanelMessage(ticket).catch(() => null);
    await interaction.reply({ content: "Ticket unclaimed.", flags: MessageFlags.Ephemeral });
    return;
  }

  if (subcommand === "transcript") {
    const transcript = await buildChannelTranscript(interaction.channel);
    const transcriptPath = path.join(__dirname, "..", "data", `ticket-transcript-${ticket.channelId}.txt`);
    fs.writeFileSync(transcriptPath, transcript);
    await interaction.reply({
      content: "Ticket transcript exported.",
      files: [new AttachmentBuilder(transcriptPath)],
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (subcommand === "move") {
    const categoryId = interaction.options.getString("category_id", true);
    await interaction.channel.setParent(categoryId).catch(async () => {
      await interaction.reply({ content: "I could not move this ticket.", flags: MessageFlags.Ephemeral });
    });
    if (interaction.replied) {
      return;
    }
    await interaction.reply({ content: `Ticket moved to category \`${categoryId}\`.`, flags: MessageFlags.Ephemeral });
    return;
  }

  if (subcommand === "priority") {
    ticket.details.priority = interaction.options.getString("level", true);
    persistTickets();
    await refreshTicketPanelMessage(ticket).catch(() => null);
    await interaction.reply({ content: `Ticket priority set to **${ticket.details.priority}**.`, flags: MessageFlags.Ephemeral });
    return;
  }

  if (subcommand === "tag") {
    ticket.details.tag = interaction.options.getString("name", true);
    persistTickets();
    await refreshTicketPanelMessage(ticket).catch(() => null);
    await interaction.reply({ content: `Ticket tag set to **${ticket.details.tag}**.`, flags: MessageFlags.Ephemeral });
    return;
  }

  if (subcommand === "note") {
    if (!Array.isArray(ticket.details.staffNotes)) {
      ticket.details.staffNotes = [];
    }
    ticket.details.staffNotes.push({
      authorId: interaction.user.id,
      text: interaction.options.getString("text", true),
      createdAt: Date.now()
    });
    persistTickets();
    await interaction.reply({ content: "Private staff note added.", flags: MessageFlags.Ephemeral });
    return;
  }

  if (subcommand === "rename") {
    const newName = interaction.options.getString("name", true).toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 90);

    if (!newName) {
      await interaction.reply({
        content: "Please provide a valid ticket name using letters, numbers, or dashes.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await interaction.channel.setName(newName).catch(async () => {
      await interaction.reply({
        content: "I could not rename this ticket.",
        flags: MessageFlags.Ephemeral
      });
    });

    if (interaction.replied) {
      return;
    }

    await sendModLog("Ticket Renamed", [
      `Channel: <#${interaction.channelId}>`,
      `New name: ${newName}`,
      `Moderator: ${interaction.user.tag}`
    ]);

    await interaction.reply({
      content: `Ticket renamed to \`${newName}\`.`,
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (subcommand === "relode") {
    const reloaded = await refreshTicketPanelMessage(ticket);

    if (!reloaded) {
      await interaction.reply({
        content: "I could not find the ticket panel message to relode.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await sendModLog("Ticket Panel Reloaded", [
      `Channel: <#${interaction.channelId}>`,
      `Moderator: ${interaction.user.tag}`
    ]);

    await interaction.reply({
      content: "Ticket panel reloded.",
      flags: MessageFlags.Ephemeral
    });
  }
}

async function sendApplicationPanel(interaction) {
  if (!config.applications.enabled) {
    await interaction.reply({
      content: "Applications are disabled.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const embed = buildEmbed(
    "🎫 🍩 **Bckertosts community Team Application** 🍩",
    [
      "Would you like to become part of **Bckertosts community**?",
      "",
      "We are looking for active, friendly, and reliable members who want to help and support our community.",
      "",
      "👑 **Open Positions:**",
      "🛡️ Moderator",
      "🎫 Supporter",
      "",
      "✅ Helpful",
      "✅ Active on Discord",
      "✅ Respectful towards others",
      "✅ Team-oriented",
      "",
      areApplicationsOpen()
        ? "📩 Click the button below this panel to start your application."
        : "⛔ Applications are currently closed.",
      "",
      "🍀 **Good luck!** 🍀"
    ].join("\n")
  );

  await interaction.channel.send({
    embeds: [
      embed
        .setThumbnail("attachment://crumb-donut-ticket.png")
        .setImage("attachment://crumb-donut-ticket-footer.png")
    ],
    files: [
      new AttachmentBuilder(ticketPanelImagePath, { name: "crumb-donut-ticket.png" }),
      new AttachmentBuilder(ticketPanelFooterImagePath, { name: "crumb-donut-ticket-footer.png" })
    ],
    components: [buildApplicationButtons()]
  });

  await interaction.reply({
    content: "Application panel sent.",
    flags: MessageFlags.Ephemeral
  });
}

async function startApplication(interaction) {
  if (!areApplicationsOpen()) {
    await interaction.reply({
      content: "Applications are currently closed.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (!config.applications.reviewChannelId || config.applications.questions.length === 0) {
    await interaction.reply({
      content: "Applications are not fully configured in `config.json` yet.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (!Array.isArray(config.applications.roles) || config.applications.roles.length === 0) {
    await interaction.reply({
      content: "Applications need at least one configured role in `config.json`.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const cooldownMs = getApplicationCooldownMs();
  const latestApplication = getLatestApplicationForUser(interaction.user.id);
  if (cooldownMs > 0 && latestApplication && Date.now() - latestApplication.createdAt < cooldownMs) {
    await interaction.reply({
      content: `You can apply again in **${formatDuration(cooldownMs - (Date.now() - latestApplication.createdAt))}**.`,
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  await interaction.reply({
    content: "Choose the role you want to apply for.",
    components: [buildApplicationRoleSelect()],
    flags: MessageFlags.Ephemeral
  });
}

async function beginApplicationFlow(interaction, selectedRole) {
  applicationSessions.set(interaction.user.id, {
    startedAt: Date.now(),
    questionIndex: 0,
    answers: [],
    selectedRoleKey: selectedRole.key,
    selectedRoleLabel: selectedRole.label,
    selectedRoleId: selectedRole.roleId
  });

  const dm = await interaction.user.createDM();
  await dm.send(
    `Your application for **${config.botName}** as **${selectedRole.label}** starts now.\nQuestion 1/${config.applications.questions.length}: ${config.applications.questions[0]}`
  );

  await interaction.update({
    content: `I sent you a DM to start your **${selectedRole.label}** application. Just reply there to answer the questions.`,
    components: []
  });
}

async function handleApplicationAnswer(message) {
  const session = applicationSessions.get(message.author.id);

  if (!session) {
    return;
  }

  session.answers.push(message.content);
  session.questionIndex += 1;

  if (session.questionIndex < config.applications.questions.length) {
    await message.channel.send(
      `Question ${session.questionIndex + 1}/${config.applications.questions.length}: ${config.applications.questions[session.questionIndex]}`
    );
    return;
  }

  applicationSessions.delete(message.author.id);

  const reviewChannel = await client.channels
    .fetch(config.applications.reviewChannelId)
    .catch(() => null);

  if (reviewChannel && reviewChannel.isTextBased()) {
    const application = {
      id: crypto.randomUUID(),
      userId: message.author.id,
      roleKey: session.selectedRoleKey,
      roleLabel: session.selectedRoleLabel,
      targetRoleId: session.selectedRoleId,
      questions: [...config.applications.questions],
      answers: [...session.answers],
      status: "pending",
      reviewerId: null,
      interviewedById: null,
      decisionReason: null,
      reviewMessageId: null,
      createdAt: Date.now(),
      reviewedAt: null
    };

    const reviewMessage = await reviewChannel.send({
      content: config.applications.staffRoleId ? `<@&${config.applications.staffRoleId}>` : undefined,
      embeds: [
        buildEmbed("New Application", buildApplicationDescription(application))
      ],
      components: [
        buildApplicationReviewButtons(application.id),
        buildRejectPresetButtons(application.id)
      ]
    });

    application.reviewMessageId = reviewMessage.id;
    application.reviewChannelId = reviewChannel.id;
    applicationsStore.push(application);
    persistApplications();

    await sendModLog("Application Submitted", [
      `User: <@${application.userId}>`,
      `Role: ${application.roleLabel}`,
      `Application ID: ${application.id}`
    ]);
  }

  await message.channel.send("Your application has been submitted. Good luck.");
}

function resolveRps(choice, botChoice) {
  if (choice === botChoice) {
    return "It's a draw.";
  }

  const wins =
    (choice === "rock" && botChoice === "scissors") ||
    (choice === "paper" && botChoice === "rock") ||
    (choice === "scissors" && botChoice === "paper");

  return wins ? "You won." : "I won.";
}

function resolvePlayerRps(firstChoice, secondChoice, firstUser, secondUser) {
  if (firstChoice === secondChoice) {
    return `It's a draw. Both chose **${firstChoice}**.`;
  }

  const firstWins =
    (firstChoice === "rock" && secondChoice === "scissors") ||
    (firstChoice === "paper" && secondChoice === "rock") ||
    (firstChoice === "scissors" && secondChoice === "paper");

  return firstWins
    ? `${firstUser} wins. ${firstChoice} beats ${secondChoice}.`
    : `${secondUser} wins. ${secondChoice} beats ${firstChoice}.`;
}

async function handleCommand(interaction) {
  if (interaction.commandName === "ping") {
    await interaction.reply("Pong!");
    return;
  }

  if (interaction.commandName === "reaction-rolls-configure") {
    const action = interaction.options.getString("action", true);
    const key = interaction.options.getString("key");

    if (action === "list") {
      if (!reactionRollsStore || reactionRollsStore.length === 0) {
        await interaction.reply({ content: "No reaction rolls configured.", flags: MessageFlags.Ephemeral });
        return;
      }

      const lines = reactionRollsStore.map((cfg) => `**${cfg.key}** — <#${cfg.channelId}> / ${cfg.messageId} — winners: ${cfg.winners}`);
      await interaction.reply({ content: lines.join("\n"), flags: MessageFlags.Ephemeral });
      return;
    }

    if (action === "add") {
      if (!key) {
        await interaction.reply({ content: "You must provide a unique `key` for this roll.", flags: MessageFlags.Ephemeral });
        return;
      }

      const channel = interaction.options.getChannel("channel");
      const messageId = interaction.options.getString("message_id");
      const winners = interaction.options.getInteger("winners") || 1;

      if (!channel || !messageId) {
        await interaction.reply({ content: "You must provide `channel` and `message_id`.", flags: MessageFlags.Ephemeral });
        return;
      }

      if (!reactionRollsStore) reactionRollsStore = [];
      if (reactionRollsStore.find((r) => r.key === key)) {
        await interaction.reply({ content: "A reaction roll with this key already exists.", flags: MessageFlags.Ephemeral });
        return;
      }

      reactionRollsStore.push({ key, channelId: channel.id, messageId, winners });
      persistReactionRolls();
      await interaction.reply({ content: `Added reaction roll **${key}**.`, flags: MessageFlags.Ephemeral });
      return;
    }

    if (action === "remove") {
      if (!key) {
        await interaction.reply({ content: "You must provide the `key` to remove.", flags: MessageFlags.Ephemeral });
        return;
      }

      const idx = reactionRollsStore.findIndex((r) => r.key === key);
      if (idx === -1) {
        await interaction.reply({ content: "No reaction roll found with that key.", flags: MessageFlags.Ephemeral });
        return;
      }

      reactionRollsStore.splice(idx, 1);
      persistReactionRolls();
      await interaction.reply({ content: `Removed reaction roll **${key}**.`, flags: MessageFlags.Ephemeral });
      return;
    }
  }

  if (interaction.commandName === "self-rolls") {
    const action = interaction.options.getString("action", true);

    if (action === "list") {
      const list = (reactionRolesStore || []).filter((r) => r.guildId === interaction.guildId);
      if (list.length === 0) {
        await interaction.reply({ content: "No reaction roles configured for this server.", flags: MessageFlags.Ephemeral });
        return;
      }

      const lines = list.map((entry) => `<#${entry.channelId}> / ${entry.messageId} — ${entry.emoji} => <@&${entry.roleId}>`);
      await interaction.reply({ content: lines.join("\n"), flags: MessageFlags.Ephemeral });
      return;
    }

    if (action === "add") {
      const channel = interaction.options.getChannel("channel");
      const messageId = interaction.options.getString("message_id");
      const emoji = interaction.options.getString("emoji");
      const role = interaction.options.getRole("role");

      if (!channel || !messageId || !emoji || !role) {
        await interaction.reply({ content: "You must provide `channel`, `message_id`, `emoji` and `role`.", flags: MessageFlags.Ephemeral });
        return;
      }

      if (!reactionRolesStore) reactionRolesStore = [];
      reactionRolesStore.push({ guildId: interaction.guildId, channelId: channel.id, messageId, emoji, roleId: role.id });
      persistReactionRoles();
      await interaction.reply({ content: `Added reaction role: ${emoji} → ${role}.`, flags: MessageFlags.Ephemeral });
      return;
    }

    if (action === "remove") {
      const channel = interaction.options.getChannel("channel");
      const messageId = interaction.options.getString("message_id");
      const emoji = interaction.options.getString("emoji");

      if (!channel || !messageId || !emoji) {
        await interaction.reply({ content: "You must provide `channel`, `message_id` and `emoji` to remove.", flags: MessageFlags.Ephemeral });
        return;
      }

      const idx = (reactionRolesStore || []).findIndex((e) => e.guildId === interaction.guildId && e.channelId === channel.id && e.messageId === messageId && e.emoji === emoji);
      if (idx === -1) {
        await interaction.reply({ content: "No matching reaction role found.", flags: MessageFlags.Ephemeral });
        return;
      }

      reactionRolesStore.splice(idx, 1);
      persistReactionRoles();
      await interaction.reply({ content: "Reaction role removed.", flags: MessageFlags.Ephemeral });
      return;
    }
  }

  if (interaction.commandName === "matenence") {
    const ownerId = process.env.OWNER_ID || config.ownerId || flaggedUserId;
    if (interaction.user.id !== ownerId) {
      await interaction.reply({ content: "Only the bot owner can use this command.", flags: MessageFlags.Ephemeral });
      return;
    }

    const action = interaction.options.getString("action", true);
    const message = interaction.options.getString("message") || config.playing;

    try {
      if (action === "on") {
        await client.user.setPresence({ activities: [{ name: message }], status: "dnd" });
        await interaction.reply({ content: `Maintenance mode enabled: ${message}`, flags: MessageFlags.Ephemeral });
        return;
      }

      if (action === "off") {
        await client.user.setPresence({ activities: [], status: "online" });
        await interaction.reply({ content: "Maintenance mode disabled.", flags: MessageFlags.Ephemeral });
        return;
      }
    } catch (err) {
      await interaction.reply({ content: "Failed to update presence.", flags: MessageFlags.Ephemeral });
      return;
    }
  }

  if (interaction.commandName === "coinflip") {
    const result = Math.random() < 0.5 ? "Heads" : "Tails";
    await interaction.reply(`The coin landed on: **${result}**`);
    return;
  }

  if (interaction.commandName === "reaction-rolls-draw") {
    const key = interaction.options.getString("key");
    const channelOpt = interaction.options.getChannel("channel");
    const messageIdOpt = interaction.options.getString("message_id");
    const winnersOpt = interaction.options.getInteger("winners");

    let cfg = null;
    if (key) cfg = (reactionRollsStore || []).find((r) => r.key === key) || null;
    if (!cfg) {
      if (!channelOpt || !messageIdOpt) {
        await interaction.reply({ content: "Provide either a configured `key` or both `channel` and `message_id`.", flags: MessageFlags.Ephemeral });
        return;
      }
      cfg = { channelId: channelOpt.id, messageId: messageIdOpt, winners: winnersOpt || 1 };
    }

    const channel = await client.channels.fetch(cfg.channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      await interaction.reply({ content: "Could not fetch the configured channel.", flags: MessageFlags.Ephemeral });
      return;
    }

    const message = await channel.messages.fetch(cfg.messageId).catch(() => null);
    if (!message) {
      await interaction.reply({ content: "Could not fetch the configured message.", flags: MessageFlags.Ephemeral });
      return;
    }

    // collect unique user IDs who reacted (exclude bots)
    const usersSet = new Set();
    for (const reaction of message.reactions.cache.values()) {
      const users = await reaction.users.fetch();
      for (const user of users.values()) {
        if (user.bot) continue;
        usersSet.add(user.id);
      }
    }

    const participantIds = [...usersSet];
    if (participantIds.length === 0) {
      await interaction.reply({ content: "No participants found for this message.", flags: MessageFlags.Ephemeral });
      return;
    }

    const winnersCount = winnersOpt || cfg.winners || 1;
    const winners = [];
    while (winners.length < Math.min(winnersCount, participantIds.length)) {
      const idx = Math.floor(Math.random() * participantIds.length);
      const id = participantIds.splice(idx, 1)[0];
      winners.push(id);
    }

    const mentions = winners.map((id) => `<@${id}>`).join(", ");
    await interaction.reply({ content: `Winners: ${mentions}` });
    return;
  }

  if (interaction.commandName === "unmute") {
    await unmuteMember(interaction);
    return;
  }

  if (interaction.commandName === "warn") {
    await warnMember(interaction);
    return;
  }

  if (interaction.commandName === "unwarn") {
    await unwarnMember(interaction);
    return;
  }

  if (interaction.commandName === "warnings") {
    await showWarnings(interaction);
    return;
  }

  if (interaction.commandName === "history") {
    await sendModerationHistory(interaction);
    return;
  }

  if (interaction.commandName === "kick") {
    await kickMember(interaction);
    return;
  }

  if (interaction.commandName === "ban") {
    await banUser(interaction);
    return;
  }

  if (interaction.commandName === "unban") {
    await unbanUser(interaction);
    return;
  }

  if (interaction.commandName === "mute") {
    await muteMember(interaction);
    return;
  }

  if (interaction.commandName === "help") {
    await interaction.reply({
      embeds: [
        buildEmbed(
          "Help",
          buildHelpLines(interaction).join("\n")
        )
      ],
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (interaction.commandName === "echo") {
    const text = interaction.options.getString("text", true);
    await interaction.reply(text);
    return;
  }

  if (interaction.commandName === "gvouch") {
    const user = interaction.options.getUser("user", true);
    const channel = interaction.options.getChannel("channel", true);
    await channel.send(`Please vouch ${user} in ${channel}`);
    await interaction.reply({
      content: "Vouch message sent.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (interaction.commandName === "penis") {
    await interaction.channel.send("# Pennis");
    await interaction.reply({
      content: "Message sent.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (interaction.commandName === "clear") {
    await clearMessages(interaction);
    return;
  }

  if (interaction.commandName === "slowmode") {
    await setSlowmode(interaction);
    return;
  }

  if (interaction.commandName === "lock") {
    await lockChannel(interaction);
    return;
  }

  if (interaction.commandName === "unlock") {
    await lockChannel(interaction, true);
    return;
  }

  if (interaction.commandName === "userinfo") {
    await sendUserInfo(interaction);
    return;
  }

  if (interaction.commandName === "avatar") {
    await sendAvatar(interaction);
    return;
  }

  if (interaction.commandName === "serverinfo") {
    await sendServerInfo(interaction);
    return;
  }

  if (interaction.commandName === "say") {
    await sendPlainMessage(interaction);
    return;
  }

  if (interaction.commandName === "embed") {
    await sendEmbedMessage(interaction);
    return;
  }

  if (interaction.commandName === "poll") {
    await sendPoll(interaction);
    return;
  }

  if (interaction.commandName === "announce") {
    await sendAnnouncement(interaction);
    return;
  }

  if (interaction.commandName === "remind") {
    await setReminder(interaction);
    return;
  }

  if (interaction.commandName === "role") {
    await addRoleToMember(interaction);
    return;
  }

  if (interaction.commandName === "premot") {
    await addRoleToMember(interaction);
    return;
  }

  if (interaction.commandName === "removerole") {
    await addRoleToMember(interaction, true);
    return;
  }

  if (interaction.commandName === "nick") {
    await changeNickname(interaction);
    return;
  }

  if (interaction.commandName === "nickreset") {
    await resetNickname(interaction);
    return;
  }

  if (interaction.commandName === "8ball") {
    const question = interaction.options.getString("question", true);
    await interaction.reply({
      embeds: [buildEmbed("🎱 Magic 8-Ball", `Question: ${question}
Answer: **${answerEightBall()}**`)]
    });
    return;
  }

  if (interaction.commandName === "dice") {
    await rollDice(interaction);
    return;
  }

  if (interaction.commandName === "uptime") {
    await sendUptime(interaction);
    return;
  }

  if (interaction.commandName === "botinfo") {
    await sendBotInfo(interaction);
    return;
  }

  if (interaction.commandName === "afk") {
    await setAfkStatus(interaction);
    return;
  }

  if (interaction.commandName === "snipe") {
    await sendSnipe(interaction);
    return;
  }

  if (interaction.commandName === "hug") {
    await sendHug(interaction);
    return;
  }

  if (interaction.commandName === "ship") {
    await sendShip(interaction);
    return;
  }

  if (interaction.commandName === "meme") {
    await sendMeme(interaction);
    return;
  }

  if (interaction.commandName === "suggest") {
    await sendSuggestion(interaction);
    return;
  }

  if (interaction.commandName === "daily") {
    await claimDaily(interaction);
    return;
  }

  if (interaction.commandName === "work") {
    await workForCoins(interaction);
    return;
  }

  if (interaction.commandName === "beg") {
    await begForCoins(interaction);
    return;
  }

  if (interaction.commandName === "balance") {
    await sendBalance(interaction);
    return;
  }

  if (interaction.commandName === "leaderboard") {
    await sendLeaderboard(interaction);
    return;
  }

  if (interaction.commandName === "pay") {
    await payCoins(interaction);
    return;
  }

  if (interaction.commandName === "shop") {
    await sendShop(interaction);
    return;
  }

  if (interaction.commandName === "buy") {
    await buyShopItem(interaction);
    return;
  }

  if (interaction.commandName === "inventory") {
    await sendInventory(interaction);
    return;
  }

  if (interaction.commandName === "bank") {
    await sendBank(interaction);
    return;
  }

  if (interaction.commandName === "deposit") {
    await depositCoins(interaction);
    return;
  }

  if (interaction.commandName === "withdraw") {
    await withdrawCoins(interaction);
    return;
  }

  if (interaction.commandName === "interest") {
    await claimInterest(interaction);
    return;
  }

  if (interaction.commandName === "economy-admin") {
    await economyAdmin(interaction);
    return;
  }

  if (interaction.commandName === "profile") {
    await sendProfile(interaction);
    return;
  }

  if (interaction.commandName === "marry") {
    await marryUser(interaction);
    return;
  }

  if (interaction.commandName === "divorce") {
    await divorceUser(interaction);
    return;
  }

  if (interaction.commandName === "streak") {
    await sendStreak(interaction);
    return;
  }

  if (interaction.commandName === "vouch") {
    await createVouch(interaction);
    return;
  }

  if (interaction.commandName === "reactionrole-panel") {
    await sendReactionRolePanel(interaction);
    return;
  }

  if (interaction.commandName === "selfrole-panel") {
    await sendSelfRolePanel(interaction);
    return;
  }

  if (interaction.commandName === "starboard-setup") {
    await configureStarboard(interaction);
    return;
  }

  if (interaction.commandName === "backup-export") {
    await exportBackup(interaction);
    return;
  }

  if (interaction.commandName === "health") {
    await sendHealth(interaction);
    return;
  }

  if (interaction.commandName === "giveaway-blacklist") {
    await configureGiveawayBlacklist(interaction);
    return;
  }

  if (interaction.commandName === "giveaway-settings") {
    await configureGiveawaySettings(interaction);
    return;
  }

  if (interaction.commandName === "giveaway-schedule") {
    await scheduleGiveaway(interaction);
    return;
  }

  if (interaction.commandName === "fastclick") {
    const seconds = 60;
    const prize = interaction.options.getString("prize", true);
    const gameId = crypto.randomUUID();
    const button = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`fastclick:${gameId}`)
        .setLabel("CLICK!")
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({
      embeds: [
        buildEmbed(
          "Fast Click",
          `Prize: **${prize}**\n1min zum drucken`
        )
      ],
      components: [button]
    });
    const message = await interaction.fetchReply();

    fastClickGames.set(gameId, {
      messageId: message.id,
      endsAt: Date.now() + seconds * 1000,
      won: false
    });

    setTimeout(async () => {
      const game = fastClickGames.get(gameId);
      if (!game || game.won) {
        return;
      }

      fastClickGames.delete(gameId);
      await message.edit({
        embeds: [buildEmbed("Fast Click", `Prize: **${prize}**\nTime is up. Nobody won.`)],
        components: [
          new ActionRowBuilder().addComponents(
            ButtonBuilder.from(button.components[0]).setDisabled(true)
          )
        ]
      }).catch(() => null);
    }, seconds * 1000);

    return;
  }

  if (interaction.commandName === "minigame") {
    const type = interaction.options.getString("type", true);

    if (type === "number") {
      const guess = interaction.options.getInteger("number");
      if (!guess) {
        await interaction.reply({
          content: "Please provide a guess from 1 to 10 in `number`.",
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const target = Math.floor(Math.random() * 10) + 1;
      const won = guess === target;
      await interaction.reply(
        won
          ? `Nice. The number was **${target}** and you guessed it.`
          : `Close. The number was **${target}**.`
      );
      return;
    }

    if (type === "rps") {
      const opponent = interaction.options.getUser("opponent");
      if (opponent) {
        if (opponent.bot || opponent.id === interaction.user.id) {
          await interaction.reply({
            content: "Choose a real different user as your opponent.",
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        const gameId = crypto.randomUUID();
        const labels = {
          rock: "Rock",
          paper: "Paper",
          scissors: "Scissors"
        };

        rpsGames.set(gameId, {
          challengerId: interaction.user.id,
          opponentId: opponent.id,
          challengerChoice: null,
          opponentChoice: null,
          labels
        });

        await interaction.reply({
          embeds: [
            buildEmbed(
              "Rock Paper Scissors",
              [
                `${interaction.user} challenged ${opponent}.`,
                "Both players have 60 seconds to choose.",
                "Choices stay hidden until both players click."
              ].join("\n")
            )
          ],
          components: [buildRpsButtons(gameId)]
        });

        const message = await interaction.fetchReply();
        const game = rpsGames.get(gameId);
        if (game) {
          game.messageId = message.id;
          game.channelId = interaction.channelId;
        }

        setTimeout(async () => {
          const activeGame = rpsGames.get(gameId);
          if (!activeGame) {
            return;
          }

          rpsGames.delete(gameId);
          await message.edit({
            embeds: [
              buildEmbed(
                "Rock Paper Scissors",
                "The challenge expired because not both players made a choice in time."
              )
            ],
            components: [buildRpsButtons(gameId, true)]
          }).catch(() => null);
        }, 60000);

        return;
      }

      const choice = interaction.options.getString("choice");
      if (!choice) {
        await interaction.reply({
          content: "Please provide Rock, Paper or Scissors in `choice`.",
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const options = ["rock", "paper", "scissors"];
      const botChoice = options[Math.floor(Math.random() * options.length)];
      const labels = {
        rock: "Rock",
        paper: "Paper",
        scissors: "Scissors"
      };

      await interaction.reply(
        `You: **${labels[choice]}**\nMe: **${labels[botChoice]}**\n${resolveRps(choice, botChoice)}`
      );
      return;
    }
  }

  if (interaction.commandName === "giveaway-create") {
    if (!config.giveaways.enabled) {
      await interaction.reply({
        content: "Giveaways are disabled.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await interaction.showModal(createGiveawayModal());
    return;
  }

  if (interaction.commandName === "giveaway-reroll") {
    const messageId = interaction.options.getString("message_id", true);
    await rerollGiveawayByMessageId(interaction, messageId);
    return;
  }

  if (interaction.commandName === "gping") {
    const type = interaction.options.getString("type", true);
    const sponsorRole = interaction.options.getRole("sponsor", true);
    await replySponsorPing(interaction, type, sponsorRole.id);
    return;
  }

  if (interaction.commandName === "gpingqd") {
    const role = interaction.options.getRole("role", true);
    await replySponsorPing(interaction, "qd", role.id);
    return;
  }

  if (interaction.commandName === "gping-extra") {
    await replySponsorPing(interaction, "extra");
    return;
  }

  if (interaction.commandName === "gping-daily") {
    await replySponsorPing(interaction, "daily");
    return;
  }

  if (interaction.commandName === "gping-weekly") {
    await replySponsorPing(interaction, "weekly");
    return;
  }

  if (interaction.isMessageContextMenuCommand() && interaction.commandName === "Reroll Giveaway") {
    await rerollGiveawayByMessageId(interaction, interaction.targetId);
    return;
  }

  if (interaction.commandName === "ticket-panel") {
    if (!config.tickets.enabled) {
      await interaction.reply({
        content: "Tickets are disabled.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await interaction.channel.send({
      embeds: [
        buildEmbed(
          "🎫 🍩 **Bckertosts community Support Tickets** 🍩",
          [
            "Do you need help or do you have a question?",
            "",
            "Create a ticket and our team will get back to you as soon as possible.",
            "",
            "📩 **Ticket Reasons:**",
            "",
            "🎁 Giveaway questions",
            "🏆 Prize not received",
            "🚨 Report a player",
            "❓ General support",
            "💡 Suggestions & feedback",
            "",
            "⚠️ Please only open tickets for important issues and describe your problem as clearly as possible.",
            "",
            "🍩 Thank you for being part of **Bckertosts community**!"
          ].join("\n")
        )
          .setThumbnail("attachment://crumb-donut-ticket.png")
          .setImage("attachment://crumb-donut-ticket-footer.png")
      ],
      files: [
        new AttachmentBuilder(ticketPanelImagePath, { name: "crumb-donut-ticket.png" }),
        new AttachmentBuilder(ticketPanelFooterImagePath, { name: "crumb-donut-ticket-footer.png" })
      ],
      components: [buildTicketButtons()]
    });

    await interaction.reply({
      content: "Ticket panel sent.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (interaction.commandName === "ticket") {
    await handleTicketCommand(interaction);
    return;
  }

  if (interaction.commandName === "onbehalf") {
    if (!config.tickets.enabled) {
      await interaction.reply({
        content: "Tickets are disabled.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const targetUser = interaction.options.getUser("user", true);
    const category = interaction.options.getString("category", true);
    const reason = interaction.options.getString("reason") || "";
    const ticketType = findTicketType(category);

    if (!ticketType) {
      await interaction.reply({
        content: "That ticket type is not configured.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const details = {};

    if (ticketType.key === "claim-giveaway") {
      const giveawayHostRaw = interaction.options.getString("giveaway_host");
      const winAmount = interaction.options.getString("win_amount");
      const ign = interaction.options.getString("ign");

      if (!giveawayHostRaw || !winAmount || !ign) {
        await interaction.reply({
          content: "For Claim Giveaway, you must provide `giveaway_host`, `win_amount`, and `ign`.",
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const giveawayHostId = extractUserId(giveawayHostRaw);
      details.giveawayHostRaw = giveawayHostRaw;
      details.giveawayHostId = giveawayHostId;
      details.giveawayHostMention = giveawayHostId ? `<@${giveawayHostId}>` : null;
      details.winAmount = winAmount;
      details.ign = ign;
    }

    if (ticketType.key === "report-someone") {
      const reportTargetRaw = interaction.options.getString("report_target");
      if (!reportTargetRaw || !reason) {
        await interaction.reply({
          content: "For Report Someone, you must provide `report_target` and `reason`.",
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const reportTargetId = extractUserId(reportTargetRaw);
      details.reportTargetRaw = reportTargetRaw;
      details.reportTargetId = reportTargetId;
      details.reportTargetMention = reportTargetId ? `<@${reportTargetId}>` : null;
      details.proof = interaction.options.getString("proof") || "";
    }

    if (ticketType.key === "sponsor-giveaway") {
      const amount = interaction.options.getString("amount");
      if (!amount) {
        await interaction.reply({
          content: "For Sponsor Giveaway, you must provide `amount`.",
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      details.amount = amount;
    }

    if (ticketType.key === "partner-request") {
      const dcLink = interaction.options.getString("dc_link");
      const memberCount = interaction.options.getString("member_count");
      if (!dcLink || !memberCount) {
        await interaction.reply({
          content: "For Partner Request, you must provide `dc_link` and `member_count`.",
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      details.dcLink = dcLink;
      details.memberCount = memberCount;
    }

    if (ticketType.key === "support" && !reason) {
      await interaction.reply({
        content: "For Support, you must provide `reason`.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await createTicket(interaction, reason, ticketType, details, {
      ownerUser: targetUser,
      openedBy: interaction.user
    });
    return;
  }

  if (interaction.commandName === "invest") {
    await handleInvestCommand(interaction);
    return;
  }

  if (interaction.commandName === "invest-panel") {
    if (!config.tickets.enabled) {
      await interaction.reply({
        content: "Tickets are disabled.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await interaction.channel.send({
      embeds: [
        buildEmbed(
          "Invest Panel",
          [
            "**If you want to invest and make money every day even when you're not online, open this ticket with**",
            "Please click on the button below to create a support ticket."
          ].join("\n")
        )
          .setThumbnail("attachment://crumb-donut-ticket.png")
          .setImage("attachment://crumb-donut-ticket-footer.png")
      ],
      files: [
        new AttachmentBuilder(ticketPanelImagePath, { name: "crumb-donut-ticket.png" }),
        new AttachmentBuilder(ticketPanelFooterImagePath, { name: "crumb-donut-ticket-footer.png" })
      ],
      components: [buildInvestPanelButton()]
    });

    await interaction.reply({
      content: "Invest panel sent.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (interaction.commandName === "ticket-close") {
    await closeTicket(interaction);
    return;
  }

  if (interaction.commandName === "application-panel") {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "send") {
      await sendApplicationPanel(interaction);
      return;
    }

    if (subcommand === "open") {
      featureSettingsStore.applications.isOpen = true;
      persistFeatureSettings();
      await interaction.reply({
        content: "Applications are now open.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (subcommand === "close") {
      featureSettingsStore.applications.isOpen = false;
      persistFeatureSettings();
      await interaction.reply({
        content: "Applications are now closed.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

if (subcommand === "status") {
      await interaction.reply({
        content: `Applications are currently **${areApplicationsOpen() ? "open" : "closed"}**.\nQuestions: **${config.applications.questions.length}**\nRoles: **${config.applications.roles.length}**`,
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (subcommand === "set-title") {
      config.applications.panelTitle = interaction.options.getString("text", true);
      saveCurrentConfig();
      await interaction.reply({ content: "Application title updated.", flags: MessageFlags.Ephemeral });
      return;
    }

    if (subcommand === "set-description") {
      config.applications.panelDescription = interaction.options.getString("text", true);
      saveCurrentConfig();
      await interaction.reply({ content: "Application description updated.", flags: MessageFlags.Ephemeral });
      return;
    }

    if (subcommand === "add-question") {
      config.applications.questions.push(interaction.options.getString("text", true));
      saveCurrentConfig();
      await interaction.reply({ content: `Question added. Total questions: **${config.applications.questions.length}**`, flags: MessageFlags.Ephemeral });
      return;
    }

    if (subcommand === "remove-question") {
      const index = interaction.options.getInteger("index", true) - 1;
      if (index < 0 || index >= config.applications.questions.length) {
        await interaction.reply({ content: "That question index does not exist.", flags: MessageFlags.Ephemeral });
        return;
      }

      const removedQuestion = config.applications.questions.splice(index, 1)[0];
      saveCurrentConfig();
      await interaction.reply({ content: `Removed question: **${removedQuestion}**`, flags: MessageFlags.Ephemeral });
      return;
    }

    if (subcommand === "add-role") {
      const role = interaction.options.getRole("role", true);
      const label = interaction.options.getString("label", true);
      const rawKey = interaction.options.getString("key") || label;
      const key = normalizeApplicationRoleKey(rawKey);

      if (!key) {
        await interaction.reply({ content: "That role key is not valid.", flags: MessageFlags.Ephemeral });
        return;
      }

      if (findApplicationRole(key)) {
        await interaction.reply({ content: "That application role key already exists.", flags: MessageFlags.Ephemeral });
        return;
      }

      config.applications.roles.push({ key, label, roleId: role.id });
      saveCurrentConfig();
      await interaction.reply({ content: `Application role **${label}** added with key \`${key}\`.`, flags: MessageFlags.Ephemeral });
      return;
    }

    if (subcommand === "remove-role") {
      const key = normalizeApplicationRoleKey(interaction.options.getString("key", true));
      const before = config.applications.roles.length;
      config.applications.roles = config.applications.roles.filter((entry) => entry.key !== key);

      if (config.applications.roles.length === before) {
        await interaction.reply({ content: "That application role key does not exist.", flags: MessageFlags.Ephemeral });
        return;
      }

      saveCurrentConfig();
      await interaction.reply({ content: `Application role \`${key}\` removed.`, flags: MessageFlags.Ephemeral });
      return;
    }
  }
}

async function handleButton(interaction) {
  if (interaction.customId.startsWith("reactionrole:")) {
    const [, roleId] = interaction.customId.split(":");
    await handleReactionRoleButton(interaction, roleId);
    return;
  }

  const [action, value, extra] = interaction.customId.split(":");

  if (action === "giveaway_join") {
    const giveaway = giveawaysStore.find((entry) => entry.id === value);

    if (!giveaway || giveaway.ended) {
      await interaction.reply({
        content: "This giveaway is no longer active.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (featureSettingsStore.giveaway.blacklist.includes(interaction.user.id)) {
      await interaction.reply({
        content: "You are blacklisted from giveaways.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (giveaway.requiredRoleId && interaction.member && !interaction.member.roles.cache.has(giveaway.requiredRoleId)) {
      await interaction.reply({
        content: "You do not have the required role to join this giveaway.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (giveaway.participants.includes(interaction.user.id)) {
      giveaway.participants = giveaway.participants.filter((userId) => userId !== interaction.user.id);
      if (giveaway.entryCounts) {
        delete giveaway.entryCounts[interaction.user.id];
      }
      persistGiveaways();
      await interaction.message.edit({
        embeds: [buildGiveawayEmbed(giveaway)],
        components: [buildGiveawayButton(giveaway.id)]
      }).catch(() => null);
      await interaction.reply({
        content: "You removed your entry.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    giveaway.participants.push(interaction.user.id);
    if (!giveaway.entryCounts) {
      giveaway.entryCounts = {};
    }
    const hasBonusRole = giveaway.bonusRoleId && interaction.member && interaction.member.roles.cache.has(giveaway.bonusRoleId);
    giveaway.entryCounts[interaction.user.id] = hasBonusRole ? 1 + (giveaway.bonusEntries || 0) : 1;
    persistGiveaways();
    await interaction.message.edit({
      embeds: [buildGiveawayEmbed(giveaway)],
      components: [buildGiveawayButton(giveaway.id)]
    }).catch(() => null);
    await interaction.reply({
      content: "You joined the giveaway.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (action === "fastclick") {
    const game = fastClickGames.get(value);

    if (!game || game.won || game.endsAt <= Date.now()) {
      await interaction.reply({
        content: "Too late.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    game.won = true;
    fastClickGames.delete(value);

    const disabledRow = new ActionRowBuilder().addComponents(
      ButtonBuilder.from(interaction.component).setDisabled(true)
    );

    await interaction.update({
      embeds: [
        buildEmbed(
          "Fast Click",
          `${interaction.user} clicked first and won.`
        )
      ],
      components: [disabledRow]
    });
    return;
  }

  if (action === "rps") {
    const game = rpsGames.get(value);
    if (!game) {
      await interaction.reply({
        content: "This Rock Paper Scissors game is no longer active.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (![game.challengerId, game.opponentId].includes(interaction.user.id)) {
      await interaction.reply({
        content: "You are not part of this game.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (interaction.user.id === game.challengerId && game.challengerChoice) {
      await interaction.reply({
        content: "You already picked your move.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (interaction.user.id === game.opponentId && game.opponentChoice) {
      await interaction.reply({
        content: "You already picked your move.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (interaction.user.id === game.challengerId) {
      game.challengerChoice = extra;
    } else {
      game.opponentChoice = extra;
    }

    if (!game.challengerChoice || !game.opponentChoice) {
      await interaction.reply({
        content: `You picked **${game.labels[extra]}**.`,
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    rpsGames.delete(value);
    const challengerMention = `<@${game.challengerId}>`;
    const opponentMention = `<@${game.opponentId}>`;
    const resultText = resolvePlayerRps(
      game.challengerChoice,
      game.opponentChoice,
      challengerMention,
      opponentMention
    );

    await interaction.update({
      embeds: [
        buildEmbed(
          "Rock Paper Scissors",
          [
            `${challengerMention}: **${game.labels[game.challengerChoice]}**`,
            `${opponentMention}: **${game.labels[game.opponentChoice]}**`,
            "",
            resultText
          ].join("\n")
        )
      ],
      components: [buildRpsButtons(value, true)]
    });
    return;
  }

  if (interaction.customId === "ticket_close") {
    await closeTicket(interaction);
    return;
  }

  if (interaction.customId === "investment_manage") {
    const ticket = ticketsStore.find((entry) => entry.channelId === interaction.channelId && !entry.closed);

    if (!isInvestmentTicket(ticket)) {
      await interaction.reply({
        content: "This is not an investment ticket.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (interaction.user.id !== investmentManagerId) {
      await interaction.reply({
        content: "Only the investment manager can set or edit the calculation amount.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await interaction.showModal(createInvestmentManageModal(ticket));
    return;
  }

  if (interaction.customId === "investment_refresh") {
    const ticket = ticketsStore.find((entry) => entry.channelId === interaction.channelId && !entry.closed);

    if (!isInvestmentTicket(ticket)) {
      await interaction.reply({
        content: "This is not an investment ticket.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await refreshInvestmentTicketMessage(ticket);
    await interaction.reply({
      content: "Investment values refreshed.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (interaction.customId === "invest_ticket_start") {
    const ticketType = findTicketType("support");
    if (!ticketType) {
      await interaction.reply({
        content: "The support ticket type is not configured.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await interaction.showModal(createInvestTicketModal());
    return;
  }

  if (interaction.customId === "application_start") {
    await startApplication(interaction);
    return;
  }

  if (action === "application_interview") {
    const application = findApplicationById(value);
    if (!application) {
      await interaction.reply({
        content: "Application not found.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (application.status === "accept" || application.status === "reject") {
      await interaction.reply({
        content: "This application has already been finalized.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    application.status = "interview";
    application.interviewedById = interaction.user.id;
    application.reviewedAt = Date.now();
    persistApplications();

    const applicant = await client.users.fetch(application.userId).catch(() => null);
    if (applicant) {
      await applicant.send({
        embeds: [
          buildEmbed(
            "Application Interview Stage",
            [
              `Your application for **${config.botName}** is now in the interview stage.`,
              `Applied role: ${application.roleLabel}`,
              `Reviewer: ${interaction.user.tag}`
            ].join("\n")
          )
        ]
      }).catch(() => null);
    }

    await interaction.message.edit({
      embeds: [buildEmbed("Application Updated", buildApplicationDescription(application))],
      components: [
        buildApplicationReviewButtons(application.id),
        buildRejectPresetButtons(application.id)
      ]
    });

    await sendModLog("Application Interview Stage", [
      `User: <@${application.userId}>`,
      `Applied role: ${application.roleLabel}`,
      `Reviewer: ${interaction.user.tag}`
    ]);

    await interaction.reply({
      content: "Application moved to interview stage.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (action === "application_accept" || action === "application_reject") {
    const application = findApplicationById(value);
    if (!application) {
      await interaction.reply({
        content: "Application not found.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await interaction.showModal(
      createApplicationDecisionModal(
        value,
        action === "application_accept" ? "accept" : "reject"
      )
    );
    return;
  }

  if (action === "application_rejectpreset") {
    const application = findApplicationById(value);
    const presetIndex = Number(extra);
    const presetReason = featureSettingsStore.applications?.rejectPresets?.[presetIndex];

    if (!application || !presetReason) {
      await interaction.reply({
        content: "That reject preset is no longer available.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await finalizeApplicationDecision(interaction, "reject", application, presetReason);
  }
}

async function handleStringSelect(interaction) {
  if (interaction.customId === "ticket_type_select") {
    const ticketType = findTicketType(interaction.values[0]);
    if (!ticketType) {
      await interaction.update({
        content: "That ticket category no longer exists.",
        components: []
      });
      return;
    }

    await interaction.showModal(createTicketReasonModal(ticketType));
    return;
  }

  if (interaction.customId !== "application_role_select") {
    return;
  }

  const selectedRole = findApplicationRole(interaction.values[0]);
  if (!selectedRole) {
    await interaction.update({
      content: "That application role no longer exists in the config.",
      components: []
    });
    return;
  }

  await beginApplicationFlow(interaction, selectedRole);
}

async function handleModal(interaction) {
  if (interaction.customId === "giveaway_create_modal") {
    const prize = interaction.fields.getTextInputValue("prize");
    const durationInput = interaction.fields.getTextInputValue("duration");
    const durationMs = parseDurationToMs(durationInput);
    const winnerCount = Number(interaction.fields.getTextInputValue("winners"));

    if (
      !durationMs ||
      !Number.isInteger(winnerCount) ||
      winnerCount < 1
    ) {
      await interaction.reply({
        content: "Please enter a valid duration (`30s`, `15m`, `2h`, `1d`) and a valid winner count.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const giveaway = {
      id: crypto.randomUUID(),
      prize,
      winnerCount,
      hostId: interaction.user.id,
      channelId: interaction.channelId,
      participants: [],
      ended: false,
      endsAt: Date.now() + durationMs,
      createdAt: Date.now()
    };

    const message = await interaction.channel.send({
      embeds: [buildGiveawayEmbed(giveaway)],
      components: [buildGiveawayButton(giveaway.id)]
    });

    giveaway.messageId = message.id;
    giveawaysStore.push(giveaway);
    persistGiveaways();

    await sendModLog("Giveaway Created", [
      `Prize: ${giveaway.prize}`,
      `Host: <@${interaction.user.id}>`,
      `Winners: ${giveaway.winnerCount}`,
      `Channel: <#${interaction.channelId}>`,
      `Ends: <t:${Math.floor(giveaway.endsAt / 1000)}:F>`
    ]);

    await interaction.reply({
      content: "Giveaway created.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (interaction.customId.startsWith("ticket_reason_modal:")) {
    const [, ticketTypeKey] = interaction.customId.split(":");
    const ticketType = findTicketType(ticketTypeKey);
    if (!ticketType) {
      await interaction.reply({
        content: "That ticket category no longer exists.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const details = {};

    if (ticketType.key === "claim-giveaway") {
      const giveawayHostRaw = interaction.fields.getTextInputValue("giveaway_host");
      const winAmount = interaction.fields.getTextInputValue("win_amount");
      const ign = interaction.fields.getTextInputValue("ign");
      const giveawayHostId = extractUserId(giveawayHostRaw);

      details.giveawayHostRaw = giveawayHostRaw;
      details.giveawayHostId = giveawayHostId;
      details.giveawayHostMention = giveawayHostId ? `<@${giveawayHostId}>` : null;
      details.winAmount = winAmount;
      details.ign = ign;
    }

    if (ticketType.key === "report-someone") {
      const reportTargetRaw = interaction.fields.getTextInputValue("report_target");
      const reportTargetId = extractUserId(reportTargetRaw);

      details.reportTargetRaw = reportTargetRaw;
      details.reportTargetId = reportTargetId;
      details.reportTargetMention = reportTargetId ? `<@${reportTargetId}>` : null;
      details.proof = interaction.fields.fields.has("proof")
        ? interaction.fields.getTextInputValue("proof")
        : "";
    }

    if (ticketType.key === "sponsor-giveaway") {
      details.amount = interaction.fields.getTextInputValue("amount");
    }

    if (ticketType.key === "partner-request") {
      details.dcLink = interaction.fields.getTextInputValue("dc_link");
      details.memberCount = interaction.fields.getTextInputValue("member_count");
    }

    const reason = interaction.fields.fields.has("reason")
      ? interaction.fields.getTextInputValue("reason")
      : "";
    await createTicket(interaction, reason, ticketType, details);
    return;
  }

  if (interaction.customId === "invest_ticket_modal") {
    const ticketType = findTicketType("support");
    if (!ticketType) {
      await interaction.reply({
        content: "The support ticket type is not configured.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const details = {
      investAmount: interaction.fields.getTextInputValue("invest_amount"),
      investDuration: interaction.fields.getTextInputValue("invest_duration"),
      investmentRequestedAt: Date.now()
    };

    await createTicket(interaction, "", ticketType, details);
    return;
  }

  if (interaction.customId === "investment_manage_modal") {
    const ticket = ticketsStore.find((entry) => entry.channelId === interaction.channelId && !entry.closed);

    if (!isInvestmentTicket(ticket)) {
      await interaction.reply({
        content: "This is not an investment ticket.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (interaction.user.id !== investmentManagerId) {
      await interaction.reply({
        content: "Only the investment manager can set or edit the calculation amount.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await updateInvestmentTicket(interaction, ticket);
    return;
  }

  if (interaction.customId.startsWith("application_decision_modal:")) {
    const [, decision, applicationId] = interaction.customId.split(":");
    const application = findApplicationById(applicationId);

    if (!application) {
      await interaction.reply({
        content: "Application not found.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const reason = interaction.fields.getTextInputValue("reason");
    await finalizeApplicationDecision(interaction, decision, application, reason);
  }
}

client.once(Events.ClientReady, async (readyClient) => {
  try {
    await registerCommands();
  } catch (error) {
    console.error("Command registration failed:", error);
  }

  if (config.playing) {
    readyClient.user.setActivity(config.playing, { type: ActivityType.Playing });
  }

  startGiveawayWatcher();
  startInvestmentWatcher();
  startServerStatsWatcher();
  console.log(`Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  return configContext.run(interaction.guildId, async () => {
    try {
      if (interaction.isChatInputCommand()) {
        await handleCommand(interaction);
        return;
      }

      if (interaction.isButton()) {
        await handleButton(interaction);
        return;
      }

      if (interaction.isStringSelectMenu()) {
        await handleStringSelect(interaction);
        return;
      }

      if (interaction.isModalSubmit()) {
        await handleModal(interaction);
      }
    } catch (error) {
      console.error("Interaction error:", error);

      const method = interaction.deferred || interaction.replied ? "followUp" : "reply";
      await interaction[method]({
        content: "Something went wrong.",
        flags: MessageFlags.Ephemeral
      }).catch(() => null);
    }
  });
});

client.on(Events.MessageDelete, async (message) => {
  if (!message || !message.guild || !message.channel || message.author?.bot) {
    return;
  }

  snipeStore.set(message.channel.id, {
    authorId: message.author?.id || null,
    authorTag: message.author ? message.author.tag : "Unknown User",
    content: message.content || "",
    attachments: message.attachments?.size
      ? [...message.attachments.values()].map((attachment) => attachment.url).join(", ")
      : "",
    deletedAt: Date.now()
  });
});

client.on(Events.MessageReactionAdd, async (reaction) => {
  const safeReaction = reaction.partial ? await reaction.fetch().catch(() => null) : reaction;
  if (!safeReaction) {
    return;
  }
  await configContext.run(safeReaction.message?.guild?.id, () => handleStarboardReaction(safeReaction)).catch(() => null);
  // noop: handled below once we also receive the reacting user via the event
});

client.on(Events.MessageReactionRemove, async (reaction) => {
  const safeReaction = reaction.partial ? await reaction.fetch().catch(() => null) : reaction;
  if (!safeReaction) {
    return;
  }
  await configContext.run(safeReaction.message?.guild?.id, () => handleStarboardReaction(safeReaction)).catch(() => null);
  // noop: handled below once we also receive the reacting user via the event
});

// Use the full event signature (reaction, user) to know which member reacted
client.on(Events.MessageReactionAdd, async (reaction, user) => {
  const safeReaction = reaction.partial ? await reaction.fetch().catch(() => null) : reaction;
  if (!safeReaction || !user) return;
  await configContext.run(safeReaction.message?.guild?.id, () => handleReactionRoleEvent(safeReaction, user, true)).catch(() => null);
});

client.on(Events.MessageReactionRemove, async (reaction, user) => {
  const safeReaction = reaction.partial ? await reaction.fetch().catch(() => null) : reaction;
  if (!safeReaction || !user) return;
  await configContext.run(safeReaction.message?.guild?.id, () => handleReactionRoleEvent(safeReaction, user, false)).catch(() => null);
});

client.on(Events.MessageCreate, async (message) => {
  return configContext.run(message.guild?.id, async () => {
  if (message.author.bot) {
    return;
  }

  if (message.author.id === flaggedUserId) {
    await message.channel.send("aufpassen scammer").catch(() => null);
  }

  if (message.guild) {
    const levelProfile = getLevelProfile(message.guild.id, message.author.id);
    levelProfile.messages += 1;
    levelProfile.xp += 5 + Math.floor(Math.random() * 6);
    persistLevels();

    const removedAfk = removeAfkEntry(message.guild.id, message.author.id);
    if (removedAfk) {
      await message.channel.send({
        content: message.author.toString() + ", welcome back. Your AFK status has been removed."
      }).catch(() => null);
    }

    const mentionedAfkUsers = [...message.mentions.users.values()]
      .map((user) => ({ user, afk: getAfkEntry(message.guild.id, user.id) }))
      .filter((entry) => entry.afk);

    if (mentionedAfkUsers.length > 0) {
      const notice = mentionedAfkUsers
        .map((entry) => entry.user.tag + " is AFK: " + entry.afk.reason)
        .join("\n");
      await message.channel.send({ content: notice }).catch(() => null);
    }
  }

  if (message.guild && message.channel) {
    const ticket = ticketsStore.find(
      (entry) =>
        entry.channelId === message.channel.id &&
        !entry.closed &&
        entry.typeKey === "claim-giveaway"
    );

    if (ticket && message.mentions.users.size > 0) {
      ticket.closed = true;
      ticket.closedAt = Date.now();
      persistTickets();

      if (config.tickets.transcriptChannelId) {
        const logChannel = await client.channels
          .fetch(config.tickets.transcriptChannelId)
          .catch(() => null);

        if (logChannel && logChannel.isTextBased()) {
          await logChannel.send({
            embeds: [
              buildEmbed(
                "Ticket Auto Closed",
                [
                  `Channel: ${message.channel.name}`,
                  `User: <@${ticket.ownerId}>`,
                  `Category: ${ticket.typeLabel || "Unknown"}`,
                  "Reason: Claim giveaway ticket was closed because a user was pinged.",
                  `Triggered by: <@${message.author.id}>`
                ].join("\n")
              )
            ]
          }).catch(() => null);
        }
      }

      await sendTicketTranscriptDm(
        ticket.ownerId,
        message.channel,
        ticket,
        "Closed automatically because a user was pinged"
      );

      await sendModLog("Ticket Auto-Closed", [
        `Channel: <#${message.channelId}>`,
        `Category: ${ticket.typeLabel || "Unknown"}`,
        `Owner: <@${ticket.ownerId}>`,
        "Reason: Closed automatically because a user was pinged"
      ]);

      await message.channel.send("Claim giveaway ticket closed automatically because a user was pinged.").catch(() => null);

      scheduleChannelDelete(message.channelId, "Claim giveaway ticket auto-closed after user ping");
      return;
    }
  }

  if (message.channel.type === ChannelType.DM) {
    await handleApplicationAnswer(message);
  }
  });
});

;(async () => {
  try {
    await store.init();

    giveawaysStore = await store.loadJson("giveaways.json", []);
    ticketsStore = await store.loadJson("tickets.json", []);
    applicationsStore = await store.loadJson("applications.json", []);
    warningsStore = await store.loadJson("warnings.json", []);
    afkStore = await store.loadJson("afk.json", []);
    economyStore = await store.loadJson("economy.json", {});
    featureSettingsStore = await store.loadJson("feature-settings.json", {
      giveaway: { blacklist: [], requiredRoleId: "", bonusRoleId: "", bonusEntries: 0, scheduled: [] },
      economy: {
        shopItems: [
          { id: "cookie", name: "Cookie", price: 250, description: "A sweet little treat." },
          { id: "vip-box", name: "VIP Box", price: 2500, description: "A shiny community reward box." },
          { id: "ticket-pass", name: "Ticket Pass", price: 1000, description: "A flex collectible for your inventory." }
        ]
      },
      community: {
        starboardChannelId: "",
        starboardThreshold: 3,
        starboardEmoji: "?"
      },
      applications: {
        cooldownDays: 7,
        isOpen: true,
        rejectPresets: [
          "Not enough detail in the application.",
          "You are not a fit for the team right now.",
          "Please get more community activity first."
        ]
      },
      tickets: {
        maxOpenPerUser: 3
      }
    });
    moderationCasesStore = await store.loadJson("mod-cases.json", []);
    vouchesStore = await store.loadJson("vouches.json", []);
    marriagesStore = await store.loadJson("marriages.json", []);
    levelStore = await store.loadJson("levels.json", {});
    starboardStore = await store.loadJson("starboard.json", []);
    reactionRollsStore = await store.loadJson("reaction-rolls.json", []);
    reactionRolesStore = await store.loadJson("reaction-roles.json", []);

    await client.login(token);
  } catch (error) {
    console.error("Startup error:", error);
    process.exit(1);
  }
})();

