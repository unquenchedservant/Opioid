// Discord doesn't write an audit log entry when a bot deletes a single message,
// so messageDelete can't tell who did it. Anything Opioid deletes itself gets its
// message ID added here first, and messageDelete checks this set before falling
// back to the audit log.
const botDeletes = new Set();

module.exports = { botDeletes };
