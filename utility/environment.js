const dotenv = require('dotenv');
dotenv.config();

const ENV = process.env.NODE_ENV || 'production'; // Default to production if NODE_ENV is not set
function isDev(){
    return ENV === 'development';
}

function validateEnv() {
    const required = ['DISCORD_TOKEN', 'CLIENT_ID', 'GUILD_ID'];
    const missing = required.filter((key) => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        process.exit(1);
    }
}

module.exports = { isDev, validateEnv };