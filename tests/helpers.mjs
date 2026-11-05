import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdir} from 'node:fs/promises';
export const BASE=process.argv[2]||'http://localhost:8921/';
export const OUT=process.argv[3]||'/tmp/claude-501/codex_tasks/shots';
assert(['localhost','127.0.0.1'].includes(new URL(BASE).hostname),'Only run complete games locally');
export async function browser(){await mkdir(OUT,{recursive:true});return chromium.launch({channel:'chrome'});}
export async function phone(b){const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await c.route('https://boardgame.leisurecat.cloud/**',r=>r.fulfill({json:{ok:true}}));return c;}
export async function action(page,act){await page.locator(`[data-act="${act}"]`).first().click();await page.waitForTimeout(180);await page.waitForFunction(()=>!document.querySelector('.conn')?.textContent.includes('保存中')); }
export async function shot(p,name){await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:`${OUT}/ark_${name}.png`,fullPage:true});}
export async function setup(p,marine=false,quick=false,n=2){await p.goto(BASE);await action(p,quick?'quick':'create');await p.waitForSelector('[data-act="direct"]:not(:disabled)');if(n!==2){await p.selectOption('[data-config="n"]',String(n));await p.waitForTimeout(200);}if(marine){await p.check('[data-config="marine"]');await p.waitForTimeout(200);}return p.url();}
export async function score(p,id,appeal=80,conservation=16){await p.selectOption('#mine',id);await p.fill('[name="appeal"]',String(appeal));await p.fill('[name="conservation"]',String(conservation));for(const k of ['ten','sponsors','noDouble'])await p.check('[name="'+k+'"]');await p.click('[value="confirm"]');await p.waitForTimeout(300);}
