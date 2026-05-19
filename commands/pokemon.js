const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const axios = require("axios");

const KOREAN_NAME_MAP = require("../data/pokemonNameMap");

const pokemonCache = new Map();

const TYPE_KO = {
  normal: "노말",
  fire: "불꽃",
  water: "물",
  electric: "전기",
  grass: "풀",
  ice: "얼음",
  fighting: "격투",
  poison: "독",
  ground: "땅",
  flying: "비행",
  psychic: "에스퍼",
  bug: "벌레",
  rock: "바위",
  ghost: "고스트",
  dragon: "드래곤",
  dark: "악",
  steel: "강철",
  fairy: "페어리",
};

const TYPE_EMOJI = {
  normal: "⚪",
  fire: "🔥",
  water: "💧",
  electric: "⚡",
  grass: "🌿",
  ice: "❄️",
  fighting: "🥊",
  poison: "☠️",
  ground: "🌍",
  flying: "🪽",
  psychic: "🔮",
  bug: "🐛",
  rock: "🪨",
  ghost: "👻",
  dragon: "🐉",
  dark: "🌑",
  steel: "⚙️",
  fairy: "🧚",
};

const STAT_KO = {
  hp: "HP",
  attack: "공격",
  defense: "방어",
  "special-attack": "특수공격",
  "special-defense": "특수방어",
  speed: "스피드",
};

const ENGLISH_TO_KOREAN_NAME_MAP = Object.fromEntries(
  Object.entries(KOREAN_NAME_MAP).map(([ko, en]) => [en, ko]),
);

function formatType(type) {
  return `${TYPE_EMOJI[type] || ""} ${TYPE_KO[type] || type}`;
}

function createStatBar(value) {
  const filled = Math.min(10, Math.round(value / 20));
  const empty = 10 - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

function createButtons(pokemonId) {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`pokemon_info_${pokemonId}`)
      .setLabel("기본정보")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId(`pokemon_stats_${pokemonId}`)
      .setLabel("스탯")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId(`pokemon_evolution_${pokemonId}`)
      .setLabel("진화")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId(`pokemon_weakness_${pokemonId}`)
      .setLabel("상성")
      .setStyle(ButtonStyle.Secondary),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`pokemon_moves_${pokemonId}`)
      .setLabel("기술")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId(`pokemon_shiny_${pokemonId}`)
      .setLabel("색이 다른 모습")
      .setStyle(ButtonStyle.Danger),
  );

  return [row1, row2];
}

function getEvolutionNames(chain) {
  const names = [];

  function walk(node) {
    if (!node) return;

    const enName = node.species.name;
    const koName = ENGLISH_TO_KOREAN_NAME_MAP[enName] || enName;

    names.push(koName);

    if (node.evolves_to?.length > 0) {
      node.evolves_to.forEach((next) => walk(next));
    }
  }

  walk(chain);
  return names.join(" → ");
}

async function getWeaknesses(types) {
  const damageMap = {};

  for (const type of types) {
    const res = await axios.get(`https://pokeapi.co/api/v2/type/${type}`);
    const relations = res.data.damage_relations;

    relations.double_damage_from.forEach((t) => {
      damageMap[t.name] = (damageMap[t.name] || 1) * 2;
    });

    relations.half_damage_from.forEach((t) => {
      damageMap[t.name] = (damageMap[t.name] || 1) * 0.5;
    });

    relations.no_damage_from.forEach((t) => {
      damageMap[t.name] = 0;
    });
  }

  const weaknesses = Object.entries(damageMap)
    .filter(([_, value]) => value > 1)
    .map(([type, value]) => {
      const typeName = formatType(type);
      return value >= 4 ? `${typeName} x4` : `${typeName} x2`;
    });

  return weaknesses.length > 0 ? weaknesses.join("\n") : "약점 없음";
}

async function getKoreanAbilities(abilities) {
  const result = [];

  for (const abilityInfo of abilities) {
    const abilityRes = await axios.get(abilityInfo.ability.url);
    const ability = abilityRes.data;

    const koreanName =
      ability.names.find((n) => n.language.name === "ko")?.name || ability.name;

    const hiddenText = abilityInfo.is_hidden ? " (숨겨진 특성)" : "";

    result.push(`${koreanName}${hiddenText}`);
  }

  return result.join("\n");
}

