
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const MAX_POKEMON_ID = 1025;

async function main() {
  const map = {};

  for (let id = 1; id <= MAX_POKEMON_ID; id++) {
    try {
      const res = await axios.get(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
      const species = res.data;

      const koName = species.names.find(n => n.language.name === 'ko')?.name;
      const enName = species.name;

      if (koName) {
        map[koName] = enName;
        console.log(`${id}. ${koName} -> ${enName}`);
      }
    } catch (error) {
      console.error(`${id}번 포켓몬 처리 실패`);
    }
  }

  const fileContent = `const KOREAN_NAME_MAP = ${JSON.stringify(map, null, 2)};

module.exports = KOREAN_NAME_MAP;
`;

  const outputPath = path.join(__dirname, '../data/pokemonNameMap.js');
  fs.writeFileSync(outputPath, fileContent, 'utf-8');

  console.log('pokemonNameMap.js 생성 완료!');
}

main();