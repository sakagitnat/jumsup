export const defaultReading=[{
 id:"reading-parallel-1",title:"Cooling Corners Bring Relief to City Residents",category:"News report",minutes:12,itemCount:5,creator:"Jumsup Official",visibility:"private",
 text:"On unusually hot afternoons, several public libraries in Riverton now remain open until 9 p.m. as neighborhood cooling corners. The program began after health workers noticed that older residents living alone were especially vulnerable during heat waves. Each site provides drinking water, shaded seating, basic health checks, and information about recognizing heat exhaustion. Although the service is free, organizers initially struggled to attract visitors because some residents assumed the spaces were only for medical emergencies. Local volunteers responded by holding board-game evenings and short technology classes at the libraries. Attendance has since more than doubled. City officials say the program will continue through September while researchers compare hospital visits in neighborhoods with and without cooling corners. They caution, however, that the spaces are only one part of a wider response that must also include cooler housing, more trees, and reliable public transport.",
 skills:["main idea","detail","inference","reference","vocabulary in context"],
 questions:[
  {id:"rp1",prompt:"What is the main purpose of the cooling-corner program?",choices:["To replace local hospitals during emergencies","To protect residents during periods of extreme heat","To encourage libraries to charge for evening events","To study how residents use public transportation"],answer:1},
  {id:"rp2",prompt:"Why did organizers introduce games and technology classes?",choices:["To correct a misunderstanding about who could use the spaces","To collect fees for extending library hours","To train volunteers to perform medical examinations","To persuade researchers to continue the study"],answer:0},
  {id:"rp3",prompt:"The word “vulnerable” is closest in meaning to _____.",choices:["likely to be harmed","willing to volunteer","difficult to contact","ready to travel"],answer:0},
  {id:"rp4",prompt:"What can be inferred about city officials' view of the program?",choices:["They consider it useful but insufficient by itself.","They believe it should operate only in hospitals.","They expect it to remove the need for greener housing.","They plan to replace it with online services."],answer:0},
  {id:"rp5",prompt:"What does “the spaces” refer to in the final sentence?",choices:["Public transport vehicles","Neighborhood houses","Cooling corners","Hospital wards"],answer:2}
 ]
}];

export const defaultListening=[{
 id:"listening-parallel-1",title:"Preparing for the Student Innovation Fair",type:"Long conversation",situation:"A student discusses a project with a school adviser",accent:"en-GB",minutes:8,itemCount:4,creator:"Jumsup Official",visibility:"private",
 script:"Student: Ms Carter, our team has finished the model for the innovation fair, but we are worried about the presentation. Adviser: What seems to be the problem? Student: The demonstration takes seven minutes, while the rules allow only five. Adviser: Then show the most important stage live and use photographs for the earlier steps. Student: That would save time. Do all four team members need to speak? Adviser: Not necessarily, but everyone must be ready to answer the judges' questions. Student: I see. We also planned to hand out printed instructions. Adviser: Upload them using the QR code on your display instead. It will reduce waste and let visitors read them later. Student: Great. We'll revise the plan this afternoon.",
 questions:[
  {id:"lp1",prompt:"What is the team's main problem?",choices:["Their model does not work.","Their demonstration is too long.","They have lost their photographs.","One member cannot attend the fair."],answer:1},
  {id:"lp2",prompt:"What does the adviser suggest doing?",choices:["Removing the demonstration completely","Asking the judges for extra time","Showing one stage live and the rest in pictures","Letting only one student attend"],answer:2},
  {id:"lp3",prompt:"What is required of every team member?",choices:["Giving an equal-length speech","Printing a copy of the instructions","Answering possible questions from judges","Building a separate model"],answer:2},
  {id:"lp4",prompt:"Why should the team use a QR code?",choices:["To make the model operate automatically","To reduce paper use and keep information accessible","To record the judges' comments","To shorten the fair itself"],answer:1}
 ]
}];

