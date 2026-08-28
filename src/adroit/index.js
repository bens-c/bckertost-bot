const fs = require("fs");
const path = require("path");
const config = require("./config");
const ffmpegPath = require("ffmpeg-static");
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

function getWaitingMembers(channel) {
  return channel.members.filter((member) => !member.user.bot);
}

function leaveAdroitVoice() {
  if (audioPlayer) {
    audioPlayer.stop(true);
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
  const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("adroit_join_support")
        .setLabel("In den Support-Call")
        .setStyle(ButtonStyle.Primary)
    )
  ];
}

async function handleVoiceStateUpdate(client, oldState, newState) {
  const voiceChannelId = String(config.voiceChannelId || "").trim();
  const supportChannelId = String(config.supportChannelId || "").trim();

  if (newState.member?.user.bot && newState.member.id !== client.user?.id) {
    return;
  }

  const textChannelId = String(config.textChannelId || "").trim();
  const joinedConfiguredChannel =
    newState.channelId === voiceChannelId && oldState.channelId !== voiceChannelId;

  if (joinedConfiguredChannel && !newState.member.user.bot) {
    rememberWaitingMember(newState.member);
  }

  if (
    oldState.channelId === voiceChannelId &&
    newState.channelId !== voiceChannelId &&
    !newState.member?.user.bot
  ) {
    removeWaitingMember(newState.member.id);
    if (oldState.channel && getWaitingMembers(oldState.channel).size === 0) {
      leaveAdroitVoice();
    }
  }

  if (newState.channelId === supportChannelId && oldState.channelId !== supportChannelId) {
    removeWaitingMember(newState.member.id);
    if (oldState.channelId === voiceChannelId && oldState.channel && getWaitingMembers(oldState.channel).size === 0) {
      leaveAdroitVoice();
    }
  }

  if (!joinedConfiguredChannel || newState.member.user.bot || !textChannelId || !config.message) {
    return;
  }

  console.log(`Adroit: ${newState.member?.user.tag || "A user"} joined the configured voice channel.`);

  const textChannel = await client.channels.fetch(textChannelId).catch((error) => {
    console.error("Adroit text channel could not be fetched:", error.message);
    return null;
  });
  if (!textChannel || !textChannel.isTextBased()) {
    console.error("Adroit text channel not found or is not text-based.");
    return;
  }

  const member = newState.member;
  const memberDetails = member
    ? `👤 **Beigetretene Person:** ${member} (${member.user.tag})\n🆔 **User-ID:** \`${member.id}\``
    : "👤 **Beigetretene Person:** Unbekannt";

  const staffMessage = await textChannel.send({
    content: `${config.staffRoleId ? `<@&${config.staffRoleId}>\n` : ""}${config.message}\n\n${memberDetails}`,
    allowedMentions: config.staffRoleId ? { roles: [config.staffRoleId] } : { parse: [] },
    components: buildAdroitComponents()
  }).catch((error) => {
    console.error("Adroit message could not be sent:", error.message);
  });

  if (staffMessage) {
    console.log(`Adroit: staff notification sent to channel ${textChannel.id}.`);
  }

  await startAdroitMusic(newState.guild, newState.channel).catch((error) => {
    console.error("Adroit bot could not join the voice channel or play music:", error.message);
  });
}

async function handleButton(interaction) {
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

  const waitingMember = [...waitingMembers.values()].find(
    (waiting) => waiting.voice.channelId === config.voiceChannelId && waiting.id !== member.id
  );

  if (!waitingMember) {
    await interaction.reply({ content: "Im Adroit-Warteraum wartet gerade niemand.", ephemeral: true });
    return true;
  }

  await Promise.all([
    member.voice.setChannel(supportChannel),
    waitingMember.voice.setChannel(supportChannel)
  ]).then(async () => {
    removeWaitingMember(waitingMember.id);
    leaveAdroitVoice();
    await interaction.reply({ content: `${waitingMember} und du wurden in den Support-Call verschoben.`, ephemeral: true });
  }).catch(async (error) => {
    console.error("Adroit could not move staff member:", error.message);
    await interaction.reply({ content: "Ich konnte euch nicht in den Support-Call verschieben.", ephemeral: true });
  });

  return true;
}

module.exports = {
  handleButton,
  handleVoiceStateUpdate
};
