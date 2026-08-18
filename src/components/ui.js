import { escapeHtml } from "../lib/utils.js";
export const Button=(label,attrs="")=>`<button class="btn" ${attrs}>${escapeHtml(label)}</button>`;
export const Tag=(label,type="blue")=>`<span class="tag ${escapeHtml(type)}">${escapeHtml(label)}</span>`;
export const Header=(eyebrow,title,desc,mode="")=>`<div class="content-header"><div><p class="content-eyebrow">${escapeHtml(eyebrow)}</p><h1 class="content-title">${escapeHtml(title)}</h1><p class="content-desc">${escapeHtml(desc)}</p></div>${mode?`<span class="content-mode">${escapeHtml(mode)}</span>`:""}</div>`;
