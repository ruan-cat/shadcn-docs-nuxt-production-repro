const baseUrl = process.argv[2] ?? process.env.REPRO_DOCS_BASE_URL ?? "http://127.0.0.1:3000";
const paths = ["/api/_content/cache.json", "/api/_content/search"];

console.log(`# Nuxt Content HTTP 探针: ${baseUrl}`);

for (const path of paths) {
  const url = new URL(path, baseUrl);
  try {
    const response = await fetch(url);
    const text = await response.text();
    console.log(`${path}: ${response.status} ${response.statusText} bytes=${Buffer.byteLength(text)}`);
    if (!response.ok || text.length === 0) {
      console.error(text.slice(0, 1000));
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`${path}: 请求失败`);
    console.error(error);
    process.exitCode = 1;
  }
}
