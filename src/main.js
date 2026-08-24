import "./styles.css";
import { createApp } from "./app/createApp.js";
import { escapeHtml } from "./lib/utils.js";
createApp(document.getElementById("app")).catch(err=>{
 console.error(err);
 document.getElementById("app").innerHTML=`<div style="padding:32px;font-family:system-ui"><h2>Jumsup failed to start</h2><pre>${escapeHtml(String(err?.message||err))}</pre></div>`;
});
