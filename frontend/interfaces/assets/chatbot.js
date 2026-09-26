function initGovBridgeChat(){
  if(document.getElementById('govbridgeChat')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div id="govbridgeChat" class="gb-chat">
      <button id="gbChatToggle" class="gb-chat-toggle" type="button" aria-expanded="false" aria-controls="gbChatPanel" aria-label="Open GovBridge AI assistant">
        <svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/></svg>
      </button>
      <section id="gbChatPanel" class="gb-chat-panel" aria-label="GovBridge AI assistant" hidden>
        <header class="gb-chat-head"><div><strong>GovBridge Assistant</strong><span>Ask about challenges, proposals, pilots, or procurement</span></div><button id="gbChatClose" type="button" aria-label="Close assistant">×</button></header>
        <div id="gbChatMessages" class="gb-chat-messages" role="log" aria-live="polite"><div class="gb-chat-msg assistant">Hi! I’m the free GovBridge help bot. Ask about common platform workflows.</div></div>
        <div class="gb-chat-suggestions"><button type="button">How does a pilot work?</button><button type="button">How can a startup apply?</button></div>
        <form id="gbChatForm" class="gb-chat-form"><textarea id="gbChatInput" rows="1" maxlength="2000" placeholder="Type your message…" aria-label="Your message" required></textarea><button id="gbChatSend" type="submit" aria-label="Send message">Send</button></form>
        <div class="gb-chat-foot">Chat isn’t saved and can’t access your account.</div>
      </section>
    </div>`);
  const panel=document.getElementById('gbChatPanel');
  const toggle=document.getElementById('gbChatToggle');
  const messagesEl=document.getElementById('gbChatMessages');
  const form=document.getElementById('gbChatForm');
  const input=document.getElementById('gbChatInput');
  const send=document.getElementById('gbChatSend');
  const history=[];
  const setOpen=open=>{panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open));if(open)input.focus();};
  const addMessage=(role,text)=>{const node=document.createElement('div');node.className='gb-chat-msg '+role;node.textContent=text;messagesEl.appendChild(node);messagesEl.scrollTop=messagesEl.scrollHeight;return node;};
  const demoReply=question=>{
    const q=question.toLowerCase();
    if(/pilot|trial/.test(q)) return 'A pilot is a time-limited test of a proposed solution with a department. Agree on scope, timeline, success measures, and evidence before it starts.';
    if(/apply|startup|submit|proposal/.test(q)) return 'Open Browse Challenges, choose an open challenge, select Submit Solution, and complete the proposal form. In this preview, the proposal is saved only in this browser.';
    if(/challenge|post/.test(q)) return 'Government demo users can use Post Challenge to add a sample challenge. Changes stay in this browser and are not shared with other visitors.';
    if(/procurement|purchase/.test(q)) return 'Procurement follows evaluation and a successful pilot. The demo shows example stages; it does not initiate a real purchase.';
    if(/evaluation|evaluate|score/.test(q)) return 'Government demo users can open Evaluation to review sample proposals and record example scores. Those changes stay in this browser.';
    return 'I’m using the offline demo help guide. Try asking how a startup applies, how a pilot works, or how to post a challenge.';
  };
  toggle.addEventListener('click',()=>setOpen(panel.hidden));
  document.getElementById('gbChatClose').addEventListener('click',()=>setOpen(false));
  document.querySelectorAll('.gb-chat-suggestions button').forEach(button=>button.addEventListener('click',()=>{input.value=button.textContent;form.requestSubmit();}));
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const text=input.value.trim();
    if(!text||send.disabled)return;
    input.value='';addMessage('user',text);history.push({role:'user',content:text});
    const pending=addMessage('assistant','Thinking…');send.disabled=true;input.disabled=true;
    try{
      if(window.GOVBRIDGE_DEMO_MODE){
        pending.textContent=demoReply(text);
        history.push({role:'assistant',content:pending.textContent});
        return;
      }
      const response=await fetch(window.GOVBRIDGE_CHAT_API_URL||'http://127.0.0.1:5001/api/chat',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:history.slice(-12)})
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||'The assistant service returned an error.');
      pending.textContent=data.reply||'I couldn’t create a reply. Please try again.';
      history.push({role:'assistant',content:pending.textContent});
    }catch(error){
      pending.textContent=error.message==='Failed to fetch'?'I can’t reach the chatbot backend. Start the backend service and try again.':error.message;
      history.pop();
    }finally{send.disabled=false;input.disabled=false;input.focus();messagesEl.scrollTop=messagesEl.scrollHeight;}
  });
}

initGovBridgeChat();


