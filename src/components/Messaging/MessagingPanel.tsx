'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Send, ArrowLeft, Bell, BellOff, Hash, MessageSquare, Users, X,
} from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase'
import type { Profile, Message } from '@/types'
import toast from 'react-hot-toast'

// ── Yerel genişletilmiş tip ───────────────────────────────────────
interface RichMessage extends Message {
  sender?: { id: string; full_name: string; initials: string; avatar_url?: string }
}

interface TopicGroup {
  topic: string
  lastSender: string
  lastMsg: string
  lastAt: string
  count: number
}

interface DmConv {
  partner: { id: string; full_name: string; initials: string; avatar_url?: string }
  lastMsg: string
  lastAt: string
}

type PanelTab  = 'public' | 'topics' | 'dms'
type PanelView = PanelTab | 'topic-thread' | 'dm-thread'

interface Props {
  profiles: Profile[]
  currentUser: Profile
  onClose: () => void
}

// ── Avatar ───────────────────────────────────────────────────────
function Avatar({
  full_name, initials, avatar_url, size = 7,
}: { full_name: string; initials: string; avatar_url?: string; size?: number }) {
  const cls = `w-${size} h-${size} rounded-full flex-shrink-0`
  return avatar_url
    ? <img src={avatar_url} alt={full_name} className={`${cls} object-cover`} />
    : <div className={`${cls} bg-indigo-100 text-indigo-700 text-[9px] font-bold flex items-center justify-center`}>{initials}</div>
}

// ── Zaman etiketi ─────────────────────────────────────────────────
function timeLabel(iso: string) {
  const d = new Date(iso)
  const isToday = d.toDateString() === new Date().toDateString()
  const t = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  return isToday ? t : `${d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} ${t}`
}

