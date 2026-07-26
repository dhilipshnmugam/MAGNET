import { useState, useEffect, useRef } from 'react';
import { messageService } from '../services';
import { Message, Conversation } from '../types';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/common/Avatar';
import { Send, Search } from 'lucide-react';
import { timeAgo } from '../utils/helpers';
import { PageLoader } from '../components/common/Loader';

export default function MessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messageService.getConversations().then((res) => { setConversations(res.data.data || []); setLoading(false); });
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      messageService.getMessages(selectedUserId).then((res) => { setMessages(res.data.data || []); });
    }
  }, [selectedUserId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedUserId) return;
    try {
      const res = await messageService.send({ receiver_id: selectedUserId, content: newMessage.trim() });
      setMessages((prev) => [...prev, res.data.data]);
      setNewMessage('');
    } catch {}
  };

  if (loading) return <PageLoader />;

  return (
    <div className="flex h-[calc(100vh-5rem)] overflow-hidden rounded-2xl border bg-white dark:bg-gray-900">
      {/* Conversation List */}
      <div className="w-80 border-r dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b dark:border-gray-700">
          <h2 className="font-bold">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="p-4 text-sm text-gray-500 text-center">No conversations yet</p>
          ) : conversations.map((conv) => (
            <button key={conv.other_user_id} onClick={() => setSelectedUserId(conv.other_user_id)}
              className={`flex w-full items-center gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 ${selectedUserId === conv.other_user_id ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}>
              <Avatar src={conv.other_user_avatar} name={conv.other_user_name} />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{conv.other_user_name}</p>
                <p className="truncate text-xs text-gray-500">{conv.last_message}</p>
              </div>
              {conv.unread_count > 0 && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-[10px] text-white">{conv.unread_count}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex flex-1 flex-col">
        {selectedUserId ? (
          <>
            <div className="border-b p-4 dark:border-gray-700">
              <p className="font-semibold">{conversations.find((c) => c.other_user_id === selectedUserId)?.other_user_name}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs rounded-2xl px-4 py-2 ${msg.sender_id === user?.id ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800'}`}>
                    <p className="text-sm">{msg.content}</p>
                    <p className={`text-[10px] mt-1 ${msg.sender_id === user?.id ? 'text-white/70' : 'text-gray-400'}`}>{timeAgo(msg.created_at)}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="border-t p-4 dark:border-gray-700">
              <div className="flex gap-2">
                <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} className="input flex-1" placeholder="Type a message..." />
                <button onClick={handleSend} className="btn-primary"><Send className="h-4 w-4" /></button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-gray-400">
            <div className="text-center">
              <Send className="mx-auto h-12 w-12 mb-3" />
              <p>Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
