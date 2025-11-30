// riot.js --> roit api 호출 모듈
const axios = require('axios');
require('dotenv').config();

const RIOT_API_KEY = process.env.RIOT_API_KEY;

async function getPuuidByRiotId(gameName, tagLine) {
  const url = `https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${tagLine}`;
  try {
    const response = await axios.get(url, {
      headers: {
        'X-Riot-Token': RIOT_API_KEY,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error getting PUUID:', error.response?.data || error.message);
    return null;
  }
}

module.exports = { getPuuidByRiotId };
