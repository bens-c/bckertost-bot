require("dotenv").config();

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  ModalBuilder,
  Partials,
  PermissionFlagsBits,
  REST,
  Routes,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");
const crypto = require("crypto");

const { buildCommands } = require("./commands");
const { loadConfig } = require("./config");
const { loadJson, saveJson } = require("./store");

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId) {
  console.error("Missing DISCORD_TOKEN or CLIENT_ID in .env");
  process.exit(1);
}

let config;

try {
  config = loadConfig();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const giveawaysStore = loadJson("giveaways.json", []);
const ticketsStore = loadJson("tickets.json", []);
const applicationSessions = new Map();
const fastClickGames = new Map();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

function color() {
  return parseInt(config.embedColor.replace("#", ""), 16);
}

function buildEmbed(title, description) {
  return new EmbedBuilder().setColor(color()).setTitle(title).setDescription(description);
}

function buildGiveawayButton(id, disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`giveaway_join:${id}`)
      .setLabel("Teilnehmen")
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled)
  );
}

function buildTicketButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_open")
      .setLabel("Ticket erstellen")
      .setStyle(ButtonStyle.Primary)
  );
}

function buildTicketCloseButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_close")
      .setLabel("Ticket schliessen")
      .setStyle(ButtonStyle.Danger)
  );
}

function buildApplicationButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("application_start")
      .setLabel("Bewerbung starten")
      .setStyle(ButtonStyle.Primary)
  );
}

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(token);
  const commands = buildCommands();

  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands
    });
    return;
  }

  await rest.put(Routes.applicationCommands(clientId), {
    body: commands
  });
}

function persistGiveaways() {
  saveJson("giveaways.json", giveawaysStore);
}

function persistTickets() {
  saveJson("tickets.json", ticketsStore);
}

function findGiveawayByMessageId(messageId) {
  return giveawaysStore.find((entry) => entry.messageId === messageId);
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

  const winners = pickWinners(giveaway.participants, giveaway.winnerCount);
  const winnerText =
    winners.length > 0
      ? winners.map((userId) => `<@${userId}>`).join(", ")
      : "Niemand hat teilgenommen.";

  const endEmbed = buildEmbed(
    reroll ? `Giveaway neu gezogen: ${giveaway.prize}` : `Giveaway beendet: ${giveaway.prize}`,
    [
      `Preis: **${giveaway.prize}**`,
      `Gewinner: ${winnerText}`,
      `Erstellt von: <@${giveaway.hostId}>`
    ].join("\n")
  ).setFooter({
    text: `Teilnehmer: ${giveaway.participants.length}`
  });

  if (!reroll) {
    giveaway.ended = true;
    giveaway.winners = winners;
    persistGiveaways();
  }

  await message.edit({
    embeds: [endEmbed],
    components: [buildGiveawayButton(giveaway.id, true)]
  });

  await channel.send(
    reroll
      ? `Neue Gewinner fuer **${giveaway.prize}**: ${winnerText}`
      : `Das Giveaway fuer **${giveaway.prize}** ist beendet. Gewinner: ${winnerText}`
  );
}

