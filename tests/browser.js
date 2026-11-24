import {chromium} from 'playwright-core';
import {spawn,execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
mkdirSync('.cache',{recursive:true});
execFileSync('ffmpeg',['-loglevel','error','-y','-loop','1','-i','demo/portrait.jpg','-t','1','-vf','scale=640:426','-pix_fmt','yuv420p','-r','10','.cache/test.y4m']);
const server=spawn('python3',['-m','http.server','8187','--bind','127.0.0.1','--directory','dist'],{stdio:'ignore'});
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-video-capture='+process.cwd()+'/.cache/test.y4m']});
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8187');await page.getByText('Start camera',{exact:true}).click();
 await page.getByText('On-device coaching active').waitFor({timeout:45000});
 await page.waitForFunction(()=>{const c=document.querySelector('#guide');return c.getContext('2d').getImageData(0,0,c.width,c.height).data.some(v=>v>0)},{},{timeout:30000});
 for(const goal of ['Portrait','Profile','Social']){
 await page.locator('#goal').selectOption(goal);await page.getByRole('button',{name:'Take photo'}).click();
 await page.locator('dialog[open] img').waitFor();assert.match(await page.locator('#save').getAttribute('download'),/jpg$/);
 await page.locator('#again').click()}
 await page.locator('#goal').selectOption('Video');await page.locator('#capture').click();await page.waitForTimeout(900);await page.locator('#capture').click();
 await page.locator('dialog[open] video').waitFor();await page.waitForFunction(()=>document.querySelector('#clip').videoWidth>0);
 await page.locator('#again').click();await page.locator('#stop').click();assert.equal(await page.locator('#source').evaluate(el=>el.srcObject),null);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.addInitScript(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Denied','NotAllowedError')}});
 await page.reload();await page.locator('#start').click();await page.getByText(/Camera access was declined/).waitFor();assert.deepEqual(errors,[]);
 console.log('PASS: on-device landmark and mask, three photo crops, playable silent video, session cleanup, narrow layout and denied permission.');
}finally{await browser?.close();server.kill()}
