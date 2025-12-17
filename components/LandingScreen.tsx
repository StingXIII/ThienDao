import React, { useRef, useState, useEffect } from 'react';
import { GameSession, Turn } from '../types';
import { db } from '../db';

interface LandingScreenProps {
  onNewGame: () => void;
  onLoadGame: (session: GameSession, turns: Turn[]) => void;
  onContinueSession: (sessionId: number) => void;
}

export const LandingScreen: React.FC<LandingScreenProps> = ({ onNewGame, onLoadGame, onContinueSession }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);

  // Load sessions from DB on mount
  useEffect(() => {
    db.sessions.orderBy('createdAt').reverse().toArray().then(setSessions);
  }, []);

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  const handleDeleteSession = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (window.confirm("Bạn có chắc muốn xóa thiên mệnh này? Hành động không thể hoàn tác.")) {
      try {
        await db.sessions.delete(id);
        await db.turns.where('sessionId').equals(id).delete();
        setSessions(prev => prev.filter(s => s.id !== id));
      } catch (err) {
        console.error("Delete failed", err);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.session && data.turns) {
           onLoadGame(data.session, data.turns);
        } else {
           alert("File save không hợp lệ hoặc bị lỗi.");
        }
      } catch (err) {
        console.error(err);
        alert("Không thể đọc file save.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-transparent relative overflow-hidden font-serif selection:bg-gold-500/30 selection:text-gold-200">
      
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 fixed">
        <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-arcane-500/10 rounded-full blur-[150px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-gold-500/5 rounded-full blur-[120px] animate-pulse-slow" style={{animationDelay: '2s'}}></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30"></div>
      </div>

      <div className="relative z-10 w-full max-w-5xl px-6 flex flex-col items-center space-y-12 py-10">
        
        {/* Title Section */}
        <div className="space-y-4 animate-fade-in text-center">
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-gold-400 via-crimson-500 to-arcane-600 flex items-center justify-center text-ink-950 shadow-[0_0_40px_rgba(234,179,8,0.5)] ring-4 ring-ink-900 ring-offset-4 ring-offset-gold-500/40 mb-8 transform hover:scale-105 transition-transform duration-700">
               <i className="fas fa-yin-yang fa-spin-slow text-5xl text-white drop-shadow-md"></i>
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold-300 via-parchment-100 to-spirit-300 drop-shadow-[0_0_25px_rgba(234,179,8,0.3)] pb-2">
              Thiên Đạo
            </h1>
            <h2 className="text-2xl md:text-3xl font-display text-gold-500/80 tracking-[0.4em] uppercase font-light border-t border-b border-gold-500/30 py-3 relative inline-block">
              <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-gold-500 rotate-45"></span>
              Simulator
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-gold-500 rotate-45"></span>
            </h2>
        </div>

        {/* Action Buttons */}
        <div className="w-full max-w-lg space-y-4 animate-slide-up" style={{animationDelay: '0.2s'}}>
          <button 
            onClick={onNewGame}
            className="group w-full relative py-4 px-6 bg-ink-900/60 hover:bg-gold-900/20 border border-gold-500/40 hover:border-gold-400 rounded-xl backdrop-blur-md transition-all duration-300 overflow-hidden shadow-[0_0_20px_rgba(234,179,8,0.1)] hover:shadow-[0_0_30px_rgba(234,179,8,0.3)]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-gold-500/0 via-gold-500/10 to-gold-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            <div className="flex items-center justify-center gap-4">
               <i className="fas fa-scroll text-gold-400 group-hover:scale-110 transition-transform text-xl"></i>
               <span className="text-xl font-bold text-parchment-100 group-hover:text-white tracking-wide font-display">Khởi Tạo Thế Giới Mới</span>
            </div>
          </button>

          {/* CONTINUE / LIBRARY BUTTON - UPDATED */}
          <button 
            onClick={() => setShowLibrary(true)}
            className="group w-full relative py-4 px-6 bg-ink-900/60 hover:bg-arcane-900/20 border border-arcane-500/30 hover:border-arcane-400 rounded-xl backdrop-blur-md transition-all duration-300 overflow-hidden shadow-lg hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]"
          >
             <div className="absolute inset-0 bg-gradient-to-r from-arcane-500/0 via-arcane-500/10 to-arcane-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
             <div className="flex items-center justify-center gap-4">
               <i className="fas fa-book-journal-whills text-arcane-400 group-hover:scale-110 transition-transform text-xl"></i>
               <div className="flex flex-col items-start">
                   <span className="text-lg font-bold text-parchment-100 group-hover:text-white tracking-wide font-display">Thư Viện Thiên Mệnh</span>
                   <span className="text-[10px] text-ink-400 uppercase tracking-widest group-hover:text-arcane-300 transition-colors">Tiếp tục hành trình ({sessions.length})</span>
               </div>
            </div>
          </button>

          <button 
            onClick={handleLoadClick}
            className="group w-full relative py-3 px-6 bg-ink-900/60 hover:bg-spirit-900/20 border border-spirit-500/30 hover:border-spirit-400 rounded-xl backdrop-blur-md transition-all duration-300 overflow-hidden shadow-lg hover:shadow-[0_0_20px_rgba(34,211,238,0.2)]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-spirit-500/0 via-spirit-500/10 to-spirit-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            <div className="flex items-center justify-center gap-3">
               <i className="fas fa-file-import text-spirit-400 group-hover:scale-110 transition-transform"></i>
               <span className="text-sm font-bold text-parchment-300 group-hover:text-white tracking-wide">Nhập File Backup (JSON)</span>
            </div>
          </button>
          
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
        </div>

        {/* Footer */}
        <div className="text-[10px] text-ink-500 uppercase tracking-widest font-bold flex flex-wrap justify-center gap-4 mt-auto">
           <span>v1.3 Eternal Return</span>
           <span className="text-gold-500/50 hidden md:inline">•</span>
           <span className="text-gold-400">Created by Zesty</span>
           <span className="text-gold-500/50 hidden md:inline">•</span>
           <span>Powered by Gemini 3.0</span>
        </div>
      </div>

      {/* LIBRARY MODAL */}
      {showLibrary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
             <div className="bg-ink-950 border border-arcane-500/30 rounded-2xl w-full max-w-5xl max-h-[85vh] flex flex-col shadow-2xl relative overflow-hidden">
                {/* Modal Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-ink-900/50">
                    <div className="flex items-center gap-3">
                        <i className="fas fa-history text-arcane-400 text-xl"></i>
                        <h2 className="text-2xl font-display font-bold text-parchment-100">Lịch Sử Luân Hồi</h2>
                        <span className="bg-ink-800 text-ink-400 px-2 py-0.5 rounded text-xs font-bold">{sessions.length}</span>
                    </div>
                    <button 
                        onClick={() => setShowLibrary(false)} 
                        className="w-8 h-8 rounded-full bg-ink-800 text-ink-400 hover:text-white hover:bg-crimson-900/50 hover:border-crimson-500 border border-transparent transition-all flex items-center justify-center"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-arcane-500/20 scrollbar-track-ink-900">
                    {sessions.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-ink-600 space-y-4 opacity-50 min-h-[300px]">
                           <i className="fas fa-scroll text-6xl"></i>
                           <p className="text-lg font-display">Chưa có thiên mệnh nào được lưu.</p>
                           <p className="text-sm">Hãy khởi tạo thế giới mới để bắt đầu hành trình.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {sessions.map((session) => (
                                <div 
                                key={session.id}
                                onClick={() => { onContinueSession(session.id!); setShowLibrary(false); }}
                                className="group relative bg-ink-900 hover:bg-ink-800 border border-white/5 hover:border-gold-500/50 rounded-xl p-5 cursor-pointer transition-all duration-300 hover:shadow-[0_0_25px_rgba(234,179,8,0.15)] hover:-translate-y-1 overflow-hidden"
                                >
                                    {/* Bg Decoration */}
                                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-2xl group-hover:from-gold-500/10 transition-colors"></div>

                                    <div className="flex items-start gap-4 relative z-10">
                                        <div className="w-14 h-14 rounded-full bg-ink-950 border border-ink-700 overflow-hidden flex-shrink-0 shadow-lg group-hover:border-gold-500/50 transition-colors">
                                        {session.avatarUrl ? (
                                            <img src={session.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-ink-600 bg-ink-950">
                                                <i className="fas fa-user text-xl"></i>
                                            </div>
                                        )}
                                        </div>
                                        <div className="flex-1 min-w-0 pt-0.5">
                                            <h4 className="text-parchment-100 font-bold font-display text-lg truncate group-hover:text-gold-400 transition-colors">
                                                {session.heroName}
                                            </h4>
                                            <div className="text-[10px] text-ink-500 uppercase tracking-wider font-bold mt-1 flex items-center gap-2">
                                                <span className="bg-ink-950 px-1.5 py-0.5 rounded border border-ink-800">{session.genre}</span>
                                                <span>{session.gender}</span>
                                            </div>
                                            <div className="text-[10px] text-ink-600 mt-2 flex items-center gap-1">
                                                <i className="far fa-clock"></i>
                                                {new Date(session.createdAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                        
                                        <button
                                            onClick={(e) => handleDeleteSession(e, session.id!)}
                                            className="absolute top-4 right-4 text-ink-700 hover:text-crimson-500 p-1.5 rounded-md hover:bg-crimson-900/10 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Xóa vĩnh viễn"
                                        >
                                            <i className="fas fa-trash-alt"></i>
                                        </button>
                                    </div>
                                    
                                    {/* Action Text */}
                                    <div className="mt-4 pt-3 border-t border-white/5 flex justify-end">
                                        <span className="text-xs text-ink-500 group-hover:text-gold-400 font-bold tracking-wide flex items-center gap-1 transition-colors">
                                            Tiếp tục <i className="fas fa-arrow-right text-[10px]"></i>
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
             </div>
        </div>
      )}
    </div>
  );
};