async function getKoreanMoves(moves) {
  const selectedMoves = moves.slice(0, 15);
  const result = [];

  for (const moveInfo of selectedMoves) {
    try {
      const moveRes = await axios.get(moveInfo.move.url);
      const move = moveRes.data;

      const koreanName =
        move.names.find((n) => n.language.name === "ko")?.name || move.name;

      result.push(`• ${koreanName}`);
    } catch {
      result.push(`• ${moveInfo.move.name}`);
    }
  }

  return result.length > 0 ? result.join("\n") : "등록된 기술 정보가 없습니다.";
}

async function getPokemonData(searchName) {
  if (pokemonCache.has(searchName)) {
    return pokemonCache.get(searchName);
  }

  const pokemonRes = await axios.get(
    `https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(searchName)}`,
  );

  const pokemon = pokemonRes.data;

  const speciesRes = await axios.get(pokemon.species.url);
  const species = speciesRes.data;

  const evolutionRes = await axios.get(species.evolution_chain.url);
  const evolutionChain = getEvolutionNames(evolutionRes.data.chain);

  const koreanName =
    species.names.find((n) => n.language.name === "ko")?.name || pokemon.name;

  const genus =
    species.genera.find((g) => g.language.name === "ko")?.genus ||
    "분류 정보 없음";

  const flavorText =
    species.flavor_text_entries
      .find((f) => f.language.name === "ko")
      ?.flavor_text.replace(/\n|\f/g, " ") || "도감 설명이 없습니다.";

  const typeNames = pokemon.types.map((t) => t.type.name);

  const types = typeNames.map((type) => formatType(type)).join("  ");

  const weaknesses = await getWeaknesses(typeNames);
  const abilities = await getKoreanAbilities(pokemon.abilities);
  const moves = await getKoreanMoves(pokemon.moves);

  const stats = pokemon.stats
    .map((s) => {
      const name = STAT_KO[s.stat.name] || s.stat.name;
      const value = s.base_stat;
      return `${name}: ${value} ${createStatBar(value)}`;
    })
    .join("\n");

  const sprite =
    pokemon.sprites.other?.["official-artwork"]?.front_default ||
    pokemon.sprites.front_default;

  const shinySprite =
    pokemon.sprites.other?.["official-artwork"]?.front_shiny ||
    pokemon.sprites.front_shiny ||
    sprite;

  const data = {
    id: pokemon.id,
    name: pokemon.name,
    koreanName,
    genus,
    flavorText,
    types,
    weaknesses,
    abilities,
    moves,
    stats,
    evolutionChain,
    height: `${pokemon.height / 10}m`,
    weight: `${pokemon.weight / 10}kg`,
    sprite,
    shinySprite,
  };

  pokemonCache.set(searchName, data);
  pokemonCache.set(String(pokemon.id), data);
  pokemonCache.set(pokemon.name, data);
  pokemonCache.set(koreanName, data);

  return data;
}

function createInfoEmbed(data) {
  return new EmbedBuilder()
    .setTitle(`#${data.id} ${data.koreanName} (${data.name})`)
    .setDescription(data.flavorText)
    .setThumbnail(data.sprite)
    .addFields(
      { name: "분류", value: data.genus, inline: true },
      { name: "타입", value: data.types, inline: true },
      { name: "키", value: data.height, inline: true },
      { name: "몸무게", value: data.weight, inline: true },
      { name: "특성", value: data.abilities || "없음", inline: false },
    )
    .setColor(0xffcb05)
    .setFooter({ text: "기본정보" });
}

function createStatsEmbed(data) {
  return new EmbedBuilder()
    .setTitle(`#${data.id} ${data.koreanName} - 스탯`)
    .setThumbnail(data.sprite)
    .addFields({ name: "기본 스탯", value: data.stats })
    .setColor(0x3498db)
    .setFooter({ text: "스탯 정보" });
}

