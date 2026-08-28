const fs = require("fs");
const path = require("path");
const config = require("./config");
const ffmpegPath = require("ffmpeg-static");
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} = require("discord.js");
const {
  AudioPlayerStatus,
  NoSubscriberBehavior,
  StreamType,
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel
} = require("@discordjs/voice");

if (ffmpegPath) {
  process.env.FFMPEG_PATH = ffmpegPath;
}

let voiceConnection = null;
let audioPlayer = null;
const waitingMembers = new Map();
const adroitStatusMessages = new Map();

function getWaitingMembersForGuild(guildId) {
  return [...waitingMembers.values()].filter((member) => member.guild?.id === guildId);
}

function getWaitingMembers(channel) {
  return channel.members.filter((member) => !member.user.bot);
}

function leaveAdroitVoice() {
  if (audioPlayer) {
    audioPlayer.stop(true);
    audioPlayer = null;
  }
  if (voiceConnection) {
    voiceConnection.destroy();
  }
  voiceConnection = null;
}

function removeWaitingMember(userId) {
  waitingMembers.delete(userId);
}

function rememberWaitingMember(member) {
  waitingMembers.set(member.id, member);
}

async function startAdroitMusic(guild, channel) {
  if (!config.musicUrl || !guild || !channel) {
    return;
  }

  if (voiceConnection && voiceConnection.joinConfig?.channelId === channel.id) {
    return;
  }

  voiceConnection = joinVoiceChannel({
    channelId: channel.id,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf: true
  });

  voiceConnection.on("error", (error) => {
    console.error("Adroit voice connection error:", error.message);
  });

  if (!audioPlayer) {
    audioPlayer = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Play }
    });
    voiceConnection.subscribe(audioPlayer);
    audioPlayer.on(AudioPlayerStatus.Idle, () => {
      if (!config.loopMusic) {
        return;
      }

      playAdroitMusic().catch((error) => {
        console.error("Adroit music could not be restarted:", error.message);
      });
    });
    audioPlayer.on("error", (error) => {
      console.error("Adroit music playback error:", error.message);
    });
  } else {
    voiceConnection.subscribe(audioPlayer);
  }

  await playAdroitMusic();
}

async function playAdroitMusic() {
  if (!audioPlayer) {
    return;
  }

  if (/^https?:\/\//i.test(config.musicUrl)) {
    const response = await fetch(config.musicUrl);
    if (!response.ok || !response.body) {
      throw new Error(`Music URL returned HTTP ${response.status}.`);
    }

    const { Readable } = require("stream");
    const resource = createAudioResource(Readable.fromWeb(response.body), {
      inputType: StreamType.Arbitrary
    });
    audioPlayer.play(resource);
    return;
  }

  const normalized = config.musicUrl.replace(/\\/g, "/");
  const localPath = path.resolve(__dirname, "..", "..", normalized);

  if (!fs.existsSync(localPath)) {
    throw new Error(`Local music file not found: ${localPath}`);
  }

  const stream = fs.createReadStream(localPath);
  const resource = createAudioResource(stream, {
    inputType: StreamType.Arbitrary
  });
  audioPlayer.play(resource);
}

function buildAdroitComponents() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("adroit_join_support")
        .setLabel("In den Support-Call")
        .setStyle(ButtonStyle.Primary)
    )
  ];
}

function buildOnDutyButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("adroit_join_support")
        .setLabel("Support claim")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("onduty:add")
        .setLabel("On Duty")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("onduty:remove")
        .setLabel("Off Duty")
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

async function sendOnDutyRolePanel(client) {
  const channelId = String(config.onDutyChannelId || "").trim();
  const roleId = String(config.staffRoleId || "").trim();

  if (!roleId || !channelId) {
    console.warn("On Duty panel not sent: no staff role or channel configured.");
    return;
  }

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    console.error("On Duty panel channel not found or is not text-based.");
    return;
  }

  const messages = await channel.messages.fetch({ limit: 25 }).catch(() => new Map());
  const existingMessage = [...messages.values()].find((message) => {
    if (message.author.id !== client.user.id) {
      return false;
    }

    return message.components.some((row) =>
      row.components.some((component) =>
        component.customId === "onduty:add" || component.customId === "onduty:remove"
      )
    );
  });

  if (existingMessage) {
    return;
  }

  await channel.send({
    content: `${config.onDutyPanelTitle || "**On Duty Panel**"}\n${config.onDutyMessage || "Klicke unten, um die Staff-Role zu aktivieren oder zu entfernen."}\n<@&${roleId}>`,
    allowedMentions: { roles: [roleId] },
    components: buildOnDutyButtons()
  }).catch((error) => {
    console.error("On Duty panel could not be sent:", error.message);
  });
}

