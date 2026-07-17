const { EmbedBuilder } = require('discord.js');
const { starboardDB } = require('../db/starboard');
const config = require('../utility/config');
const { isDev } = require('../utility/environment');
const logger = require('./logger');


// Used to have a "Modboard" so that's why this is called "True Count". It's counting how many stars outside of bots and the author of the message.
async function getTrueCount(message) {
  let trueCount = 0;
  for (const reaction of message.reactions.cache.values()) {
    if (reaction.emoji.name === '⭐') {
      if (!isDev()) {
        logger.info('Not dev, fetching reactions for starboard');
        const users = await reaction.users.fetch();
        trueCount = Array.from(users.values()).filter(user =>
          !user.bot && user.id !== message.author.id,
        ).length;
      }
      else {
        trueCount = reaction.count;
      }
    }
  }
  return trueCount;
}

async function addToStarboard(message, trueCount, starboardChannel) {
  const embed = await createEmbed(message, trueCount);
  const starboardMsg = await starboardChannel.send({ embeds: [embed] });
  starboardDB.add(message.id, starboardMsg.id);
}

async function updateStarboard(message, trueCount, starboardChannel) {
  const starboardMsgID = await starboardDB.get(message.id);
  const starboardMsg = await starboardChannel.messages.fetch(starboardMsgID);
  const embed = await createEmbed(message, trueCount);
  await starboardMsg.edit({ embeds: [embed] });
}

async function removeFromStarboard(message, starboardChannel) {
  const starboardMsgID = await starboardDB.get(message.id);
  const starboardMsg = await starboardChannel.messages.fetch(starboardMsgID);
  await starboardMsg.delete();
  starboardDB.remove(message.id);
}

// I reverse engineered this from some other bot (Randy)
async function createEmbed(message, count) {
  const author = message.author;
  const authorName = author.tag;
  const authorUser = author.username;
  let msg = message.content;
  msg += `\n\n[⤴️ Go to message](${message.url})`;
  const footer = `⭐ ${count} in #${message.channel.name}`;
  const title = authorName === authorUser ? authorName : `${authorUser} ~ ${authorName}`;
  const embed = new EmbedBuilder()
    .setAuthor({ name: title, iconURL: message.author.displayAvatarURL() })
    .setTimestamp(message.createdAt)
    .setFooter({ text: footer })
    .setDescription(msg);
  if (message.attachments.size > 0) {
    const firstAttachment = message.attachments.first();
    if (firstAttachment.contentType?.startsWith('image/')) {
      embed.setImage(firstAttachment.url);
    }
  }
  return embed;
}

module.exports = {
  getTrueCount,
  addToStarboard,
  updateStarboard,
  removeFromStarboard,
  createEmbed,
};