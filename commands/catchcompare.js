const {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
} = require("discord.js");
const axios = require("axios");
const { createCanvas } = require("canvas");

const { logCatchCompare } = require("../utils/db");
const { catchCache } = require("../utils/cache");

const KOREAN_NAME_MAP = require("../data/pokemonNameMap");
const { calculateCatchRate } = require("../utils/catchCalculator");

const BALLS = [
  { key: "quick", label: "퀵볼", bonus: 5, color: "#f1c40f" },
  { key: "master", label: "마스터볼", bonus: 255, color: "#9b59b6" },
  { key: "timer", label: "타이머볼", bonus: 4, color: "#2ecc71" },
  { key: "net", label: "네트볼", bonus: 3.5, color: "#1abc9c" },
  { key: "repeat", label: "리피트볼", bonus: 3.5, color: "#e67e22" },
  { key: "dusk", label: "다크볼", bonus: 3, color: "#34495e" },
  { key: "ultra", label: "하이퍼볼", bonus: 2, color: "#f39c12" },
  { key: "great", label: "슈퍼볼", bonus: 1.5, color: "#3498db" },
  { key: "poke", label: "포켓볼", bonus: 1, color: "#e74c3c" },
  { key: "premier", label: "프리미어볼", bonus: 1, color: "#ecf0f1" },
];

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

function createGraphPng(results, pokemonName) {
  const width = 760;
  const rowHeight = 46;
  const height = 100 + results.length * rowHeight;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // 배경
  ctx.fillStyle = "#111318";
  ctx.fillRect(0, 0, width, height);

  // 제목
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px sans-serif";
  ctx.fillText(`${pokemonName} 볼별 포획 확률`, 40, 42);

  ctx.fillStyle = "#b2bec3";
  ctx.font = "18px sans-serif";
  ctx.fillText("볼별 포획 확률", 40, 72);

  const fullBarWidth = 410;

  results.forEach((ball, index) => {
    const y = 90 + index * rowHeight;

    let barWidth;
    if (ball.probability >= 99.99) {
      barWidth = fullBarWidth; // 🔥 100% 꽉 채우기
    } else {
      barWidth = Math.max(
        4,
        Math.round((ball.probability / 100) * fullBarWidth),
      );
    }

    // 이름
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px sans-serif";
    ctx.fillText(ball.label, 40, y + 22);

    // 퍼센트
    ctx.fillStyle = "#dfe6e9";
    ctx.font = "22px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${ball.probability.toFixed(2)}%`, 220, y + 22);
    ctx.textAlign = "left";

    // 배경 바
    ctx.fillStyle = "#2f3640";
    ctx.beginPath();
    ctx.roundRect(250, y, fullBarWidth, 28, 14);
    ctx.fill();

    // 실제 바
    ctx.fillStyle = ball.color;
    ctx.beginPath();
    ctx.roundRect(250, y, barWidth, 28, 14);
    ctx.fill();
  });

  return canvas.toBuffer("image/png");
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("catchcompare")
    .setDescription("볼 종류별 포획 확률을 비교합니다.")
    .addStringOption((option) =>
      option
        .setName("pokemon")
        .setDescription("포켓몬 이름, 영어 이름 또는 번호")
        .setRequired(true),
    )
    .addNumberOption((option) =>
      option
        .setName("hp")
        .setDescription("현재 HP 비율 (1~100)")
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
    .addNumberOption((option) =>
      option
        .setName("bonus")
        .setDescription("기타 보정 배율 (기본 1)")
        .setRequired(false),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const inputName = interaction.options
        .getString("pokemon")
        .trim()
        .toLowerCase();
      const searchName = KOREAN_NAME_MAP[inputName] || inputName;

      const hpPercent = interaction.options.getNumber("hp");
      const status = interaction.options.getString("status");
      const extraBonus = interaction.options.getNumber("bonus") ?? 1;

      const cacheKey = `${searchName}:${hpPercent}:${status}:${extraBonus}`;

      const cached = catchCache.get(cacheKey);

      if (cached) {
        console.log(`[CACHE HIT] ${cacheKey}`);

        const attachment = new AttachmentBuilder(cached.graphBuffer, {
          name: "catchcompare.png",
        });

        return interaction.editReply({
          embeds: [cached.embed],
          files: [attachment],
        });
      }

      const pokemonRes = await axios.get(
        `https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(searchName)}`,
      );

      const pokemon = pokemonRes.data;

      const speciesRes = await axios.get(pokemon.species.url);
      const species = speciesRes.data;

      const koreanName =
        species.names.find((n) => n.language.name === "ko")?.name ||
        pokemon.name;

      const catchRate = species.capture_rate;
      const maxHP = pokemon.stats.find((s) => s.stat.name === "hp").base_stat;
      const currentHP = Math.floor((hpPercent / 100) * maxHP);

      const results = BALLS.map((ball) => {
        const result = calculateCatchRate({
          maxHP,
          currentHP,
          catchRate,
          ballBonus: ball.bonus,
          statusBonus: STATUS_BONUS[status],
          extraBonus,
        });

        return {
          ...ball,
          probability: Number(result.probability),
        };
      }).sort((a, b) => b.probability - a.probability);

      const bestBall = results[0];

      const graphBuffer = createGraphPng(results, koreanName);

      const attachment = new AttachmentBuilder(graphBuffer, {
        name: "catchcompare.png",
      });

      const embed = new EmbedBuilder()
        .setTitle(`📊 ${koreanName} 볼별 포획 확률 비교`)
        .setDescription(
          `추천 볼: **${bestBall.label} (${bestBall.probability.toFixed(2)}%)**`,
        )
        .setImage("attachment://catchcompare.png")
        .addFields(
          { name: "대상", value: `#${pokemon.id} ${koreanName}`, inline: true },
          {
            name: "HP",
            value: `${hpPercent}% (${currentHP}/${maxHP})`,
            inline: true,
          },
          { name: "상태이상", value: `${STATUS_LABEL[status]}`, inline: true },
          { name: "기본 포획률", value: `${catchRate}`, inline: true },
          { name: "기타 보정", value: `x${extraBonus}`, inline: true },
        )
        .setColor(parseInt(bestBall.color.replace("#", ""), 16))
        .setFooter({
          text: "볼별 포획 확률 그래프",
        });

      const payload = {
        embed,
        graphBuffer,
      };

      catchCache.set(cacheKey, payload);

      logCatchCompare({
        userId: interaction.user.id,
        username: interaction.user.username,
        pokemonName: koreanName,
        hpPercent,
        status,
        bestBall: bestBall.label,
        bestProbability: bestBall.probability,
      });

      console.log(`[CACHE SAVE] ${cacheKey}`);

      await interaction.editReply({
        embeds: [embed],
        files: [attachment],
      });
    } catch (err) {
      console.error(err);
      await interaction.editReply("❌ 오류 발생");
    }
  },
};
