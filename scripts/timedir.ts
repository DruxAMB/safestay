import { listDirectory } from "../src/lib/arkiv/queries";
const t = Date.now();
try {
  const d = await listDirectory();
  console.log(`OK ${Date.now() - t}ms — ${d.length} landlords, ${d.reduce((s, l) => s + l.termsCount, 0)} terms`);
} catch (e) {
  console.log(`FAIL ${Date.now() - t}ms —`, (e as Error).message);
}
process.exit(0);
