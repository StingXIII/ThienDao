import React, { useEffect, useRef, useState } from 'react';
import { Turn, AIResponseSchema, GameGenre, GameSession, StoryLength } from '../types';

interface GameUIProps {
  session: GameSession;
  turns: Turn[];
  currentStats: AIResponseSchema['stats'] | null;
  currentOptions: AIResponseSchema['options'] | null;
  loading: boolean;
  onOptionClick: (action: string, lengthMode: StoryLength) => void;
  onRegenerate: (turnIndex: number, newPrompt: string, lengthMode: StoryLength) => void;
  onUndo: () => void;
  avatarUrl?: string;
  genre: GameGenre;
  onExit: () => void;
}

// Helper to format narrative text with paragraphs
const NarrativeDisplay: React.FC<{ text: string }> = ({ text }) => {
  // Clean up excessive newlines and split
  const paragraphs = text.split('\n\n').filter(p => p.trim());
  return (
    <div className="prose-content font-serif leading-loose text-justify text-parchment-100">
      {paragraphs.map((p, idx) => (
        <p key={idx} className="mb-4 animate-fade-in drop-shadow-sm">
          {p}
        </p>
      ))}
    </div>
  );
};

// Map genres to UI labels for stats
const getStatLabels = (genre: GameGenre) => {
  switch (genre) {
    case GameGenre.SCIFI:
      return { root: "Genotype", talent: "Mô-đun", realm: "Cấp Bậc" };
    case GameGenre.FANTASY:
      return { root: "Chủng Tộc", talent: "Kỹ Năng", realm: "Rank" };
    case GameGenre.HORROR:
      return { root: "Thể Chất", talent: "Năng Lực", realm: "Tinh Thần" };
    case GameGenre.DETECTIVE:
      return { root: "Xuất Thân", talent: "Sở Trường", realm: "Danh Tiếng" };
    case GameGenre.SLICE_OF_LIFE:
      return { root: "Gia Thế", talent: "Tài Lẻ", realm: "Địa Vị" };
    case GameGenre.POST_APOCALYPTIC:
      return { root: "Dị Năng", talent: "Kỹ Năng", realm: "Cấp Độ" };
    case GameGenre.HISTORICAL:
      return { root: "Thân Phận", talent: "Tài Nghệ", realm: "Quan Phẩm" };
    case GameGenre.CULTIVATION:
    default:
      return { root: "Linh Căn", talent: "Thiên Phú", realm: "Cảnh Giới" };
  }
};

const ACTION_PREFIX = "[HÀNH ĐỘNG]: ";
const SYSTEM_PREFIX = "[HỆ THỐNG]: ";
const ITEMS_PER_PAGE = 10; // 5 User turns + 5 Model turns

