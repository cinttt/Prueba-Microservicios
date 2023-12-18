const express = require("express");
const puppeteer = require("puppeteer");
const port = 3000;
const app = express();
const path = require("path");
const fs = require("fs");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const countries = require("i18n-iso-countries");
const base64 = require("./PDF/public/base64-images/images.js");

app.set("view engine", "ejs");
app.use(express.static("views"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const calculatePercentages = (financials) => {
  const clients = financials.clients;
  const total = Object.values(clients).reduce((sum, value) => sum + value, 0);
  const percentages = {};
  for (const region in clients) {
    percentages[region] = ((clients[region] / total) * 100).toFixed(2) + "%";
  }
  return percentages;
};

const balanceTeam = (team) => {
  const totalEmployees = team.male + team.female;
  const totalToRender = 10;
  let maleMembers = Math.round((team.male / totalEmployees) * totalToRender);
  let femaleMembers = Math.round((team.female / totalEmployees) * totalToRender);
  const totalSum = maleMembers + femaleMembers;
  if (totalSum > totalToRender) {
    maleMembers > femaleMembers ? maleMembers-- : femaleMembers--;
  } else if (totalSum < totalToRender) {
    maleMembers < femaleMembers ? maleMembers++ : femaleMembers++;
  }
  return { maleMembers: new Array(maleMembers).fill('male'), femaleMembers: new Array(femaleMembers).fill('female') };
};

const getCountryCode = (location) => {
  return countries.getAlpha2Code(location, "en");
};

const countryCodeForRegion = (countryArray) => {
  let countryCodePerClient = {};
  for (const region of countryArray) {
    countryCodePerClient[region] = getCountryCode(region);
  }
  return countryCodePerClient;
};


app.post("/generate-pdf", async (req, res) => {
  const data = req.body;
  const clientKeys = Object.keys(data.financials.clients);
  const graphValues = Object.values(data.financials.clients);
  const percentageArray = calculatePercentages(data.financials);
  countries.registerLocale(require("i18n-iso-countries/langs/es.json"));
  const companyCountryCode = countries.getAlpha2Code(data.company_info.business_group.country, "es");
  const teamBalance = balanceTeam(data.company_info.team);

  const html = await ejs.renderFile(path.join(__dirname, "views", "index.ejs"), {
    data,
    graphValues,
    companyCountryCode,
    clientKeys,
    percentageArray,
    teamBalance,
    countryCodePerClient: countryCodeForRegion(clientKeys),
    rayasImg: base64.rayasImg,
    excelenciaImg: base64.excelenciaImg,
    ceeisImg: base64.ceeisImg,
    manPic: base64.manPic,
    womanPic: base64.womanPic,
    euFlag: base64.europeFlag,
    activityPic:  base64.activityPic,
    carPic:  base64.carPic,
    giftPic:  base64.giftPic,
    heartPic:  base64.heartPic,
    incomesPic:  base64.incomesPic,
    paperPic:  base64.paperPic,
    personPic:  base64.personPic,
    resourcesPic:  base64.resourcesPic,
    ringsPic:  base64.ringsPic
  });

  const browser = await puppeteer.launch({ headless: 'new'});
  const page = await browser.newPage();
  await page.setContent(html);
  await page.addStyleTag({ path: path.join(__dirname, "views", "style.css") });
  const pdfPath = path.join(__dirname, "PDF", "document.pdf");
  await page.pdf({ path: pdfPath, format: "A4", printBackground: true });
  await browser.close();

  const base64string = fs.readFileSync(pdfPath, { encoding: "base64" });
  res.send(base64string);
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});