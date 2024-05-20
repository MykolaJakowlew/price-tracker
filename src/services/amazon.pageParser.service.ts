import { Injectable } from "@nestjs/common";
import { ParserResult } from "models/amazon";
import axios from 'axios'
import * as cheerio from 'cheerio';
import * as fs from 'fs'
import puppeteer from 'puppeteer';
@Injectable()
export class AmazonPageParserService {
    constructor() {

    }

    async parserPup(link: string): Promise<ParserResult> {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36");
        await page.setJavaScriptEnabled(false);
        await page.setRequestInterception(true);
        page.on("request", req => req.url() === link ? req.continue() : req.abort());
        await page.goto(link,  {waitUntil: "domcontentloaded"});
        // const el = await page.waitForSelector(".a-price .a-offscreen");
        // const price = await el.evaluate(el => (el as any).innerText);
        await page.screenshot({ path: './p.png', type: 'png',fullPage: true });
        return {} as ParserResult
    }

    async parser(link: string): Promise<ParserResult> {

        const response = await axios.get(link, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Encoding': 'gzip, deflate, br, zstd',
                'Accept-Language': 'en-US,en;q=0.9,uk-UA;q=0.8,uk;q=0.7,ru;q=0.6,la;q=0.5,da;q=0.4'
            }
        })

        const html = response.data

        console.log(html.indexOf('a-offscreen'))

        fs.writeFileSync('./amazon.html', html)

        const doc = cheerio.load(html)

        const title = doc('#productTitle').text().trim()
        console.log(title);
        const price = doc('#actualPriceValue')

        const a = doc('.a-price-whole')
        console.log(price);
        return {
            title,
            price: { value: 10, currency: 'USD' }
        }
    }
}