export const defaultWriting=[
 {id:"writing-parallel-1",title:"A Library of Things",type:"Text Completion",minutes:10,itemCount:5,creator:"Jumsup Official",visibility:"private",
  passage:"In several towns, residents can now borrow tools, camping equipment, and kitchen appliances from a “library of things.” The idea has become popular because many household objects (1) _____ only a few times each year. By sharing them, families can save money while (2) _____ the amount of waste sent to landfills. Members usually reserve an item online before collecting it. (3) _____ an object is returned damaged, the library first checks whether ordinary wear caused the problem. This policy encourages responsible use without making members afraid to borrow. Supporters argue that the service is not merely economical; it also helps neighbors (4) _____ trust through sharing. As more towns adopt the model, careful maintenance will remain essential (5) _____ the collections are to remain useful over time.",
  questions:[
   {id:"wp1",prompt:"Choose the best answer for blank (1).",choices:["use","used","are used","are using"],answer:2},
   {id:"wp2",prompt:"Choose the best answer for blank (2).",choices:["reduce","reduced","reducing","to reducing"],answer:2},
   {id:"wp3",prompt:"Choose the best answer for blank (3).",choices:["Unless","If","Despite","Whereas"],answer:1},
   {id:"wp4",prompt:"Choose the best answer for blank (4).",choices:["build","building","built","to building"],answer:0},
   {id:"wp5",prompt:"Choose the best answer for blank (5).",choices:["unless","although","if","because of"],answer:2}
  ]
 },
 {id:"writing-parallel-2",title:"How a Repair Café Works",type:"Paragraph Organization",minutes:6,itemCount:1,creator:"Jumsup Official",visibility:"private",
  directions:"Choose the best answer to rearrange the statements into a logical paragraph.",
  statements:["Visitors first explain the problem to a volunteer, who helps them choose the correct worktable.","Repair cafés give people a practical alternative to throwing away broken household items.","By the end of the session, participants often leave with both a working object and a new skill.","At the table, experienced repairers guide the owners instead of simply doing all the work for them."],
  questions:[{id:"wo1",prompt:"Which order creates the most logical paragraph?",choices:["B-A-D-C","B-D-A-C","A-B-C-D","A-D-B-C"],answer:0}]
 }
];

export const defaultMocks=[{
 id:"mock-parallel-1",title:"Jumsup Parallel Mock Preview #1",visibility:"private",creator:"Jumsup Official",questions:80,minutes:90,itemCount:80,
 sections:[
  {title:"Listening and Speaking Skills",description:"Items 1-20 · Short and long conversations",context:"Situation: Two students are arranging a community survey.",questions:[
   {id:"mock-1",number:1,prompt:"Nina: Have you finished writing the survey questions? Pat: Almost. _____.",choices:["I still need to check whether they are clear","The bus arrived ten minutes ago","Our teacher never reads books","The results were published last year"],answer:0},
   {id:"mock-2",number:2,prompt:"Nina: Shall we test them with another class first? Pat: _____. That could reveal confusing questions.",choices:["I doubt it","Good thinking","Never mind","Not at all"],answer:1}
  ]},
  {title:"Reading Skill",description:"Items 21-60 · Advertisements, reviews, news, visuals and articles",context:"A neighborhood app allows residents to report broken streetlights. Reports are displayed on a public map, and users receive a message when a repair team has inspected the location. The council warns that emergencies should still be reported by telephone.",questions:[
   {id:"mock-21",number:21,prompt:"What is the app mainly designed to do?",choices:["Replace all emergency telephone services","Help residents track reports about streetlights","Allow repair teams to sell equipment","Show residents how to repair lights themselves"],answer:1},
   {id:"mock-22",number:22,prompt:"Which situation should NOT be reported only through the app?",choices:["A light that has been dim for a week","A lamp with a faded identification number","A dangerous electrical emergency","A streetlight inspected yesterday"],answer:2}
  ]},
  {title:"Writing Skill",description:"Items 61-80 · Text completion and paragraph organization",context:"A school garden can provide more than fresh vegetables. When students take responsibility for planting and watering, they learn how small decisions (61) _____ the health of a shared environment. The work also requires patience, (62) _____ results do not appear immediately.",questions:[
   {id:"mock-61",number:61,prompt:"Choose the best answer for blank (61).",choices:["affect","affects","affected","are affecting"],answer:0},
   {id:"mock-62",number:62,prompt:"Choose the best answer for blank (62).",choices:["unless","because","despite","otherwise"],answer:1}
  ]}
 ]
}];

