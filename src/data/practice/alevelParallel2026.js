// Fresh Jumsup-authored A-Level parallel suite. No exam wording is copied.
const Q=(id,prompt,choices,answer=0,explanation="")=>{
 const correct=choices[answer],offset=[1,3,2,0][[...id].reduce((n,c)=>n+c.charCodeAt(0),0)%4];
 const shuffled=choices.map((_,i)=>choices[(i+offset)%choices.length]);
 return {id,prompt,choices:shuffled,answer:shuffled.indexOf(correct),explanation};
};
const wrong=["A detail not stated in the passage","The opposite of the stated information","An unrelated idea"];

const conversations=[
 ["Project display","Two students are preparing a school exhibition.","Mina: Has the office confirmed our room? Leo: Not yet. They asked me to return after lunch. Mina: I will finish the signs while you are there. Leo: Please also check whether we need extension cords.",["Why is the room not confirmed?|The office asked Leo to return later","What will Mina finish?|The signs","What should Mina also check?|Whether extension cords are needed","What are the speakers doing?|Sharing preparation tasks"]],
 ["Bicycle repair","At a repair shop before work.","Customer: My rear brake makes a sharp noise when the road is wet. Mechanic: The pads may be worn. I can replace them in forty minutes. Customer: That is fine. I will take the bus this morning.",["What problem is reported?|A noisy rear brake","When is it most noticeable?|When the road is wet","What may be worn?|The brake pads","What will the customer do?|Take the bus"]],
 ["Presentation feedback","A lecturer comments after a presentation.","Lecturer: Your evidence was strong, but the final chart was difficult to read. Student: Was the text too small? Lecturer: Yes, and the colors were too similar. Please revise it and include the source below it.",["What does the lecturer praise?|The evidence","What was difficult to read?|The final chart","What two visual problems are mentioned?|Small text and similar colors","What must be added?|The source"]]
];
const parsedConversations=conversations.map(c=>c[3].map(x=>x.split("|")));
const shortSections=conversations.map((c,si)=>({id:`short-${si+1}`,part:"short_conversation",title:c[0],situation:c[1],script:c[2],questions:parsedConversations[si].map(([p,a],i)=>{const related=[parsedConversations[(si+1)%3][i][1],parsedConversations[(si+2)%3][i][1],parsedConversations[si][(i+1)%4][1]];return Q(`l${si*4+i+1}`,p,[a,...related],0,`The conversation directly states “${a}”.`)})}));
const longItems=[["What confused some visitors?","The route from the bus stop"],["Where should the information desk move?","Nearer the gate"],["What will the city provide?","Sorting bins"],["How many bins will be requested?","Twelve"],["What concerned shop owners?","The loud stage"],["How will the noise issue be addressed?","Turn the speakers and finish by eight"],["What will the volunteer update?","The event notice"],["What happens on Thursday?","The changes will be reviewed"]];
const longSection={id:"long-1",part:"long_conversation",title:"Improving an evening market",situation:"A coordinator reviews a trial market with a volunteer.",script:"Coordinator: Last Saturday attracted more visitors than expected, but the entrance confused people arriving from the bus stop. Volunteer: We could place a map beside the stop and move the information desk nearer the gate. Coordinator: Good. Some stalls also ran out of recycling bags. Volunteer: The city lends sorting bins to community events for free. I can request twelve and ask whether the city collects them afterward. Coordinator: Please do. Shop owners also said the stage was too loud. We will face the speakers toward the courtyard and finish performances by eight. Volunteer: I will update the event notice. Coordinator: Let us review every change on Thursday before contacting stall owners.",questions:longItems.map(([p,a],i)=>Q(`l${i+13}`,p,[a,longItems[(i+2)%8][1],longItems[(i+4)%8][1],longItems[(i+6)%8][1]],0,`The conversation directly states “${a}”.`))};
export const defaultListening=[{id:"jumsup-alevel-listening-1",title:"A-Level Listening คู่ขนาน · ชุดทางการ 1",type:"Full section",minutes:25,itemCount:20,creator:"Jumsup Official",visibility:"public",official:true,sections:[...shortSections,longSection]}];

