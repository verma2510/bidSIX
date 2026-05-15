import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import useGameStore from '../store/gameStore';

export default function ChatPanel({ onSendMessage }) {
  const { chatMessages, showChat, toggleChat } = useGameStore();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);
  const seenCountRef = useRef(chatMessages.length);
  const [unread, setUnread] = useState(0);

  // Track unread count when panel is closed
  useEffect(() => {
    if (showChat) {
      seenCountRef.current = chatMessages.length;
      setUnread(0);
    } else {
      const newCount = chatMessages.length - seenCountRef.current;
      setUnread(newCount > 0 ? newCount : 0);
    }
  }, [chatMessages.length, showChat]);

  // Auto-scroll to newest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length, showChat]);

  const handleSend = (e) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  return (
    <div className="relative">
      <button
        className="px-2 py-1 md:px-4 md:py-2 bg-slate-800/80 hover:bg-slate-700 border border-white/10 rounded-lg text-white font-medium flex items-center gap-1 md:gap-2 backdrop-blur-sm transition-colors relative shadow-lg text-[10px] sm:text-xs md:text-base"
        onClick={toggleChat}
      >
        <span className="text-xs md:text-base">💬</span>
        <span className="hidden md:inline">Chat</span>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center leading-none shadow-md">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {showChat && createPortal(
        <div className="fixed top-10 landscape:top-9 sm:top-16 md:top-24 right-2 sm:right-4 md:right-8 w-[calc(100vw-1rem)] max-w-xs sm:w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col z-[200] overflow-hidden" style={{ maxHeight: 'min(400px, 55vh)' }}>
          <div className="bg-slate-800 p-3 border-b border-slate-700 flex justify-between items-center">
            <h3 className="text-white font-bold text-sm flex items-center gap-2">💬 Game Chat</h3>
            <button className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700 transition-colors" onClick={toggleChat}>✕</button>
          </div>

          <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-2 bg-slate-900/50 shadow-inner [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full">
            {chatMessages.length === 0 ? (
              <p className="text-slate-500 text-center text-xs mt-4">No messages yet. Say hi!</p>
            ) : (
              chatMessages.map((msg) => {
                const isTeamA = msg.team === 'A';
                return (
                  <div key={msg.id} className="flex flex-col">
                    <span className={`text-[10px] font-bold mb-0.5 ${isTeamA ? 'text-indigo-400' : 'text-rose-400'}`}>
                      {msg.playerName}
                    </span>
                    <div className={`px-3 py-1.5 rounded-lg text-sm w-fit max-w-[90%] break-words shadow-sm ${isTeamA ? 'bg-indigo-950 text-indigo-100 rounded-tl-none border border-indigo-900/50' : 'bg-rose-950 text-rose-100 rounded-tl-none border border-rose-900/50'}`}>
                      {msg.message}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="p-3 bg-slate-800 border-t border-slate-700 flex gap-2" onSubmit={handleSend}>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message..."
              className="flex-1 bg-slate-900 border border-slate-600 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-indigo-500 shadow-inner transition-colors"
              maxLength={200}
            />
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-md">
              Send
            </button>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
}
