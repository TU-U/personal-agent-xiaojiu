import {desktop,navigateDesktop} from './desktop';
import {contractPost} from './api';
import { useEffect, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent, type FocusEvent } from 'react';
import { Circle, Bell, FileText, Heart, MessageCircle, Moon, Send, Sparkles, X } from 'lucide-react';

import {useSharedPetReminders} from './PetReminderContext';
import PetReminderTable,{openPetReminder} from './PetReminderTable';
import type { PetChatMessage, PetChatReply } from './types';
import curiousPet from '../assets/小九-开心调皮好奇渴求.png';
import thoughtfulPet from '../assets/小九-思考不快质疑傲娇沉默好奇.png';
import sulkyPet from '../assets/小九-不嘻嘻.png';
import tiredPet from '../assets/小九-力竭了-已苍白.png';
import gigglingPet from '../assets/小九-嘻嘻.png';
import shyPet from '../assets/小九-局促地看着你.png';
import groomedPet from '../assets/小九-打理美妆后.png';
import sleepyPet from '../assets/小九-模糊沧桑.png';
import calmPet from '../assets/小九-端正坐好萌萌地看着你.png';
import delightedPet from '../assets/小九-非常开心地看着你.png';

type PetMood = 'calm' | 'curious' | 'shy' | 'happy' | 'giggle' | 'thinking' | 'groomed' | 'sullen' | 'tired' | 'sleepy';
type PetEvent = 'HOVER' | 'PET' | 'CHAT' | 'CHAT_OK' | 'CHAT_ERROR' | 'NAP' | 'WAKE' | 'TIMEOUT' | 'OVERSTIMULATED' | 'COMPLETED' | 'CONCERN';
const transitions: Record<PetMood, Partial<Record<PetEvent, PetMood>>> = {
  // Opening the panel is not alarming by itself; her default, calm portrait stays visible.
  calm: { PET: 'happy', CHAT: 'thinking', NAP: 'sleepy', OVERSTIMULATED: 'sullen' },
  curious: { HOVER: 'shy', PET: 'happy', CHAT: 'thinking', TIMEOUT: 'calm', OVERSTIMULATED: 'sullen' },
  shy: { HOVER: 'shy', PET: 'happy', CHAT: 'thinking', WAKE: 'calm', TIMEOUT: 'calm', OVERSTIMULATED: 'sullen' },
  happy: { HOVER: 'happy', PET: 'happy', CHAT: 'thinking', TIMEOUT: 'calm', OVERSTIMULATED: 'sullen' },
  giggle: { PET: 'happy', CHAT: 'thinking', TIMEOUT: 'calm', OVERSTIMULATED: 'sullen' },
  thinking: { PET: 'happy', CHAT: 'thinking', CHAT_OK: 'curious', CHAT_ERROR: 'shy', TIMEOUT: 'calm' },
  groomed: { HOVER: 'groomed', PET: 'happy', CHAT: 'thinking', TIMEOUT: 'calm' },
  sullen: { PET: 'shy', CHAT: 'thinking', WAKE: 'calm', TIMEOUT: 'calm' },
  tired: { PET: 'shy', CHAT: 'thinking', WAKE: 'calm', TIMEOUT: 'calm' },
  sleepy: { HOVER: 'shy', PET: 'happy', CHAT: 'thinking', WAKE: 'calm', TIMEOUT: 'calm' },
};

const petImages: Record<PetMood, string> = {
  calm: calmPet,
  curious: curiousPet,
  shy: shyPet,
  happy: delightedPet,
  giggle: gigglingPet,
  thinking: thoughtfulPet,
  groomed: groomedPet,
  sullen: sulkyPet,
  tired: tiredPet,
  sleepy: sleepyPet,
};

const moodNames: Record<PetMood, string> = {
  calm: '很安心', curious: '好奇地听着', shy: '有点局促', happy: '开心地贴贴',
  giggle: '嘻嘻', thinking: '认真想想', groomed: '打理好啦',
  sullen: '想安静一下', tired: '有些累了', sleepy: '在暗处打盹',
};

function transition(mood: PetMood, event: PetEvent): PetMood {
  if(event==='COMPLETED')return 'happy';
  if(event==='CONCERN')return 'thinking';
  return transitions[mood][event] ?? mood;
}