const readingSpecs=[
 ["Tool lockers","Notice","Residents can borrow repair tools from secure lockers beside the district library. Membership is free after a safety orientation. Items may be reserved through the council app for two days. Late returns suspend borrowing temporarily, while damaged equipment must be reported.",["provide shared repair tools","complete a safety orientation","the council app","two days","temporary suspension","report damaged tools","district library","responsible shared use"]],
 ["A quieter lunchroom","News report","Northfield School created a quiet lunch zone after students described the main cafeteria as overwhelming. The area has softer lighting, fewer tables, and no amplified music. Students may choose either area. After six weeks, fewer students left lunch early, but staff want a longer trial.",["reduce sensory pressure","student feedback","softer lighting","free choice of area","six weeks","fewer early departures","a longer trial","a cautious positive result"]],
 ["Review: FoldCup","Product review","The FoldCup collapses to half its height and fits in a small bag. Its lid did not leak during a week of commuting. However, its narrow base is unstable on uneven tables, and hot drinks leave a mild taste unless the cup is washed immediately.",["save space","half its height","a secure lid","an unstable base","wash it immediately","commuters","balanced","space is the main strength"]],
 ["Trees after sunset","Research summary","Students measured evening temperatures on twelve streets with different tree cover. Continuously shaded streets cooled faster after sunset. The team did not claim trees were the only cause because building height and traffic varied. It recommends repeating the study across seasons.",["study shade and cooling","twelve streets","after sunset","continuous shade","building height and traffic","avoid a single-cause claim","repeat across seasons","limited but useful evidence"]],
 ["Learning to repair","General article","Community repair workshops are popular not only because products are expensive. Participants want to understand everyday objects. Volunteers guide owners through diagnosis and repair rather than taking over. Even when an item cannot be fixed, owners learn why it failed and how to buy more wisely next time.",["explain repair workshops","understand objects","volunteers guide owners","diagnosis and repair","learning after failure","better future purchases","skills as well as cost","an educational community service"]]
];
const prompts=["What is the main purpose of the passage?","Which circumstance is explicitly mentioned?","Which detail is correct according to the passage?","Which feature or condition is described?","Which result or limitation is stated?","Who or what is associated with the passage?","Which statement is supported by the passage?","Which statement best summarizes the passage?"];
const readingSections=readingSpecs.map((s,si)=>({id:`reading-${si+1}`,part:s[1].toLowerCase().replaceAll(" ","_"),title:s[0],category:s[1],text:s[2],questions:prompts.map((p,i)=>{
 const correct=s[3][i],related=[1,2,3].map(step=>readingSpecs[(si+step)%readingSpecs.length][3][i]);
 return Q(`r${si*8+i+1}`,p,[correct,...related],0,`The wording of the passage directly supports “${correct}”.`);
})}));
export const defaultReading=[{id:"jumsup-alevel-reading-1",title:"A-Level Reading คู่ขนาน · ชุดทางการ 1",category:"Full section",minutes:40,itemCount:40,creator:"Jumsup Official",visibility:"public",official:true,sections:readingSections}];

