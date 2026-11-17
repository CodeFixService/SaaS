// G79: CM → Usuarios → Nueva cuenta (socio) debe pedir contraseña y mostrar el mensaje de acceso. Correr: node pruebas/g79_socio_clave.js
const fs=require('fs');const {chromium}=require('playwright');
const src=fs.readFileSync('/home/user/SaaS/admin/admin.js','utf8');
const f1=fs.readFileSync('/home/user/SaaS/nucleo/seguro.js','utf8')+';const SUPER=true,rpc=async()=>{},confirmar=async()=>true;'+src.slice(src.indexOf('  // G87 C · 🔑 Cuenta creada'),src.indexOf('  // Precios, links'));
(async()=>{const b=await chromium.launch();const p=await b.newPage();
await p.setContent('<body></body>');
const r=await p.evaluate(async(code)=>{let enviado=null,toasts=[];
 const App={clave:()=>'Abc1234de',esc:(s)=>String(s),mensajeAcceso:(d)=>'Correo: '+d.email+'\nContraseña: '+d.password,
  crearCuenta:async(d)=>{enviado=d;if(!d.password||d.password.length<6)throw new Error('La contraseña debe tener al menos 6 caracteres');return{ok:true}}};
 const modal=(h)=>{const d=document.createElement('dialog');d.innerHTML=h;document.body.appendChild(d);d.showModal();return d};
 const toast=(m)=>toasts.push(m),err=(e)=>toast(e.message),usuarios=()=>{},esc=App.esc;
 eval(code+';nueva();');
 const d=document.querySelector('dialog');d.querySelector('#nn').value='Pedro';d.querySelector('#ne').value='p@x.cl';d.querySelector('#nr').value='socio';d.querySelector('#nw').value='9 1234 5678';
 const pre=d.querySelector('#np').value;d.querySelector('#nk').click();await new Promise(r=>setTimeout(r,50));
 const t=[...document.querySelectorAll('dialog[open] textarea')].map(x=>x.value);
 return {pre,enviado,toasts,t};},f1);
console.log(JSON.stringify(r));
const ok=r.pre==='Abc1234de'&&r.enviado.password==='Abc1234de'&&r.enviado.rol==='socio'&&r.t[0].includes('Abc1234de');
console.log(ok?'PRUEBA OK':'PRUEBA FALLA');await b.close();process.exit(ok?0:1)})();