function startGiveawayWatcher() {
  setInterval(async () => {
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
    .setTitle("Giveaway erstellen");

  const prizeInput = new TextInputBuilder()
    .setCustomId("prize")
    .setLabel("Preis")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100);

  const durationInput = new TextInputBuilder()
    .setCustomId("duration")
    .setLabel("Dauer in Minuten")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder("z.B. 60");

  const winnerInput = new TextInputBuilder()
    .setCustomId("winners")
    .setLabel("Anzahl Gewinner")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder("z.B. 1");

  return modal.addComponents(
    new ActionRowBuilder().addComponents(prizeInput),
    new ActionRowBuilder().addComponents(durationInput),
    new ActionRowBuilder().addComponents(winnerInput)
  );
}

function createTicketReasonModal() {
  const modal = new ModalBuilder()
    .setCustomId("ticket_reason_modal")
    .setTitle("Ticket erstellen");

  const reasonInput = new TextInputBuilder()
    .setCustomId("reason")
    .setLabel("Worum geht es?")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(500);

  return modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
}

async function createTicket(interaction, reason) {
  if (!interaction.guild) {
    await interaction.reply({
      content: "Tickets gehen nur auf einem Server.",
      ephemeral: true
    });
    return;
  }

  if (!config.tickets.categoryId || !config.tickets.supportRoleId) {
    await interaction.reply({
      content: "Ticket-System ist noch nicht komplett in `config.json` eingerichtet.",
      ephemeral: true
    });
    return;
  }

  const existingTicket = ticketsStore.find(
    (entry) => entry.guildId === interaction.guildId && entry.ownerId === interaction.user.id && !entry.closed
  );

  if (existingTicket) {
    await interaction.reply({
      content: `Du hast bereits ein offenes Ticket: <#${existingTicket.channelId}>`,
      ephemeral: true
    });
    return;
  }

  const safeName = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12);
  const channelName = `${config.tickets.channelNamePrefix}-${safeName || interaction.user.id.slice(-4)}`;
  const channel = await interaction.guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: config.tickets.categoryId,
    permissionOverwrites: [
      {
        id: interaction.guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel]
      },
      {
        id: interaction.user.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
      },
      {
        id: config.tickets.supportRoleId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
      }
    ]
  });

  ticketsStore.push({
    id: crypto.randomUUID(),
    guildId: interaction.guildId,
    channelId: channel.id,
    ownerId: interaction.user.id,
    reason,
    closed: false,
    createdAt: Date.now()
  });
  persistTickets();

  const embed = buildEmbed(
    "Neues Ticket",
    `User: <@${interaction.user.id}>\nGrund: ${reason}`
  );

  await channel.send({
    content: `<@${interaction.user.id}> <@&${config.tickets.supportRoleId}>`,
    embeds: [embed],
    components: [buildTicketCloseButtons()]
  });

  await interaction.reply({
    content: `Dein Ticket wurde erstellt: ${channel}`,
    ephemeral: true
  });
}

async function closeTicket(interaction) {
  if (!interaction.guild || !interaction.channel) {
    return;
  }

  const ticket = ticketsStore.find(
    (entry) => entry.channelId === interaction.channelId && !entry.closed
  );

  if (!ticket) {
    const method = interaction.deferred || interaction.replied ? "followUp" : "reply";
    await interaction[method]({
      content: "Das ist kein offenes Ticket.",
      ephemeral: true
    });
    return;
  }

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
            "Ticket geschlossen",
            `Channel: ${interaction.channel.name}\nUser: <@${ticket.ownerId}>\nGrund: ${ticket.reason}`
          )
        ]
      });
    }
  }

  const method = interaction.deferred || interaction.replied ? "followUp" : "reply";
  await interaction[method]({
    content: "Ticket wird geschlossen...",
    ephemeral: true
  });

  setTimeout(async () => {
    await interaction.channel.delete("Ticket closed by bot").catch(() => null);
  }, 1500);
}

async function sendApplicationPanel(interaction) {
  if (!config.applications.enabled) {
    await interaction.reply({
      content: "Bewerbungen sind deaktiviert.",
      ephemeral: true
    });
    return;
  }

  const embed = buildEmbed(
    config.applications.panelTitle,
    config.applications.panelDescription
  );

  await interaction.channel.send({
    embeds: [embed],
    components: [buildApplicationButtons()]
  });

  await interaction.reply({
    content: "Bewerbungs-Panel gesendet.",
    ephemeral: true
  });
}

async function startApplication(interaction) {
  if (!config.applications.reviewChannelId || config.applications.questions.length === 0) {
    await interaction.reply({
      content: "Bewerbungen sind in `config.json` noch nicht komplett eingerichtet.",
      ephemeral: true
    });
    return;
  }

  applicationSessions.set(interaction.user.id, {
    startedAt: Date.now(),
    questionIndex: 0,
    answers: []
  });

  const dm = await interaction.user.createDM();
  await dm.send(
    `Deine Bewerbung fuer **${config.botName}** startet jetzt.\nFrage 1/${config.applications.questions.length}: ${config.applications.questions[0]}`
  );

  await interaction.reply({
    content: "Ich habe dir eine DM geschickt. Antworte dort einfach auf die Fragen.",
    ephemeral: true
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
      `Frage ${session.questionIndex + 1}/${config.applications.questions.length}: ${config.applications.questions[session.questionIndex]}`
    );
    return;
  }

  applicationSessions.delete(message.author.id);

  const reviewChannel = await client.channels
    .fetch(config.applications.reviewChannelId)
    .catch(() => null);

  if (reviewChannel && reviewChannel.isTextBased()) {
    const lines = config.applications.questions.map((question, index) => {
      return `**${index + 1}. ${question}**\n${session.answers[index] || "-"}\n`;
    });

    await reviewChannel.send({
      content: config.applications.staffRoleId ? `<@&${config.applications.staffRoleId}>` : undefined,
      embeds: [
        buildEmbed(
          "Neue Bewerbung",
          `User: <@${message.author.id}>\n\n${lines.join("\n")}`
        )
      ]
    });
  }

  await message.channel.send("Deine Bewerbung wurde abgeschickt. Viel Erfolg.");
}

