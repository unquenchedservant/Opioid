// Instead of hardcoding IDs everywhere, this is a centralized spot for them. Some things I don't feel necessary to have a dev version for, so I don't. If that changes, we can update this. 

const { isDev } = require('./environment');


const guildIDDev = '365879579887534080';
const guildIDProd = '1527492380515635220';
const starboardIDDev = '1347392583050985612';
const starboardIDProd = '1527500899591651378';
const announcementsIDDev = '471397293229342781';
const announcementsIDProd = '1527492811145089136';
const generalIDDev = '365879579887534082';
const generalIDProd = '1527492381203763422';
const staffID = '1527501465923620934';
const staffBotCommandIDDev = '1556440215499833354';
const staffBotCommandIDProd = '1527501548182175845';
const feedbackIDProd = '1530429987553808424';
const feedbackIDDev = '1530430516283572264';
const specialUserID = '236394260553924608';
const statusIDDev = '1545861869850460260';
const statusIDProd = '1545867601878581400';
const vcMuteRoleIDDev = '1556437929948094564';
const vcMuteRoleIDProd = '1556335007809933456';
const modLogsIDProd = '1557810315012476949';
const modLogsIDDev = '1530746377498525797';


module.exports = {
    guildID: isDev() ? guildIDDev : guildIDProd,
    starboardID: isDev() ? starboardIDDev : starboardIDProd,
    announcementsID: isDev() ? announcementsIDDev : announcementsIDProd,
    generalID: isDev() ? generalIDDev : generalIDProd,
    feedbackID: isDev() ? feedbackIDDev : feedbackIDProd,
    statusID: isDev() ? statusIDDev : statusIDProd,
    vcMuteRoleID: isDev() ? vcMuteRoleIDDev : vcMuteRoleIDProd,
    staffBotCommandID: isDev() ? staffBotCommandIDDev : staffBotCommandIDProd,
    modLogs: isDev() ? modLogsIDDev : modLogsIDProd,
    staffID: staffID, 
    specialUserID: specialUserID
}