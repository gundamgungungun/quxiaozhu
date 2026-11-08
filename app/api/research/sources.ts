export type SourceEntry = { source: string; title: string; url: string; unavailable?: string; kind?: "rent" };

// Platform identifiers are deliberately separate: e.g. Chengdu is cd on Beike
// and chengdu / 8 on Dianping. Never derive an arbitrary subdomain from input.
const RENT_CITIES: Record<string, { anjuke: string; ke: string }> = {
  大理: { anjuke: "dali", ke: "dali" }, 成都: { anjuke: "cd", ke: "cd" },
  威海: { anjuke: "weihai", ke: "weihai" }, 昆明: { anjuke: "km", ke: "km" },
  丽江: { anjuke: "lijiang", ke: "lijiang" }, 三亚: { anjuke: "sanya", ke: "sanya" },
  北海: { anjuke: "beihai", ke: "beihai" }, 厦门: { anjuke: "xm", ke: "xm" },
  杭州: { anjuke: "hz", ke: "hz" }, 西双版纳: { anjuke: "xishuangbanna", ke: "xishuangbanna" },
  腾冲: { anjuke: "tengchong", ke: "tengchong" }, 桂林: { anjuke: "guilin", ke: "guilin" },
  海口: { anjuke: "haikou", ke: "haikou" }, 青岛: { anjuke: "qd", ke: "qd" },
  北京: { anjuke: "bj", ke: "bj" }, 上海: { anjuke: "sh", ke: "sh" },
  广州: { anjuke: "gz", ke: "gz" }, 深圳: { anjuke: "sz", ke: "sz" },
};

// IDs and slugs checked against each source city homepage, not a shared pinyin table.
const DIANPING_CITIES: Record<string, { slug: string; id: number }> = {
  大理: { slug: "dali", id: 277 }, 成都: { slug: "chengdu", id: 8 }, 威海: { slug: "weihai", id: 152 },
  昆明: { slug: "kunming", id: 267 }, 丽江: { slug: "lijiang", id: 279 }, 三亚: { slug: "sanya", id: 345 },
  北海: { slug: "beihai", id: 228 }, 厦门: { slug: "xiamen", id: 15 }, 杭州: { slug: "hangzhou", id: 3 },
  西双版纳: { slug: "xishuangbanna", id: 276 }, 腾冲: { slug: "tengchong", id: 1841 }, 桂林: { slug: "guilin", id: 226 },
  海口: { slug: "haikou", id: 23 }, 青岛: { slug: "qingdao", id: 21 }, 北京: { slug: "beijing", id: 2 },
  上海: { slug: "shanghai", id: 1 }, 广州: { slug: "guangzhou", id: 4 }, 深圳: { slug: "shenzhen", id: 7 },
};

export function cityName(value: string): string {
  if (value === "大理白族自治州") return "大理";
  const input = value.replace(/市$/, "");
  if (RENT_CITIES[input]) return input;
  return Object.keys(RENT_CITIES).find((name) =>
    [RENT_CITIES[name].anjuke, RENT_CITIES[name].ke, DIANPING_CITIES[name]?.slug].includes(input.toLowerCase())) || input;
}

export function rentEntries(city: string, keyword: string, district: string): SourceEntry[] {
  const name = cityName(city);
  const codes = RENT_CITIES[name];
  const query = [name, "租房", keyword, district].filter(Boolean).join(" ");
  const unavailable = `暂未收录“${city}”在该平台的城市入口，请打开来源网站选择城市。`;
  return [
    { source: "豆瓣租房小组", title: `${name} · 租房小组搜索`, url: `https://www.douban.com/group/search?cat=1019&q=${encodeURIComponent(query)}`, kind: "rent" },
    { source: "安居客", title: `${name} · 租房城市列表`, url: codes ? `https://m.anjuke.com/${codes.anjuke}/zf/` : "https://www.anjuke.com/", ...(codes ? {} : { unavailable }), kind: "rent" },
    { source: "贝壳/链家", title: `${name} · 租房城市列表`, url: codes ? `https://${codes.ke}.zu.ke.com/zufang/` : "https://www.ke.com/", ...(codes ? {} : { unavailable }), kind: "rent" },
  ];
}

export function facilityEntries(city: string, keyword: string): SourceEntry[] {
  const name = cityName(city);
  const codes = DIANPING_CITIES[name];
  const unavailable = `暂未收录“${city}”在大众点评的城市入口，请打开来源网站选择城市。`;
  return [
    { source: "大众点评城市页", title: `${name} · 生活服务`, url: codes ? `https://www.dianping.com/${codes.slug}/` : "https://www.dianping.com/", ...(codes ? {} : { unavailable }) },
    { source: "大众点评关键词", title: `${name} · ${keyword || "周边设施"}`, url: codes ? `https://www.dianping.com/search/keyword/${codes.id}/0_${encodeURIComponent(keyword || "菜市场")}` : "https://www.dianping.com/", ...(codes ? {} : { unavailable }) },
  ];
}

export function validateSourceContent(entry: SourceEntry, content: string): void {
  if (entry.kind === "rent" && !/(?:租房|出租|合租|房源|元\s*\/\s*月)/.test(content)) {
    throw new Error("来源未返回可识别的租房内容，请打开来源页核对或调整检索词。");
  }
}
