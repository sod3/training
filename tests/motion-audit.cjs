/* eslint-disable @typescript-eslint/no-require-imports -- Browser QA runner. */
const {chromium}=require('@playwright/test');
const fs=require('fs');
(async()=>{
fs.mkdirSync('qa/motion',{recursive:true});
const browser=await chromium.launch();const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
const rows=[]; const base=process.env.MOTION_QA_URL || 'http://localhost:3100';
for(const route of ['/','/trainers','/match','/login','/signup','/booking','/checkout','/how-it-works','/dashboard/customer','/trainer','/admin']){
await page.goto(base+route,{timeout:120000});
for(const width of [1440,1280,768,430,390,375]){
await page.setViewportSize({width,height:900});await page.waitForTimeout(200);
rows.push({route,width,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)});
}
}
await page.setViewportSize({width:1440,height:1000});await page.goto(base);await page.waitForTimeout(1800);
await page.locator('.performance-story').scrollIntoViewIfNeeded();await page.waitForTimeout(800);await page.screenshot({path:'qa/motion/story-desktop.png'});
await page.evaluate(()=>scrollBy(0,1000));await page.waitForTimeout(800);await page.screenshot({path:'qa/motion/story-stage.png'});
await page.setViewportSize({width:390,height:844});await page.goto(base);await page.waitForTimeout(1200);await page.screenshot({path:'qa/motion/mobile.png'});
await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1440,height:1000});await page.goto(base);await page.waitForTimeout(500);
rows.push({reducedMotion:true,canvases:await page.locator('canvas').count(),pins:await page.locator('.pin-spacer').count(),storyPanels:await page.locator('.story-panel:visible').count()});
fs.writeFileSync('qa/motion/results.json',JSON.stringify({rows,errors},null,2));console.log(JSON.stringify({overflows:rows.filter(r=>r.overflow),errors,reduced:rows.at(-1)}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
