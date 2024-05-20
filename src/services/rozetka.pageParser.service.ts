import { Injectable } from "@nestjs/common";
import { ParserResult } from "models/amazon";
import axios from 'axios'
import * as cheerio from 'cheerio';

@Injectable()
export class RozetkaPageParserService {
    constructor() {}

    async parser(link: string): Promise<ParserResult> {
        const response = await axios.get(link)
        const html = response.data

        const doc = cheerio.load(html)

        const title = doc('h1.product__title-left').text().trim()
        const priceText = doc('p.product-price__big').text()
        const priceValue = priceText.slice(0, priceText.length - 1)
        const currency = priceText.slice(- 1)
        return {
            title,
            price: { value: +priceValue, currency }
        }
    }
}