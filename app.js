const puppeteer = require("puppeteer");
const Kabum = require("./kabum");

var card = [];

const tracked_words = ["RTX 2060"];

iniciarBrowser = async (text_search, selected_word) => {
  const browser = await puppeteer.launch({
    product: "chrome",
    headless: false,
    userDataDir: "/tmp/myChromeSession",
  });
  const page = await browser.newPage();

  const kabum = new Kabum(page, browser);

  await kabum.start();

  // await kabum.search(text_search);

  await kabum.check_price(text_search, card);

  async function fn60sec() {
    await page.reload({ waitUntil: ["networkidle0", "domcontentloaded"] });
    card = [];
    await kabum.check_price(text_search, card);
  }
  fn60sec();
  setInterval(fn60sec, 60 * 1000);
};

console.log(
  "[BEGIN] APLICAÇÃO INICIADA. PROCURANDO POR PROMOÇÕES DAS GPU RTX 2060..."
);

iniciarBrowser("RTX 2060", tracked_words[0]);
