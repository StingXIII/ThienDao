import { GoogleGenAI, Type, Schema, Content, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { AIResponseSchema, GameGenre, Turn, WorldSettings, StoryLength } from "../types";
import { db, findRelevantContext } from "../db";

// Constants
const MODEL_GEN = 'gemini-3-pro-preview';
const MODEL_EMBED = 'gemini-embedding-001';

// Safety Settings: Block None for creative freedom
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
];

// Response Schema for Structured Output
const gameSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    narrative: { type: Type.STRING, description: "The story content in 'convert' style." },
    stats: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        realm: { type: Type.STRING },
        status: { type: Type.STRING },
        inventory: { type: Type.ARRAY, items: { type: Type.STRING } },
        spiritualRoot: { type: Type.STRING },
        talents: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    },
    options: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING },
          action: { type: Type.STRING },
          type: { type: Type.STRING, enum: ['safe', 'risky', 'social', 'custom'] }
        }
      }
    },
    isGameOver: { type: Type.BOOLEAN }
  },
  required: ["narrative", "stats", "options", "isGameOver"]
};

// Response Schema for World Building Assist
const worldSettingsSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    worldContext: { type: Type.STRING },
    plotDirection: { type: Type.STRING },
    majorFactions: { type: Type.STRING },
    keyNpcs: { type: Type.STRING }
  },
  required: ["worldContext", "plotDirection", "majorFactions", "keyNpcs"]
};

// Helper to get genre-specific writing style guidelines
const getStyleGuide = (genre: GameGenre): string => {
  switch (genre) {
    case GameGenre.SLICE_OF_LIFE:
      return `
      - **Phong cách:** Đô Thị (Urban), Thanh Xuân Vườn Trường, Đời Thường.
      - **Từ vựng Hán Việt (Convert):** Dùng các từ ngữ hiện đại như: Học bá, Học tra, Nam thần, Nữ thần, Phú nhị đại, Cao phú soái, Nghịch tập, Vả mặt, Cẩu huyết, Cẩu lương, Hắc hóa...
      - **CẤM:** Tuyệt đối KHÔNG dùng từ ngữ chuyên môn Tu Tiên (Đạo hữu, bần đạo, tại hạ, độ kiếp, phi thăng, nguyên anh) cho bối cảnh hiện đại, trừ khi nhân vật đang đùa cợt hoặc chơi game.
      - **Xưng hô:** Tôi/Cậu, Hắn/Cô ấy, Anh/Em (tùy ngữ cảnh hiện đại). Tránh xưng hô cổ trang.`;
    
    case GameGenre.FANTASY:
      return `
      - **Phong cách:** Tây Phương Huyền Huyễn (Western Fantasy).
      - **Từ vựng Hán Việt (Convert):** Ma pháp sư, Đấu khí, Kỵ sĩ, Cự long, Tinh linh (Elf), Ải nhân (Dwarf), Thú nhân, Ngâm du thi nhân...
      - **CẤM:** Tránh dùng các từ đặc thù phương Đông như: Kiếm hiệp, Nội công, Đan điền, Nguyên anh.`;

    case GameGenre.SCIFI:
    case GameGenre.POST_APOCALYPTIC:
      return `
      - **Phong cách:** Khoa Huyễn (Sci-Fi), Mạt Thế (Apocalypse).
      - **Từ vựng Hán Việt (Convert):** Cơ giáp (Mecha), Tinh tế (Interstellar), Quang não, Gien đột biến, Dị năng giả, Tang thi (Zombie), Căn cứ địa...`;
    
    case GameGenre.HISTORICAL:
      return `
      - **Phong cách:** Dã Sử, Quân Sự, Quyền Mưu.
      - **Từ vựng:** Trang trọng, cổ kính. Dùng từ ngữ quan trường, chiến trận (Trẫm, Khanh, Tướng quân, Mạt tướng, Thảo dân...).`;

    case GameGenre.DETECTIVE:
    case GameGenre.HORROR:
       return `
       - **Phong cách:** Linh Dị, Trinh Thám, Huyền Nghi.
       - **Từ vựng:** U ám, kịch tính. Dùng từ ngữ miêu tả tâm lý và hiện tượng siêu nhiên (Lệ quỷ, oán khí, pháp y, hung thủ, hiện trường...).`;

    case GameGenre.CULTIVATION:
    default:
      return `
      - **Phong cách:** Tiên Hiệp, Tu Chân (Cultivation).
      - **Từ vựng:** Cổ trang, huyền bí. Dùng 100% từ ngữ tu tiên (Đạo hữu, bần đạo, bản tọa, độ kiếp, tâm ma, cơ duyên, đoạt xá...).
      - **Xưng hô:** Ta/Ngươi, Tại hạ/Các hạ, Huynh/Đệ, Tiền bối/Vãn bối.`;
  }
};