async function updateWaitingRoomStatus(client, guildId) {
  if (!config.queueStatusEnabled || !guildId || !config.onDutyChannelId) {
    return;
  }

  const channel = await client.channels.fetch(config.onDutyChannelId).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    return;
  }

  const waitingMembersInGuild = getWaitingMembersForGuild(guildId);
  const waitingCount = waitingMembersInGuild.length;
  const memberList = waitingMembersInGuild.length
    ? waitingMembersInGuild.map((member, index) => `${index + 1}. ${member}`).join("\n")
    : "Keine Personen im Warteraum.";

  const statusText = [
    String(config.onDutyPanelTitle || "**On Duty Panel**"),
    String(config.onDutyMessage || "Klicke unten, um die Staff-Role zu aktivieren oder zu entfernen."),
    "",
    `**Warteraum (${waitingCount})**`,
    memberList,
    "",
    String(config.queueStatusMessage || "🟡 Aktuell warten **{count}** Personen im Warteraum.").replace("{count}", String(waitingCount))
  ].join("\n");

  const existingMessageId = adroitStatusMessages.get(guildId);

  if (existingMessageId) {
    const existingMessage = await channel.messages.fetch(existingMessageId).catch(() => null);
    if (existingMessage) {
      await existingMessage.edit({
        content: statusText,
        components: buildOnDutyButtons(),
        allowedMentions: { parse: [] }
      }).catch(() => null);
      return;
    }

    adroitStatusMessages.delete(guildId);
  }

  const newMessage = await channel.send({
    content: statusText,
    allowedMentions: { parse: [] },
    components: buildOnDutyButtons()
  }).catch(() => null);

  if (newMessage) {
    adroitStatusMessages.set(guildId, newMessage.id);
  }
}

async function pingOnDutyStaff(client, guildId, member) {
  const roleId = String(config.staffRoleId || "").trim();
  const channelId = String(config.onDutyChannelId || "").trim();

  if (!roleId || !channelId || !guildId) {
    return;
  }

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    return;
  }

  const message = await channel.send({
    content: `🚨 <@&${roleId}> ${member} ist jetzt im Warteraum.`,
    allowedMentions: { roles: [roleId] }
  }).catch(() => null);

  if (message) {
    setTimeout(() => {
      message.delete().catch(() => null);
    }, 2500);
  }
}

async function handleVoiceStateUpdate(client, oldState, newState) {
  const voiceChannelId = String(config.voiceChannelId || "").trim();
  const supportChannelId = String(config.supportChannelId || "").trim();

  if (newState.member?.user.bot && newState.member.id !== client.user?.id) {
    return;
  }

  const joinedConfiguredChannel =
    newState.channelId === voiceChannelId && oldState.channelId !== voiceChannelId;

  if (joinedConfiguredChannel && !newState.member.user.bot) {
    rememberWaitingMember(newState.member);
    await pingOnDutyStaff(client, newState.guild.id, newState.member);
    await updateWaitingRoomStatus(client, newState.guild.id);
  }

  if (
    oldState.channelId === voiceChannelId &&
    newState.channelId !== voiceChannelId &&
    !newState.member?.user.bot
  ) {
    removeWaitingMember(newState.member.id);
    await updateWaitingRoomStatus(client, newState.guild.id);
    if (oldState.channel && getWaitingMembers(oldState.channel).size === 0) {
      leaveAdroitVoice();
    }
  }

  if (newState.channelId === supportChannelId && oldState.channelId !== supportChannelId) {
    removeWaitingMember(newState.member.id);
    await updateWaitingRoomStatus(client, newState.guild.id);
    if (oldState.channelId === voiceChannelId && oldState.channel && getWaitingMembers(oldState.channel).size === 0) {
      leaveAdroitVoice();
    }
  }

  if (!joinedConfiguredChannel || newState.member.user.bot) {
    return;
  }

  console.log(`Adroit: ${newState.member?.user.tag || "A user"} joined the configured voice channel.`);

  await startAdroitMusic(newState.guild, newState.channel).catch((error) => {
    console.error("Adroit bot could not join the voice channel or play music:", error.message);
  });
}

