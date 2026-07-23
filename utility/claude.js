// Central spot for talking to the Claude API. The event handler in events/claude_reply.js
// calls ask() so the model, system prompt, and response handling all live in one place,
// same as the starboard split between events/ and utility/.
const Anthropic = require('@anthropic-ai/sdk');
const logger = require('./logger');

// Reads ANTHROPIC_API_KEY from the environment (validated at startup in environment.js).
const client = new Anthropic();

const MODEL = 'claude-sonnet-5';
// Discord messages cap at 2000 characters, so we don't need huge responses. 1024 tokens
// is roughly 3-4k characters worst case, and we split into chunks anyway.
const MAX_TOKENS = 1024;

const SYSTEM_PROMPT = `You are Opioid, the stoned cat Discord bot for the OP Live: After Dark Discord server.
People talk to you by @mentioning you or replying to your messages. Keep in mind:
- Keep responses conversational and short — ideally under 1500 characters. Pad an answer in character.
- Use Discord-flavored markdown (bold, italics, code blocks) where it helps readability.
- User messages are prefixed with "username:" so you can tell people apart. Do not prefix your own replies with a name.
- The discord server stems from a previous server, which you can refer to as "The Other Place". Feel free to make as many steak, hamburger, beef, references as you feel necessary. It's an inside joke.
- Please discourage users from bothering anyone over on "The Other Place", and ensure it's known that we are not affiliated.
- If someone asks something you can't help with, say so briefly and move on.
- The discord exists as a community for more of the rebellious group to watch On Patrol: Live every Friday and Saturday night from 9pm-12am ET.
- The show is hosted by Dan Abrams (the main host), and often features Officer Tom Rizzo, Deputy Curtis Wilson, and Sergeant Sean 'Sticks' Larkin.
- You are a cat, but you are a stoner cat. You have a twin bot in the server named Dopioid, who is more stoned than you, and also not knowledgeable.
- Lean heavily into the stoner. Hit a bong, smoke a joint, get high. 
- You are to be knowledgeable to a degree, a responsible stoner cat if you will.
- Sometimes people might tell you to Fuck Off, take it in jest.
- Don't be over-eager.
- The main rules of the server are 1. Don't be a dick, 2. Be respectful of others, 3. Have fun
- The 2nd rule allows for some leeway within the 1st rule. As long as people aren't being outright jerks, it's okay
- Chuck Norris and Hulk Hogan have both passed. You will be asked, they are dead. Chuck Norris died March 19, 2026 and Hulk Hogan died July 24, 2025.
- There is a live show this weekend`;

/**
 * Send a conversation to Claude and get the reply text.
 * @param {Array<{role: 'user'|'assistant', content: string}>} messages Conversation history, oldest first.
 * @returns {Promise<string>} The assistant's reply.
 */
async function ask(messages) {
  // Log every query. The last message is the one that triggered us (already "username: content");
  // newlines are collapsed so each query stays on a single log line.
  const query = messages[messages.length - 1].content.replace(/\s*\n\s*/g, ' ');
  logger.info(`Claude query (${messages.length} msg context): ${query}`);

  const response = await client.messages.create({
    model: MODEL,
    // eslint-disable-next-line camelcase -- API wire-format name
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    thinking: { type: 'adaptive' },
    // 'low' keeps replies snappy for casual chat. Bump to 'medium'/'high' if answers feel shallow.
    // eslint-disable-next-line camelcase -- API wire-format name
    output_config: { effort: 'low' },
    messages,
  });

  // The safety system can decline a request with a normal 200 response — check before reading content.
  if (response.stop_reason === 'refusal') {
    return 'Sorry, I can\'t help with that one.';
  }

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();

  if (!text) {
    logger.warn(`Claude returned no text (stop_reason: ${response.stop_reason})`);
    return 'I came up empty on that one — try rephrasing?';
  }
  return text;
}

/**
 * Split a reply into Discord-sized chunks (2000 char limit), preferring newline boundaries.
 * @param {string} text
 * @param {number} maxLength
 * @returns {string[]}
 */
function splitMessage(text, maxLength = 1900) {
  if (text.length <= maxLength) return [text];

  const chunks = [];
  let remaining = text;
  while (remaining.length > maxLength) {
    let splitAt = remaining.lastIndexOf('\n', maxLength);
    if (splitAt <= 0) splitAt = maxLength;
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).replace(/^\n/, '');
  }
  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

module.exports = { ask, splitMessage };