function resolveRps(choice, botChoice) {
  if (choice === botChoice) {
    return "Unentschieden.";
  }

  const wins =
    (choice === "rock" && botChoice === "scissors") ||
    (choice === "paper" && botChoice === "rock") ||
    (choice === "scissors" && botChoice === "paper");

  return wins ? "Du hast gewonnen." : "Ich habe gewonnen.";
}

async function handleCommand(interaction) {
  if (interaction.commandName === "ping") {
    await interaction.reply("Pong!");
    return;
  }

  if (interaction.commandName === "coinflip") {
    const result = Math.random() < 0.5 ? "Kopf" : "Zahl";
    await interaction.reply(`Die Muenze zeigt: **${result}**`);
    return;
  }

  if (interaction.commandName === "fastclick") {
    const seconds = interaction.options.getInteger("sekunden") || 15;
    const gameId = crypto.randomUUID();
    const button = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`fastclick:${gameId}`)
        .setLabel("KLICK!")
        .setStyle(ButtonStyle.Danger)
    );

    const message = await interaction.reply({
      fetchReply: true,
      embeds: [
        buildEmbed(
          "Fast Click",
          `Wer zuerst klickt, gewinnt.\nZeitlimit: ${seconds} Sekunden`
        )
      ],
      components: [button]
    });

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
        embeds: [buildEmbed("Fast Click", "Zeit abgelaufen. Niemand hat gewonnen.")],
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
    const type = interaction.options.getString("typ", true);

    if (type === "number") {
      const guess = interaction.options.getInteger("zahl");
      if (!guess) {
        await interaction.reply({
          content: "Bitte gib bei `zahl` einen Tipp von 1 bis 10 an.",
          ephemeral: true
        });
        return;
      }

      const target = Math.floor(Math.random() * 10) + 1;
      const won = guess === target;
      await interaction.reply(
        won
          ? `Stark. Die Zahl war **${target}** und du hast getroffen.`
          : `Knapp daneben. Die Zahl war **${target}**.`
      );
      return;
    }

    if (type === "rps") {
      const choice = interaction.options.getString("wahl");
      if (!choice) {
        await interaction.reply({
          content: "Bitte gib bei `wahl` Schere, Stein oder Papier an.",
          ephemeral: true
        });
        return;
      }

      const options = ["rock", "paper", "scissors"];
      const botChoice = options[Math.floor(Math.random() * options.length)];
      const labels = {
        rock: "Stein",
        paper: "Papier",
        scissors: "Schere"
      };

      await interaction.reply(
        `Du: **${labels[choice]}**\nIch: **${labels[botChoice]}**\n${resolveRps(choice, botChoice)}`
      );
      return;
    }
  }

  if (interaction.commandName === "giveaway-create") {
    if (!config.giveaways.enabled) {
      await interaction.reply({
        content: "Giveaways sind deaktiviert.",
        ephemeral: true
      });
      return;
    }

    await interaction.showModal(createGiveawayModal());
    return;
  }

  if (interaction.commandName === "giveaway-reroll") {
    const messageId = interaction.options.getString("message_id", true);
    const giveaway = findGiveawayByMessageId(messageId);

    if (!giveaway) {
      await interaction.reply({
        content: "Kein Giveaway mit dieser Message-ID gefunden.",
        ephemeral: true
      });
      return;
    }

    await finalizeGiveaway(giveaway, true);
    await interaction.reply({
      content: "Giveaway wurde neu gezogen.",
      ephemeral: true
    });
    return;
  }

  if (interaction.commandName === "ticket-panel") {
    if (!config.tickets.enabled) {
      await interaction.reply({
        content: "Tickets sind deaktiviert.",
        ephemeral: true
      });
      return;
    }

    await interaction.channel.send({
      embeds: [
        buildEmbed(config.tickets.panelTitle, config.tickets.panelDescription)
      ],
      components: [buildTicketButtons()]
    });

    await interaction.reply({
      content: "Ticket-Panel gesendet.",
      ephemeral: true
    });
    return;
  }

  if (interaction.commandName === "ticket-close") {
    await closeTicket(interaction);
    return;
  }

  if (interaction.commandName === "application-panel") {
    await sendApplicationPanel(interaction);
  }
}