async function handleButton(interaction) {
  if (interaction.customId === "onduty:add" || interaction.customId === "onduty:remove") {
    const roleId = String(config.staffRoleId || "").trim();
    if (!roleId) {
      await interaction.reply({ content: "Es ist keine On-Duty-Role konfiguriert.", flags: MessageFlags.Ephemeral });
      return true;
    }

    const role = interaction.guild.roles.cache.get(roleId) || await interaction.guild.roles.fetch(roleId).catch(() => null);
    if (!role) {
      await interaction.reply({ content: "Die On-Duty-Role wurde nicht gefunden.", flags: MessageFlags.Ephemeral });
      return true;
    }

    const isAddAction = interaction.customId === "onduty:add";
    const hasRole = interaction.member.roles.cache.has(role.id);

    if (isAddAction && hasRole) {
      await interaction.reply({ content: `Du hast die Rolle ${role} bereits aktiv.`, flags: MessageFlags.Ephemeral });
      return true;
    }

    if (!isAddAction && !hasRole) {
      await interaction.reply({ content: `Du hast die Rolle ${role} noch nicht aktiv.`, flags: MessageFlags.Ephemeral });
      return true;
    }

    try {
      if (isAddAction) {
        await interaction.member.roles.add(role);
        await interaction.reply({ content: `Du bist jetzt ${role} On Duty.`, flags: MessageFlags.Ephemeral });
      } else {
        await interaction.member.roles.remove(role);
        await interaction.reply({ content: `Du bist jetzt nicht mehr ${role} On Duty.`, flags: MessageFlags.Ephemeral });
      }
    } catch (error) {
      console.error("On Duty role update failed:", error.message);
      await interaction.reply({ content: "Ich konnte die On-Duty-Role nicht aktualisieren.", flags: MessageFlags.Ephemeral });
    }

    return true;
  }

  if (interaction.customId !== "adroit_join_support") {
    return false;
  }

  if (config.staffRoleId && !interaction.member.roles.cache.has(config.staffRoleId)) {
    await interaction.reply({ content: "Dieser Button ist nur für das Staff-Team.", ephemeral: true });
    return true;
  }

  const member = interaction.member;
  if (!member.voice.channelId) {
    await interaction.reply({ content: "Du musst zuerst in einem Voice-Channel sein.", ephemeral: true });
    return true;
  }

  const supportChannel = await interaction.guild.channels.fetch(config.supportChannelId).catch(() => null);
  if (!supportChannel || !supportChannel.isVoiceBased()) {
    await interaction.reply({ content: "Der Support-Call wurde nicht gefunden.", ephemeral: true });
    return true;
  }

  const waitingMembersInGuild = [...waitingMembers.values()].filter(
    (waiting) => waiting.guild?.id === interaction.guildId && waiting.voice.channelId === config.voiceChannelId && waiting.id !== member.id
  );

  if (waitingMembersInGuild.length === 0) {
    await interaction.reply({ content: "Im Adroit-Warteraum wartet gerade niemand.", ephemeral: true });
    return true;
  }

  const chooseText = String(config.supportChoiceText || "Wähle die Person, die du annehmen willst.");

  await interaction.reply({
    content: `${chooseText}\n${waitingMembersInGuild.map((waiting, index) => `${index + 1}. ${waiting}`).join("\n")}`,
    ephemeral: true
  });

  const collector = interaction.channel.createMessageComponentCollector({
    filter: (componentInteraction) => componentInteraction.user.id === interaction.user.id,
    time: 15000,
    max: 1
  });

  const buttons = waitingMembersInGuild.map((waiting, index) =>
    new ButtonBuilder()
      .setCustomId(`adroit_select_support:${waiting.id}`)
      .setLabel(`${index + 1}. ${waiting.user?.tag || waiting.displayName || waiting.id}`)
      .setStyle(ButtonStyle.Primary)
  );

  await interaction.followUp({
    content: `${chooseText}`,
    components: [new ActionRowBuilder().addComponents(...buttons)],
    ephemeral: true
  }).catch(() => null);

  collector.on("collect", async (componentInteraction) => {
    if (!componentInteraction.isButton()) {
      return;
    }

    const [, waitingId] = componentInteraction.customId.split(":");
    const selectedWaitingMember = waitingMembersInGuild.find((waiting) => waiting.id === waitingId);

    if (!selectedWaitingMember) {
      await componentInteraction.reply({ content: "Diese Person ist nicht mehr im Warteraum.", ephemeral: true });
      return;
    }

    try {
      await Promise.all([
        member.voice.setChannel(supportChannel),
        selectedWaitingMember.voice.setChannel(supportChannel)
      ]);

      removeWaitingMember(selectedWaitingMember.id);
      leaveAdroitVoice();
      await componentInteraction.reply({ content: `${selectedWaitingMember} und du wurden in den Support-Call verschoben.`, ephemeral: true });
    } catch (error) {
      console.error("Adroit could not move staff member:", error.message);
      await componentInteraction.reply({ content: "Ich konnte euch nicht in den Support-Call verschieben.", ephemeral: true });
    }
  });

  return true;
}

module.exports = {
  handleButton,
  handleVoiceStateUpdate,
  sendOnDutyRolePanel,
  updateWaitingRoomStatus
};

module.exports = {
  handleButton,
  handleVoiceStateUpdate,
  sendOnDutyRolePanel,
  updateWaitingRoomStatus
};