// Original parallel items used to make the bundled mock fully testable at 80 items.
// They mirror only the skill balance of the exam format; no source wording is reused.
const listeningMockItems=[
 ["A: I forgot to reserve a study room. B: _____. The library still has outdoor tables.",["We can work there instead","The book was expensive","I never study biology","It closed last year"],0,"The response offers a relevant alternative."],
 ["A: Would you mind checking my introduction? B: _____. Send it to me tonight.",["Not at all","I have no introduction","That is impossible to read","You should cancel it"],0,"Not at all politely accepts the request."],
 ["A: The train has been delayed for forty minutes. B: _____. Our appointment starts soon.",["That is worrying","What a beautiful station","The ticket was free","I prefer walking yesterday"],0,"The reply matches concern about being late."],
 ["A: I heard you won the science competition. B: _____. Our whole team worked hard.",["Thanks, we were delighted","Never mind the weather","I doubt the rules","Please return it"],0,"The speaker appropriately accepts congratulations."],
 ["A: Could you explain why this answer is wrong? B: _____. Look at the verb after the blank.",["Certainly","No one asked","It does not matter","I have already left"],0,"Certainly agrees to explain."],
 ["A: Shall we print fifty copies of the poster? B: _____. Most visitors can scan the QR code.",["That may be unnecessary","The printer is blue","I counted the chairs","The poster won yesterday"],0,"The second sentence explains why fewer copies are needed."],
 ["A: I am sorry I interrupted your presentation. B: _____. We still finished on time.",["Do not worry about it","You must interrupt again","The audience has vanished","I never presented"],0,"The response reassures the apologizing speaker."],
 ["A: Do you think Maya will lead the workshop? B: _____. She has the most experience.",["She is the obvious choice","She missed the bus","The room is upstairs","Workshops are printed"],0,"Experience supports choosing Maya."],
 ["A: The instructions say the form is due Friday. B: _____. I thought it was due Monday.",["Thanks for pointing that out","I mailed it last year","Friday is a color","Forms are never useful"],0,"The speaker acknowledges corrected information."],
 ["A: May I borrow your charger for a moment? B: _____. I am not using it.",["Go ahead","Keep waiting forever","It has no battery yesterday","You may not ask"],0,"Go ahead grants permission."],
 ["A: This café is much quieter than the one near campus. B: _____. We can actually discuss the project here.",["Exactly","I cannot hear the menu","Coffee grows quickly","The campus moved"],0,"Exactly agrees with the observation."],
 ["A: I cannot attend the rehearsal this afternoon. B: _____. Can you join us online instead?",["That is a shame","The music is green","I attended tomorrow","Please erase the stage"],0,"The response shows disappointment and proposes an alternative."],
 ["A: How was your interview? B: _____. The manager asked thoughtful questions.",["Better than I expected","It has not been built","I lost the restaurant","Questions are silent"],0,"The follow-up supports a positive evaluation."],
 ["A: You look exhausted. B: _____. I stayed up finishing the report.",["I did not get much sleep","This chair is new","Reports are delicious","I will wake yesterday"],0,"Lack of sleep explains exhaustion."],
 ["A: Should we invite a local engineer to speak? B: _____. Students could ask about real projects.",["That is worth considering","Engineers never speak","The invitation is square","We have no students"],0,"The benefit makes the proposal worth considering."],
 ["A: I accidentally deleted our shared notes. B: _____. The app keeps earlier versions.",["We may be able to restore them","Delete them once more","Notes cannot contain words","The app is a notebook"],0,"Version history offers a solution."],
 ["A: The museum tour is fully booked. B: _____. There is another tour on Saturday.",["Let us try that one","Museums are always empty","Saturday was canceled last month","I booked the weather"],0,"The reply selects the available alternative."],
 ["A: Would it be possible to submit the file tomorrow morning? B: _____. The final deadline is noon.",["Yes, provided it arrives before then","Tomorrow has already ended","Files do not need names","Morning is too bright"],0,"The response grants a conditional extension."]
].map((x,i)=>({id:`mock-${i+3}`,number:i+3,prompt:x[0],choices:x[1],answer:x[2],explanation:x[3]}));

