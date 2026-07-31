import { useRef, useState, KeyboardEvent } from 'react';
import { Send, Paperclip, X, Smile, Loader2 } from 'lucide-react';
import { Message } from '../../types';
import { cn } from '../../utils/helpers';

const EMOJI = ['\u2764\uFE0F', '\uD83D\uDE00', '\uD83D\uDE02', '\uD83D\uDE0D', '\uD83D\uDE4C', '\uD83D\uDC4D', '\uD83D\uDE2E', '\uD83C\uDF89', '\uD83E\uDD73', '\uD83D\uDC4F'];

interface MessageComposerProps {
  replyTo: Message | null;
  onCancelReply: () => void;
  onSend: (text: string, files: File[]) => Promise<void>;
  onTyping: (isTyping: boolean) => void;
  typingEnabled: boolean;
}

export default function MessageComposer({
  replyTo, onCancelReply, onSend, onTyping, typingEnabled,
}: MessageComposerProps) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerTyping = () => {
    if (!typingEnabled || !text.trim()) return;
    if (typingTimer.current) return;
    onTyping(true);
    typingTimer.current = setTimeout(() => {
      onTyping(false);
      typingTimer.current = null;
    }, 2500);
  };

  const handleSend = async () => {
    if (sending) return;
    if (!text.trim() && files.length === 0) return;
    setSending(true);
    try {
      await onSend(text.trim(), files);
      setText('');
      setFiles([]);
      setShowEmoji(false);
      if (typingTimer.current) {
        clearTimeout(typingTimer.current);
        typingTimer.current = null;
        onTyping(false);
      }
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'Enter') {
      triggerTyping();
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white px-3 py-2.5 dark:border-gray-800 dark:bg-gray-950">
      {replyTo && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border-l-4 border-[#0095f6] bg-[#0095f6]/5 px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-[#0095f6]">Replying to {replyTo.reply_to?.sender_name || ''}</p>
            <p className="line-clamp-1 text-xs text-gray-600 dark:text-gray-300">
              {replyTo.content || (replyTo.attachments?.length ? 'Media' : '')}
            </p>
          </div>
          <button onClick={onCancelReply} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {files.length > 0 && (
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
          {files.map((f, i) => (
            <div key={i} className="relative flex-shrink-0">
              {f.type.startsWith('image/') ? (
                <img src={URL.createObjectURL(f)} alt="" className="h-16 w-16 rounded-lg object-cover" />
              ) : (
                <div className="flex h-16 w-16 flex-col items-center justify-center rounded-lg bg-gray-100 text-center text-[10px] text-gray-600 dark:bg-gray-800">
                  <Paperclip className="h-4 w-4" />
                  <span className="line-clamp-2 px-1">{f.name}</span>
                </div>
              )}
              <button
                onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                className="absolute -right-1 -top-1 rounded-full bg-gray-700 p-0.5 text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip"
          className="hidden"
          onChange={(e) => {
            const list = Array.from(e.target.files || []);
            setFiles((prev) => [...prev, ...list].slice(0, 10));
            e.target.value = '';
          }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="mb-0.5 rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          title="Attach"
        >
          <Paperclip className="h-5 w-5" />
        </button>

        <div className="relative flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="max-h-32 min-h-[42px] w-full resize-none rounded-2xl border border-gray-200 bg-gray-100 px-4 py-2.5 pr-10 text-sm outline-none focus:border-[#0095f6] focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:bg-gray-800"
          />
          <button
            onClick={() => setShowEmoji((v) => !v)}
            className="absolute bottom-2 right-2 rounded-full p-1 text-gray-400 hover:text-[#0095f6]"
            title="Emoji"
          >
            <Smile className="h-5 w-5" />
          </button>

          {showEmoji && (
            <div className="absolute bottom-12 right-0 z-20 grid w-64 grid-cols-5 gap-1 rounded-2xl border border-gray-200 bg-white p-3 shadow-xl dark:border-gray-700 dark:bg-gray-800">
              {EMOJI.map((e) => (
                <button
                  key={e}
                  onClick={() => {
                    setText((t) => t + e);
                    setShowEmoji(false);
                  }}
                  className="rounded-lg p-1.5 text-2xl hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleSend}
          disabled={sending || (!text.trim() && files.length === 0)}
          className={cn(
            'mb-0.5 rounded-full p-2.5 transition',
            text.trim() || files.length
              ? 'bg-gradient-to-br from-[#0095f6] to-[#833ab4] text-white shadow-md'
              : 'bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-600'
          )}
          title="Send"
        >
          {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}