function createEvolutionEmbed(data) {
  return new EmbedBuilder()
    .setTitle(`#${data.id} ${data.koreanName} - 진화`)
    .setThumbnail(data.sprite)
    .addFields({
      name: "진화 루트",
      value: data.evolutionChain || "진화 정보 없음",
    })
    .setColor(0x2ecc71)
    .setFooter({ text: "진화 정보" });
}

function createWeaknessEmbed(data) {
  return new EmbedBuilder()
    .setTitle(`#${data.id} ${data.koreanName} - 상성`)
    .setThumbnail(data.sprite)
    .addFields(
      { name: "타입", value: data.types, inline: false },
      { name: "약점", value: data.weaknesses, inline: false },
    )
    .setColor(0xe74c3c)
    .setFooter({ text: "타입 상성" });
}

function createMovesEmbed(data) {
  return new EmbedBuilder()
    .setTitle(`#${data.id} ${data.koreanName} - 기술`)
    .setDescription("상위 15개 기술만 표시합니다.")
    .setThumbnail(data.sprite)
    .addFields({
      name: "기술 목록",
      value: data.moves,
    })
    .setColor(0x9b59b6)
    .setFooter({ text: "기술 정보" });
}

function createShinyEmbed(data) {
  return new EmbedBuilder()
    .setTitle(`#${data.id} ${data.koreanName} - 색이 다른 모습`)
    .setDescription("색이 다른 포켓몬의 모습입니다.")
    .setImage(data.shinySprite)
    .setColor(0xf1c40f)
    .setFooter({ text: "Shiny Form" });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pokemon")
    .setDescription("포켓몬 도감 정보를 검색합니다.")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("포켓몬 이름, 영어 이름, 번호 또는 random")
        .setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      let input = interaction.options.getString("name").trim().toLowerCase();

      if (input === "random" || input === "랜덤") {
        input = String(Math.floor(Math.random() * 1025) + 1);
      }

      const searchName = KOREAN_NAME_MAP[input] || input;
      const data = await getPokemonData(searchName);

      await interaction.editReply({
        embeds: [createInfoEmbed(data)],
        components: createButtons(data.id),
      });

      const message = await interaction.fetchReply();

      const collector = message.createMessageComponentCollector({
        time: 60_000,
      });

      collector.on("collect", async (buttonInteraction) => {
        if (buttonInteraction.user.id !== interaction.user.id) {
          return buttonInteraction.reply({
            content: "이 버튼은 명령어를 사용한 사람만 누를 수 있습니다.",
            ephemeral: true,
          });
        }

        const cachedData = pokemonCache.get(String(data.id));

        if (!cachedData) {
          return buttonInteraction.reply({
            content: "캐시 데이터가 만료되었습니다. 다시 검색해주세요.",
            ephemeral: true,
          });
        }

        let embed;

        if (buttonInteraction.customId === `pokemon_info_${data.id}`) {
          embed = createInfoEmbed(cachedData);
        } else if (buttonInteraction.customId === `pokemon_stats_${data.id}`) {
          embed = createStatsEmbed(cachedData);
        } else if (
          buttonInteraction.customId === `pokemon_evolution_${data.id}`
        ) {
          embed = createEvolutionEmbed(cachedData);
        } else if (
          buttonInteraction.customId === `pokemon_weakness_${data.id}`
        ) {
          embed = createWeaknessEmbed(cachedData);
        } else if (buttonInteraction.customId === `pokemon_moves_${data.id}`) {
          embed = createMovesEmbed(cachedData);
        } else if (buttonInteraction.customId === `pokemon_shiny_${data.id}`) {
          embed = createShinyEmbed(cachedData);
        }

        await buttonInteraction.update({
          embeds: [embed],
          components: createButtons(data.id),
        });
      });

      collector.on("end", async () => {
        const disabledRows = createButtons(data.id);

        disabledRows.forEach((row) => {
          row.components.forEach((button) => button.setDisabled(true));
        });

        await interaction
          .editReply({
            components: disabledRows,
          })
          .catch(() => {});
      });
    } catch (error) {
      console.error(error);

      await interaction.editReply({
        content:
          "❌ 포켓몬을 찾을 수 없습니다.\n예: `/pokemon name:피카츄`, `/pokemon name:pikachu`, `/pokemon name:25`, `/pokemon name:random`",
        components: [],
      });
    }
  },
};