const readingCards=[
 {text:"A town replaced several grass lawns with native wildflowers. Maintenance costs fell because the new plants needed less water, while insect surveys recorded more bee species.",main:"Native planting can reduce upkeep while supporting biodiversity.",detail:"The wildflowers needed less water.",infer:"The former lawns probably required more maintenance.",word:"upkeep",meaning:"maintenance"},
 {text:"A small cinema introduced quiet screenings with lower sound and dimmed rather than dark lights. Attendance grew among families whose children had previously found ordinary screenings overwhelming.",main:"Adjusted screenings made the cinema accessible to more families.",detail:"The lights remained dim instead of fully dark.",infer:"Some viewers are sensitive to typical cinema conditions.",word:"overwhelming",meaning:"difficult to cope with"},
 {text:"Researchers asked commuters to try an express bus for one month. Many arrived faster, but ridership dropped on rainy days because the stops offered little shelter.",main:"The service was fast but its stops reduced reliability for passengers.",detail:"Ridership declined when it rained.",infer:"Covered stops could encourage more consistent use.",word:"ridership",meaning:"the number of passengers"},
 {text:"A bakery sells yesterday's bread at a discount through a food-rescue app. Customers collect orders shortly before closing, allowing the shop to reduce waste without interrupting regular sales.",main:"A timed discount system helps the bakery prevent food waste.",detail:"Collection happens near closing time.",infer:"The bakery wants to protect normal daytime sales.",word:"interrupting",meaning:"disrupting"},
 {text:"Students testing two note-taking methods remembered more concepts when they summarized ideas in their own words than when they copied every sentence. However, exact copying remained useful for formulas.",main:"The best note-taking method depends partly on the type of information.",detail:"Summaries improved memory for concepts.",infer:"No single note-taking method is ideal for every task.",word:"summarized",meaning:"expressed the main points briefly"},
 {text:"An apartment building created a shared shelf for tools. Residents borrowed drills and ladders frequently, but the project succeeded only after labels explained where each item should be returned.",main:"Clear organization helped a tool-sharing project work.",detail:"Labels showed where tools belonged.",infer:"The shelf was initially difficult to manage.",word:"frequently",meaning:"often"},
 {text:"A coastal school moved sports practice to early morning during the hottest months. Students reported feeling more comfortable, although buses had to begin their routes thirty minutes earlier.",main:"Changing practice time improved comfort but required transport adjustments.",detail:"Bus routes started earlier.",infer:"The school accepted a logistical cost for student safety.",word:"adjustments",meaning:"changes"},
 {text:"A podcast publishes complete transcripts beside each episode. Language learners use them to check unfamiliar phrases, while listeners with hearing loss say the text makes the program accessible.",main:"Transcripts make audio content useful to a wider audience.",detail:"Learners check unfamiliar phrases in the text.",infer:"Accessibility features can benefit several groups.",word:"accessible",meaning:"easy for people to use or understand"},
 {text:"A market asked shoppers to borrow reusable containers by paying a small deposit. Most containers were returned, but some customers forgot because return points were not clearly marked.",main:"The container scheme worked fairly well but needed clearer return information.",detail:"Customers paid a small deposit.",infer:"Better signs could improve the return rate.",word:"deposit",meaning:"money held until an item is returned"},
 {text:"A company tested four-day workweeks without reducing weekly goals. Teams held fewer meetings and completed similar amounts of work, but customer support required overlapping schedules.",main:"A shorter week was possible when teams changed how they organized work.",detail:"Teams reduced the number of meetings.",infer:"Some departments cannot all take the same day off.",word:"overlapping",meaning:"partly occurring at the same time"}
];
const readingMockItems=readingCards.flatMap((card,ci)=>{
 const items=[
  {prompt:`Read: “${card.text}” What is the main idea?`,choices:[card.main,"The project failed completely.","Cost was the only concern.","The passage recommends ending the program."],answer:0,explanation:"The first choice combines the central outcome and qualification."},
  {prompt:`According to the passage above, which statement is TRUE?`,choices:[card.detail,"The project had no users.","No changes were required.","The organizers immediately ended it."],answer:0,explanation:"This detail is stated directly in the passage."},
  {prompt:`What can be inferred from the passage?`,choices:[card.infer,"The organizers ignored all feedback.","The service was legally required.","Every participant had the same opinion."],answer:0,explanation:"The inference follows from the problem and response described."},
  {prompt:`The word “${card.word}” is closest in meaning to _____.`,choices:[card.meaning,"a formal complaint","an unexpected payment","a distant location"],answer:0,explanation:`In this context, ${card.word} means ${card.meaning}.`}
 ];
 return items.slice(0,ci<8?4:3).map(q=>({...q}));
}).map((q,i)=>({...q,id:`mock-${i+23}`,number:i+23}));