const completion=(id,title,passage,answers)=>({id,part:"text_completion",title,directions:"Choose the best answer for each blank.",passage,questions:answers.map((a,i)=>Q(`${id}-${i+1}`,`Choose the best answer for blank (${a[0]}).`,a[1],a[2]))});
const writingSections=[
 completion("wA","A mobile science cabinet","A school has converted an old cart into a mobile science cabinet. The cart (1) _____ between classrooms. Clear labels prevent fragile items from (2) _____. Teachers once bought duplicates (3) _____ supplies were hard to find. The idea is inexpensive; (4) _____, it needs careful scheduling. With a shared calendar, it (5) _____ useful for years.",[[1,["moves","is moved","moving","has move"],1],[2,["damage","damaged","being damaged","to damage"],2],[3,["because","although","unless","despite"],0],[4,["however","therefore","for example","similarly"],0],[5,["remains","remained","will remain","has remain"],2]]),
 completion("wB","Night buses for hospital staff","A city added night buses after workers (6) _____ difficulty traveling home. Buses leave every thirty minutes. Use was low (7) _____ hospitals shared the timetable. Since then, passenger numbers have risen (8) _____. Officials are deciding (9) _____ buses should run on holidays. A decision follows when the trial (10) _____.",[[6,["experience","experienced","will experience","experiencing"],1],[7,["until","because","whereas","despite"],0],[8,["steady","steadily","steadiness","more steady"],1],[9,["whether","what","whose","which"],0],[10,["ends","will end","ending","has end"],0]]),
 completion("wC","A formal-clothing library","Donated clothes are checked before they (11) _____ online. Students may reserve two items if everything (12) _____ within seven days. Items are photographed (13) _____ users can judge their condition. The group needs a larger room in (14) _____ to store donations. Without volunteers, it (15) _____ open daily next term.",[[11,["list","listed","are listed","are listing"],2],[12,["returns","is returned","returned","returning"],1],[13,["so that","even though","unless","despite"],0],[14,["order","case","addition","contrast"],0],[15,["may be unable to","must","had","has"],0]])
];
const org=[
 ["A. Data appear on a public dashboard. B. A library installs an air sensor. C. Residents compare conditions. D. The sensor records every ten minutes.","B-D-A-C"],
 ["A. Volunteers test each lamp. B. Repaired lamps go to study centers. C. A project collects unwanted lamps. D. Unsafe lamps go for recycling.","C-A-D-B"],
 ["A. Comments reveal unclear instructions. B. A team drafts a museum map. C. The revised map is printed. D. Visitors test the draft.","B-D-A-C"],
 ["A. Rooted cuttings move into soil. B. Healthy stems are cut. C. One plant produces several new ones. D. Stems are placed in water.","C-B-D-A"],
 ["A. Responses are grouped. B. A council publishes a survey. C. Engineers prepare options. D. Residents compare the options.","B-A-C-D"]
];
writingSections.push({id:"wO",part:"paragraph_organization",title:"Paragraph Organization",directions:"Arrange the statements into a logical paragraph.",passage:"Use topic sentences, references, sequence and conclusions.",questions:org.map((x,i)=>Q(`w${16+i}`,`${x[0]} Choose the logical order.`,[x[1],"A-B-D-C","D-C-B-A","C-D-A-B"]))});
export const defaultWriting=[{id:"jumsup-alevel-writing-1",title:"A-Level Writing คู่ขนาน · ชุดทางการ 1",type:"Full section",minutes:25,itemCount:20,creator:"Jumsup Official",visibility:"public",official:true,sections:writingSections}];

const numbered=(items,start)=>items.map((x,i)=>({...x,number:start+i}));
const responseSpecs=[
 ["Could you send me the revised schedule?","Certainly. I will email it this afternoon."],
 ["How often does the shuttle leave?","Every thirty minutes."],
 ["Would you mind lowering the volume?","Not at all. Sorry about that."],
 ["Why was the workshop postponed?","The instructor was ill."],
 ["Where can I return this equipment?","At the service desk downstairs."],
 ["What did you think of the exhibition?","The final section was especially impressive."],
 ["May I use your charger for a moment?","Of course. It is beside my laptop."],
 ["How long have you lived in this area?","For nearly three years."],
 ["Which route is faster during rush hour?","The train is usually faster."],
 ["When should we submit the consent form?","By noon on Friday."]
];
const responseQuestions=responseSpecs.map((x,i)=>Q(`tgat-s${i+1}`,x[0],[x[1],"Yes, I have seen it before.","It belongs to the main office.","The weather was unusually warm."],0,`The response directly answers the question: ${x[1]}`));
const tgatCompletion=writingSections.slice(0,3).flatMap(section=>section.questions);
const tgatReading=readingSections.flatMap(section=>section.questions).slice(0,15);
export const defaultMocks=[{id:"jumsup-alevel-mock-1",title:"A-Level 82 English Mock คู่ขนาน · ชุดทางการ 1",visibility:"public",creator:"Jumsup Official",official:true,questions:80,itemCount:80,minutes:90,sections:[
 {title:"Listening and Speaking Skills",type:"listening",description:"Items 1-20",questions:numbered([...shortSections.flatMap(s=>s.questions),...longSection.questions],1)},
 {title:"Reading Skill",type:"reading",description:"Items 21-60",questions:numbered(readingSections.flatMap(s=>s.questions),21)},
 {title:"Writing Skill",type:"writing",description:"Items 61-80",questions:numbered(writingSections.flatMap(s=>s.questions),61)}
] },{id:"jumsup-tgat1-mock-1",title:"TGAT1 English Communication Mock คู่ขนาน · ชุดทางการ 1",visibility:"public",creator:"Jumsup Official",official:true,questions:60,itemCount:60,minutes:60,sections:[
 {title:"Speaking Skill",type:"listening",description:"Question-response, short and long conversations · Items 1-30",questions:numbered([...responseQuestions,...shortSections.flatMap(s=>s.questions),...longSection.questions],1)},
 {title:"Reading Skill",type:"reading",description:"Text completion and reading comprehension · Items 31-60",questions:numbered([...tgatCompletion,...tgatReading],31)}
] }];

