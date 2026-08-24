function enhanceCommunityModeration(){
 const heading=[...document.querySelectorAll("h2")].find(x=>x.textContent.trim()==="รายงาน Community");
 const panel=heading?.closest("section");if(!panel)return;
 for(const article of panel.querySelectorAll("article")){
  if(article.querySelector("[data-community-remove]"))continue;
  const source=article.querySelector('[data-action^="report-"]'),id=source?.dataset.id;if(!id)continue;
  const button=document.createElement("button");button.className="muted";button.dataset.communityRemove=id;button.textContent="ซ่อนเนื้อหา";
  button.onclick=async()=>{if(!confirm("ซ่อนเนื้อหานี้ออกจาก Community และปิดรายงาน?"))return;button.disabled=true;try{await window.jumsupAdminApi?.("/api/admin/reports",{method:"POST",body:JSON.stringify({id,status:"removed"})});await window.jumsupAdminReload?.()}catch(error){button.disabled=false;alert(error.message||"ดำเนินการไม่สำเร็จ")}};
  article.lastElementChild?.append(button);
 }
}
new MutationObserver(enhanceCommunityModeration).observe(document.body,{childList:true,subtree:true});
enhanceCommunityModeration();
