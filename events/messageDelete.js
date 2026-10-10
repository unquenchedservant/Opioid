const { Events, AuditLogEvent, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../utility/config');
const { createModLogEmbed } = require('../utility/starboard');
const { botDeletes } = require('../utility/botDeletes');
const logger = require('../utility/logger');


// entryId -> last seen count, used to detect grouped (bumped) entries
const seenCounts = new Map();

module.exports = {
  name: Events.MessageDelete,
  async execute(message) {
    if (!message.guild) return;

    // Opioid's own deletes never show up in the audit log, so check those first.
    // This runs before the channel filter so the ID is always cleared from the set.
    let deleter = botDeletes.delete(message.id) ? message.client.user : null;

    // Deletes in the status and mod log channels are expected noise, don't log them
    if ([config.statusID, config.modLogs].includes(message.channelId)) return;

    // Discord pulls deleted attachments off the CDN quickly, so grab the image
    // before the audit log wait. If it's already gone, the log just goes out without it.
    const files = [];
    const image = message.attachments?.find(a => a.contentType?.startsWith('image/'));
    if (image) {
      try {
        const res = await fetch(image.url);
        if (res.ok) {
          files.push({ attachment: Buffer.from(await res.arrayBuffer()), name: image.name });
        }
      }
      catch {
        // already gone
      }
    }

    // The deleted message's own link is dead, so link to the message right before it instead.
    // Only needs the ID, so this works even for uncached (partial) messages.
    const components = [];
    try {
      const before = await message.channel?.messages.fetch({ before: message.id, limit: 1 });
      const context = before?.first();
      if (context) {
        components.push(new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel('Jump to Context')
            .setStyle(ButtonStyle.Link)
            .setURL(context.url),
        ));
      }
    }
    catch {
      // no Read Message History, or nothing before it -- send without the button
    }

    if (!deleter) {
      // Give Discord a moment to write the audit log entry
      await new Promise(r => setTimeout(r, 1000));

      try {
        const logs = await message.guild.fetchAuditLogs({
          type: AuditLogEvent.MessageDelete,
          limit: 6,
        });

        for (const entry of logs.entries.values()) {
          const sameTarget  = entry.target?.id === message.author?.id;
          const sameChannel = entry.extra?.channel?.id === message.channelId;
          const prev        = seenCounts.get(entry.id);
          const isFresh     = Date.now() - entry.createdTimestamp < 5000;
          const bumped      = prev !== undefined && entry.extra.count > prev;
          seenCounts.set(entry.id, entry.extra.count);

          if (sameTarget && sameChannel && (isFresh || bumped)) {
            deleter = entry.executor;
            break;
          }
        }
      }
      catch (error) {
        logger.error(`Failed to fetch audit logs for message delete: ${error.stack || error}`);
      }
    }

    try {
      const modLogChannel = await message.guild.channels.fetch(config.modLogs);
      let embed;
      if (deleter) {
        embed = createModLogEmbed(`Message from ${message.author?.tag ?? 'Unknown'} deleted in #${message.channel?.name ?? 'Unknown'} by ${deleter.tag}`, message.content || 'Unknown', deleter, Date.now(), message.author?.displayAvatarURL() ?? null, files[0]?.name);
      }
      else {
        embed = createModLogEmbed(`Message from ${message.author?.tag ?? 'Unknown' } deleted in #${message.channel?.name ?? 'Unknown2'} by ${message.author?.tag ?? 'Unknown'}`, message.content || '**Message is too old, no data found**', message.author, Date.now(), message.author?.displayAvatarURL() ?? null, files[0]?.name);
      }
      await modLogChannel.send({ embeds: [embed], files, components });
    }
    catch (error) {
      logger.error(`Failed to send message delete mod log: ${error.stack || error}`);
    }
  },
};