const writingRaw=[
 ["By the time the volunteers arrived, the organizers _____ all the tables.",["had arranged","arrange","will arrange","are arranging"],0,"Past perfect marks the earlier past action."],
 ["The new signs were installed _____ visitors could find the entrance more easily.",["so that","despite","unless","whereas"],0,"So that introduces purpose."],
 ["Neither the teacher nor the students _____ satisfied with the original schedule.",["were","was","be","has"],0,"The verb agrees with the nearer plural subject."],
 ["The device is inexpensive, easy to repair, and _____ efficient.",["remarkably","remarkable","remark","remarked"],0,"An adverb modifies the adjective efficient."],
 ["If the city had added more shelters, commuters _____ the bus on rainy days.",["might have used","will use","had used","use"],0,"This is a third conditional result."],
 ["The article, _____ was published yesterday, summarizes the survey results.",["which","who","where","what"],0,"Which introduces a non-defining clause about a thing."],
 ["Residents were asked to avoid _____ water while repairs were under way.",["wasting","waste","to wasting","wasted"],0,"Avoid is followed by a gerund."],
 ["_____ the limited budget, the team completed the project on time.",["Despite","Because","Since","In addition"],0,"Despite is followed by a noun phrase and signals contrast."],
 ["The manager recommended that every application _____ before Friday.",["be reviewed","is reviewed","was reviewing","reviewed"],0,"The mandative subjunctive uses be plus past participle."],
 ["The more carefully users label their files, the _____ they can retrieve them.",["more quickly","quickest","quick","most quickly"],0,"The correlative comparative requires more quickly."],
 ["Only after the test ended _____ the researchers notice the faulty sensor.",["did","do","had","were"],0,"Initial Only after triggers subject-auxiliary inversion."],
 ["The workshop attracted twice _____ participants as the organizers expected.",["as many","more","most","much"],0,"Count nouns use twice as many ... as."],
 ["The policy aims to make public transport both affordable _____ reliable.",["and","but","or","so"],0,"Both pairs with and."],
 ["Having _____ the instructions, Mina assembled the shelf without assistance.",["read","reads","reading","to read"],0,"The perfect participial idea uses having plus past participle."],
 ["There is little evidence _____ the change harmed local businesses.",["that","what","where","whose"],0,"That introduces the content clause after evidence."],
 ["A. Finally, the seedlings are moved outdoors. B. First, seeds are placed in damp soil. C. Next, the trays are kept near a sunny window. D. After several leaves appear, the plants are gradually exposed to cooler air. Choose the logical order.",["B-C-D-A","B-D-C-A","C-B-A-D","D-B-C-A"],0,"The chronological markers establish B-C-D-A."],
 ["A. This feedback helps the team revise its design. B. Product testing begins with a working prototype. C. The improved version is then tested again. D. Users try the prototype and report difficulties. Choose the logical order.",["B-D-A-C","B-A-D-C","D-B-C-A","A-C-B-D"],0,"The prototype precedes user feedback, revision, and retesting."],
 ["A. As a result, less edible food reaches landfills. B. Volunteers collect unsold items from shops. C. Food-rescue groups reduce waste through a simple process. D. The items are sorted and delivered to community kitchens. Choose the logical order.",["C-B-D-A","C-D-B-A","B-C-A-D","D-B-C-A"],0,"The topic sentence is followed by collection, delivery, and result."]
].map((x,i)=>({id:`mock-${i+63}`,number:i+63,prompt:x[0],choices:x[1],answer:x[2],explanation:x[3]}));

defaultMocks[0].sections[0].questions.push(...listeningMockItems);
defaultMocks[0].sections[1].questions.push(...readingMockItems);
defaultMocks[0].sections[2].questions.push(...writingRaw);

