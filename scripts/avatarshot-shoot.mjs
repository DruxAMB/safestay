import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
});
const p = await b.newPage();
await p.setViewport({ width: 760, height: 140 });
await p.goto("file:///C:/Users/LOYAL/Documents/hack/shots/avatars.html");
await new Promise((r) => setTimeout(r, 500));
await p.screenshot({ path: "../shots/avatars.png" });
await b.close();
console.log("done");
