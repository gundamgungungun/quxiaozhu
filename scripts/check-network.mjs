import { ensurePublicHost, networkConfig, parseFeed, fetchText, readPage } from "../app/api/research/core.ts";

// Run in Node before local development; Worker deployments must also be checked
// through their own /api/research endpoint because their outbound network differs.
const page = process.argv[2] || "https://www.weather.com.cn/weather/101270101.shtml";
const feed = process.argv[3];
try {
  const config = networkConfig();
  console.log(`DNS: ${config.dnsEndpoints.map((url) => new URL(url).hostname).join(" → ")}`);
  await ensurePublicHost(new URL(page).hostname);
  console.log("公开地址校验通过。");
  const content = await readPage(page, true);
  console.log(`网页读取通过：${content.length} 字符。`);
  if (feed) {
    const xml = await fetchText(feed, { verifyDns: true });
    console.log(`RSS / Atom 读取通过：${parseFeed(xml, feed, 12).length} 条。`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "网络检查失败。");
  process.exitCode = 1;
}