export default function MessagingPanel({ profiles, currentUser, onClose }: Props) {
  const supabase = createBrowserClient()

  const [tab,           setTab]           = useState<PanelTab>('public')
  const [view,          setView]          = useState<PanelView>('public')
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
  const [selectedUser,  setSelectedUser]  = useState<DmConv['partner'] | null>(null)
  const [messages,      setMessages]      = useState<RichMessage[]>([])
  const [topicGroups,   setTopicGroups]   = useState<TopicGroup[]>([])
  const [dmConvs,       setDmConvs]       = useState<DmConv[]>([])
  const [input,         setInput]         = useState('')
  const [mentionQuery,  setMentionQuery]  = useState<string | null>(null)
  const [pendingDm,     setPendingDm]     = useState<DmConv['partner'] | null>(null)
  const [subscriptions, setSubscriptions] = useState<string[]>([])
  const [loading,       setLoading]       = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  // Profil haritası (props'tan)
  const profileMap = new Map(profiles.map(p => [p.id, p]))
  const enrich = (msg: Message): RichMessage => {
    const p = profileMap.get(msg.sender_id)
    return { ...msg, sender: p ? { id: p.id, full_name: p.full_name, initials: p.initials, avatar_url: p.avatar_url } : undefined }
  }

  // ── Abonelikler ───────────────────────────────────────────────
  useEffect(() => {
    supabase.from('topic_subscriptions').select('topic').eq('user_id', currentUser.id)
      .then(({ data }) => { if (data) setSubscriptions(data.map(s => s.topic)) })
  }, [currentUser.id])

  // ── Veri çekme ────────────────────────────────────────────────
  const fetchContent = useCallback(async () => {
    setLoading(true)
    try {
      if (view === 'public') {
        const { data } = await supabase.from('messages')
          .select('id,sender_id,recipient_id,content,type,topic,created_at')
          .eq('type', 'public').order('created_at', { ascending: true }).limit(100)
        setMessages((data || []).map(enrich))

      } else if (view === 'topic-thread' && selectedTopic) {
        const { data } = await supabase.from('messages')
          .select('id,sender_id,recipient_id,content,type,topic,created_at')
          .eq('type', 'topic').eq('topic', selectedTopic)
          .order('created_at', { ascending: true }).limit(100)
        setMessages((data || []).map(enrich))

      } else if (view === 'dm-thread' && selectedUser) {
        const { data } = await supabase.from('messages')
          .select('id,sender_id,recipient_id,content,type,topic,created_at')
          .eq('type', 'dm')
          .or(`and(sender_id.eq.${currentUser.id},recipient_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},recipient_id.eq.${currentUser.id})`)
          .order('created_at', { ascending: true }).limit(100)
        setMessages((data || []).map(enrich))

      } else if (view === 'topics') {
        const { data } = await supabase.from('messages')
          .select('id,topic,sender_id,content,created_at')
          .eq('type', 'topic').order('created_at', { ascending: false }).limit(500)
        if (data) {
          const map = new Map<string, TopicGroup>()
          for (const m of data) {
            if (!m.topic) continue
            if (!map.has(m.topic)) {
              const sender = profileMap.get(m.sender_id)
              map.set(m.topic, { topic: m.topic, lastSender: sender?.full_name || '', lastMsg: m.content, lastAt: m.created_at, count: 1 })
            } else {
              map.get(m.topic)!.count++
            }
          }
          setTopicGroups(Array.from(map.values()))
        }

      } else if (view === 'dms') {
        const { data } = await supabase.from('messages')
          .select('id,sender_id,recipient_id,content,created_at')
          .eq('type', 'dm')
          .or(`sender_id.eq.${currentUser.id},recipient_id.eq.${currentUser.id}`)
          .order('created_at', { ascending: false }).limit(200)
        if (data) {
          const convMap = new Map<string, DmConv>()
          for (const m of data as any[]) {
            const partnerId = m.sender_id === currentUser.id ? m.recipient_id : m.sender_id
            if (!partnerId || convMap.has(partnerId)) continue
            const p = profileMap.get(partnerId)
            if (!p) continue
            convMap.set(partnerId, {
              partner: { id: p.id, full_name: p.full_name, initials: p.initials, avatar_url: p.avatar_url },
              lastMsg: m.content, lastAt: m.created_at,
            })
          }
          setDmConvs(Array.from(convMap.values()))
        }
      }
    } finally {
      setLoading(false)
    }
  }, [view, selectedTopic, selectedUser?.id, currentUser.id])

  useEffect(() => { fetchContent() }, [fetchContent])

  // Mesaj listesinin altına kaydır
  useEffect(() => {
    if (['public', 'topic-thread', 'dm-thread'].includes(view)) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
    }
  }, [messages, view])

  // ── Realtime ─────────────────────────────────────────────────
  useEffect(() => {
    const ch = supabase.channel(`msg-panel-${currentUser.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as Message
        const mine = msg.sender_id === currentUser.id
        const forMe =
          (view === 'public' && msg.type === 'public') ||
          (view === 'topic-thread' && msg.type === 'topic' && msg.topic === selectedTopic) ||
          (view === 'dm-thread' && msg.type === 'dm' && (
            (msg.sender_id === currentUser.id && msg.recipient_id === selectedUser?.id) ||
            (msg.sender_id === selectedUser?.id && msg.recipient_id === currentUser.id)
          ))
        if (forMe && !mine) setMessages(prev => [...prev, enrich(msg)])
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [view, selectedTopic, selectedUser?.id, currentUser.id])

  // ── Input ─────────────────────────────────────────────────────
  const handleInputChange = (val: string) => {
    setInput(val)
    const m = val.match(/@([^\s@]*)$/)
    setMentionQuery(m ? m[1] : null)
    if (!val.startsWith('@')) setPendingDm(null)
  }

  const selectMention = (p: Profile) => {
    setInput(`@${p.full_name} `)
    setPendingDm({ id: p.id, full_name: p.full_name, initials: p.initials, avatar_url: p.avatar_url })
    setMentionQuery(null)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const mentionResults = mentionQuery !== null
    ? profiles.filter(p => p.id !== currentUser.id &&
        (mentionQuery === '' || p.full_name.toLowerCase().includes(mentionQuery.toLowerCase()))
      ).slice(0, 6)
    : []

  // ── Gönder ───────────────────────────────────────────────────
  const sendMessage = async () => {
    const trimmed = input.trim()
    if (!trimmed) return

    // //KonuAdı → konuya git
    const topicNav = trimmed.match(/^\/\/(.+)$/)
    if (topicNav && view !== 'topic-thread') {
      const topicName = topicNav[1].trim()
      setSelectedTopic(topicName)
      setView('topic-thread')
      setInput('')
      return
    }

    let type: 'public' | 'dm' | 'topic' = 'public'
    let recipientId: string | null = null
    let topic: string | null = null

    if (pendingDm || view === 'dm-thread') {
      type = 'dm'
      recipientId = pendingDm?.id || selectedUser?.id || null
    } else if (view === 'topic-thread' && selectedTopic) {
      type = 'topic'
      topic = selectedTopic
    }

    if (type === 'dm' && !recipientId) { toast.error('Alıcı seçilmedi'); return }

    const { data: newMsg, error } = await supabase.from('messages')
      .insert({ sender_id: currentUser.id, content: trimmed, type, recipient_id: recipientId, topic })
      .select('id,sender_id,recipient_id,content,type,topic,created_at')
      .single()

    if (error) { toast.error('Gönderilemedi: ' + error.message); return }

    setInput('')
    setPendingDm(null)
    setMentionQuery(null)
    if (newMsg) setMessages(prev => [...prev, enrich(newMsg)])

    // @mention ile DM gönderiliyorsa thread'e geç
    if (type === 'dm' && view !== 'dm-thread' && recipientId) {
      const p = profileMap.get(recipientId)
      if (p) { setSelectedUser({ id: p.id, full_name: p.full_name, initials: p.initials, avatar_url: p.avatar_url }); setView('dm-thread') }
    }

    // DM bildirimi
    if (type === 'dm' && recipientId && recipientId !== currentUser.id) {
      await supabase.from('notifications').insert({
        user_id: recipientId,
        workspace_id: null,
        workspace_name: 'Mesajlar',
        text: `${currentUser.full_name}: "${trimmed.slice(0, 60)}"`,
      })
    }

    // Konu abonelik bildirimi
    if (type === 'topic' && topic) {
      const { data: subs } = await supabase.from('topic_subscriptions')
        .select('user_id').eq('topic', topic).neq('user_id', currentUser.id)
      if (subs?.length) {
        await supabase.from('notifications').insert(
          subs.map(s => ({
            user_id: s.user_id,
            workspace_id: null,
            workspace_name: `#${topic}`,
            text: `${currentUser.full_name}: "${trimmed.slice(0, 80)}"`,
          }))
        )
      }
    }
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  // ── Abonelik ─────────────────────────────────────────────────
  const toggleSub = async (topicName: string) => {
    if (subscriptions.includes(topicName)) {
      await supabase.from('topic_subscriptions').delete().eq('user_id', currentUser.id).eq('topic', topicName)
      setSubscriptions(prev => prev.filter(t => t !== topicName))
      toast.success(`#${topicName} aboneliğiniz kaldırıldı`)
    } else {
      await supabase.from('topic_subscriptions').insert({ user_id: currentUser.id, topic: topicName })
      setSubscriptions(prev => [...prev, topicName])
      toast.success(`#${topicName} konusuna abone oldunuz`)
    }
  }

  // ── Input placeholder ────────────────────────────────────────
  const placeholder = pendingDm
    ? `${pendingDm.full_name} kullanıcısına mesaj...`
    : view === 'topic-thread' ? `#${selectedTopic} kanalına yaz...`
    : view === 'dm-thread' ? `${selectedUser?.full_name} kullanıcısına mesaj...`
    : 'Mesaj yaz... (@kişi veya //konu)'

  // ── Alt render: mesaj balonu ──────────────────────────────────
  const Bubble = ({ msg }: { msg: RichMessage }) => {
    const isMine = msg.sender_id === currentUser.id
    return (
      <div className={`flex items-end gap-2 mb-3 ${isMine ? 'flex-row-reverse' : ''}`}>
        {!isMine && msg.sender && (
          <Avatar {...msg.sender} size={6} />
        )}
        <div className={`max-w-[75%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
          {!isMine && msg.sender && (
            <span className="text-[9px] text-slate-400 mb-0.5 px-1">{msg.sender.full_name}</span>
          )}
          <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed break-words ${
            isMine
              ? 'bg-indigo-600 text-white rounded-br-sm'
              : 'bg-white text-slate-800 border border-slate-100 rounded-bl-sm shadow-sm'
          }`}>
            {msg.content}
          </div>
          <span className="text-[8px] text-slate-300 mt-0.5 px-1">{timeLabel(msg.created_at)}</span>
        </div>
      </div>
    )
  }

  // ── Tab bar ───────────────────────────────────────────────────
  const TabBar = () => (
    <div className="flex border-b border-slate-100 flex-shrink-0">
      {([
        { key: 'public', Icon: MessageSquare, label: 'Genel' },
        { key: 'topics', Icon: Hash,          label: 'Konular' },
        { key: 'dms',    Icon: Users,          label: 'DM' },
      ] as const).map(({ key, Icon, label }) => (
        <button key={key}
          onClick={() => { setTab(key); setView(key); setMessages([]) }}
          className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-[10px] font-medium border-b-2 transition-colors ${
            tab === key ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Icon size={11} /> {label}
        </button>
      ))}
    </div>
  )

  // ── Thread başlığı ────────────────────────────────────────────
  const ThreadHeader = () => {
    const isSub = selectedTopic ? subscriptions.includes(selectedTopic) : false
    return (
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-slate-50 flex-shrink-0">
        <button onClick={() => { setView(tab); setMessages([]) }}
          className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600">
          <ArrowLeft size={14} />
        </button>
        <span className="flex-1 text-xs font-semibold text-slate-700 truncate">
          {view === 'topic-thread' ? `# ${selectedTopic}` : selectedUser?.full_name}
        </span>
        {view === 'topic-thread' && selectedTopic && (
          <button onClick={() => toggleSub(selectedTopic)}
            title={isSub ? 'Aboneliği kaldır' : 'Bildirim al'}
            className={`p-1.5 rounded-lg transition-colors ${
              isSub ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
            }`}
          >
            {isSub ? <Bell size={13} /> : <BellOff size={13} />}
          </button>
        )}
      </div>
    )
  }

  // ── Konular listesi ───────────────────────────────────────────
  const TopicsList = () => (
    <div className="flex-1 overflow-y-auto">
      <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
        <p className="text-[10px] text-slate-400">
          Yeni konu açmak için <span className="font-mono font-semibold text-slate-600">//KonuAdı</span> yazın
        </p>
      </div>
      {!loading && topicGroups.length === 0 && (
        <div className="flex flex-col items-center py-12 text-center px-4">
          <Hash size={26} className="text-slate-200 mb-2" />
          <p className="text-xs text-slate-400">Henüz konu yok</p>
        </div>
      )}
      {topicGroups.map(g => {
        const isSub = subscriptions.includes(g.topic)
        return (
          <div key={g.topic} onClick={() => { setSelectedTopic(g.topic); setView('topic-thread') }}
            className="px-3 py-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Hash size={10} className="text-indigo-500 flex-shrink-0" />
              <span className="text-xs font-semibold text-slate-700 flex-1 truncate">{g.topic}</span>
              <button onClick={e => { e.stopPropagation(); toggleSub(g.topic) }}
                className={`p-1 rounded ${isSub ? 'text-indigo-500' : 'text-slate-300 hover:text-indigo-400'}`}>
                {isSub ? <Bell size={10} /> : <BellOff size={10} />}
              </button>
              <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{g.count}</span>
            </div>
            <p className="text-[10px] text-slate-400 truncate pl-3.5">
              <span className="font-medium">{g.lastSender}:</span> {g.lastMsg}
            </p>
            <p className="text-[9px] text-slate-300 pl-3.5 mt-0.5">{timeLabel(g.lastAt)}</p>
          </div>
        )
      })}
    </div>
  )

  // ── DM konuşmalar listesi ─────────────────────────────────────
  const DmsList = () => (
    <div className="flex-1 overflow-y-auto">
      {!loading && dmConvs.length === 0 && (
        <div className="flex flex-col items-center py-12 text-center px-4">
          <Users size={26} className="text-slate-200 mb-2" />
          <p className="text-xs text-slate-400">Henüz DM yok</p>
          <p className="text-[10px] text-slate-300 mt-1">Mesaj kutusunda @isim yazın</p>
        </div>
      )}
      {dmConvs.map(conv => (
        <div key={conv.partner.id}
          onClick={() => { setSelectedUser(conv.partner); setView('dm-thread') }}
          className="flex items-center gap-3 px-3 py-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer">
          <Avatar {...conv.partner} size={8} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-700 truncate">{conv.partner.full_name}</p>
            <p className="text-[10px] text-slate-400 truncate">{conv.lastMsg}</p>
          </div>
          <span className="text-[9px] text-slate-300 flex-shrink-0">{timeLabel(conv.lastAt)}</span>
        </div>
      ))}
    </div>
  )

  // ── Mesaj listesi ─────────────────────────────────────────────
  const MessageList = () => (
    <div className="flex-1 overflow-y-auto px-3 py-3 bg-slate-50">
      {loading && <p className="text-center text-slate-300 text-xs py-4">Yükleniyor…</p>}
      {!loading && messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-center py-8">
          <MessageSquare size={26} className="text-slate-200 mb-2" />
          <p className="text-xs text-slate-400">
            {view === 'public' ? 'İlk mesajı sen gönder!' : 'Henüz mesaj yok'}
          </p>
        </div>
      )}
      {messages.map(msg => <Bubble key={msg.id} msg={msg} />)}
      <div ref={bottomRef} />
    </div>
  )

  // ── Input alanı ───────────────────────────────────────────────
  const InputArea = () => (
    <div className="border-t border-slate-100 p-2 relative bg-white flex-shrink-0">
      {mentionResults.length > 0 && (
        <div className="absolute bottom-full left-2 right-2 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden mb-1 z-10">
          {mentionResults.map(p => (
            <button key={p.id} onMouseDown={e => { e.preventDefault(); selectMention(p) }}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-indigo-50 text-left">
              {p.avatar_url
                ? <img src={p.avatar_url} className="w-6 h-6 rounded-full object-cover flex-shrink-0" alt={p.full_name} />
                : <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-bold flex items-center justify-center flex-shrink-0">{p.initials}</div>
              }
              <span className="text-xs text-slate-700">{p.full_name}</span>
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2 items-end">
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => handleInputChange(e.target.value)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          rows={1}
          className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-xl resize-none outline-none focus:border-indigo-300 min-h-[36px] max-h-24 bg-white"
          style={{ lineHeight: '1.5' }}
        />
        <button onClick={sendMessage} disabled={!input.trim()}
          className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors flex-shrink-0">
          <Send size={13} />
        </button>
      </div>
    </div>
  )

  const isThread = view === 'topic-thread' || view === 'dm-thread'

  return (
    <div className="w-72 bg-white border-l border-slate-200 flex flex-col flex-shrink-0 h-full">
      {/* Başlık */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200 flex-shrink-0">
        <span className="text-xs font-semibold text-slate-700">Mesajlar</span>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
          <X size={14} />
        </button>
      </div>

      {isThread ? <ThreadHeader /> : <TabBar />}

      {(view === 'public' || isThread) && <MessageList />}
      {view === 'topics' && <TopicsList />}
      {view === 'dms'    && <DmsList />}

      <InputArea />
    </div>
  )
}
