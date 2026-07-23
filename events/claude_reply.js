// AI chat: anyone can talk to the bot by @mentioning it or replying to one of its messages.
// The actual API call lives in utility/claude.js — this file just decides when to respond
// and builds the conversation context from the reply chain.
const { Events } = require('discord.js');
const logger = require('../utility/logger');
const claude = require('../utility/claude');

// How far back up a reply chain we'll walk for context. Keeps token usage bounded.
const MAX_CHAIN_LENGTH = 10;

// Strip the bot's @mention from a message and collapse leftover whitespace.
function cleanContent(message, botId) {
  return message.content
    .replaceAll(`<@${botId}>`, '')
    .replaceAll(`<@!${botId}>`, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Walk the reply chain (newest -> oldest), then flip it into oldest-first API messages.
async function buildConversation(message, botId) {
  const messages = [];
  let current = message;

  for (let i = 0; i < MAX_CHAIN_LENGTH && current; i++) {
    const isBot = current.author.id === botId;
    const content = cleanContent(current, botId);
    if (content) {
      messages.unshift({
        role: isBot ? 'assistant' : 'user',
        content: isBot ? content : `${current.author.username}: ${content}`,
      });
    }

    if (!current.reference?.messageId) break;
    current = await current.channel.messages.fetch(current.reference.messageId).catch(() => null);
  }

  // The API requires the conversation to start with a user turn. If the chain got cut off
  // mid-conversation on a bot message, pad the front so the request doesn't 400.
  if (messages.length > 0 && messages[0].role === 'assistant') {
    messages.unshift({ role: 'user', content: '(earlier messages in this conversation are unavailable)' });
  }

  return messages;
}

module.exports = {
  name: Events.MessageCreate,
  once: false,
  async execute(message) {
    // Never respond to bots (including ourselves) — avoids reply loops.
    if (message.author.bot) return;

    const botId = message.client.user.id;

    // Trigger on a direct @mention (not @everyone/@here or a role ping)...
    const mentionsBot = message.mentions.users.has(botId);
    // ...or on a reply to one of the bot's messages.
    let isReplyToBot = false;
    if (!mentionsBot && message.reference?.messageId) {
      const referenced = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
      isReplyToBot = referenced?.author.id === botId;
    }
    if (!mentionsBot && !isReplyToBot) return;

    try {
      await message.channel.sendTyping();

      const conversation = await buildConversation(message, botId);
      if (conversation.length === 0) {
        await message.reply('You rang? Ask me something!');
        return;
      }

      const answer = await claude.ask(conversation);

      // First chunk as a reply (so the thread of conversation is followable), rest as follow-ups.
      const chunks = claude.splitMessage(answer);
      await message.reply(chunks[0]);
      for (const chunk of chunks.slice(1)) {
        await message.channel.send(chunk);
      }
    }
    catch (error) {
      logger.error(`Claude reply failed: ${error.stack || error}`);
      await message.reply('Something went wrong on my end — try again in a bit.').catch(() => null);
    }
  },
};