// Full-length skill sets. These reuse Jumsup's original parallel questions and
// expose them by A-Level subsection so every practice screen can be tested end to end.
const fullListeningQuestions=defaultMocks[0].sections[0].questions.map(q=>({...q}));
const fullReadingQuestions=defaultMocks[0].sections[1].questions.map(q=>({...q}));
const fullWritingCompletion=defaultMocks[0].sections[2].questions.slice(0,15).map(q=>({...q}));
const organizationQuestions=[
 {id:"full-w-76",prompt:"A. The library first collected clean jars from residents. B. Finally, visitors filled the jars with donated seeds. C. A community seed shelf began with a simple collection drive. D. Volunteers then sorted and labelled each variety. Choose the logical order.",choices:["C-A-D-B","A-C-B-D","C-D-A-B","D-A-C-B"],answer:0,explanation:"The topic sentence is followed by collection, sorting, and the final use."},
 {id:"full-w-77",prompt:"A. The results showed which corners were difficult to navigate. B. Students designed a map to improve wheelchair access at school. C. They presented the revised map to the principal. D. First, they invited wheelchair users to test the proposed routes. Choose the logical order.",choices:["B-D-A-C","D-B-C-A","B-A-D-C","A-B-D-C"],answer:0,explanation:"The design is introduced, tested, evaluated, and then presented."},
 {id:"full-w-78",prompt:"A. After a week, the class compared plant growth in both containers. B. One container was placed beside a window, while the other stayed in a cupboard. C. The experiment examined how light affects young plants. D. Each container received the same amount of water. Choose the logical order.",choices:["C-B-D-A","B-C-A-D","C-D-A-B","D-B-C-A"],answer:0,explanation:"The aim comes first, followed by conditions, control, and observation."},
 {id:"full-w-79",prompt:"A. This information helped residents choose quieter travel times. B. The council installed sensors beside three busy roads. C. A public dashboard displayed the hourly measurements. D. The sensors recorded noise throughout the day. Choose the logical order.",choices:["B-D-C-A","D-B-A-C","B-C-D-A","C-A-B-D"],answer:0,explanation:"Installation precedes recording, publication, and the resulting benefit."},
 {id:"full-w-80",prompt:"A. Participants then practised the technique in pairs. B. The trainer demonstrated how to give clear emergency instructions. C. By the end, each pair could complete the task without notes. D. The workshop opened with a short explanation of the procedure. Choose the logical order.",choices:["D-B-A-C","B-D-C-A","D-A-B-C","A-D-B-C"],answer:0,explanation:"Explanation leads to demonstration, practice, and independent performance."}
];

defaultListening.unshift({
 id:"listening-alevel-full-1",title:"A-Level Parallel Listening - Full Set 1",type:"Full section",situation:"20 original items: short and long conversations",accent:"en-GB",minutes:25,itemCount:20,creator:"Jumsup Official",visibility:"private",
 sections:[
  {title:"Short Conversations",description:"Items 1-12",situation:"Listen to each short exchange and choose the best response.",script:fullListeningQuestions.slice(0,12).map(q=>q.prompt).join(" Next conversation. "),questions:fullListeningQuestions.slice(0,12)},
  {title:"Long Conversation",description:"Items 13-20",situation:"Listen for purpose, detail, attitude, and inference.",script:fullListeningQuestions.slice(12).map(q=>q.prompt).join(" Next part. "),questions:fullListeningQuestions.slice(12)}
 ]
});

const readingParts=[
 ["Advertisements","Items 21-26",0,6],
 ["Product / Service Review","Items 27-32",6,12],
 ["News Report","Items 33-38",12,18],
 ["Visuals and Public Information","Items 39-44",18,24],
 ["General Articles","Items 45-60",24,40]
];
defaultReading.unshift({
 id:"reading-alevel-full-1",title:"A-Level Parallel Reading - Full Set 1",category:"Full section",minutes:45,itemCount:40,creator:"Jumsup Official",visibility:"private",skills:["main idea","detail","inference","purpose","reference","vocabulary in context"],
 sections:readingParts.map(([title,description,start,end],i)=>({title,description,text:i===0?defaultMocks[0].sections[1].context:"Each item below uses an original mini-passage, notice, review, report, or data description written for this practice set.",questions:fullReadingQuestions.slice(start,end)}))
});

defaultWriting.unshift({
 id:"writing-alevel-full-1",title:"A-Level Parallel Writing - Full Set 1",type:"Full section",minutes:25,itemCount:20,creator:"Jumsup Official",visibility:"private",
 sections:[
  {title:"Text Completion I",directions:"Items 61-65: choose the best form or connector for each context.",passage:"Read each original sentence as part of a connected academic and everyday context.",questions:fullWritingCompletion.slice(0,5)},
  {title:"Text Completion II",directions:"Items 66-70: choose the grammatically and logically best answer.",passage:"Pay attention to tense, agreement, clauses, word form, and purpose.",questions:fullWritingCompletion.slice(5,10)},
  {title:"Text Completion III",directions:"Items 71-75: complete each original context.",passage:"Use both sentence grammar and the meaning of the whole statement.",questions:fullWritingCompletion.slice(10,15)},
  {title:"Paragraph Organization",directions:"Items 76-80: arrange the statements into a logical paragraph.",passage:"Identify the topic sentence, sequence markers, references, and concluding result.",questions:organizationQuestions}
 ]
});
