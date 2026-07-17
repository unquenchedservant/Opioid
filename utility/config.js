// Instead of hardcoding IDs everywhere, this is a centralized spot for them. Some things I don't feel necessary to have a dev version for, so I don't. If that changes, we can update this. 

const { isDev } = require('./environment');

// TODO: Lift dev values to .env file and update environment.js to check for those values if dev. 

const guildIDDev = '365879579887534080';
const guildIDProd = '1527492380515635220';
const starboardIDDev = '1347392583050985612';
const starboardIDProd = '1527500899591651378';
const announcementsIDDev = '471397293229342781';
const announcementsIDProd = '1527492811145089136';
const generalIDDev = '365879579887534082';
const generalIDProd = '1527492381203763422';
const staffID = '1527501465923620934';

module.exports = {
    guildID: isDev() ? guildIDDev : guildIDProd,
    starboardID: isDev() ? starboardIDDev : starboardIDProd,
    announcementsID: isDev() ? announcementsIDDev : announcementsIDProd,
    generalID: isDev() ? generalIDDev : generalIDProd,
    staffID: staffID
}