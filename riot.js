// riot.js
const axios = require('axios');
const RIOT_API_KEY = process.env.RIOT_API_KEY;

async function getPuuidByRiotId(gameName, tagLine) {
  const url = `https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
  const response = await axios.get(url, {
    headers: { 'X-Riot-Token': RIOT_API_KEY },
  });
  return response.data.puuid;
}

async function getSummonerByPuuid(puuid) {
  const url = `https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`;
  const response = await axios.get(url, {
    headers: { 'X-Riot-Token': RIOT_API_KEY },
  });
  return response.data; // { id, name, summonerLevel, profileIconId, ... }
}

async function getRankByPuuid(puuid) {
  const url = `https://kr.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`;
  const response = await axios.get(url, {
    headers: { 'X-Riot-Token': RIOT_API_KEY },
  });
  return response.data;
}


module.exports = {
  getPuuidByRiotId,
  getSummonerByPuuid,
  getRankByPuuid,
};
