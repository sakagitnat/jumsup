import { escapeHtml } from "../lib/utils.js";
export function modal(title,body,actions=""){return `<div class="modal-backdrop" data-action="close-modal"><div class="modal-card" data-modal-card><div class="modal-head"><h2>${escapeHtml(title)}</h2><button class="modal-close" data-action="close-modal">×</button></div>${body}<div class="modal-actions">${actions}</div></div></div>`}