export const GameUI: React.FC<GameUIProps> = ({ 
  session,
  turns, 
  currentStats, 
  currentOptions, 
  loading, 
  onOptionClick,
  onRegenerate,
  onUndo,
  avatarUrl,
  genre,
  onExit
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const labels = getStatLabels(genre);
  
  // System Mode State
  const [isSystemMode, setIsSystemMode] = useState(false);
  const [showStatsMobile, setShowStatsMobile] = useState(false);
  
  // NEW: Visibility Toggle for Options
  const [isOptionsVisible, setIsOptionsVisible] = useState(true);

  // NEW: Story Length Mode
  const [lengthMode, setLengthMode] = useState<StoryLength>('medium');

  // NEW: Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  // Exit Confirmation State
  const [exitConfirm, setExitConfirm] = useState(false);
  // Save Toast State
  const [showSaveToast, setShowSaveToast] = useState(false);

  // Edit Modal State
  const [editState, setEditState] = useState<{ isOpen: boolean; turnIndex: number | null; text: string }>({
    isOpen: false,
    turnIndex: null,
    text: ''
  });

  // Calculate pagination
  const totalPages = Math.ceil(turns.length / ITEMS_PER_PAGE) || 1;
  const displayTurns = turns.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Auto-scroll and Auto-page switch logic
  useEffect(() => {
    // If new turns are added (generation), switch to the last page automatically
    // We check if the total pages increased or if we were already on the last page
    const newTotalPages = Math.ceil(turns.length / ITEMS_PER_PAGE) || 1;
    if (newTotalPages > currentPage) {
        setCurrentPage(newTotalPages);
    }
  }, [turns.length]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      const { scrollHeight, clientHeight } = scrollContainerRef.current;
      
      // If we are on the last page, use the auto-scroll to bottom logic
      if (currentPage === totalPages) {
         const isNearBottom = scrollHeight - scrollContainerRef.current.scrollTop - clientHeight < 300;
         if (loading || isNearBottom || turns.length < 5) {
            scrollContainerRef.current.scrollTo({
               top: scrollHeight,
               behavior: 'smooth'
            });
         }
      } else {
         // If we switched to a previous page, scroll to top to start reading
         scrollContainerRef.current.scrollTo({
             top: 0,
             behavior: 'smooth'
         });
      }
    }
  }, [turns, loading, currentPage, totalPages]);

  // Reset confirmation state if user interacts elsewhere or after timeout
  useEffect(() => {
    if (exitConfirm) {
      const timer = setTimeout(() => setExitConfirm(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [exitConfirm]);

  const handleEdit = (index: number, oldPrompt: string) => {
    let cleanText = oldPrompt;
    if (oldPrompt.startsWith(SYSTEM_PREFIX)) {
      cleanText = oldPrompt.replace(SYSTEM_PREFIX, '');
    } else if (oldPrompt.startsWith(ACTION_PREFIX)) {
      cleanText = oldPrompt.replace(ACTION_PREFIX, '');
    }
    setEditState({ isOpen: true, turnIndex: index, text: cleanText });
  };

  const confirmEdit = () => {
    if (editState.turnIndex !== null && editState.text.trim()) {
        const oldTurn = turns[editState.turnIndex];
        let prefix = ACTION_PREFIX;
        if (oldTurn?.userPrompt?.startsWith(SYSTEM_PREFIX)) {
            prefix = SYSTEM_PREFIX;
        }

        onRegenerate(editState.turnIndex, prefix + editState.text, lengthMode);
        setEditState({ isOpen: false, turnIndex: null, text: '' });
    }
  };

  const handleRetry = () => {
      // Find the index of the last user turn
      let lastUserIndex = -1;
      for (let i = turns.length - 1; i >= 0; i--) {
          if (turns[i].role === 'user') {
              lastUserIndex = i;
              break;
          }
      }

      if (lastUserIndex !== -1) {
          const turn = turns[lastUserIndex];
          onRegenerate(lastUserIndex, turn.userPrompt || "", lengthMode);
      }
  };

  const handleExportGame = () => {
      const data = {
          session: session,
          turns: turns
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `td_backup_${session.heroName}_${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
  };

  const handleManualSave = () => {
      setShowSaveToast(true);
      setTimeout(() => setShowSaveToast(false), 2000);
  };

  const handleExitClick = () => {
      if (exitConfirm) {
          onExit();
      } else {
          setExitConfirm(true);
      }
  };

  const formatUserDisplay = (text: string) => {
    if (text.startsWith(SYSTEM_PREFIX)) {
      return (
        <span className="text-arcane-300 font-bold drop-shadow-sm text-glow-purple">
          <i className="fas fa-bolt mr-2 text-xs"></i>
          {text.replace(SYSTEM_PREFIX, '')}
        </span>
      );
    }
    return text.replace(ACTION_PREFIX, '');
  };

  const handleInputSubmit = (value: string) => {
    if (!value.trim()) return;
    const prefix = isSystemMode ? SYSTEM_PREFIX : ACTION_PREFIX;
    onOptionClick(prefix + value, lengthMode);
  };

  // Helper for length mode display
  const getLengthIcon = (mode: StoryLength) => {
    switch (mode) {
      case 'short': return { icon: 'fa-align-left', label: 'Ngắn' };
      case 'medium': return { icon: 'fa-align-justify', label: 'Vừa' };
      case 'long': return { icon: 'fa-align-center', label: 'Dài' };
    }
  };
  
  const cycleLengthMode = () => {
    if (lengthMode === 'short') setLengthMode('medium');
    else if (lengthMode === 'medium') setLengthMode('long');
    else setLengthMode('short');
  };

  const lengthInfo = getLengthIcon(lengthMode);

  return (
    <div className="flex h-screen bg-transparent font-serif overflow-hidden relative selection:bg-gold-500/30 selection:text-gold-200">
      
      {/* BACKGROUND PARTICLES/FOG */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-spirit-500/5 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-arcane-500/5 rounded-full blur-[100px] animate-pulse-slow" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Save Toast Notification */}
      {showSaveToast && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-fade-in bg-ink-900/95 border border-gold-500/50 text-gold-300 px-6 py-3 rounded-full shadow-lg backdrop-blur flex items-center gap-2">
              <i className="fas fa-check-circle text-gold-500"></i>
              <span className="text-sm font-bold tracking-wide">Đã lưu vào Thư Viện Thiên Mệnh!</span>
          </div>
      )}

      {/* EDIT MODAL */}
      {editState.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-ink-900 border border-gold-500/30 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden transform transition-all scale-100">
                <div className="p-4 border-b border-white/5 bg-ink-950 flex justify-between items-center">
                    <h3 className="text-gold-400 font-bold font-display uppercase tracking-wider text-sm">
                        <i className="fas fa-pen-fancy mr-2"></i>Sửa đổi Tiên Cơ
                    </h3>
                    <button 
                        onClick={() => setEditState({ isOpen: false, turnIndex: null, text: '' })} 
                        className="text-ink-500 hover:text-white transition-colors"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>
                <div className="p-6">
                    <textarea 
                        value={editState.text}
                        onChange={(e) => setEditState(prev => ({ ...prev, text: e.target.value }))}
                        className="w-full h-32 bg-ink-950/50 border border-ink-700 rounded-lg p-3 text-parchment-100 focus:border-gold-500/50 outline-none resize-none font-serif leading-relaxed"
                        autoFocus
                    />
                </div>
                <div className="p-4 border-t border-white/5 bg-ink-950/50 flex justify-end gap-3">
                    <button 
                        onClick={() => setEditState({ isOpen: false, turnIndex: null, text: '' })} 
                        className="px-4 py-2 rounded text-sm text-ink-400 hover:text-white transition-colors border border-transparent hover:border-ink-700"
                    >
                        Hủy bỏ
                    </button>
                    <button 
                        onClick={confirmEdit} 
                        className="px-6 py-2 rounded bg-gold-600 hover:bg-gold-500 text-ink-950 font-bold text-sm shadow-lg shadow-gold-900/20 transition-all transform hover:scale-105"
                    >
                        Nghịch Thiên Cải Mệnh
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* LEFT PANEL: MAIN STORY */}
      <div className="flex-1 flex flex-col h-full relative z-10 transition-all duration-300">
        
        {/* HEADER */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-ink-950/80 backdrop-blur-md z-50 shadow-sm relative">
          <div className="flex items-center gap-4">
             <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-400 via-crimson-500 to-arcane-600 flex items-center justify-center text-ink-950 shadow-[0_0_15px_rgba(234,179,8,0.3)]">
               <i className="fas fa-yin-yang fa-spin-slow text-sm text-white"></i>
             </div>
            <h1 className="font-display font-bold text-xl md:text-2xl text-transparent bg-clip-text bg-gradient-to-r from-gold-300 via-parchment-100 to-spirit-300 tracking-wide drop-shadow-sm">
              {currentStats?.name || "Thiên Đạo Simulator"}
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded border border-ink-700 bg-ink-900/50 text-ink-500 uppercase tracking-widest hidden md:inline-block">
              {genre}
            </span>
          </div>
          <div className="flex gap-2">
            <button 
                onClick={handleExitClick}
                className={`
                    p-2 rounded-full transition-all duration-300 flex items-center gap-2 border
                    ${exitConfirm 
                        ? 'bg-crimson-600 text-white border-crimson-500 w-auto px-4 shadow-[0_0_15px_rgba(220,38,38,0.5)]' 
                        : 'text-crimson-500/80 hover:text-crimson-400 hover:bg-ink-800/50 border-transparent w-10 justify-center'}
                `}
                title="Về màn hình chính (Tự động lưu)"
            >
                <i className={`fas ${exitConfirm ? 'fa-exclamation-circle' : 'fa-home'} text-lg`}></i>
                {exitConfirm && <span className="text-xs font-bold animate-fade-in whitespace-nowrap">Thoát?</span>}
            </button>
            <button 
                onClick={handleManualSave}
                className="text-gold-500/80 hover:text-gold-300 p-2 w-10 hover:bg-ink-800/50 rounded-full transition-colors flex items-center justify-center gap-2"
                title="Lưu vào Thư Viện (Save)"
            >
                <i className="fas fa-save text-lg"></i>
            </button>
            <button 
                onClick={handleExportGame}
                className="text-spirit-500/80 hover:text-spirit-300 p-2 w-10 hover:bg-ink-800/50 rounded-full transition-colors flex items-center justify-center gap-2"
                title="Xuất file Backup (Export)"
            >
                <i className="fas fa-file-export text-lg"></i>
            </button>
            <button 
                onClick={() => setShowStatsMobile(!showStatsMobile)}
                className="md:hidden text-parchment-400 p-2 w-10 hover:bg-ink-800/50 rounded-full transition-colors flex items-center justify-center"
            >
                <i className="fas fa-scroll text-xl"></i>
            </button>
          </div>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-4 md:px-20 lg:px-32 py-8 scroll-smooth"
        >
          <div className="max-w-4xl mx-auto space-y-8">
            {turns.length === 0 && (
              <div className="text-center text-parchment-400 mt-20 italic animate-fade-in font-light opacity-60">
                <i className="fas fa-dharmachakra fa-spin-slow text-gold-500/50 text-5xl mb-6"></i>
                <br/>
                <span className="font-display text-xl text-gold-200/80">"Đại đạo vô hình, sinh dục thiên địa..."</span>
              </div>
            )}

            {displayTurns.map((turn, relativeIndex) => {
              // Calculate global index for editing
              const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + relativeIndex;
              
              // MODEL TURN
              if (turn.role === 'model' && turn.narrative) {
                return (
                  <div key={globalIndex} className="relative group">
                    {/* Decorative divider for new sections */}
                    {(relativeIndex > 0 || currentPage > 1) && (
                      <div className="flex justify-center mb-8 opacity-30">
                         <div className="flex items-center gap-2 text-gold-500/50 text-xs">
                             <div className="h-px w-12 bg-gradient-to-r from-transparent to-gold-500/50"></div>
                             <i className="fas fa-star-of-life fa-spin-slow text-[8px]"></i>
                             <div className="h-px w-12 bg-gradient-to-l from-transparent to-gold-500/50"></div>
                         </div>
                      </div>
                    )}
                    
                    <div className="pl-4 md:pl-0 border-l-2 border-transparent md:border-none">
                       <NarrativeDisplay text={turn.narrative} />
                    </div>
                  </div>
                );
              } 
              // USER TURN
              else if (turn.role === 'user' && turn.userPrompt) {
                const isSystemMsg = turn.userPrompt.startsWith(SYSTEM_PREFIX);
                return (
                  <div key={globalIndex} className="flex justify-end my-6 animate-slide-up pl-10">
                     <div className="relative max-w-xl w-full group">
                      <div className={`
                        px-6 py-4 rounded-2xl rounded-tr-sm shadow-xl border backdrop-blur-md relative overflow-hidden
                        ${isSystemMsg 
                          ? 'bg-arcane-900/60 border-arcane-500/50 shadow-[0_4px_20px_rgba(168,85,247,0.15)]' 
                          : 'bg-ink-800/80 border-gold-500/20 shadow-[0_4px_20px_rgba(234,179,8,0.05)]'
                        }
                      `}>
                         {/* Subtle shine effect */}
                         <div className={`absolute inset-0 bg-gradient-to-br pointer-events-none ${isSystemMsg ? 'from-arcane-500/10' : 'from-gold-500/5'} to-transparent`}></div>

                        <div className={`text-[9px] font-bold mb-1 uppercase tracking-[0.2em] flex items-center justify-between gap-4 ${isSystemMsg ? 'text-arcane-300' : 'text-gold-500'}`}>
                          <span className="flex items-center gap-1">
                             <i className={`fas ${isSystemMsg ? 'fa-bolt' : 'fa-comment-alt'} text-[8px]`}></i>
                             {isSystemMsg ? 'Thiên Ý' : 'Mệnh Lệnh'}
                          </span>
                          
                          {/* EDIT BUTTON - Always Visible, High Z-Index */}
                          <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(globalIndex, turn.userPrompt!);
                            }}
                            className="text-ink-500 hover:text-white transition-colors cursor-pointer p-1 rounded hover:bg-white/10 relative z-20"
                            title="Sửa lại"
                          >
                            <i className="fas fa-pen text-xs"></i>
                          </button>
                        </div>
                        <div className="text-parchment-100 text-lg font-medium leading-relaxed italic font-display">
                          {formatUserDisplay(turn.userPrompt)}
                        </div>
                      </div>
                     </div>
                  </div>
                );
              }
              return null;
            })}

            {loading && currentPage === totalPages && (
              <div className="flex flex-col items-center justify-center space-y-4 py-8 opacity-90">
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-2 border-gold-500/10 rounded-full"></div>
                    <div className="absolute inset-0 border-2 border-t-gold-400 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                    <div className="absolute inset-2 border-2 border-t-transparent border-r-crimson-400 border-b-transparent border-l-transparent rounded-full animate-spin-slow direction-reverse"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <i className="fas fa-feather-alt text-gold-500/50 animate-pulse"></i>
                    </div>
                </div>
                <span className="text-gold-400 text-xs tracking-[0.3em] uppercase animate-pulse font-display">Thiên Đạo Diễn Sinh...</span>
              </div>
            )}
            
            {/* PAGINATION CONTROLS */}
            {totalPages > 1 && (
               <div className="flex justify-center items-center gap-4 py-6 border-t border-white/5 mt-8">
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1 || loading}
                    className="w-10 h-10 rounded-full border border-ink-700 bg-ink-900 text-ink-400 hover:text-gold-400 hover:border-gold-500/50 disabled:opacity-30 disabled:hover:text-ink-400 transition-all flex items-center justify-center"
                    title="Trang trước"
                  >
                    <i className="fas fa-chevron-left"></i>
                  </button>
                  
                  <div className="px-4 py-2 bg-ink-950/50 border border-gold-500/20 rounded-lg text-xs font-bold uppercase tracking-widest text-gold-500 shadow-inner">
                     Trang {currentPage} / {totalPages}
                  </div>
                  
                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages || loading}
                    className="w-10 h-10 rounded-full border border-ink-700 bg-ink-900 text-ink-400 hover:text-gold-400 hover:border-gold-500/50 disabled:opacity-30 disabled:hover:text-ink-400 transition-all flex items-center justify-center"
                    title="Trang sau"
                  >
                    <i className="fas fa-chevron-right"></i>
                  </button>
               </div>
            )}
            
            <div ref={bottomRef} className="h-6" />
          </div>
        </div>

        {/* INPUT & CONTROLS AREA */}
        <div className={`
          relative p-4 md:p-6 z-30 transition-all duration-500 border-t border-white/5
          bg-ink-950/90 backdrop-blur-xl
          ${isSystemMode ? 'shadow-[0_-5px_30px_rgba(168,85,247,0.15)] border-t-arcane-500/30' : 'shadow-[0_-5px_30px_rgba(234,179,8,0.1)] border-t-gold-500/10'}
        `}>
          <div className="max-w-4xl mx-auto relative">
            
            {/* Toggle Visibility Button */}
            <div className="absolute -top-12 right-0 flex gap-2">
                 <button
                    onClick={() => setIsOptionsVisible(!isOptionsVisible)}
                    className="w-8 h-8 rounded-full bg-ink-900 border border-ink-700 hover:border-gold-400 text-ink-400 hover:text-gold-400 flex items-center justify-center transition-all shadow-lg backdrop-blur-sm"
                    title={isOptionsVisible ? "Ẩn lựa chọn" : "Hiện lựa chọn"}
                 >
                     <i className={`fas ${isOptionsVisible ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                 </button>
            </div>
            
            {/* Toolbar: Undo / Retry - PROMINENT */}
            <div className="flex justify-between items-center px-1 mb-3">
               <div className="flex gap-3">
                   {/* Undo Button */}
                   <button 
                     onClick={onUndo} 
                     disabled={loading || turns.length === 0}
                     className="bg-ink-900/80 border border-ink-700 hover:border-crimson-500 hover:text-crimson-400 text-ink-500 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                     title="Quay lại lượt trước"
                   >
                     <i className="fas fa-undo"></i> Hoàn tác
                   </button>
                   
                   {/* Retry Button - Only if last turn is model */}
                   {!loading && turns.length > 0 && turns[turns.length-1].role === 'model' && (
                      <button 
                         onClick={handleRetry}
                         className="bg-ink-900/80 border border-ink-700 hover:border-gold-500 hover:text-gold-400 text-ink-500 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
                         title="Thử lại lượt này (Tạo kết quả khác)"
                      >
                         <i className="fas fa-redo"></i> Thử lại
                      </button>
                   )}
               </div>
               <div className="text-[10px] text-ink-600 italic">
                   {isSystemMode ? 'Chế độ Thiên Đạo' : 'Chế độ Nhập Vai'}
               </div>
            </div>

            {/* Options Grid - VIVID COLORS */}
            {!loading && currentOptions && !isSystemMode && isOptionsVisible && (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6 animate-fade-in origin-bottom">
                 {currentOptions.map((opt, idx) => (
                   <button
                     key={idx}
                     onClick={() => onOptionClick(ACTION_PREFIX + opt.action, lengthMode)}
                     className={`
                       group relative p-4 rounded-xl border text-left transition-all duration-300
                       hover:transform hover:-translate-y-1 hover:shadow-lg overflow-hidden
                       glass-panel
                       ${opt.type === 'risky' ? 'border-crimson-500/30 hover:border-crimson-500/70 hover:bg-crimson-900/10' : ''}
                       ${opt.type === 'safe' ? 'border-jade-500/30 hover:border-jade-500/70 hover:bg-jade-900/10' : ''}
                       ${opt.type === 'social' ? 'border-spirit-500/30 hover:border-spirit-500/70 hover:bg-spirit-900/10' : ''}
                       ${opt.type === 'custom' ? 'border-gold-500/30 hover:border-gold-500/70 hover:bg-gold-900/10' : ''}
                     `}
                   >
                     {/* Hover glow */}
                     <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                     
                     <div className="flex items-start relative z-10">
                       <span className={`
                         flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-[10px] font-bold mr-3 border font-display
                         ${opt.type === 'risky' ? 'border-crimson-500/50 text-crimson-400 bg-crimson-900/30' : 
                           opt.type === 'safe' ? 'border-jade-500/50 text-jade-400 bg-jade-900/30' : 
                           opt.type === 'social' ? 'border-spirit-500/50 text-spirit-400 bg-spirit-900/30' : 
                           'border-gold-600 text-gold-400 bg-gold-900/30 group-hover:border-gold-400 group-hover:text-gold-300'}
                       `}>
                         {String.fromCharCode(65 + idx)}
                       </span>
                       <span className="text-parchment-200 font-medium group-hover:text-white transition-colors text-sm font-serif">{opt.label}</span>
                     </div>
                   </button>
                 ))}
               </div>
            )}

            {/* Input Bar */}
            <div className="flex gap-3 relative items-end">
              {/* System Toggle */}
              <button 
                onClick={() => setIsSystemMode(!isSystemMode)}
                className={`
                  flex-shrink-0 w-12 h-12 rounded-xl border flex items-center justify-center transition-all duration-300 relative
                  ${isSystemMode 
                    ? 'bg-arcane-900/60 border-arcane-500 text-arcane-200 shadow-[0_0_15px_rgba(168,85,247,0.3)]' 
                    : 'bg-ink-900/50 border-ink-700 text-ink-500 hover:text-gold-400 hover:border-gold-500/50 hover:bg-ink-800'
                  }
                `}
                title="Chế độ Thiên Đạo (God Mode)"
              >
                <i className={`fas ${isSystemMode ? 'fa-eye' : 'fa-cog'} ${isSystemMode ? 'animate-pulse' : ''}`}></i>
                {isSystemMode && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-arcane-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-arcane-500"></span></span>}
              </button>

              {/* Text Input Container */}
              <div className="flex-1 relative group">
                  {isSystemMode && (
                      <div className="absolute -top-8 left-0 text-[10px] text-arcane-300 font-bold uppercase tracking-widest animate-pulse flex items-center bg-arcane-950/90 px-3 py-1 rounded-full border border-arcane-500/50 shadow-lg backdrop-blur">
                          <i className="fas fa-bolt mr-2 text-arcane-400"></i> Can thiệp Thiên Cơ
                      </div>
                  )}
                  
                  <div className={`
                    flex items-center w-full bg-ink-900/40 border rounded-xl overflow-hidden transition-all duration-300 shadow-inner backdrop-blur-sm
                    ${isSystemMode 
                        ? 'border-arcane-500/30 focus-within:border-arcane-400 focus-within:bg-arcane-900/20 focus-within:shadow-[0_0_20px_rgba(168,85,247,0.1)]' 
                        : 'border-ink-700 focus-within:border-gold-500/50 focus-within:bg-ink-800/60 focus-within:shadow-[0_0_20px_rgba(234,179,8,0.1)]'
                    }
                  `}>
                     {/* Length Selector Button Inside Input Area */}
                     <button
                        onClick={cycleLengthMode}
                        className="pl-3 pr-2 py-3.5 h-full text-ink-500 hover:text-parchment-200 transition-colors flex items-center gap-2 border-r border-white/5"
                        title={`Độ dài phản hồi: ${lengthInfo.label}`}
                     >
                        <i className={`fas ${lengthInfo.icon} text-sm`}></i>
                        <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline-block w-8 text-center">
                            {lengthInfo.label}
                        </span>
                     </button>

                     <input 
                        type="text" 
                        placeholder={isSystemMode ? "Nhập ý chí của Thiên Đạo..." : "Nhập hành động của bạn..."}
                        className="flex-1 bg-transparent px-4 py-3.5 text-parchment-100 focus:outline-none placeholder-ink-600 font-serif"
                        onKeyDown={(e) => {
                           if (e.key === 'Enter' && !loading) {
                              const target = e.target as HTMLInputElement;
                              if (target.value.trim()) {
                                 handleInputSubmit(target.value);
                                 target.value = '';
                              }
                           }
                        }}
                     />
                  </div>
              </div>
              
              {/* Send Button */}
              <button 
                  onClick={(e) => {
                       const inputContainer = e.currentTarget.previousElementSibling;
                       const input = inputContainer?.querySelector('input') as HTMLInputElement;
                       if(input) {
                          handleInputSubmit(input.value);
                          input.value = '';
                       }
                  }}
                  disabled={loading}
                  className={`
                    w-14 h-12 rounded-xl flex items-center justify-center text-lg shadow-lg transition-all duration-300
                    hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border
                    ${isSystemMode 
                        ? 'bg-gradient-to-br from-arcane-600 to-arcane-800 hover:from-arcane-500 hover:to-arcane-700 text-white border-arcane-500/50 shadow-arcane-900/50' 
                        : 'bg-gradient-to-br from-gold-500 to-amber-600 hover:from-gold-400 hover:to-amber-500 text-white border-gold-400/50 shadow-gold-900/50'
                    }
                  `}>
                <i className={`fas ${loading ? 'fa-spinner fa-spin' : isSystemMode ? 'fa-bolt' : 'fa-paper-plane'}`}></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: STATS SIDEBAR */}
      <div className={`
        fixed inset-y-0 right-0 w-80 bg-ink-950/90 backdrop-blur-2xl border-l border-white/5 transform transition-transform duration-300 z-40 shadow-2xl
        md:relative md:transform-none md:w-80 md:bg-ink-950/30 md:shadow-none
        ${showStatsMobile ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
      `}>
        {/* Mobile Close Button */}
        <button 
          onClick={() => setShowStatsMobile(false)}
          className="md:hidden absolute top-4 left-4 text-parchment-300 hover:text-white"
        >
          <i className="fas fa-times text-xl"></i>
        </button>

        {currentStats ? (
          <div className="h-full overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-ink-700">
            {/* Character Header */}
            <div className="flex flex-col items-center mb-8 relative">
              <div className="relative group cursor-pointer animate-float">
                <div className="w-24 h-24 rounded-full p-[2px] bg-gradient-to-tr from-gold-400 via-crimson-500 to-spirit-500 shadow-[0_0_30px_rgba(234,179,8,0.2)]">
                   <div className="w-full h-full rounded-full overflow-hidden bg-ink-950 border-2 border-ink-900">
                     <img 
                      src={avatarUrl || `https://picsum.photos/seed/${currentStats.name}/200`} 
                      alt="Avatar" 
                      className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-all duration-500 hover:scale-110" 
                    />
                   </div>
                </div>
                {/* Rank Badge */}
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-ink-900 border border-gold-500/50 px-3 py-1 rounded-full text-[9px] font-bold text-gold-300 uppercase whitespace-nowrap shadow-lg tracking-widest font-display">
                  {currentStats.realm?.split(' ')[0] || 'Phàm Nhân'}
                </div>
              </div>
              <h2 className="mt-6 text-2xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-parchment-100 to-parchment-300 text-center drop-shadow">{currentStats.name}</h2>
              <div className="text-ink-500 text-[9px] uppercase tracking-[0.2em] mt-1 font-bold">{labels.realm}</div>
              <div className="text-gold-300 text-sm mt-0.5 font-bold drop-shadow-sm font-display">{currentStats.realm}</div>
            </div>

            {/* Stats Cards */}
            <div className="space-y-4">
              {/* Status */}
              <div className="glass-panel rounded-xl p-4 hover:border-crimson-500/30 transition-colors group">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 rounded bg-ink-900 flex items-center justify-center text-crimson-400 group-hover:scale-110 transition-transform">
                      <i className="fas fa-heart-pulse text-xs"></i>
                  </div>
                  <span className="text-[9px] font-bold text-ink-500 uppercase tracking-wide">Trạng Thái</span>
                </div>
                <div className="text-sm text-parchment-200 leading-relaxed font-serif border-l-2 border-crimson-500/20 pl-3">
                    {currentStats.status}
                </div>
              </div>

              {/* Origin / Root */}
              {currentStats.spiritualRoot && (
                <div className="glass-panel rounded-xl p-4 relative overflow-hidden group hover:border-gold-500/30 transition-colors">
                  <div className="absolute -right-4 -top-4 text-6xl text-gold-500/5 group-hover:text-gold-500/10 transition-colors pointer-events-none rotate-12">
                    <i className="fas fa-atom"></i>
                  </div>
                  <div className="flex items-center gap-2 mb-2 relative z-10">
                    <div className="w-5 h-5 rounded bg-ink-900 flex items-center justify-center text-gold-400 group-hover:scale-110 transition-transform">
                        <i className="fas fa-dna text-xs"></i>
                    </div>
                    <span className="text-[9px] font-bold text-ink-500 uppercase tracking-wide">{labels.root}</span>
                  </div>
                  <div className="text-sm font-bold text-gold-200 relative z-10 font-display tracking-wide border-l-2 border-gold-500/20 pl-3">
                      {currentStats.spiritualRoot}
                  </div>
                </div>
              )}

              {/* Talents */}
              {currentStats.talents && currentStats.talents.length > 0 && (
                <div className="glass-panel rounded-xl p-4 hover:border-arcane-500/30 transition-colors">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded bg-ink-900 flex items-center justify-center text-arcane-400">
                        <i className="fas fa-star text-xs"></i>
                    </div>
                    <span className="text-[9px] font-bold text-ink-500 uppercase tracking-wide">{labels.talent}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {currentStats.talents.map((t, i) => (
                      <span key={i} className="text-[10px] bg-arcane-500/10 border border-arcane-500/20 px-2 py-1 rounded text-arcane-200 hover:bg-arcane-500/20 transition-colors cursor-default font-medium">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Inventory */}
              <div className="mt-8 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-gold-500 uppercase tracking-wide flex items-center gap-2">
                    <i className="fas fa-box-open"></i> Hành Trang
                  </h3>
                  <span className="text-[9px] text-ink-600 bg-ink-900 px-1.5 rounded">{currentStats.inventory?.length || 0}</span>
                </div>
                <ul className="space-y-1 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-ink-800">
                  {currentStats.inventory && currentStats.inventory.length > 0 ? (
                    currentStats.inventory.map((item, i) => (
                      <li key={i} className="flex items-center group p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/5">
                         <div className="w-7 h-7 rounded bg-ink-950 border border-ink-800 flex items-center justify-center mr-3 text-ink-600 group-hover:text-gold-500 group-hover:border-gold-500/30 transition-all">
                           <i className="fas fa-cube text-[10px]"></i>
                         </div>
                         <span className="text-sm text-parchment-300 group-hover:text-parchment-100 font-serif">{item}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-center py-6 text-ink-700 italic text-xs border border-dashed border-ink-800 rounded-lg">
                       Không có vật phẩm
                    </li>
                  )}
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-6 border-t border-white/5 text-center">
              <div className="text-[9px] text-ink-700 uppercase tracking-widest font-bold font-display opacity-50">
                Thien Dao Simulator • Created by Zesty
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-ink-600 p-6 text-center">
            <div className="w-16 h-16 rounded-full border-2 border-ink-800 flex items-center justify-center mb-4 opacity-50">
               <i className="fas fa-scroll text-2xl"></i>
            </div>
            <p className="text-xs mt-2 font-display uppercase tracking-widest">Đang tải dữ liệu...</p>
          </div>
        )}
      </div>
      
      {/* Overlay for mobile sidebar */}
      {showStatsMobile && (
        <div 
          className="fixed inset-0 bg-black/80 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setShowStatsMobile(false)}
        />
      )}
    </div>
  );
};