import {defineConfig,devices} from '@playwright/test';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const port=Number(process.env.SHIGUANG_E2E_PORT||4432);
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('SHIGUANG_E2E_PORT must be 1024–65535');
const baseURL=`http://127.0.0.1:${port}`;
const dataDir=mkdtempSync(join(tmpdir(),'shiguang-e2e-'));
export default defineConfig({testDir:'./tests/e2e',fullyParallel:false,workers:1,timeout:45000,expect:{timeout:10000},reporter:[['list'],['html',{open:'never'}]],use:{baseURL,trace:'retain-on-failure',screenshot:'only-on-failure'},webServer:{command:`PORT=${port} DATA_DIR=${dataDir} node server/index.mjs`,url:baseURL+'/api/health',reuseExistingServer:false,timeout:60000},projects:[{name:'desktop',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:1000}}},{name:'android',use:{...devices['Pixel 7']}}]});
