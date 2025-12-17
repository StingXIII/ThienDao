import React, { useState } from 'react';
import { db } from './db';
import { geminiService } from './services/geminiService';
import { GameSession, Turn, GameGenre, AIResponseSchema, WorldSettings, CharacterTraits, StoryLength } from './types';
import { SettingsScreen } from './components/SettingsScreen';
import { GameUI } from './components/GameUI';
import { LandingScreen } from './components/LandingScreen';

type AppStep = 'landing' | 'settings' | 'game';

function App() {
  const [step, setStep] = useState<AppStep>('landing');

  const [session, setSession] = useState<GameSession | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Derived state from the latest model turn
  const [currentStats, setCurrentStats] = useState<AIResponseSchema['stats'] | null>(null);
  const [currentOptions, setCurrentOptions] = useState<AIResponseSchema['options'] | null>(null);

  // 1. Settings (Character + World) Handler -> Start Game
  const startGame = async (
    basicInfo: { name: string; genre: GameGenre; gender: string; avatarUrl?: string },
    worldSettings: WorldSettings, 
    traits: CharacterTraits
  ) => {
    
    const newSession: GameSession = {
      heroName: basicInfo.name,
      gender: basicInfo.gender,
      genre: basicInfo.genre,
      worldSettings: worldSettings,
      characterTraits: traits,
      avatarUrl: basicInfo.avatarUrl,
      createdAt: Date.now()
    };
    
    const id = await db.sessions.add(newSession);
    const sessionWithId = { ...newSession, id: id as number };
    setSession(sessionWithId);
    setTurns([]); // Reset UI
    setStep('game');
    
    // Initial Prompt to start the game
    // Note: We use the generic labels 'Linh Căn'/'Thiên Phú' in prompt for consistency, 
    // or we can let Gemini infer from the context.
    const traitsDesc = `Căn cơ/Đặc điểm: ${traits.spiritualRoot}, Kỹ năng/Thiên phú: ${traits.talents.join(', ')}.` 
      
    // Manually add prefix because geminiService no longer adds it by default
    const initialPrompt = `[HÀNH ĐỘNG]: Khởi tạo nhân vật giới tính ${basicInfo.gender} tên là ${basicInfo.name}. ${traitsDesc} Bắt đầu cốt truyện theo thiết lập thế giới đã cung cấp.`;
    handleTurn(sessionWithId, initialPrompt, [], 'medium'); 
  };

  // 1b. Restore Game Session (Load Game from JSON File)
  const restoreSession = async (savedSession: GameSession, savedTurns: Turn[]) => {
    console.group("📂 Restoring Session from File");
    
    // Store in DB as a NEW session
    const newSessionId = await db.sessions.add({ ...savedSession, id: undefined, createdAt: Date.now() });
    const sessionWithId = { ...savedSession, id: newSessionId as number };
    
    const turnsWithNewId = savedTurns.map(t => ({ ...t, id: undefined, sessionId: newSessionId as number }));
    await db.turns.bulkAdd(turnsWithNewId);

    setSession(sessionWithId);
    setTurns(turnsWithNewId);
    
    restoreDerivedState(turnsWithNewId);

    setStep('game');
    console.groupEnd();
  };

  // 1c. Continue Existing Session (Load Game from DB)
  const continueSession = async (sessionId: number) => {
    setLoading(true);
    try {
      const savedSession = await db.sessions.get(sessionId);
      if (!savedSession) {
         alert("Không tìm thấy dữ liệu thiên mệnh này.");
         return;
      }

      const savedTurns = await db.turns.where('sessionId').equals(sessionId).sortBy('turnIndex');
      
      setSession(savedSession);
      setTurns(savedTurns);
      
      restoreDerivedState(savedTurns);

      setStep('game');
    } catch (e) {
      console.error(e);
      alert("Lỗi khi hồi sinh thiên mệnh.");
    } finally {
      setLoading(false);
    }
  };

  // Helper to restore stats from last turn
  const restoreDerivedState = (history: Turn[]) => {
    const lastModelTurn = [...history].reverse().find(t => t.role === 'model');
    if (lastModelTurn && lastModelTurn.rawResponseJSON) {
        try {
            const parsed = JSON.parse(lastModelTurn.rawResponseJSON);
            setCurrentStats(parsed.stats);
            setCurrentOptions(parsed.options);
        } catch(e) { console.error("Failed to parse last turn state", e); }
    } else {
      setCurrentStats(null);
      setCurrentOptions(null);
    }
  };

  const handleTurn = async (
    currentSession: GameSession, 
    userPrompt: string, 
    history: Turn[],
    lengthMode: StoryLength
  ) => {
    setLoading(true);

    try {
      const turnIndex = history.length;

      // 1. Add User Turn to State (Optimistic UI) & DB
      const userTurn: Turn = {
        sessionId: currentSession.id!,
        turnIndex: turnIndex,
        role: 'user',
        userPrompt: userPrompt
      };
      
      // Save User Turn
      await db.turns.add(userTurn);
      
      // Update UI state with user message
      const updatedHistory = [...history, userTurn];
      setTurns(updatedHistory);

      // 2. Call Gemini
      const { parsed, raw, thoughtSignature } = await geminiService.generateTurn(
        currentSession.id!,
        currentSession.genre,
        currentSession.heroName,
        currentSession.gender,
        currentSession.worldSettings,
        userPrompt,
        history,
        currentSession.characterTraits,
        lengthMode
      );

      // 3. Generate Embedding for the narrative (for future RAG)
      const embedding = await geminiService.embedText(parsed.narrative);

      // 4. Create Model Turn
      const modelTurn: Turn = {
        sessionId: currentSession.id!,
        turnIndex: turnIndex + 1,
        role: 'model',
        narrative: parsed.narrative,
        rawResponseJSON: raw,
        embedding: embedding,
        thoughtSignature: thoughtSignature
      };

      // 5. Save Model Turn
      await db.turns.add(modelTurn);

      // 6. Update UI
      setTurns([...updatedHistory, modelTurn]);
      setCurrentStats(parsed.stats);
      setCurrentOptions(parsed.options);

    } catch (error) {
      console.error("Game Loop Error:", error);
      alert("Hệ thống gặp trục trặc (API Error). Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const onOptionClick = (action: string, lengthMode: StoryLength) => {
    if (session) {
      handleTurn(session, action, turns, lengthMode);
    }
  };

  const onRegenerate = async (index: number, newPrompt: string, lengthMode: StoryLength) => {
    if (!session) return;
    
    const keptTurns = turns.slice(0, index); 
    
    // Delete from DB (simple implementation)
    await db.turns
      .where('sessionId').equals(session.id!)
      .and(t => t.turnIndex >= index)
      .delete();

    setTurns(keptTurns);
    
    handleTurn(session, newPrompt, keptTurns, lengthMode);
  };

  const onUndo = async () => {
    if (!session || turns.length === 0) return;
    
    // Usually turns come in pairs (User -> Model).
    // Logic: If last is model, remove model and user. If last is user (rare), remove user.
    
    const newTurns = [...turns];
    let itemsToRemove = 0;
    
    if (newTurns.length > 0) {
        const last = newTurns[newTurns.length - 1];
        if (last.role === 'model') {
            itemsToRemove = 2; // Remove Model + User
        } else {
            itemsToRemove = 1; // Just User
        }
    }
    
    if (itemsToRemove === 0 || newTurns.length < itemsToRemove) return;

    const keptTurns = newTurns.slice(0, newTurns.length - itemsToRemove);
    
    // DB Update: Delete turns with index >= keptTurns.length
    await db.turns
        .where('sessionId').equals(session.id!)
        .and(t => t.turnIndex >= keptTurns.length)
        .delete();
        
    setTurns(keptTurns);
    restoreDerivedState(keptTurns);
  };

  // --- RENDER LOGIC ---

  if (step === 'landing') {
    return (
      <LandingScreen 
        onNewGame={() => setStep('settings')}
        onLoadGame={restoreSession}
        onContinueSession={continueSession}
      />
    );
  }

  if (step === 'settings') {
    return (
      <SettingsScreen 
        onConfirm={startGame}
        onBack={() => setStep('landing')}
      />
    );
  }

  if (step === 'game' && session) {
    return (
      <GameUI 
        session={session}
        turns={turns}
        currentStats={currentStats}
        currentOptions={currentOptions}
        loading={loading}
        onOptionClick={onOptionClick}
        onRegenerate={onRegenerate}
        onUndo={onUndo}
        avatarUrl={session.avatarUrl}
        genre={session.genre}
        onExit={() => {
          setStep('landing');
          setSession(null);
        }}
      />
    );
  }

  return null;
}

export default App;