async function handleButton(interaction) {
  const [action, value] = interaction.customId.split(":");

  if (action === "giveaway_join") {
    const giveaway = giveawaysStore.find((entry) => entry.id === value);

    if (!giveaway || giveaway.ended) {
      await interaction.reply({
        content: "Dieses Giveaway ist nicht mehr aktiv.",
        ephemeral: true
      });
      return;
    }

    if (giveaway.participants.includes(interaction.user.id)) {
      giveaway.participants = giveaway.participants.filter((userId) => userId !== interaction.user.id);
      persistGiveaways();
      await interaction.reply({
        content: "Du hast deine Teilnahme entfernt.",
        ephemeral: true
      });
      return;
    }

    giveaway.participants.push(interaction.user.id);
    persistGiveaways();
    await interaction.reply({
      content: "Du nimmst jetzt am Giveaway teil.",
      ephemeral: true
    });
    return;
  }

  if (action === "fastclick") {
    const game = fastClickGames.get(value);

    if (!game || game.won || game.endsAt <= Date.now()) {
      await interaction.reply({
        content: "Zu spaet.",
        ephemeral: true
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
          `${interaction.user} hat als erstes geklickt und gewonnen.`
        )
      ],
      components: [disabledRow]
    });
    return;
  }

  if (interaction.customId === "ticket_open") {
    await interaction.showModal(createTicketReasonModal());
    return;
  }

  if (interaction.customId === "ticket_close") {
    await closeTicket(interaction);
    return;
  }

  if (interaction.customId === "application_start") {
    await startApplication(interaction);
  }
}

async function handleModal(interaction) {
  if (interaction.customId === "giveaway_create_modal") {
    const prize = interaction.fields.getTextInputValue("prize");
    const durationMinutes = Number(interaction.fields.getTextInputValue("duration"));
    const winnerCount = Number(interaction.fields.getTextInputValue("winners"));

    if (
      !Number.isInteger(durationMinutes) ||
      durationMinutes < 1 ||
      !Number.isInteger(winnerCount) ||
      winnerCount < 1
    ) {
      await interaction.reply({
        content: "Bitte gib gueltige Zahlen fuer Dauer und Gewinner ein.",
        ephemeral: true
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
      endsAt: Date.now() + durationMinutes * 60 * 1000,
      createdAt: Date.now()
    };

    const embed = buildEmbed(
      `Giveaway: ${prize}`,
      [
        `Preis: **${prize}**`,
        `Gewinner: **${winnerCount}**`,
        `Endet: <t:${Math.floor(giveaway.endsAt / 1000)}:R>`,
        `Host: <@${interaction.user.id}>`
      ].join("\n")
    );

    const message = await interaction.channel.send({
      embeds: [embed],
      components: [buildGiveawayButton(giveaway.id)]
    });

    giveaway.messageId = message.id;
    giveawaysStore.push(giveaway);
    persistGiveaways();

    await interaction.reply({
      content: "Giveaway wurde erstellt.",
      ephemeral: true
    });
    return;
  }

  if (interaction.customId === "ticket_reason_modal") {
    const reason = interaction.fields.getTextInputValue("reason");
    await createTicket(interaction, reason);
  }
}

client.once(Events.ClientReady, async (readyClient) => {
  try {
    await registerCommands();
    startGiveawayWatcher();
    console.log(`Logged in as ${readyClient.user.tag}`);
  } catch (error) {
    console.error("Failed to start bot:", error);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      await handleCommand(interaction);
      return;
    }

    if (interaction.isButton()) {
      await handleButton(interaction);
      return;
    }

    if (interaction.isModalSubmit()) {
      await handleModal(interaction);
    }
  } catch (error) {
    console.error("Interaction error:", error);

    const method = interaction.deferred || interaction.replied ? "followUp" : "reply";
    await interaction[method]({
      content: "Dabei ist ein Fehler passiert.",
      ephemeral: true
    }).catch(() => null);
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) {
    return;
  }

  if (message.channel.type === ChannelType.DM) {
    await handleApplicationAnswer(message);
  }
});

client.login(token);
