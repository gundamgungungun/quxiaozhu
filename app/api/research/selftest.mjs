// Run: node --experimental-strip-types app/api/research/selftest.mjs
import assert from "node:assert/strict";
import { blockedPage, ensurePublicHost, fetchText, htmlText, isPublicAddress, networkConfig, parseFeed, publicUrl, readablePage, readPage } from "./core.ts";
import { cityName, facilityEntries, rentEntries, validateSourceContent } from "./sources.ts";

for (const value of ["file:///etc/passwd", "http://localhost", "http://localhost.example.local", "http://127.0.0.1", "http://2130706433", "http://0x7f000001", "http://[::1]", "http://user:pass@example.com", "https://example.com:8080", "http://metadata.google.internal"]) {
  assert.throws(() => publicUrl(value), value);
}
assert.equal(publicUrl("https://example.com/path#fragment").href, "https://example.com/path");
assert.equal(isPublicAddress("8.8.8.8"), true);
assert.equal(isPublicAddress("2606:4700:4700::1111"), true);
for (const address of ["127.0.0.1", "10.0.0.2", "172.31.1.1", "192.168.1.2", "169.254.169.254", "100.64.0.1", "::1", "::ffff:127.0.0.1", "fd00::1", "2001:db8::1"]) assert.equal(isPublicAddress(address), false, address);
assert.equal(htmlText("<style>hide</style><script>alert('x')</script><h1>大理 &amp; 旅居</h1><p>月租&nbsp; &#x4e00;千</p>"), "大理 & 旅居\n月租 一千");
assert.equal(htmlText("&lt;p&gt;订阅摘要&lt;/p&gt;"), "订阅摘要");
assert.equal(blockedPage("Title: Just a moment...\nWarning: This page is requiring CAPTCHA"), true);
assert.equal(blockedPage("<title>安全验证</title><p>拖动滑块</p>"), true);
assert.equal(blockedPage("Title: 大理生活\n天气晴，欢迎查看租房信息。"), false);
const challenge = "https://callback.58.com/antibot/verifycode?serialId=fixture-only&sign=fixture-only";
const login = "大众点评网\n登录\nAPP扫码，享七天免登录\n二维码已失效\n请点击刷新\n抱歉，登录失败\n打开大众点评APP\n扫描二维码登录\n账号登录/注册 遇到问题\n关于我们 | 商户入驻";
const article = "<title>大理生活指南</title><nav><a>登录 / 注册</a></nav><h1>大理租房与生活</h1><p>这是一篇正常公开文章，介绍租房、菜市场和公共交通。先核对实地情况，再选择适合的居住区域。</p>";
assert.equal(blockedPage(challenge), true);
assert.equal(blockedPage(login), true);
assert.equal(blockedPage('{"msg":"您的网络好像不太给力，请稍后再试","code":406,"customData":{"verifyPageUrl":"https://verify.meituan.com/v2/app/general?token=fixture-only"}}'), true);
assert.equal(blockedPage(article), false);
assert.equal(blockedPage(`${article}<aside>打开 APP 扫码登录，账号登录/注册</aside>`), false);
assert.equal(blockedPage(`<script>请输入验证码</script>${article}`), false);
assert.equal(blockedPage(`${article}${"<p>正常公开生活信息。</p>".repeat(400)}<aside>扫码登录</aside>`), false);
assert.throws(() => readablePage(challenge), /安全验证或登录页面/);
assert.throws(() => readablePage(login), /安全验证或登录页面/);
assert.match(readablePage(article), /正常公开文章/);
assert.throws(() => readablePage("https://example.com/empty-page"), /可读正文/);
assert.equal(cityName("cd"), "成都");
assert.equal(facilityEntries("成都", "菜市场")[0].url, "https://www.dianping.com/chengdu/");
assert.equal(facilityEntries("北京", "医院")[1].url, `https://www.dianping.com/search/keyword/2/0_${encodeURIComponent("医院")}`);
assert.equal(facilityEntries("大理", "医院")[1].url, `https://www.dianping.com/search/keyword/277/0_${encodeURIComponent("医院")}`);
assert.match(facilityEntries("未知城", "医院")[0].unavailable, /暂未收录/);
assert.equal(rentEntries("成都", "月租", "武侯区")[1].url, "https://m.anjuke.com/cd/zf/");
assert.equal(rentEntries("大理", "", "")[2].url, "https://dali.zu.ke.com/zufang/");
assert.match(decodeURIComponent(rentEntries("成都", "月租", "")[0].url), /成都 租房 月租/);
assert.match(rentEntries("unlisted-city", "", "")[2].unavailable, /暂未收录/);
assert.throws(() => validateSourceContent({ kind: "rent" }, "成都月嫂，月饼团购"), /租房内容/);
validateSourceContent({ kind: "rent" }, "成都租房：合租 1000 元/月");
const rss = '<rss><channel><item><title><![CDATA[大理 &amp; 新闻]]></title><link>https://example.com/news</link><description><![CDATA[<p>这是摘要</p>]]></description></item></channel></rss>';
assert.deepEqual(parseFeed(rss, "https://example.com/feed", 6)[0], { title: "大理 & 新闻", source: "example.com", url: "https://example.com/news", content: "这是摘要", status: "success" });
const cdataRss = '<rss><channel><item><title>公开资讯</title><link><![CDATA[https://example.com/story?sid=1&from=rss]]></link><description>摘要</description></item></channel></rss>';
assert.equal(parseFeed(cdataRss, "https://example.com/feed", 6)[0].url, "https://example.com/story?sid=1&from=rss");
const atom = '<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>本地公告</title><link rel="self" href="https://example.com/feed/1"/><link href="/post"/><summary>周末天气</summary></entry></feed>';
assert.equal(parseFeed(atom, "https://example.com/feed", 1)[0].url, "https://example.com/post");
assert.throws(() => parseFeed("<html>login</html>", "https://example.com", 6), /RSS/);
const originalFetch = globalThis.fetch;
const originalDnsEndpoints = process.env.RESEARCH_DNS_ENDPOINTS;
try {
  delete process.env.RESEARCH_DNS_ENDPOINTS;
  globalThis.fetch = async () => Response.json({ Status: 0, Answer: [{ type: 1, data: "127.0.0.1" }] });
  await assert.rejects(() => fetchText("https://public-looking.example.com", { verifyDns: true }), /指向内网/);
  let attempts = [];
  globalThis.fetch = async (value) => {
    const url = new URL(String(value)); attempts.push(url.hostname);
    if (url.hostname === "dns.alidns.com") throw new TypeError("network unavailable");
    if (url.hostname === "cloudflare-dns.com") return Response.json({ Status: 0, Answer: [{ type: 1, data: "93.184.215.14" }] });
    return new Response(article);
  };
  assert.match(await readPage("https://example.com/article", true), /正常公开文章/);
  assert(attempts.includes("cloudflare-dns.com"));
  assert(!attempts.includes("r.jina.ai"), "Untrusted URLs must keep redirects under local validation");
  let targetCalls = 0;
  globalThis.fetch = async (value) => {
    const url = new URL(String(value));
    if (url.hostname === "dns.alidns.com") {
      if (url.searchParams.get("type") === "28") throw new TypeError("AAAA unavailable");
      return Response.json({ Status: 0, Answer: [{ type: 1, data: "10.0.0.1" }] });
    }
    targetCalls++; return new Response(article);
  };
  await assert.rejects(() => ensurePublicHost("example.com"), /指向内网/);
  assert.equal(targetCalls, 0, "A private partial answer cannot fall through to another resolver");
  globalThis.fetch = async () => { throw new TypeError("offline"); };
  await assert.rejects(() => ensurePublicHost("example.com"), /DNS 校验服务/);
  globalThis.fetch = async () => Response.json({ Status: 0, Answer: [] });
  await assert.rejects(() => ensurePublicHost("example.com"), /未找到/);
  process.env.RESEARCH_DNS_ENDPOINTS = "http://localhost/resolve";
  assert.throws(networkConfig, /公开网站/);
  process.env.RESEARCH_DNS_ENDPOINTS = "https://resolver.example.com/resolve";
  assert.deepEqual(networkConfig().dnsEndpoints, ["https://resolver.example.com/resolve"]);
  delete process.env.RESEARCH_DNS_ENDPOINTS;
  // Emulate Workerd's supported fetch options, so browser-only redirect:error
  // cannot silently pass in Node tests again.
  globalThis.fetch = async (_value, options) => {
    assert.equal(options.redirect, "manual");
    return Response.json({ Status: 0, Answer: [{ type: 1, data: "93.184.215.14" }] });
  };
  await ensurePublicHost("example.com");
  let resolverRedirectCalls = 0;
  globalThis.fetch = async () => {
    resolverRedirectCalls++;
    return new Response(null, { status: 302, headers: { location: "http://127.0.0.1/secret" } });
  };
  await assert.rejects(() => ensurePublicHost("example.com"), /DNS 校验服务/);
  assert.equal(resolverRedirectCalls, 4, "Two DNS types per resolver; never follow the redirect");
  let redirectedFetches = [];
  globalThis.fetch = async (value) => {
    const url = new URL(String(value));
    if (/dns.alidns.com|cloudflare-dns.com/.test(url.hostname)) return Response.json({ Status: 0, Answer: [{ type: 1, data: url.searchParams.get("name") === "private.example.com" ? "192.168.1.2" : "93.184.215.14" }] });
    redirectedFetches.push(url.hostname);
    return new Response(null, { status: 302, headers: { location: "https://private.example.com/secret" } });
  };
  await assert.rejects(() => readPage("https://example.com/article", true), /指向内网/);
  assert.deepEqual(redirectedFetches, ["example.com"]);
  globalThis.fetch = async (value) => new Response(String(value).includes("r.jina.ai") ? challenge : article);
  assert.match(await readPage("https://example.com/article"), /正常公开文章/);
  globalThis.fetch = async () => new Response(login);
  await assert.rejects(() => readPage("https://example.com/article"), (error) => /安全验证或登录页面/.test(error.message) && !error.message.includes("sign="));
  globalThis.fetch = async () => new Response(null, { status: 302, headers: { location: "http://127.0.0.1/secret" } });
  await assert.rejects(() => fetchText("https://example.com"), /公开网站/);
  globalThis.fetch = async () => new Response("restricted", { status: 403 });
  await assert.rejects(() => fetchText("https://example.com"), /限制自动读取/);
  globalThis.fetch = async () => new Response("<title>安全验证</title>", { headers: { "content-type": "text/html" } });
  await assert.rejects(() => fetchText("https://example.com"), /验证/);
  globalThis.fetch = async () => new Response("large", { headers: { "content-length": "9000000" } });
  await assert.rejects(() => fetchText("https://example.com"), /大小限制/);
  globalThis.fetch = async () => new Response("正常公开网页正文", { headers: { "content-type": "text/plain" } });
  assert.equal(await fetchText("https://example.com"), "正常公开网页正文");
} finally {
  globalThis.fetch = originalFetch;
  if (originalDnsEndpoints === undefined) delete process.env.RESEARCH_DNS_ENDPOINTS;
  else process.env.RESEARCH_DNS_ENDPOINTS = originalDnsEndpoints;
}
console.log("Research API self-check passed: source-specific cities, real challenge/login regressions, normal login navigation, DNS failover/fail-closed, every-hop redirect checks, RSS/Atom, HTTP failures and body limits.");
