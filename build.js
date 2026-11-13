const fs=require('fs'),p=require('path');
const t=fs.readFileSync(p.join(__dirname,'index.src.html'),'utf8');
const out=t.replace('/*SIM*/',()=>fs.readFileSync(p.join(__dirname,'sim.js'),'utf8')).replace('/*CLIENT*/',()=>fs.readFileSync(p.join(__dirname,'client.js'),'utf8'));
fs.mkdirSync(p.join(__dirname,'public'),{recursive:true});
fs.writeFileSync(p.join(__dirname,'public','index.html'),out);
console.log('built',out.length,'bytes');