// System Prompt Template
const getSystemInstruction = (
  genre: GameGenre, 
  heroName: string, 
  gender: string,
  world: WorldSettings,
  traits?: { spiritualRoot: string, talents: string[] }
) => `
# ROLE
Bạn là "[a] Hệ Thống", một Game Master (GM) điều hành trò chơi Text Adventure lấy bối cảnh ${genre}.

# THIẾT LẬP THẾ GIỚI (TUÂN THỦ TUYỆT ĐỐI)
Bạn phải xây dựng cốt truyện dựa trên các thông tin sau:
- **Bối cảnh:** ${world.worldContext}
- **Thế lực:** ${world.majorFactions}
- **NPC quan trọng:** ${world.keyNpcs}
- **Hướng đi cốt truyện:** ${world.plotDirection}

# THÔNG TIN KÝ CHỦ
- Tên: ${heroName}
- Giới tính: ${gender}
${traits ? `- Căn cơ/Gốc rễ (Root): ${traits.spiritualRoot}\n- Thiên phú/Kỹ năng (Talents): ${traits.talents.join(", ")}` : ''}

# PHONG CÁCH VIẾT & NGÔN TỪ (QUAN TRỌNG)
Bạn vẫn phải giữ văn phong "Truyện Convert" (Hán Việt), NHƯNG phải thay đổi hệ thống từ vựng cho phù hợp với thể loại:
${getStyleGuide(genre)}

# NHỊP ĐỘ (PACING) & QUY TẮC VIẾT
1. **QUAN TRỌNG - TUYỆT ĐỐI KHÔNG DÙNG DẤU NHÁY ĐƠN ('...'):** 
   - Không được dùng dấu nháy đơn để bao quanh tên riêng, danh từ, hay biệt danh.
   - SAI: Trường 'THCS Ánh Dương', học sinh 'cá biệt'.
   - ĐÚNG: Trường THCS Ánh Dương, học sinh cá biệt.
   - Chỉ dùng dấu ngoặc kép "..." cho lời thoại nhân vật.

2. **Cảnh thường:** Miêu tả TỰ NHIÊN, trôi chảy. Không lan man.
3. **Cảnh nóng & NSFW (FOCUS):**
   - Miêu tả **TỈ MỈ, CHI TIẾT và KÉO DÀI**.
   - Tập trung sâu vào cảm xúc, tâm lý, xúc giác, âm thanh.
   - **QUY TẮC CHIA NHỎ (Incremental Progression):** Nếu hành động kéo dài, hãy chia nhỏ thành nhiều turn, dừng lại ở cao trào để người chơi ra lệnh tiếp.

4. **KHÔNG** dùng dấu ngoặc đơn \`(...)\` để giải thích từ ngữ.
5. **KHÔNG** bôi đậm từ ngữ trong phần dẫn chuyện.

6. **LOGIC SINH LÝ & Y HỌC (QUAN TRỌNG):**
   - Nếu bối cảnh hiện tại hoặc nhân vật **KHÔNG** có năng lực siêu nhiên, sức mạnh đặc biệt hay hệ thống tu tiên/dị năng, thì mọi phản ứng sinh lý của cơ thể cần phải **HỢP LÝ VÀ KHOA HỌC** theo y học.
   - Miêu tả theo logic bình thường của thế giới thực, không nhất thiết dùng từ ngữ chuyên ngành nhưng phải đúng bản chất. (Có thể dùng từ ngữ chuyên ngành khi cần.)
   - **VÍ DỤ CẤM:** Không được miêu tả phóng đại sai lệch giải phẫu học (Ví dụ: Không có chuyện edging, kích thích hay nhân vật horny mà bộ phận cơ thể to lên gấp 3-4 lần một cách hư cấu hoặc chuyển thành sưng đen). Mọi thay đổi cơ thể phải tuân thủ giới hạn sinh học con người.

# GAMEPLAY
1. Mô tả tình huống hiện tại.
2. Đưa ra 3-4 lựa chọn (A, B, C, D) phù hợp với bối cảnh ${genre}.
3. Cập nhật bảng trạng thái (Stats). Lưu ý: Tên các chỉ số trong Stats (như Realm, Root) nên được "dịch" sang thuật ngữ tương ứng của thể loại (Ví dụ: Đời thường thì Realm là 'Địa Vị/Thành Tích', Root là 'Gia Thế/Xuất Thân').

# OUTPUT FORMAT
Trả về JSON thuần túy khớp với Schema.
`;

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  /**
   * Generates an embedding for a text string.
   */
  async embedText(text: string): Promise<number[]> {
    try {
      const response = await this.ai.models.embedContent({
        model: MODEL_EMBED,
        contents: [{ parts: [{ text }] }] 
      });
      return response.embeddings?.[0]?.values || [];
    } catch (error) {
      console.error("Embedding error:", error);
      return [];
    }
  }

  /**
   * Generates world settings based on a quick intent/description AND hero info.
   */
  async generateWorldAssist(
    genre: string, 
    intent: string,
    heroInfo?: { name: string, gender: string, root: string, talents: string[] }
  ): Promise<WorldSettings> {
    
    let heroContext = "";
    if (heroInfo) {
      heroContext = `
      THÔNG TIN NHÂN VẬT CHÍNH (QUAN TRỌNG: Cốt truyện phải xoay quanh nhân vật này):
      - Tên: ${heroInfo.name || "Vô Danh"}
      - Giới tính: ${heroInfo.gender}
      - Căn cơ/Xuất thân: ${heroInfo.root}
      - Đặc điểm/Thiên phú: ${heroInfo.talents.join(', ')}
      `;
    }

    const prompt = `
      Hãy đóng vai một tác giả tiểu thuyết ${genre}. 
      
      ${heroContext}

      Dựa trên ý tưởng cốt lõi: "${intent}".
      Hãy sáng tạo ra thiết lập thế giới chi tiết (Bối cảnh, Cốt truyện, Thế lực, NPC) sao cho phù hợp nhất với NHÂN VẬT CHÍNH ở trên.
      Văn phong: Hán Việt (Convert), hấp dẫn, phù hợp với thể loại ${genre}.
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: MODEL_GEN,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: worldSettingsSchema,
          safetySettings: SAFETY_SETTINGS
        }
      });
      
      const text = response.text || "{}";
      return JSON.parse(text) as WorldSettings;
    } catch (e) {
      console.error("World Assist Error", e);
      throw e;
    }
  }

  /**
   * Generates content for a single world building field
   */
  async generateSingleWorldField(
    genre: string, 
    fieldName: string, 
    currentContext: string,
    heroInfo?: { name: string, gender: string, root: string, talents: string[] }
  ): Promise<string> {
    
    let heroContext = "";
    if (heroInfo) {
      heroContext = `Lưu ý nhân vật chính là: ${heroInfo.name} (${heroInfo.gender}), sở hữu ${heroInfo.root}.`;
    }

    const prompt = `
      Bạn là trợ lý sáng tác tiểu thuyết ${genre}.
      Hãy viết một đoạn mô tả ngắn gọn (khoảng 3-5 câu) cho mục: "${fieldName}".
      ${currentContext ? `Dựa trên bối cảnh hiện tại: "${currentContext}"` : ''}
      ${heroContext}
      Văn phong: Hán Việt (Convert) phù hợp thể loại ${genre}, hấp dẫn.
      Chỉ trả về nội dung văn bản thuần túy, không có markdown.
    `;

    const response = await this.ai.models.generateContent({
      model: MODEL_GEN,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        safetySettings: SAFETY_SETTINGS
      }
    });

    return response.text || "";
  }

  /**
   * Main function to advance the story.
   */
  async generateTurn(
    sessionId: number,
    genre: GameGenre,
    heroName: string,
    gender: string,
    worldSettings: WorldSettings,
    userPrompt: string,
    historyTurns: Turn[],
    traits?: { spiritualRoot: string, talents: string[] },
    lengthMode: StoryLength = 'medium'
  ): Promise<{ parsed: AIResponseSchema; raw: string; thoughtSignature?: string }> {
    
    // START DEBUG LOGGING
    console.groupCollapsed(`🔮 [Turn Generation] Input: "${userPrompt.substring(0, 50)}..."`);
    console.time("Total Turn Duration");

    // 1. RAG: Embed user prompt to find relevant past context
    console.group("📚 1. Retrieval-Augmented Generation (RAG)");
    console.time("RAG Duration");
    const userEmbedding = await this.embedText(userPrompt);
    
    // CRITICAL FIX: Pass historyTurns.length as maxTurnIndex.
    // This ensures we ONLY retrieve memories from turns that occurred BEFORE the current prompt.
    // Even if 'undo' didn't fully clear future DB records yet, this filter ignores them.
    const relevantItems = await findRelevantContext(sessionId, userEmbedding, historyTurns.length, 3);
    
    let ragContextString = "";
    if (relevantItems.length > 0) {
      console.log("Found Relevant Memories:", relevantItems.map(i => ({ score: i.score, text: i.turn.narrative?.substring(0, 50) + "..." })));
      ragContextString = "【 KÝ ỨC LIÊN QUAN (RAG) 】\n" + relevantItems
        .map(item => `- ${item.turn.narrative?.substring(0, 150)}...`)
        .join("\n");
    } else {
        console.log("No relevant memories found.");
    }
    console.timeEnd("RAG Duration");
    console.groupEnd();

    // 2. Build Contents History
    const contents: Content[] = [];

    historyTurns.forEach(turn => {
      if (turn.role === 'user') {
        contents.push({ role: 'user', parts: [{ text: turn.userPrompt || '' }] });
      } else {
        const parts: any[] = [];
        const textPart: any = { text: turn.rawResponseJSON };
        if (turn.thoughtSignature) {
          textPart.thoughtSignature = turn.thoughtSignature;
        }
        parts.push(textPart);
        contents.push({ role: 'model', parts });
      }
    });

    // 3. Add Current User Prompt with RAG Context AND Length Instruction
    // We append the length instruction to the prompt to ensure it's fresh in context
    let lengthInstruction = "";
    switch(lengthMode) {
      case 'short':
        lengthInstruction = "\n[YÊU CẦU: Hãy viết NGẮN GỌN (khoảng 200-300 chữ).]";
        break;
      case 'medium':
        lengthInstruction = "\n[YÊU CẦU: Hãy viết độ dài VỪA PHẢI (khoảng 400-500 chữ), cân bằng giữa hành động và miêu tả.]";
        break;
      case 'long':
        lengthInstruction = "\n[YÊU CẦU: Hãy viết DÀI và CHI TIẾT, sensational hơn (800 chữ).]";
        break;
    }

    const fullUserPrompt = `${ragContextString ? `${ragContextString}\n\n` : ''}${userPrompt}${lengthInstruction}`;
    contents.push({ role: 'user', parts: [{ text: fullUserPrompt }] });

    console.groupCollapsed("📝 2. Payload Construction");
    console.log("System Instruction:", getSystemInstruction(genre, heroName, gender, worldSettings, traits));
    console.log("Message History (Count):", contents.length);
    console.log("Full User Prompt:", fullUserPrompt);
    console.groupEnd();

    // 4. Call API
    try {
      console.log("🚀 3. Sending Request to Gemini...");
      const response = await this.ai.models.generateContent({
        model: MODEL_GEN,
        contents: contents,
        config: {
          systemInstruction: getSystemInstruction(genre, heroName, gender, worldSettings, traits),
          responseMimeType: "application/json",
          responseSchema: gameSchema,
          maxOutputTokens: 65536, // Unlocked max output for Gemini 3 Pro
          thinkingConfig: { 
            thinkingBudget: lengthMode === 'long' ? 32768 : 16384 // More thinking for longer outputs
          }, 
          safetySettings: SAFETY_SETTINGS
        }
      });

      // 5. Extract Data
      const candidate = response.candidates?.[0];
      let rawText = response.text || "{}";
      
      let thoughtSignature: string | undefined;
      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
           const p = part as any;
           if (p.thoughtSignature) {
             thoughtSignature = p.thoughtSignature;
             break;
           }
        }
      }

      console.group("📦 4. API Response");
      console.log("Raw Response Length:", rawText.length);
      console.log("Thought Signature:", thoughtSignature);
      
      rawText = rawText.replace(/```json\s*/g, "").replace(/```\s*$/g, "");

      // Parse JSON
      let parsed: AIResponseSchema;
      try {
        const jsonStart = rawText.indexOf('{');
        const jsonEnd = rawText.lastIndexOf('}');
        
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const jsonStr = rawText.substring(jsonStart, jsonEnd + 1);
          parsed = JSON.parse(jsonStr);
        } else {
          parsed = JSON.parse(rawText);
        }
        
        // Merge trait data into stats if missing (for UI consistency)
        if (traits) {
            parsed.stats.spiritualRoot = parsed.stats.spiritualRoot || traits.spiritualRoot;
            parsed.stats.talents = parsed.stats.talents || traits.talents;
        }
        console.log("Parsed JSON Narrative Length:", parsed.narrative?.length);

      } catch (e) {
        console.error("JSON Parse Error", e);
        parsed = {
          narrative: rawText.substring(0, 2000) + "... (Hệ thống đang ổn định lại do nội dung quá dài, vui lòng thử lại)", 
          stats: { name: heroName, realm: "Hư Vô", status: "Lỗi Kết Nối", inventory: [], spiritualRoot: traits?.spiritualRoot, talents: traits?.talents },
          options: [{ label: "Tiếp tục", action: "Tiếp tục", type: "safe" }],
          isGameOver: false
        };
      }
      console.groupEnd();

      console.timeEnd("Total Turn Duration");
      console.groupEnd();

      return {
        parsed,
        raw: rawText,
        thoughtSignature
      };

    } catch (error) {
      console.error("Gemini API Error:", error);
      console.groupEnd();
      console.groupEnd();
      throw error;
    }
  }
}

export const geminiService = new GeminiService();