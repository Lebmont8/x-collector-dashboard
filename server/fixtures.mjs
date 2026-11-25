// Entirely fictional authors and original synthetic text. No source accounts.
const authors=[['fieldnotes','Field Notes'],['buildledger','Build Ledger'],['openpatterns','Open Patterns'],['signalroom','Signal Room'],['producttrail','Product Trail']];
const notes=[
 ['engineering','A useful collection starts with a narrow question. Store the source, timestamp and context before building another dashboard.'],
 ['design','We replaced a dense filter drawer with four visible controls. Finding the right note now takes fewer decisions.'],
 ['research','Small research habit: write down what would change your mind before collecting evidence. It makes the next search more focused.'],
 ['engineering','A retry is not a recovery strategy. Give every import a stable ID, validate the payload and make duplicate runs harmless.'],
 ['product','Today’s release: clearer empty states, keyboard-friendly search and an export that keeps the current filters. Small details, daily value.'],
 ['design','Good information hierarchy makes the important thing obvious without making everything else disappear. Start with the reader’s next decision.'],
 ['research','Our weekly reading list is smaller this time: five well-documented ideas beat fifty unexplained links. Quality over volume.'],
 ['product','Shipping the smallest useful workflow: collect → search → compare → export. Keep the original context attached at every step.'],
 ['engineering','Local-first tools can be simple: one SQLite file, explicit migrations and a documented export format. No hidden services required.'],
 ['design','A chart needs a question, a unit and a readable scale. If a sentence explains the finding better, use the sentence.'],
 ['research','We keep two separate columns in our research notes: observed facts and interpretations. Mixing them creates confidence without evidence.'],
 ['product','The best feedback this week was specific: “I need to find everything from one author last Tuesday.” That is now a test case.']
];
export function demoPosts(now=new Date()){
 const midnight=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate());
 return Array.from({length:72},(_,i)=>{const [author,name]=authors[i%5];const [topic,text]=notes[i%12];return{id:'sample-'+String(i+1).padStart(3,'0'),author,name,text,topic,publishedAt:new Date(midnight-Math.floor(i/12)*86400000+(20-i%12)*3600000).toISOString(),likes:12+(i*37)%462,reposts:(i*11)%84,replies:(i*7)%31};});
}
