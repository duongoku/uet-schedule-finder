import * as cheerio from 'cheerio';
import * as fs from "fs";
import fetch from "node-fetch";
import { NodeType, parse } from "node-html-parser";

async function getLasterTermId() {
    let response = await fetch("https://daotaodaihoc.uet.vnu.edu.vn/qldt/", {
        "headers": {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/118.0",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-User": "?1"
        },
        "referrer": "https://daotaodaihoc.uet.vnu.edu.vn/congdaotao/",
        "method": "GET"
    });
    let root = parse(await response.text());
    let termIdSelection = root.querySelector("#SinhvienLmh_term_id");
    let lastestTerm = termIdSelection!.querySelectorAll("option")[1];
    let lastestTermId = lastestTerm!.getAttribute("value");
    return lastestTermId!;
}

async function getClassList(termId: string, studentId: string) {
    let response = await fetch(`https://daotaodaihoc.uet.vnu.edu.vn/qldt/?SinhvienLmh[masvTitle]=${studentId}&SinhvienLmh[term_id]=${termId}&pageSize=5000`, {
        "headers": {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/118.0",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-User": "?1"
        },
        "referrer": "https://daotaodaihoc.uet.vnu.edu.vn/congdaotao/",
        "method": "GET"
    });
    let root = parse(await response.text());
    let rt = new Set();
    root.querySelectorAll('tr').slice(2).forEach((e) => {
        rt.add(e.querySelectorAll('td')[5].textContent.trim().replace(/\s+/g, ' ') + '_' + e.querySelectorAll('td')[7].textContent.trim());
        if (e.querySelectorAll('td')[7].textContent.trim() != 'CL') {
            rt.add(e.querySelectorAll('td')[5].textContent.trim().replace(/\s+/g, ' ') + '_CL');
        }
    });
    return rt;
}

async function getSchedule(termId: string, studentId: string, simple: boolean = false) {
    let classList = await getClassList(termId, studentId);
    let response =
        await fetch("http://112.137.129.115/tkb/listbylist.php", {
            "headers": {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US",
                "Upgrade-Insecure-Requests": "1"
            },
            "method": "GET",
        });
    // console.log(await response.text());
    const $ = cheerio.load(await response.text());
    let classes = cheerio.load($("tbody")[3])("tr").toArray().filter((row) => {
        let cells = cheerio.load(row)("td");
        if (cells[4] == null) {
            return false;
        }
        let course_id = cheerio.load(cells[4].cloneNode(true)).text().trim();
        let group_id = cheerio.load(cells[11].cloneNode(true)).text().trim();
        return classList.has(course_id + '_' + group_id);
    });
    return classes.map(row => {
        let cells = cheerio.load(row)("td");
        if (simple) {
            const rt = {
                // id: cheerio.load(cells[0]).text(),
                // course_id: cheerio.load(cells[1]).text().trim(),
                course_name: cheerio.load(cells[2]).text().trim(),
                // credit: cheerio.load(cells[3]).text().trim(),
                class_id: cheerio.load(cells[4]).text().trim(),
                lecturer: cheerio.load(cells[5]).text().trim(),
                // students: cheerio.load(cells[6]).text().trim(),
                time: cheerio.load(cells[7]).text().trim(),
                day: cheerio.load(cells[8]).text().trim(),
                period: cheerio.load(cells[9]).text().trim(),
                room: cheerio.load(cells[10]).text().trim(),
                group_id: cheerio.load(cells[11]).text().trim(),
            }
            return rt;
        }
        const rt = {
            id: cheerio.load(cells[0]).text(),
            course_id: cheerio.load(cells[1]).text().trim(),
            course_name: cheerio.load(cells[2]).text().trim(),
            credit: cheerio.load(cells[3]).text().trim(),
            class_id: cheerio.load(cells[4]).text().trim(),
            lecturer: cheerio.load(cells[5]).text().trim(),
            students: cheerio.load(cells[6]).text().trim(),
            time: cheerio.load(cells[7]).text().trim(),
            day: cheerio.load(cells[8]).text().trim(),
            period: cheerio.load(cells[9]).text().trim(),
            room: cheerio.load(cells[10]).text().trim(),
            group_id: cheerio.load(cells[11]).text().trim(),
        }
        return rt;
    });
}

async function run() {
    const args = require('args-parser')(process.argv);
    if (args.id == null) {
        console.log("Please provide student id");
        return;
    }
    if (args.simple == null && args.s == null) {
        args.simple = false;
    }
    let l = await getSchedule(await getLasterTermId(), args.id, args.simple || args.s);
    console.table(l);
}

run();