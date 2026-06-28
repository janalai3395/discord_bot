const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const axios = require("axios");
const cheerio = require("cheerio");

const NEWS_URL = "https://pokemonkorea.co.kr/";

let newsCache = {
  data: null,
  expiresAt: 0,
};

function isPokemonNewsLink(href) {
  if (!href) return false;

  return (
    href.includes("/news/") ||
    href.includes("/MegaFesta") ||
    href.includes("/ptc") ||
    href.includes("pokemoncard.co.kr/card/")
  );
}

function normalizeUrl(href, baseUrl = "https://pokemonkorea.co.kr/") {
  if (!href) return null;

  if (href.startsWith("http")) return href;

  try {
    return new URL(href, baseUrl).href;
  } catch {
    return null;
  }
}

// 뉴스 상세 페이지 정보 가져오기
async function fetchNewsDetail(url) {
  try {
    const res = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const $ = cheerio.load(res.data);

    let image = null;

    // 이미지 후보 저장
    const imageCandidates = [];

    $("img").each((_, el) => {
      let src =
        $(el).attr("src") ||
        $(el).attr("data-src") ||
        $(el).attr("data-original");

      if (!src) return;

      src = normalizeUrl(src, url);

      // 제외할 이미지들
      const lower = src.toLowerCase();

      if (
        lower.includes("logo") ||
        lower.includes("icon") ||
        lower.includes("banner") ||
        lower.includes("footer") ||
        lower.includes("common") ||
        lower.includes("btn") ||
        lower.includes("thank")
      ) {
        return;
      }

      const width = $(el).attr("width");
      const height = $(el).attr("height");

      if ((width && Number(width) < 100) || (height && Number(height) < 100)) {
        return;
      }

      imageCandidates.push(src);
    });

    // 가장 긴 URL = 보통 실제 이미지
    imageCandidates.sort((a, b) => b.length - a.length);

    image = imageCandidates[0];

    // 없으면 og:image 사용
    if (!image) {
      image =
        $('meta[property="og:image"]').attr("content") ||
        $('meta[name="twitter:image"]').attr("content");
    }

    // 설명
    const description =
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="description"]').attr("content") ||
      $(".board-view").text().trim().slice(0, 120) ||
      "";

    return {
      image: normalizeUrl(image, url),
      description: description.trim(),
    };
  } catch (err) {
    console.log("상세 뉴스 가져오기 실패:", url);

    return {
      image: null,
      description: "",
    };
  }
}

async function fetchPokemonNews(count = 5) {
  // 캐시 사용
  if (newsCache.data && Date.now() < newsCache.expiresAt) {
    console.log("[NEWS CACHE HIT]");
    return newsCache.data;
  }

  console.log("[NEWS FETCH START]");

  const res = await axios.get(NEWS_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });

  console.log("뉴스 페이지 상태코드:", res.status);
  console.log("HTML 길이:", res.data.length);

  const $ = cheerio.load(res.data);

  const news = [];

  $("a").each((_, el) => {
    const href = $(el).attr("href");
    const text = $(el).text().replace(/\s+/g, " ").trim();

    if (!isPokemonNewsLink(href)) return;
    if (!text || text.length < 4) return;

    news.push({
      title: text,
      url: normalizeUrl(href),
    });
  });

  console.log("수집된 뉴스 개수:", news.length);

  // 중복 제거
  const unique = [];
  const seen = new Set();

  for (const item of news) {
    if (seen.has(item.url)) continue;

    seen.add(item.url);
    unique.push(item);
  }

  // 뉴스 상세 정보 가져오기
  for (const item of unique.slice(0, count)) {
    const detail = await fetchNewsDetail(item.url);

    item.image = detail.image;
    item.description = detail.description;
  }

  // 캐시 저장
  newsCache = {
    data: unique.slice(0, 20),
    expiresAt: Date.now() + 1000 * 60 * 10,
  };

  console.log("[NEWS CACHE SAVE]");

  return newsCache.data;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pokenews")
    .setDescription("포켓몬코리아 최신 소식을 가져옵니다.")
    .addIntegerOption((option) =>
      option
        .setName("count")
        .setDescription("표시할 뉴스 개수 (기본 5)")
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(10),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const count = interaction.options.getInteger("count") ?? 5;

      const news = await fetchPokemonNews(count);

      if (!news || news.length === 0) {
        return interaction.editReply(
          "❌ 뉴스 데이터를 찾지 못했습니다.\n사이트 구조가 변경되었을 수 있습니다.",
        );
      }

      // 뉴스마다 Embed 생성
      const embeds = news.slice(0, count).map((item, index) => {
        const embed = new EmbedBuilder()
          .setTitle(`${index + 1}. ${item.title}`)
          .setURL(item.url)
          .setDescription(item.description || "설명 없음")
          .setColor(0xffcb05)
          .setFooter({
            text: "출처: 포켓몬코리아 공식 사이트",
          })
          .setTimestamp();

        // 뉴스 이미지
        if (item.image) {
          embed.setImage(item.image);
        }

        return embed;
      });

      await interaction.editReply({
        embeds,
      });
    } catch (error) {
      console.error("❌ pokenews error:", error);
      console.error("status:", error.response?.status);

      await interaction.editReply(
        "❌ 포켓몬 소식을 가져오는 중 오류가 발생했습니다.\n터미널 로그를 확인해주세요.",
      );
    }
  },
};