export default function PetBuddy() {
  const reminders=useSharedPetReminders();
  const pendingCount=reminders.error?0:(reminders.data?.total||0);
  const [pinned,setPinned]=useState(false);
  const hover=useRef(false);
  const [mood, setMood] = useState<PetMood>('calm');
  const [moodTick,setMoodTick]=useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [jelly, setJelly] = useState(false);
  const [reply, setReply] = useState('光线暗一点，我会更安心。圆圆的玩具和温柔贴贴，我都喜欢。');
  const [showSpeech, setShowSpeech] = useState(false);
  const [businessFeedback,setBusinessFeedback]=useState('');
  const feedbackSeen=useRef<Set<string>|null>(null);
  const moodVersion=useRef(0);
  const [messages, setMessages] = useState<PetChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState('');
  const [memoryContext,setMemoryContext]=useState<Pick<PetChatReply,'memoryUsage'|'memoryNotice'>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const drag = useRef<{ pointerId: number; startX: number; startY: number; offsetX: number; offsetY: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const panelRef = useRef<HTMLElement>(null);
  const chatInput = useRef<HTMLInputElement>(null);
  const moodTimer = useRef<number | null>(null);
  const idleTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);
  const petTaps = useRef<number[]>([]);
  const chatCount = useRef(0);

  function setPetMood(event: PetEvent) {
    if(moodTimer.current)clearTimeout(moodTimer.current);
    moodVersion.current++;
    if(!['COMPLETED','CONCERN','HOVER'].includes(event))setBusinessFeedback('');
    setMoodTick(value=>value+1);
    setMood(current => transition(current, event));
  }

  function animateJelly() {
    setJelly(false);
    requestAnimationFrame(() => setJelly(true));
  }

  function keepHerAwake() {
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => setPetMood('NAP'), 120_000);
  }

  useEffect(() => {
    if (moodTimer.current) window.clearTimeout(moodTimer.current);
    if (mood !== 'calm') {
      const version=moodVersion.current;
      moodTimer.current = window.setTimeout(() => {if(version===moodVersion.current)setPetMood('TIMEOUT');}, mood === 'sleepy' ? 14_000 : 7_000);
    }
    return () => { if (moodTimer.current) window.clearTimeout(moodTimer.current); };
  }, [mood,moodTick]);

  useEffect(()=>{
    if(reminders.error||!reminders.data?.feedback)return;
    const events=reminders.data.feedback;
    // First snapshot is a baseline, including after reload: do not celebrate old history.
    if(!feedbackSeen.current){feedbackSeen.current=new Set(events.map(event=>event.id));return;}
    const fresh=events.filter(event=>!feedbackSeen.current!.has(event.id));
    events.forEach(event=>feedbackSeen.current!.add(event.id));
    const event=fresh[0];if(!event||chatOpen||chatBusy)return;
    setPetMood(event.kind==='completed'?'COMPLETED':'CONCERN');
    setBusinessFeedback(event.message);keepHerAwake();
  },[reminders.data,reminders.error,chatOpen,chatBusy]);

  useEffect(() => {
    if (!jelly) return;
    const timer = window.setTimeout(() => setJelly(false), 700);
    return () => window.clearTimeout(timer);
  }, [jelly]);

  useEffect(() => {
    if (!chatOpen || !panelOpen) return;
    chatInput.current?.focus();
  }, [chatOpen, panelOpen]);

  useEffect(() => () => {
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
  }, []);

  useEffect(() => { keepHerAwake(); }, []);

  function openPanel() {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setPanelOpen(true);
    setPetMood('HOVER');
    keepHerAwake();
  }

  function closePanelSoon() {
    if (document.activeElement && panelRef.current?.contains(document.activeElement) && document.activeElement.matches(':focus-visible')) return;
    closeTimer.current = window.setTimeout(() => setPanelOpen(false), 180);
  }

  function handleFocusOut(event: FocusEvent<HTMLElement>) {
    const next = event.relatedTarget as Node | null;
    if (next && event.currentTarget.contains(next)) return;
    window.setTimeout(() => {
      if (!hover.current&&!panelRef.current?.contains(document.activeElement)) setPanelOpen(false);
    }, 0);
  }

  function startDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    if(desktop?.role==='pet')desktop.drag(true);
    const bounds = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!bounds) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointerId: event.pointerId, startX: desktop?.role==='pet'?event.screenX:event.clientX, startY: desktop?.role==='pet'?event.screenY:event.clientY, offsetX: event.clientX - bounds.left, offsetY: event.clientY - bounds.top, moved: false };
  }

  function moveDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    if (Math.abs((desktop?.role==='pet'?event.screenX:event.clientX) - current.startX) + Math.abs((desktop?.role==='pet'?event.screenY:event.clientY) - current.startY) > 4 && !current.moved) {
      current.moved = true;
      setIsDragging(true);
      setPanelOpen(false);
    }
    if (!current.moved||desktop?.role==='pet') return;
    const bounds = event.currentTarget.parentElement?.getBoundingClientRect();
    const width = bounds?.width ?? 122;
    const height = bounds?.height ?? 132;
    setPosition({ left: Math.max(0, Math.min(window.innerWidth - width, event.clientX - current.offsetX)), top: Math.max(0, Math.min(window.innerHeight - height, event.clientY - current.offsetY)) });
  }

  function endDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if(desktop?.role==='pet')desktop.drag(false);
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    if (current.moved) {
      suppressClick.current = true;
      setIsDragging(false);
      window.setTimeout(() => { suppressClick.current = false; }, 350);
    }
    drag.current = null;
  }

  function pet() {
    if (suppressClick.current) { suppressClick.current = false; return; }
    const now = Date.now();
    petTaps.current = [...petTaps.current.filter(time => now - time < 12_000), now];
    if (petTaps.current.length >= 5) {
      setPetMood('OVERSTIMULATED');
      setReply('贴贴已经够多啦，我先去暗一点的地方缓一缓，等下再来找你。');
    } else {
      setPetMood('PET');
      setReply('嗯…这样摸摸刚刚好。我很喜欢和你待在一起。');
    }
    setShowSpeech(true);
    keepHerAwake();
    animateJelly();
  }

  function openChat() {
    setPanelOpen(true);
    setChatOpen(true);
    setChatError('');
    if (!messages.length) setReply('我在这里听你说。你想聊一点开心的，还是今天有点累？');
    setShowSpeech(true);
    setPetMood('CHAT');
    keepHerAwake();
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || chatBusy) return;
    setChatBusy(true);
    setChatError('');
    setMemoryContext({});
    setReply('小九认真地想一想…');
    setPetMood('CHAT');
    keepHerAwake();
    const history = messages.slice(-6);
    try {
      const result = await contractPost('postPetChat','/pet/chat',{ message: content, history });
      setMessages(current => [...current, { role: 'user' as const, content }, { role: 'assistant' as const, content: result.reply }].slice(-12));
      setDraft('');
      setReply(result.reply);
      setMemoryContext({memoryUsage:result.memoryUsage,memoryNotice:result.memoryNotice});
      chatCount.current += 1;
      if (chatCount.current >= 4) setMood('tired'); else setPetMood('CHAT_OK');
      animateJelly();
    } catch (cause) {
      const message = (cause as Error).message;
      setChatError(message);
      setReply('我还在这里陪着你。等连上模型，我们再慢慢聊。');
      setPetMood('CHAT_ERROR');
    } finally {
      setChatBusy(false);
    }
  }

  function handlePetClick() {
    pet();
  }

  const visible=panelOpen||pinned||chatOpen;
  function dismiss(){if(closeTimer.current)clearTimeout(closeTimer.current);setPinned(false);setPanelOpen(false);setChatOpen(false);}
  const panelClass = `pet-buddy${visible ? ' panel-open' : ''}${isDragging ? ' is-dragging' : ''}`;

  return (
    <aside
      ref={panelRef}
      className={panelClass}
      aria-label="陪伴者小九"
      style={position ? { left: position.left, top: position.top, right: 'auto', bottom: 'auto' } : undefined}
      onMouseEnter={()=>{hover.current=true;openPanel();}}
      onMouseLeave={()=>{hover.current=false;closePanelSoon();}}
      onFocusCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null))openPanel();}}
      onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();dismiss();}}}
      onBlurCapture={handleFocusOut}
    >
      <section className="pet-buddy-panel" aria-label="小九的互动面板" aria-hidden={!visible} style={position?{position:'fixed',left:Math.max(8,Math.min(window.innerWidth-370,position.left-340)),top:Math.max(8,Math.min(window.innerHeight-520,position.top-450)),right:'auto',bottom:'auto'}:undefined}>
        <header className="pet-panel-header">
          <span className="pet-panel-moon"><Moon size={16}/></span>
          <div><span className="pet-panel-kicker">YOUR LITTLE COMPANION</span><h2>小九</h2></div>
          <span className="pet-mood-pill"><i/>{moodNames[mood]}</span>
          <button className="pet-panel-close" type="button" aria-label="收起小九面板" onClick={dismiss}><X size={16}/></button>
        </header>
        <PetReminderTable state={reminders} onOpen={item=>{openPetReminder(item);dismiss();}}/>
        <div className="pet-personality">
          <p>{businessFeedback||reply}</p>
          <div className="pet-traits"><span><Moon size={12}/>喜欢暗一点</span><span><Circle size={12}/>圆圆的玩具</span><span><Heart size={12}/>温柔贴贴</span></div>
        </div>
        <div className="pet-actions" role="group" aria-label="和小九互动">
          <button type="button" onClick={openChat} aria-expanded={chatOpen}><MessageCircle size={17}/><span>交流</span></button>
          <button type="button" onClick={()=>{if(!navigateDesktop({page:'artifacts'}))location.hash='artifacts';setPetMood('PET');setReply('一起看看你的成果吧 ✨');setShowSpeech(true);keepHerAwake();}}><FileText size={17}/><span>汇报</span></button>
          <button type="button" aria-pressed={pinned} onClick={()=>{setPinned(value=>!value);setPanelOpen(hover.current);}}><Bell size={17}/><span>提示语</span></button>
        </div>
        {chatOpen && <div className="pet-chat">
          <button type="button" className="btn text" onClick={()=>setChatOpen(false)}>收起交流</button>
          {messages.length > 0 && <div className="pet-chat-history" role="log" aria-label="和小九的对话" aria-live="polite">{messages.slice(-6).map((message, index) => <p key={`${index}-${message.role}`} className={message.role === 'user' ? 'from-user' : 'from-pet'}><span>{message.role === 'user' ? '你' : '小九'}</span>{message.content}</p>)}{chatBusy&&<p className="from-pet"><span>小九</span><i className="pet-thinking-dots">正在想…</i></p>}</div>}
          <form className="pet-chat-form" onSubmit={sendMessage}>
            <input ref={chatInput} aria-label="和小九说话" placeholder="跟小九说说话…" maxLength={400} value={draft} onChange={event => setDraft(event.target.value)} disabled={chatBusy}/>
            <button type="submit" aria-label="发送给小九" disabled={chatBusy||!draft.trim()}>{chatBusy?<Sparkles size={16} className="pet-thinking-icon"/>:<Send size={16}/>}</button>
          </form>
          {chatError && <p className="pet-chat-error" role="alert">{chatError}</p>}
          {memoryContext.memoryNotice&&<p className="pet-chat-hint" role="status">{memoryContext.memoryNotice}</p>}
          {!!memoryContext.memoryUsage?.length&&<details className="pet-chat-hint"><summary>本次提供给模型的通用记忆 · {memoryContext.memoryUsage.length} 条</summary>{memoryContext.memoryUsage.map(memory=><p key={memory.id}>{memory.title} · 版本 {memory.revision}</p>)}</details>}
          <small className="pet-chat-hint">交流可参考相关、已确认的通用记忆；不会自动带入全部任务、要事或财务资料。提示表独立展示。</small>
        </div>}
      </section>
      {!visible && (businessFeedback||showSpeech&&reply) && <span className="pet-buddy-speech" aria-live="polite">{businessFeedback||reply}</span>}
      {reminders.error&&<span className="pet-pending-dot" role="status" aria-label="提示获取失败，请打开提示表重试">!</span>}
      {pendingCount>0&&<span className="pet-pending-dot" role="status" aria-label={`${pendingCount} 项待处理提示`}>{pendingCount}</span>}
      <button
        className="pet-buddy-button"
        type="button"
        aria-label={`小九现在${moodNames[mood]}，点击摸摸她`}
        aria-expanded={visible}
        title="小九 · 按住拖动，点击摸摸"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClick={handlePetClick}
      >
        <img key={`${mood}-${jelly}`} className={jelly ? 'pet-buddy-image jelly' : 'pet-buddy-image'} src={petImages[mood]} alt="" draggable="false" />
      </button>
      {desktop?.role==='pet'&&<button type="button" className="desktop-open-main" onClick={()=>void desktop?.openMain()}>打开主界面</button>}
      <span className="pet-buddy-name" aria-hidden="true">小九 · {moodNames[mood]}</span>
    </aside>
  );
}
