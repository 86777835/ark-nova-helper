import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const tests=['test_logic','test_stream','test_authority','test_room','test_edges','test_nav','test_review','test_chat','test_chat_ui','test_teach'];
const results=[];
for(const name of tests){const args=[`tests/${name}.mjs`];if(name==='test_chat')args.push('http://localhost:8921/','/tmp/claude-501/codex_tasks/shots','--no-key');if(name==='test_teach')args.push('http://localhost:8921/','/tmp/claude-501/codex_tasks/shots');const r=spawnSync(process.execPath,args,{encoding:'utf8',timeout:180000});process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');results.push({name,status:r.status===0?'PASS':'FAIL',output:(r.stdout||'')+(r.stderr||'')+(r.error?.message||'')});}
writeFileSync('tests/测试结果.md','# 本地测试结果\n\n日期：2026-11-05。仅访问 localhost:8921，评价接口全部拦截；无线上写入。\n\n'+results.map(r=>`- ${r.status} — ${r.name}`).join('\n')+'\n\n'+results.map(r=>`## ${r.name}\n\n\`\`\`text\n${r.output}\`\`\`\n`).join('\n'));
console.log(results.map(r=>`${r.status} ${r.name}`).join('\n'));if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
