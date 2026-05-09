import { useState } from 'react';

export default function Lobby({ onCreateRoom, onJoinRoom, playerName, setPlayerName }) {
  const [roomCode, setRoomCode] = useState('');
  const [activeTab, setActiveTab] = useState('create');
  const [error, setError] = useState('');

  const handleCreate = () => {
    if (!playerName.trim()) return setError('Please enter your name');
    setError('');
    onCreateRoom(playerName.trim());
  };

  const handleJoin = () => {
    if (!playerName.trim()) return setError('Please enter your name');
    if (!roomCode.trim()) return setError('Please enter a room code');
    setError('');
    onJoinRoom(roomCode.trim().toUpperCase(), playerName.trim());
  };

  return (
    <div className="h-screen bg-slate-950 flex flex-col items-center justify-center p-3 sm:p-4 relative overflow-hidden text-slate-200">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-600/20 rounded-full blur-[120px]"></div>
        {/* Floating background cards — hidden on tiny screens */}
        <div className="hidden sm:block absolute top-[20%] left-[15%] text-6xl opacity-10 rotate-12 select-none">🂡</div>
        <div className="hidden sm:block absolute bottom-[25%] left-[20%] text-6xl opacity-10 -rotate-12 select-none">🂱</div>
        <div className="hidden sm:block absolute top-[30%] right-[15%] text-6xl opacity-10 -rotate-6 select-none text-red-500">🃁</div>
        <div className="hidden sm:block absolute bottom-[20%] right-[20%] text-6xl opacity-10 rotate-12 select-none text-red-500">🃑</div>
      </div>

      {/* Card — full width on mobile, capped on desktop */}
      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden z-10 flex flex-col">

        {/* ── Header ── */}
        <div className="px-4 py-3 md:py-6 md:px-8 text-center bg-slate-900/50 border-b border-slate-800 relative overflow-hidden flex-shrink-0">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500"></div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl md:text-5xl">🃏</span>
            <h1 className="text-2xl md:text-4xl font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-rose-400 bg-clip-text text-transparent">BID 6</h1>
          </div>
          <p className="text-slate-400 font-medium text-[10px] md:text-sm mt-0.5">A 6-Player Trick-Taking Game</p>
        </div>

        {/* ── Form body ── */}
        <div className="px-4 py-3 md:px-8 md:py-5 flex-shrink-0">
          {/* Name input */}
          <div className="mb-3 md:mb-5">
            <label className="block text-[10px] md:text-sm font-bold text-slate-400 mb-1 uppercase tracking-wide" htmlFor="playerName">Your Name</label>
            <input
              id="playerName"
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (activeTab === 'create' ? handleCreate() : handleJoin())}
              placeholder="Enter your name..."
              maxLength={15}
              className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-3 py-2 md:py-3 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600 shadow-inner"
            />
          </div>

          {/* Tab switcher */}
          <div className="flex bg-slate-950 p-1 rounded-lg mb-3 md:mb-5 border border-slate-800 shadow-inner">
            <button
              className={`flex-1 py-1.5 rounded-md text-xs md:text-sm font-bold transition-all ${activeTab === 'create' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
              onClick={() => setActiveTab('create')}
            >
              Create Room
            </button>
            <button
              className={`flex-1 py-1.5 rounded-md text-xs md:text-sm font-bold transition-all ${activeTab === 'join' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
              onClick={() => setActiveTab('join')}
            >
              Join Room
            </button>
          </div>

          {/* Tab content */}
          <div className="min-h-[90px] md:min-h-[130px]">
            {activeTab === 'create' ? (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <p className="text-slate-400 text-[11px] md:text-sm mb-2 md:mb-4 text-center">Create a new game room and invite your friends!</p>
                <button onClick={handleCreate} className="w-full py-2.5 md:py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm md:text-base font-bold shadow-lg shadow-indigo-500/25 transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2">
                  <span>🎮</span> Create Game Room
                </button>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="mb-2 md:mb-4">
                  <label className="block text-[10px] md:text-sm font-bold text-slate-400 mb-1 uppercase tracking-wide" htmlFor="roomCode">Room Code</label>
                  <input
                    id="roomCode"
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                    placeholder="6-DIGIT CODE"
                    maxLength={6}
                    className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-3 py-2 md:py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600 text-center tracking-[0.3em] font-mono text-base md:text-xl uppercase shadow-inner"
                  />
                </div>
                <button onClick={handleJoin} className="w-full py-2.5 md:py-3.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm md:text-base font-bold shadow-lg shadow-rose-500/25 transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2">
                  <span>🚪</span> Join Game Room
                </button>
              </div>
            )}
            {error && <div className="mt-2 p-2 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400 text-[10px] md:text-sm text-center font-medium animate-in fade-in">{error}</div>}
          </div>
        </div>

        {/* ── Quick Rules ── */}
        <div className="bg-slate-900/50 px-4 py-3 md:px-6 md:py-4 border-t border-slate-800 flex-shrink-0">
          <h3 className="text-slate-300 font-bold text-[10px] md:text-sm mb-1.5 flex items-center gap-1.5">
            <span>📜</span> Quick Rules
          </h3>
          <ul className="text-[9px] md:text-xs text-slate-400 space-y-1">
            <li className="flex gap-1.5 items-start"><span className="text-indigo-400 mt-px">•</span> 6 players, 2 teams (alternating seats)</li>
            <li className="flex gap-1.5 items-start"><span className="text-indigo-400 mt-px">•</span> 48-card deck, 8 cards each</li>
            <li className="flex gap-1.5 items-start"><span className="text-indigo-400 mt-px">•</span> Bid 6–8 tricks (or forced bid of 5)</li>
            <li className="flex gap-1.5 items-start"><span className="text-indigo-400 mt-px">•</span> Bid winner picks the trump suit</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
