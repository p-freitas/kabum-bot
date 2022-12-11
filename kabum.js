const cookiesFilePath = "./cookies.json";
const jsonfile = require("jsonfile");
const fileExists = require("./existsSync");
var nodemailer = require("nodemailer");
require("dotenv").config({ path: __dirname + "/.env" });

const url_kabum =
  "https://www.kabum.com.br/busca/RTX-2060?page_number=1&page_size=100&facet_filters=&sort=price";

let itemPrice = "";

class Kabum {
  constructor(page, browser) {
    this.page = page;
    this.browser = browser;
  }

  async start() {
    await this.loadSession();
    await this.page.setDefaultNavigationTimeout(60000);
    await this.page.goto(url_kabum, { waitUntil: "domcontentloaded" });

    const sessionIsLoaded = await this.sessionIsLoaded();
    console.log(sessionIsLoaded);
    if (!sessionIsLoaded) {
      await this.login();
      await this.saveSession();
    }
  }

  async loadSession() {
    const previousSession = fileExists(cookiesFilePath);
    if (previousSession) {
      const cookiesArr = require(cookiesFilePath);
      if (cookiesArr.length !== 0) {
        for (let cookie of cookiesArr) {
          await this.page.setCookie(cookie);
        }
        console.log("[INFO] SESSÃO CARREGADA NO BROWSER.");
      }
    }
  }

  async saveSession() {
    const cookiesObject = await this.page.cookies();
    jsonfile.writeFile(cookiesFilePath, cookiesObject, { spaces: 2 }, (err) => {
      if (err)
        console.log("[ERROR] ERRO AO ESCREVER O ARQUIVO DE COOKIES: ", err);

      console.log("[INFO] SESSÃO SALVA COM SUCESSO.");
    });
  }

  async sessionIsLoaded() {
    return (
      (await this.page.$(
        'a[href="https://www.kabum.com.br/cgi-local/site/login/login.cgi"]'
      )) === null
    );
  }

  async search(text_search) {
    await this.page.waitForSelector("#input-busca");
    await this.page.type("#input-busca", text_search);

    this.page.keyboard.press("Enter");
    await this.page.waitForNavigation();
  }

  async check_price(text_search, card) {
    try {
      const priceTextList = await this.page.evaluate(() =>
        Array.from(
          document.querySelectorAll(".productCard"),
          (element) => element.innerText
        )
      );

      const list = priceTextList.map((el) => {
        var card;

        if (el.split("\n").length === 5) {
          card = el.split("\n").slice(1, 3);
        } else if (el.split("\n").length === 11) {
          card = el.split("\n").slice(5, 7);
        } else if (el.split("\n").length === 4) {
          card = el.split("\n").slice(0, 2);
        } else if (el.split("\n").length === 12) {
          card = el.split("\n").slice(6, 8);
        }
        return card;
      });

      for (let index = 0; index < list.length; index++) {
        const element = list[index];

        if (element) {
          card.push({
            name: element[0],
            price: parseFloat(
              element[1]
                ?.replace(/[^0-9\.]+/g, "")
                .substring(0, element[1]?.length - 6)
            ),
          });
        }
      }

      let itemPrice = "";
      const localStorage = await this.page.evaluate(() =>
        Object.assign({}, window.localStorage)
      );

      const cheapestPrice = card.reduce(function (res, obj) {
        const item = obj.price < res.price ? obj : res;
        itemPrice = item.price;
        return item;
      });

      console.log(`\nPlaca mais barata no momento: `);
      console.log(`Nome: ${cheapestPrice.name}`);
      console.log(`Preço: R$ ${cheapestPrice.price}`);
      console.log(
        `Horário da busca: ${new Date().getHours()}:${new Date().getMinutes()}:${new Date().getSeconds()}`
      );
      console.log(
        `________________________________________________________________________________`
      );

      if (parseFloat(localStorage.price) > itemPrice) {
        console.log("Promoção encontrada!!");
        console.log("Nome da placa: ", cheapestPrice.name);
        console.log("Valor da placa: ", cheapestPrice.price);

        var remetente = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env["EMAIL"],
            pass: process.env["PASSWORD"],
          },
        });

        var emailASerEnviado = {
          from: {
            name: "Promoção da RTX 2060 encontrada!",
            address: "bot@gmail.com"
          },
          to: process.env["EMAILTO"],
          subject: "Promoção da RTX 2060 encontrada!",
          text: `Nome da placa: ${cheapestPrice.name}\nPreço da placa: R$ ${cheapestPrice.price}`,
        };

        remetente.sendMail(emailASerEnviado, function (error) {
          if (error) {
            console.log(error);
          } else {
            console.log("Email enviado com sucesso.");
          }
        });

        await this.page.evaluate((itemPrice) => {
          localStorage.setItem("price", itemPrice);
        }, itemPrice);
      }
    } catch (err) {
      console.log(
        "[ERROR] ERRO AO TENTAR RECUPERAR O PREÇO DO PRODUTO - " + text_search
      );
      this.browser.close();
      throw err;
    }
  }

  delay(time) {
    return new Promise(function (resolve) {
      setTimeout(resolve, time);
    });
  }
}

module.exports = Kabum;
