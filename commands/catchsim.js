const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const axios = require("axios");
const KOREAN_NAME_MAP = require("../data/pokemonNameMap");
const { calculateCatchRate } = require("../utils/catchCalculator");

const BALL_BONUS = {
  poke: 1,
  great: 1.5,
  ultra: 2,
  master: 255,
  premier: 1,
  repeat: 3.5,
  net: 3.5,
  dusk: 3,
  quick: 5,
  timer: 4,
};

const BALL_LABEL = {
  poke: "포켓볼",
  great: "슈퍼볼",
  ultra: "하이퍼볼",
  master: "마스터볼",
  premier: "프리미어볼",
  repeat: "리피트볼",
  net: "네트볼",
  dusk: "다크볼",
  quick: "퀵볼",
  timer: "타이머볼",
};

const STATUS_BONUS = {
  none: 1,
  sleep: 2.5,
  freeze: 2.5,
  paralyze: 1.5,
  burn: 1.5,
  poison: 1.5,
};

const STATUS_LABEL = {
  none: "없음",
  sleep: "수면",
  freeze: "얼음",
  paralyze: "마비",
  burn: "화상",
  poison: "독",
};

function runSimulation(probability, count) {
  let success = 0;

  for (let i = 0; i < count; i++) {
    const roll = Math.random() * 100;
    if (roll <= probability) success++;
  }

  const fail = count - success;
  const successRate = (success / count) * 100;
  const averageBalls = probability > 0 ? 100 / probability : Infinity;

  return {
    success,
    fail,
    successRate: successRate.toFixed(2),
    averageBalls: Number.isFinite(averageBalls)
      ? averageBalls.toFixed(2)
      : "계산 불가",
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("catchsim")
    .setDescription("포켓몬 포획을 여러 번 시뮬레이션합니다.")
    .addStringOption((option) =>
      option
        .setName("pokemon")
        .setDescription("포켓몬 이름, 영어 이름 또는 번호")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("ball")
        .setDescription("사용할 볼 종류")
        .setRequired(true)
        .addChoices(
          { name: "포켓볼", value: "poke" },
          { name: "슈퍼볼", value: "great" },
          { name: "하이퍼볼", value: "ultra" },
          { name: "마스터볼", value: "master" },
          { name: "프리미어볼", value: "premier" },
          { name: "리피트볼", value: "repeat" },
          { name: "네트볼", value: "net" },
          { name: "다크볼", value: "dusk" },
          { name: "퀵볼", value: "quick" },
          { name: "타이머볼", value: "timer" },
        ),
    )
    .addNumberOption((option) =>
      option
        .setName("hp")
        .setDescription("현재 HP 비율, 1~100")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100),
    )
    .addStringOption((option) =>
      option
        .setName("status")
        .setDescription("상태이상")
        .setRequired(true)
        .addChoices(
          { name: "없음", value: "none" },
          { name: "수면", value: "sleep" },
          { name: "얼음", value: "freeze" },
          { name: "마비", value: "paralyze" },
          { name: "화상", value: "burn" },
          { name: "독", value: "poison" },
        ),
    )
    .addIntegerOption((option) =>
      option
        .setName("count")
        .setDescription("시뮬레이션 횟수, 기본값 1000")
        .setRequired(false)
        .setMinValue(10)
        .setMaxValue(10000),
    )
    .addNumberOption((option) =>
      option
        .setName("bonus")
        .setDescription("기타 보정 배율, 기본값 1")
        .setRequired(false)
        .setMinValue(0.1)
        .setMaxValue(10),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const inputName = interaction.options
        .getString("pokemon")
        .trim()
        .toLowerCase();
      const searchName = KOREAN_NAME_MAP[inputName] || inputName;

      const ball = interaction.options.getString("ball");
      const hpPercent = interaction.options.getNumber("hp");
      const status = interaction.options.getString("status");
      const count = interaction.options.getInteger("count") ?? 1000;
      const extraBonus = interaction.options.getNumber("bonus") ?? 1;

      const pokemonRes = await axios.get(
        `https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(searchName)}`,
      );

      const pokemon = pokemonRes.data;

      const speciesRes = await axios.get(pokemon.species.url);
      const species = speciesRes.data;

      const koreanName =
        species.names.find((name) => name.language.name === "ko")?.name ||
        pokemon.name;

      const catchRate = species.capture_rate;
      const maxHP = pokemon.stats.find(
        (stat) => stat.stat.name === "hp",
      ).base_stat;
      const currentHP = Math.max(1, Math.floor((hpPercent / 100) * maxHP));

      const calculation = calculateCatchRate({
        maxHP,
        currentHP,
        catchRate,
        ballBonus: BALL_BONUS[ball],
        statusBonus: STATUS_BONUS[status],
        extraBonus,
      });

      const probability = Number(calculation.probability);
      const sim = runSimulation(probability, count);

      const image =
        pokemon.sprites.other?.["official-artwork"]?.front_default ||
        pokemon.sprites.front_default;

      const embed = new EmbedBuilder()
        .setTitle(`🎲 ${koreanName} 포획 시뮬레이션`)
        .setDescription(`${count.toLocaleString()}번 볼을 던진 결과입니다.`)
        .setThumbnail(image)
        .addFields(
          { name: "대상", value: `#${pokemon.id} ${koreanName}`, inline: true },
          {
            name: "사용 볼",
            value: `${BALL_LABEL[ball]} x${BALL_BONUS[ball]}`,
            inline: true,
          },
          {
            name: "HP",
            value: `${hpPercent}% (${currentHP}/${maxHP})`,
            inline: true,
          },
          {
            name: "상태이상",
            value: `${STATUS_LABEL[status]} x${STATUS_BONUS[status]}`,
            inline: true,
          },
          {
            name: "이론 확률",
            value: `${probability.toFixed(2)}%`,
            inline: true,
          },
          {
            name: "시뮬레이션 성공률",
            value: `${sim.successRate}%`,
            inline: true,
          },
          {
            name: "성공",
            value: `${sim.success.toLocaleString()}회`,
            inline: true,
          },
          {
            name: "실패",
            value: `${sim.fail.toLocaleString()}회`,
            inline: true,
          },
          {
            name: "평균 필요 볼",
            value: `약 ${sim.averageBalls}개`,
            inline: true,
          },
        )
        .setColor(0xf39c12)
        .setFooter({
          text: "시뮬레이션 결과는 실행할 때마다 달라질 수 있습니다.",
        });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);

      await interaction.editReply(
        "❌ 포획 시뮬레이션에 실패했습니다.\n예: `/catchsim pokemon:피카츄 ball:하이퍼볼 hp:10 status:수면 count:1000`",
      );
    }
  },
};
