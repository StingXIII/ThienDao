import React, { useState, useEffect, useRef } from 'react';
import { GameGenre, WorldSettings, CharacterTraits } from '../types';
import { geminiService } from '../services/geminiService';

interface SettingsScreenProps {
  onConfirm: (
    basicInfo: { name: string; genre: GameGenre; gender: string; avatarUrl?: string },
    world: WorldSettings, 
    traits: CharacterTraits
  ) => void;
  onBack: () => void;
}

// --- Dynamic Data Structure ---

type GenreData = {
  rootLabel: string;
  talentLabel: string;
  roots: { name: string; color: string; rarity: string; weight: number }[];
  talents: string[];
  preset: WorldSettings;
};

// --- DATA EXPANSION & REBALANCING ---
const GENRE_DATA: Record<GameGenre, GenreData> = {
  [GameGenre.CULTIVATION]: {
    rootLabel: "Linh Căn / Thể Chất",
    talentLabel: "Thiên Phú / Cơ Duyên",
    roots: [
      // Top Tier (0.5 - 2%)
      { name: 'Hồng Mông Đạo Thể', color: 'text-arcane-400 text-glow-purple', rarity: 'Chí Tôn', weight: 1 },
      { name: 'Hỗn Độn Linh Căn', color: 'text-purple-400', rarity: 'Truyền Thuyết', weight: 2 },
      { name: 'Tiên Thiên Đạo Thai', color: 'text-gold-300', rarity: 'Truyền Thuyết', weight: 3 },
      { name: 'Hoang Cổ Thánh Thể', color: 'text-gold-500 text-glow-gold', rarity: 'Thần Thoại', weight: 3 },
      { name: 'Thương Thiên Bá Thể', color: 'text-crimson-500 text-glow-crimson', rarity: 'Thần Thoại', weight: 3 },
      { name: 'Chí Tôn Cốt', color: 'text-parchment-100 text-glow', rarity: 'Vô Địch', weight: 2 },
      { name: 'Trùng Đồng (Mắt Kép)', color: 'text-yellow-400', rarity: 'Thượng Cổ', weight: 2 },
      { name: 'Phượng Hoàng Huyết Mạch', color: 'text-rose-500', rarity: 'Thần Thú', weight: 4 },
      { name: 'Chân Long Huyết Mạch', color: 'text-amber-500', rarity: 'Thần Thú', weight: 4 },
      { name: 'Cửu Vĩ Thiên Hồ', color: 'text-pink-400', rarity: 'Yêu Thần', weight: 4 },
      
      // High Tier (10-15%)
      { name: 'Thiên Linh Căn (Thuần)', color: 'text-spirit-400', rarity: 'Cực Phẩm', weight: 10 },
      { name: 'Biến Dị Lôi Linh Căn', color: 'text-blue-400', rarity: 'Thượng Phẩm', weight: 12 },
      { name: 'Biến Dị Băng Linh Căn', color: 'text-cyan-300', rarity: 'Thượng Phẩm', weight: 12 },
      { name: 'Biến Dị Phong Linh Căn', color: 'text-emerald-300', rarity: 'Thượng Phẩm', weight: 12 },
      { name: 'Ám Linh Căn', color: 'text-ink-400', rarity: 'Hiếm', weight: 8 },
      { name: 'Quang Linh Căn', color: 'text-yellow-200', rarity: 'Hiếm', weight: 8 },
      { name: 'Không Gian Linh Căn', color: 'text-slate-300', rarity: 'Hiếm', weight: 5 },
      { name: 'Thời Gian Linh Căn', color: 'text-slate-400', rarity: 'Cực Hiếm', weight: 3 },
      
      // Special Bodies
      { name: 'Kiếm Linh Thể', color: 'text-sky-300', rarity: 'Chiến Thể', weight: 10 },
      { name: 'Đao Phách Chi Thể', color: 'text-red-400', rarity: 'Chiến Thể', weight: 10 },
      { name: 'Dược Linh Chi Thể', color: 'text-green-400', rarity: 'Đan Đạo', weight: 10 },
      { name: 'Trận Đạo Chi Thể', color: 'text-indigo-400', rarity: 'Trận Pháp', weight: 10 },
      { name: 'Thuần Âm Chi Thể', color: 'text-indigo-300', rarity: 'Lò Đỉnh', weight: 10 },
      { name: 'Thuần Dương Chi Thể', color: 'text-orange-400', rarity: 'Dương Khí', weight: 10 },
      { name: 'Mị Cốt Thiên Thành', color: 'text-pink-500', rarity: 'Mị Hoặc', weight: 8 },
      { name: 'Huyết Linh Thể', color: 'text-crimson-600', rarity: 'Ma Đạo', weight: 8 },
      { name: 'Độc Ách Chi Thể', color: 'text-purple-600', rarity: 'Độc Tu', weight: 5 },
      
      // Mid Tier
      { name: 'Ngũ Hành Linh Căn (Cân Bằng)', color: 'text-teal-400', rarity: 'Đặc Biệt', weight: 15 },
      { name: 'Song Linh Căn (Thủy/Hỏa)', color: 'text-blue-500', rarity: 'Trung Phẩm', weight: 20 },
      { name: 'Song Linh Căn (Kim/Mộc)', color: 'text-yellow-600', rarity: 'Trung Phẩm', weight: 20 },
      { name: 'Song Linh Căn (Thổ/Kim)', color: 'text-amber-700', rarity: 'Trung Phẩm', weight: 20 },
      { name: 'Âm Dương Song Linh Căn', color: 'text-gray-300', rarity: 'Thượng Phẩm', weight: 15 },
      
      // Low Tier & Bad Luck
      { name: 'Cửu Âm Tuyệt Mạch', color: 'text-blue-900', rarity: 'Tuyệt Mệnh', weight: 5 },
      { name: 'Thiên Đố Chi Thể', color: 'text-red-900', rarity: 'Trời Phạt', weight: 3 },
      { name: 'Tam Linh Căn', color: 'text-zinc-400', rarity: 'Hạ Phẩm', weight: 30 },
      { name: 'Tứ Linh Căn', color: 'text-zinc-500', rarity: 'Tạp Căn', weight: 40 },
      { name: 'Ngũ Hành Phế Căn', color: 'text-zinc-600', rarity: 'Phế Vật', weight: 25 },
      { name: 'Phàm Nhân', color: 'text-zinc-700', rarity: 'Vô Duyên', weight: 10 },
      { name: 'Khôi Lỗi Chi Thân', color: 'text-stone-500', rarity: 'Con Rối', weight: 5 },
      { name: 'Tàn Hồn Đoạt Xá', color: 'text-emerald-800', rarity: 'Quỷ Tu', weight: 5 },
      { name: 'Thảo Mộc Thành Tinh', color: 'text-green-600', rarity: 'Yêu Tu', weight: 5 },
      { name: 'Khí Linh Chuyển Thế', color: 'text-cyan-600', rarity: 'Linh Vật', weight: 3 },
    ],
    talents: [
      // S-Tier
      "Hệ Thống (System)", "Trọng Sinh Giả", "Xuyên Việt Giả", "Lão Gia Gia Trong Nhẫn", "Khí Vận Chi Tử", 
      "Ngộ Tính Nghịch Thiên", "Bất Tử Chi Thân", "Thao Túng Thời Gian", "Thôn Phệ Vạn Vật", "Ngôn Xuất Pháp Tùy",
      "Ký Ức Kiếp Trước", "Biết Trước Tương Lai", "Con Cưng Của Thiên Đạo", "Vô Hạn Tài Nguyên", "Bất Hoại Kim Thân",
      // Combat & Skills
      "Kiếm Tâm Thông Minh", "Đao Ý Đại Thành", "Quyền Pháp Tông Sư", "Thần Xạ Thủ", "Vạn Kiếm Quy Tông",
      "Đan Đạo Tông Sư", "Trận Pháp Đại Sư", "Luyện Khí Kỳ Tài", "Phù Lục Tông Sư", "Khôi Lỗi Sư (Rối)",
      "Ngự Thú Sư", "Thần Nông Tái Thế", "Bách Biến Thần Hành (Tốc độ)", "Ẩn Nấp Tuyệt Đối", "Di Hồn Đại Pháp",
      "Hấp Tinh Đại Pháp", "Quỳ Hoa Bảo Điển", "Đồng Tử Công", "Nhìn Thấu Thiên Cơ", "Âm Dương Nhãn",
      // Social & Harem
      "Mị Cốt Thiên Thành", "Đào Hoa Kiếp", "Vua Harem", "Song Tu Đạo Lữ", "Gia Tộc Chống Lưng",
      "Phú Nhị Đại (Giàu)", "Thần Hào Tu Tiên", "Thanh Mai Trúc Mã Mạnh Mẽ", "Sư Phụ Bao Che", "Tiên Thiên Mị Lực",
      "Miệng Lưỡi Thế Gian (Võ Mồm)", "Thu Phục Lòng Người", "Uy Danh Hiển Hách", "Gương Mặt Uy Tín", "Giả Heo Ăn Thịt Hổ",
      // Dark & Survival
      "Sát Phạt Quyết Đoán", "Tâm Ma Bất Xâm", "Vạn Độc Bất Xâm", "Huyết Mạch Chân Long", "Phượng Hoàng Niết Bàn",
      "Cẩu Đạo Trung Nhân", "Vô Sỉ Chi Đồ", "Phản Phái Mệnh Cách", "Thiên Sát Cô Tinh", "Đoạt Xá Trọng Tu",
      "Hỏa Nhãn Kim Tinh", "Thần Hồn Cường Đại", "May Mắn Tuyệt Đối", "Thích Ứng Mọi Hoàn Cảnh", "Tâm Trí Sắt Đá"
    ],
    preset: {
      worldContext: "Thiên Nam Tu Tiên Giới, linh khí suy kiệt. Các tông môn chính đạo và ma đạo tranh giành tài nguyên khốc liệt.",
      plotDirection: "Từ một phàm nhân vô tình nhặt được bình nhỏ bí ẩn, bước lên con đường tu tiên nghịch thiên.",
      majorFactions: "- Thanh Vân Môn (Chính)\n- Huyết Sát Giáo (Ma)\n- Vạn Bảo Lâu (Trung lập)",
      keyNpcs: "- Lão giả bí ẩn (Sư phụ)\n- Nữ tử áo trắng (Hồng nhan)\n- Đại sư huynh (Tiểu nhân)"
    }
  },
  [GameGenre.FANTASY]: {
    rootLabel: "Chủng Tộc / Huyết Mạch",
    talentLabel: "Kỹ Năng / Chúc Phúc",
    roots: [
      { name: 'Thần Tộc (Godborn)', color: 'text-gold-400 text-glow-gold', rarity: 'Tối Cao', weight: 2 },
      { name: 'Chúa Quỷ (Demon Lord)', color: 'text-crimson-500 text-glow-crimson', rarity: 'Tối Cao', weight: 2 },
      { name: 'Cổ Long (Ancient Dragon)', color: 'text-orange-500', rarity: 'Huyền Thoại', weight: 3 },
      { name: 'Thiên Sứ Sa Ngã', color: 'text-slate-300', rarity: 'Hiếm', weight: 4 },
      { name: 'Vampire Progenitor', color: 'text-crimson-400', rarity: 'Huyền Thoại', weight: 4 },
      { name: 'High Elf Hoàng Gia', color: 'text-jade-400', rarity: 'Cao Quý', weight: 5 },
      { name: 'Dũng Giả (Hero)', color: 'text-blue-400', rarity: 'Được Chọn', weight: 5 },
      { name: 'Hiền Giả Chuyển Sinh', color: 'text-purple-400', rarity: 'Thông Thái', weight: 5 },
      { name: 'Thánh Nữ/Thánh Tử', color: 'text-yellow-200', rarity: 'Thánh Khiết', weight: 5 },
      { name: 'Tinh Linh Nguyên Tố', color: 'text-cyan-300', rarity: 'Tinh Linh', weight: 6 },
      { name: 'Hồ Ly Tinh (Kitsune)', color: 'text-pink-400', rarity: 'Yêu Quái', weight: 6 },
      { name: 'Người Sói Alpha', color: 'text-stone-400', rarity: 'Mạnh Mẽ', weight: 8 },
      { name: 'Tiên Tộc (Fairy)', color: 'text-lime-300', rarity: 'Nhỏ Bé', weight: 8 },
      { name: 'Người Lùn (Dwarf King)', color: 'text-orange-300', rarity: 'Thợ Rèn', weight: 8 },
      { name: 'Thú Nhân (Hổ/Sư Tử)', color: 'text-amber-600', rarity: 'Chiến Binh', weight: 10 },
      { name: 'Thú Nhân (Mèo/Thỏ)', color: 'text-amber-300', rarity: 'Dễ Thương', weight: 10 },
      { name: 'Dark Elf (Drow)', color: 'text-purple-900', rarity: 'Sát Thủ', weight: 8 },
      { name: 'Long Nhân (Dragonborn)', color: 'text-red-600', rarity: 'Lai Rồng', weight: 8 },
      { name: 'Quỷ Tộc (Tiefling)', color: 'text-red-800', rarity: 'Lai Quỷ', weight: 8 },
      { name: 'Người Khổng Lồ (Giant)', color: 'text-stone-600', rarity: 'Sức Mạnh', weight: 5 },
      { name: 'Người Cá (Mermaid)', color: 'text-cyan-500', rarity: 'Biển Cả', weight: 6 },
      { name: 'Succubus/Incubus', color: 'text-fuchsia-500', rarity: 'Mị Hoặc', weight: 5 },
      { name: 'Orc Warlord', color: 'text-green-700', rarity: 'Thủ Lĩnh', weight: 5 },
      { name: 'Goblin Vương', color: 'text-green-500', rarity: 'Tinh Quái', weight: 5 },
      { name: 'Slime Biến Dị', color: 'text-cyan-400', rarity: 'Quái Vật', weight: 5 },
      { name: 'Mimic (Rương Ăn Thịt)', color: 'text-yellow-800', rarity: 'Quái Vật', weight: 3 },
      { name: 'Bộ Xương (Skeleton Mage)', color: 'text-zinc-300', rarity: 'Undead', weight: 5 },
      { name: 'Lich King', color: 'text-cyan-200 text-glow', rarity: 'Undead', weight: 2 },
      { name: 'Dullahan (Không Đầu)', color: 'text-purple-800', rarity: 'Undead', weight: 3 },
      { name: 'Golem Đá', color: 'text-stone-500', rarity: 'Vô Tri', weight: 5 },
      { name: 'Homunculus (Người nhân tạo)', color: 'text-pink-200', rarity: 'Giả Kim', weight: 4 },
      { name: 'Banshee', color: 'text-gray-400', rarity: 'Linh Hồn', weight: 3 },
      { name: 'Centaur (Nhân Mã)', color: 'text-yellow-700', rarity: 'Tốc Độ', weight: 5 },
      { name: 'Minotaur', color: 'text-red-900', rarity: 'Sức Mạnh', weight: 5 },
      { name: 'Harpy', color: 'text-sky-600', rarity: 'Bầu Trời', weight: 5 },
      { name: 'Lamia (Người Rắn)', color: 'text-emerald-600', rarity: 'Yêu Quái', weight: 4 },
      { name: 'Doppelganger (Giả Dạng)', color: 'text-gray-500', rarity: 'Bí Ẩn', weight: 3 },
      { name: 'Nhân Tộc', color: 'text-parchment-300', rarity: 'Phổ Thông', weight: 30 },
      { name: 'Dân Làng A (NPC)', color: 'text-zinc-600', rarity: 'Bình Thường', weight: 10 },
    ],
    talents: [
      // Isekai Tropes
      "Thẩm Định (Appraise)", "Kho Đồ Không Gian (Inventory)", "Dịch Chuyển Tức Thời", "Hồi Phục Siêu Tốc", "Bất Tử Tái Sinh",
      "Nhân Đôi Kinh Nghiệm", "Cướp Đoạt Kỹ Năng", "Sức Mạnh Của Tình Bạn", "Miễn Nhiễm Ma Thuật", "Hào Quang Nhân Vật Chính",
      "Ngôn Ngữ Thế Giới (Hiểu mọi tiếng)", "Bản Đồ Nhỏ (Minimap)", "Save/Load Game", "Shop Liên Giới Diện", "Gacha May Mắn",
      // Magic
      "Ma Pháp Vô Hạn (Mana)", "Niệm Chú Cấp Tốc", "Thao Túng Nguyên Tố (Đa hệ)", "Necromancy (Chiêu Hồn)", "Thánh Quang Chữa Lành",
      "Không Gian Ma Pháp", "Thuật Giả Kim (Alchemy)", "Tiên Tri (Oracle)", "Thao Túng Thời Gian", "Thao Túng Bóng Tối",
      "Triệu Hồi Sư Tối Thượng", "Ma Pháp Trận", "Phản Phệ Sát Thương", "Bay Lượn (Flight)", "Biến Hình (Shapeshift)",
      // Combat
      "Kiếm Thánh (Sword Saint)", "Cuồng Chiến Sĩ (Berserker)", "Xạ Thủ Thần Thánh", "Sát Thủ Vô Hình", "Đấu Khí Vô Hạn",
      "Sát Long Nhân (Dragon Slayer)", "Bậc Thầy Khiên Chắn", "Song Kiếm Hợp Bích", "Võ Thuật Cận Chiến", "Phản Đòn (Counter)",
      // Life Skills
      "Bậc Thầy Rèn Đúc", "Nấu Ăn Tăng Chỉ Số", "Quyến Rũ Mọi Loài (Charm)", "Thương Nhân Gian Xảo", "Thú Ngữ (Nói chuyện với thú)",
      "Bản Đồ Thế Giới", "Chế Tạo Golem", "Trồng Trọt Ma Pháp", "Ca Hát Mê Hoặc (Bard)", "Câu Cá Level Max",
      // Special
      "Long Ngữ (Dragon Tongue)", "Mắt Quỷ (Demon Eye)", "Nhìn Xuyên Thấu", "Kháng Độc Tuyệt Đối", "Vua Harem", 
      "Thuần Hóa Rồng", "Tách Rời Cơ Thể", "Điều Khiển Rối", "Hấp Thụ Linh Hồn", "Tàng Hình"
    ],
    preset: {
      worldContext: "Lục địa Aethelgard, nơi ma thuật và kiếm thuật ngự trị. Long tộc đã ngủ say ngàn năm nay đang thức tỉnh.",
      plotDirection: "Người được chọn phải tìm ra 7 viên ngọc rồng để phong ấn Ma Vương, giải cứu thế giới.",
      majorFactions: "- Hiệp Hội Pháp Sư\n- Đế Chế Loài Người\n- Liên Minh Dị Tộc",
      keyNpcs: "- Nữ Hoàng Elf\n- Hiệp Sĩ Rồng\n- Phù Thủy Hắc Ám"
    }
  },
  [GameGenre.SCIFI]: {
    rootLabel: "Genotype / Nguồn Gốc",
    talentLabel: "Mô-đun / Công Nghệ",
    roots: [
      { name: 'AI Siêu Việt (Singularity)', color: 'text-spirit-400 text-glow', rarity: 'Vượt Trội', weight: 2 },
      { name: 'Thực Thể Năng Lượng', color: 'text-yellow-300', rarity: 'Vượt Trội', weight: 2 },
      { name: 'Con Của Thống Đốc Thiên Hà', color: 'text-gold-400', rarity: 'Quyền Lực', weight: 5 },
      { name: 'Người Thừa Kế Mega-Corp', color: 'text-emerald-400', rarity: 'Tỷ Phú', weight: 5 },
      { name: 'Cyborg Chiến Đấu S-Class', color: 'text-crimson-500', rarity: 'Vũ Khí', weight: 8 },
      { name: 'Android Hầu Gái/Quản Gia', color: 'text-pink-300', rarity: 'Phục Vụ', weight: 8 },
      { name: 'Nhà Du Hành Thời Gian', color: 'text-arcane-400', rarity: 'Bí Ẩn', weight: 5 },
      { name: 'Gen Đột Biến Alpha (Psyker)', color: 'text-purple-400', rarity: 'Nguy Hiểm', weight: 8 },
      { name: 'Newtype (Gundam Pilot)', color: 'text-blue-500', rarity: 'Phi Công', weight: 8 },
      { name: 'Người Sao Hỏa Thuần Chủng', color: 'text-orange-500', rarity: 'Quý Tộc', weight: 10 },
      { name: 'Người Mặt Trăng (Moonborn)', color: 'text-slate-300', rarity: 'Ly Khai', weight: 10 },
      { name: 'Space Marine', color: 'text-blue-700', rarity: 'Chiến Binh', weight: 8 },
      { name: 'Hacker Mũ Đen', color: 'text-jade-400', rarity: 'Tội Phạm', weight: 12 },
      { name: 'Thợ Săn Tiền Thưởng', color: 'text-zinc-300', rarity: 'Tự Do', weight: 15 },
      { name: 'Space Pirate', color: 'text-red-500', rarity: 'Tội Phạm', weight: 12 },
      { name: 'Xenomorph Hybrid (Lai Alien)', color: 'text-green-600', rarity: 'Quái Vật', weight: 5 },
      { name: 'Symbiote Host (Vật Chủ)', color: 'text-stone-800', rarity: 'Ký Sinh', weight: 5 },
      { name: 'Cơ Thể Nano Bất Hoại', color: 'text-cyan-400', rarity: 'Công Nghệ', weight: 6 },
      { name: 'Bộ Não Trong Lọ', color: 'text-pink-500', rarity: 'Cổ Đại', weight: 4 },
      { name: 'Kỹ Sư Không Gian', color: 'text-orange-400', rarity: 'Kỹ Thuật', weight: 15 },
      { name: 'Bác Sĩ Cyberpunk', color: 'text-teal-400', rarity: 'Y Tế', weight: 12 },
      { name: 'Nhân Viên Văn Phòng Arasaka', color: 'text-gray-400', rarity: 'Nô Lệ Tư Bản', weight: 20 },
      { name: 'Dân Khu Ổ Chuột', color: 'text-stone-600', rarity: 'Đáy Xã Hội', weight: 25 },
      { name: 'Nhân Bản Vô Tính (Clone)', color: 'text-parchment-400', rarity: 'Thấp Kém', weight: 20 },
      { name: 'Android Lỗi', color: 'text-crimson-400', rarity: 'Phế Liệu', weight: 10 },
      { name: 'Thí Nghiệm Thất Bại', color: 'text-lime-600', rarity: 'Biến Dị', weight: 10 },
      { name: 'Grey Alien', color: 'text-gray-500', rarity: 'Ngoài Hành Tinh', weight: 3 },
      { name: 'Insectoid (Người Côn Trùng)', color: 'text-green-800', rarity: 'Bầy Đàn', weight: 3 },
      { name: 'Reptilian (Người Thằn Lằn)', color: 'text-emerald-700', rarity: 'Thống Trị', weight: 3 },
      { name: 'Hologram Sống', color: 'text-blue-200', rarity: 'Ảo Ảnh', weight: 3 },
    ],
    talents: [
      // Tech & Hacking
      "Bộ Não Lượng Tử", "Hacker Thần Sầu (Netrunner)", "Kết Nối Neural Trực Tiếp", "Điều Khiển Drone Bầy Đàn", "AI Trợ Lý Cá Nhân",
      "Quyền Truy Cập Admin", "Phá Khóa Điện Tử", "Sao Chép Dữ Liệu", "Thao Túng Thị Trường Ảo", "Bậc Thầy Ngụy Trang Hologram",
      "Lập Trình Virus Siêu Cấp", "Chiếm Đoạt Cơ Thể Robot", "Tạo Thực Tế Ảo", "Xóa Dấu Vết Số", "Deepfake Hoàn Hảo",
      // Combat & Weapons
      "Xạ Thủ Không Gian", "Lái Mecha Cấp Thần", "Vũ Khí Plasma", "Giáp Năng Lượng (Force Field)", "Thích Khách Vô Hình",
      "Cánh Tay Robot Cường Lực", "Mắt Điện Tử (Aim Bot)", "Phản Xạ Siêu Thanh", "Bậc Thầy Thuốc Nổ", "Kiếm Laser",
      "Hệ Thống Ngắm Tự Động", "Làm Chậm Thời Gian (Sandevistan)", "Khiên Phản Xạ", "Tàng Hình Quang Học", "Súng Trọng Lực",
      // Space & Pilot
      "Lái Phi Thuyền Điêu Luyện", "Dịch Chuyển Lượng Tử", "Hệ Thống Dẫn Đường Tuyệt Đối", "Sửa Chữa Tàu Vũ Trụ", "Vua Buôn Lậu",
      "Bản Đồ Thiên Hà", "Sinh Tồn Trong Chân Không", "Thích Nghi Mọi Trọng Lực", "Ngôn Ngữ Người Ngoài Hành Tinh", "Ngoại Giao Liên Sao",
      "Chiến Thuật Hạm Đội", "Khai Thác Khoáng Sản", "Lái Xe Bay", "Nhảy Bước Nhảy Alpha", "Cảm Nhận Không Gian",
      // Bio & Psionics
      "Đọc Suy Nghĩ (Telepathy)", "Điều Khiển Vật Thể (Telekinesis)", "Hồi Phục Tế Bào Nano", "Gen Bất Tử", "Miễn Nhiễm Bức Xạ",
      "Tách Rời Cơ Thể", "Thay Đổi Khuôn Mặt", "Siêu Trí Nhớ", "Thao Túng Trọng Lực", "Dự Đoán Quỹ Đạo",
      "Kiểm Soát Tinh Thần", "Tạo Ảo Giác", "Hút Năng Lượng", "Thở Dưới Nước", "Da Cứng Như Thép",
      // Money & Status
      "Tài Khoản Ngân Hàng Vô Hạn", "Thẻ ID Giả Hoàn Hảo", "Quan Hệ Thế Giới Ngầm", "Kho Vũ Khí Di Động", "Bác Sĩ Phẫu Thuật Cyber",
      "Kỹ Sư Robot Thiên Tài", "Nhà Khoa Học Điên", "Trùm Mafia Vũ Trụ", "Nhà Khảo Cổ Di Tích Alien", "Người Nổi Tiếng Liên Sao"
    ],
    preset: {
      worldContext: "Năm 3050, nhân loại đã thống trị thiên hà nhưng bị chia rẽ bởi các tập đoàn Mega-Corp. AI đang nổi dậy.",
      plotDirection: "Một hacker vùng ngoại ô vô tình đánh cắp được mã nguồn của AI Mẹ, trở thành kẻ bị truy nã toàn vũ trụ.",
      majorFactions: "- Tập Đoàn Arasaka\n- Quân Đội Liên Bang\n- Phe Kháng Chiến Neo-Zion",
      keyNpcs: "- Android sát thủ\n- Trùm buôn lậu vũ trụ\n- Hacker huyền thoại Zero"
    }
  },
  [GameGenre.HORROR]: {
    rootLabel: "Thể Chất / Lời Nguyền",
    talentLabel: "Năng Lực Sinh Tồn",
    roots: [
      { name: 'Đứa Con Của Cthulhu', color: 'text-jade-600 text-glow', rarity: 'Cổ Thần', weight: 2 },
      { name: 'Kẻ Giao Ước Với Quỷ', color: 'text-crimson-600', rarity: 'Nguy Hiểm', weight: 5 },
      { name: 'Antichrist (Kẻ Chống Chúa)', color: 'text-red-700', rarity: 'Tận Thế', weight: 2 },
      { name: 'Tái Sinh Từ Cõi Chết', color: 'text-purple-400', rarity: 'Bất Tử', weight: 5 },
      { name: 'Người Âm Dương (Medium)', color: 'text-arcane-400', rarity: 'Tâm Linh', weight: 10 },
      { name: 'Thợ Săn Quỷ (Constantine)', color: 'text-amber-500', rarity: 'Chuyên Gia', weight: 8 },
      { name: 'Pháp Sư Trừ Tà', color: 'text-yellow-400', rarity: 'Thánh Khiết', weight: 8 },
      { name: 'Nhà Ngoại Cảm', color: 'text-purple-300', rarity: 'Hiếm', weight: 10 },
      { name: 'Kẻ Sát Nhân Hàng Loạt', color: 'text-crimson-800', rarity: 'Ác Nhân', weight: 5 },
      { name: 'Bác Sĩ Pháp Y', color: 'text-cyan-600', rarity: 'Khoa Học', weight: 10 },
      { name: 'Thám Tử Tâm Linh', color: 'text-stone-400', rarity: 'Điều Tra', weight: 10 },
      { name: 'Kẻ Sống Sót Cuối Cùng (Final Girl)', color: 'text-blue-400', rarity: 'May Mắn', weight: 15 },
      { name: 'Nhà Văn Kinh Dị', color: 'text-indigo-400', rarity: 'Trí Tuệ', weight: 12 },
      { name: 'Người Mất Trí Nhớ', color: 'text-gray-500', rarity: 'Bí Ẩn', weight: 15 },
      { name: 'Bệnh Nhân Tâm Thần', color: 'text-rose-400', rarity: 'Điên Loạn', weight: 8 },
      { name: 'Con Của Kẻ Sát Nhân', color: 'text-red-900', rarity: 'Di Truyền', weight: 8 },
      { name: 'Người Bị Nguyền Rủa', color: 'text-purple-800', rarity: 'Xui Xẻo', weight: 12 },
      { name: 'Vật Chủ Ký Sinh', color: 'text-lime-600', rarity: 'Kinh Dị', weight: 5 },
      { name: 'Búp Bê Sống', color: 'text-pink-300', rarity: 'Ma Ám', weight: 4 },
      { name: 'Ma Cà Rồng Lai', color: 'text-red-500', rarity: 'Quái Vật', weight: 4 },
      { name: 'Người Sói', color: 'text-stone-500', rarity: 'Quái Vật', weight: 4 },
      { name: 'Xác Sống Biết Suy Nghĩ', color: 'text-green-700', rarity: 'Zombie', weight: 3 },
      { name: 'Người Bạn Tưởng Tượng', color: 'text-sky-200', rarity: 'Vô Hình', weight: 3 },
      { name: 'Kẻ Mộng Du', color: 'text-slate-400', rarity: 'Vô Thức', weight: 10 },
      { name: 'Nạn Nhân Hiến Tế', color: 'text-crimson-400', rarity: 'Xui Xẻo', weight: 10 },
      { name: 'Người Yếu Bóng Vía', color: 'text-parchment-400', rarity: 'Bình Thường', weight: 20 },
      { name: 'Youtuber Săn Ma', color: 'text-red-500', rarity: 'Liều Lĩnh', weight: 15 },
      { name: 'Bảo Vệ Ca Đêm', color: 'text-blue-800', rarity: 'Đen Đủi', weight: 15 },
      { name: 'Người Đào Mộ', color: 'text-stone-700', rarity: 'U Ám', weight: 5 },
      { name: 'Nhà Khảo Cổ', color: 'text-amber-700', rarity: 'Tò Mò', weight: 8 },
    ],
    talents: [
      // Supernatural
      "Nhìn Thấy Ma (Âm Dương Nhãn)", "Gọi Hồn (Medium)", "Trừ Tà Diệt Quỷ", "Cảm Nhận Sát Khí", "Biết Trước Cái Chết",
      "Miễn Nhiễm Sợ Hãi", "Búp Bê Thế Mạng", "Sử Dụng Bùa Chú", "Kiến Thức Cấm Kỵ (Necronomicon)", "Giao Tiếp Với Vong",
      "Nhìn Trong Bóng Tối", "Máu Độc Khắc Chế Quỷ", "Thôi Miên", "Nhập Hồn", "Tạo Ảo Giác",
      "Dịch Chuyển Tức Thời (Ngắn)", "Tái Tạo Cơ Thể", "Điều Khiển Máu", "Nguyền Rủa Kẻ Khác", "Hóa Bóng",
      // Survival
      "Chạy Nhanh Hơn Bạn Bè", "Ẩn Nấp Tuyệt Đối", "Giả Chết", "Nín Thở Siêu Lâu", "Giác Quan Nhạy Bén",
      "Bản Năng Sinh Tồn", "May Mắn Sống Sót (Plot Armor)", "Cơ Thể Dẻo Dai", "Hồi Phục Vết Thương", "Tâm Trí Thép (Sanity)",
      "Bậc Thầy Giải Đố", "Phá Khóa (Lockpick)", "Sơ Cứu Cấp Tốc", "Chế Tạo Vũ Khí Thô Sơ", "Định Hướng Trong Mê Cung",
      "Leo Trèo Như Nhện", "Sức Mạnh Khi Hoảng Loạn", "Trí Nhớ Nhiếp Ảnh", "Đọc Môi", "Giả Giọng Nói",
      // Items & Combat
      "Vũ Khí Thánh (Nước Thánh/Thập Giá)", "Đèn Pin Vĩnh Cửu", "Bật Lửa May Mắn", "Dao Găm Trừ Tà", "Súng Đạn Bạc",
      "Võ Thuật Cận Chiến", "Thiện Xạ", "Sức Mạnh Điên Cuồng (Adrenaline)", "Ném Đồ Chuẩn Xác", "Đặt Bẫy",
      "Máy Ảnh Chụp Ma", "Radio Bắt Sóng Ma", "La Bàn Chỉ Quỷ", "Muối Trừ Tà", "Dây Chuyền Bảo Hộ",
      // Social & Special
      "Quyến Rũ Ma Quỷ", "Lãnh Đạo Nhóm", "Hy Sinh Đồng Đội", "Hét To Làm Choáng", "Đọc Ký Ức Đồ Vật",
      "Nghe Được Tiếng Thì Thầm", "Thú Cưng Hộ Mệnh (Mèo Đen)", "Nhà Giàu (Mua trang bị)", "Có Xe Hơi", "Bản Đồ Bí Mật"
    ],
    preset: {
      worldContext: "Thành phố sương mù Arkham, nơi những Cổ Thần đang thì thầm trong giấc mơ của con người. Tỷ lệ mất tích tăng cao.",
      plotDirection: "Điều tra bí ẩn về trại thương điên bỏ hoang, nơi được cho là cánh cổng dẫn đến địa ngục.",
      majorFactions: "- Giáo Phái Cthulhu\n- Hội Kín Mắt Bạc\n- Cảnh Sát Địa Phương",
      keyNpcs: "- Bác sĩ tâm thần điên loạn\n- Cô bé ôm gấu bông dính máu\n- Vị mục sư mất đức tin"
    }
  },
  [GameGenre.DETECTIVE]: {
    rootLabel: "Xuất Thân / Nghề Nghiệp",
    talentLabel: "Kỹ Năng Nghiệp Vụ",
    roots: [
      { name: 'Sherlock Holmes Tái Thế', color: 'text-gold-400', rarity: 'Thiên Tài', weight: 2 },
      { name: 'Siêu Điệp Viên 007', color: 'text-blue-500', rarity: 'Huyền Thoại', weight: 3 },
      { name: 'Giáo Sư Tội Phạm (Moriarty)', color: 'text-crimson-500', rarity: 'Trùm Cuối', weight: 3 },
      { name: 'Kaito Kid (Siêu Đạo Chích)', color: 'text-spirit-400', rarity: 'Huyền Thoại', weight: 3 },
      { name: 'Bác Sĩ Pháp Y Tài Ba', color: 'text-cyan-400', rarity: 'Chuyên Gia', weight: 8 },
      { name: 'Chuyên Gia Tâm Lý Tội Phạm', color: 'text-purple-400', rarity: 'Chuyên Gia', weight: 8 },
      { name: 'Hacker Mũ Trắng', color: 'text-jade-400', rarity: 'Công Nghệ', weight: 8 },
      { name: 'Thám Tử Tư Lão Luyện', color: 'text-zinc-400', rarity: 'Kinh Nghiệm', weight: 10 },
      { name: 'Cảnh Sát Hình Sự (Hardboiled)', color: 'text-blue-600', rarity: 'Chính Quy', weight: 12 },
      { name: 'Đặc Vụ FBI/CIA', color: 'text-indigo-500', rarity: 'Chính Quy', weight: 8 },
      { name: 'Nhà Báo Điều Tra', color: 'text-parchment-300', rarity: 'Năng Nổ', weight: 12 },
      { name: 'Luật Sư Ác Ma', color: 'text-red-400', rarity: 'Sắc Sảo', weight: 8 },
      { name: 'Công Tố Viên Sắt', color: 'text-slate-500', rarity: 'Quyền Lực', weight: 8 },
      { name: 'Cảnh Sát Giao Thông', color: 'text-yellow-600', rarity: 'Bình Thường', weight: 15 },
      { name: 'Bảo Vệ Tòa Nhà', color: 'text-stone-500', rarity: 'Bình Thường', weight: 15 },
      { name: 'Tài Xế Taxi (Biết Tuốt)', color: 'text-amber-500', rarity: 'Thông Thạo', weight: 10 },
      { name: 'Bartender (Nghe Ngóng)', color: 'text-pink-400', rarity: 'Thông Tin', weight: 10 },
      { name: 'Ông Trùm Mafia Hoàn Lương', color: 'text-stone-800', rarity: 'Nguy Hiểm', weight: 5 },
      { name: 'Sát Thủ Mất Trí Nhớ', color: 'text-gray-400', rarity: 'Bí Ẩn', weight: 5 },
      { name: 'Đứa Trẻ Conan (Thần Chết)', color: 'text-blue-300', rarity: 'Xui Xẻo', weight: 2 },
      { name: 'Bà Hàng Xóm Nhiều Chuyện', color: 'text-orange-400', rarity: 'Camera Chạy', weight: 5 },
      { name: 'Thợ Khóa Siêu Đẳng', color: 'text-zinc-500', rarity: 'Kỹ Thuật', weight: 8 },
      { name: 'Chuyên Gia Chất Nổ', color: 'text-red-600', rarity: 'Nguy Hiểm', weight: 5 },
      { name: 'Lừa Đảo Bậc Thầy', color: 'text-purple-500', rarity: 'Xảo Quyệt', weight: 8 },
      { name: 'Người Qua Đường', color: 'text-gray-500', rarity: 'Bình Thường', weight: 20 },
      { name: 'Nạn Nhân Tiềm Năng', color: 'text-crimson-300', rarity: 'Nguy Hiểm', weight: 10 },
      { name: 'Chó Nghiệp Vụ (Hóa Người)', color: 'text-amber-700', rarity: 'Đặc Biệt', weight: 2 },
      { name: 'AI Thám Tử', color: 'text-cyan-300', rarity: 'Công Nghệ', weight: 2 },
      { name: 'Nhà Văn Trinh Thám', color: 'text-indigo-300', rarity: 'Trí Tuệ', weight: 10 },
      { name: 'Thẩm Phán Công Minh', color: 'text-slate-200', rarity: 'Quyền Lực', weight: 5 },
    ],
    talents: [
      // Investigation
      "Cung Điện Ký Ức", "Suy Luận Logic Tuyệt Đối", "Tâm Lý Học Tội Phạm", "Quan Sát Chi Tiết Nhỏ", "Pháp Y Tái Tạo Hiện Trường",
      "Kiến Thức Độc Dược", "Đọc Ngôn Ngữ Cơ Thể", "Phát Hiện Nói Dối", "Trí Nhớ Siêu Phàm", "Giác Quan Nhạy Bén",
      "Đọc Khẩu Hình", "Tra Cứu Hồ Sơ Nhanh", "Phân Tích Chữ Viết", "Giải Mã Mật Mã", "Kiến Thức Lịch Sử/Cổ Vật",
      "Khứu Giác Như Chó", "Thính Giác Siêu Phàm", "Nhìn Xuyên Thấu (Thiết bị)", "Tái Hiện Vụ Án (Tưởng tượng)", "Linh Cảm Thám Tử",
      // Action
      "Võ Thuật Cận Chiến (Krav Maga)", "Bắn Súng Bách Phát Bách Trúng", "Vua Parkour", "Lái Xe Điêu Luyện", "Kỹ Năng Phá Khóa",
      "Tàng Hình (Theo dõi)", "Móc Túi", "Chế Tạo Gadget Điệp Viên", "Tháo Gỡ Bom Mìn", "Bơi Lặn Chuyên Nghiệp",
      "Cải Trang Như Thật", "Leo Trèo", "Phi Dao", "Lái Máy Bay", "Thoát Hiểm (Houdini)",
      // Tech & Social
      "Hacker Thượng Thừa", "Nghe Lén", "Sử Dụng Flycam", "Nhiếp Ảnh Gia", "Kỹ Sư Âm Thanh",
      "Giả Giọng Nói", "Quyến Rũ Chết Người (Femme Fatale)", "Bậc Thầy Thẩm Vấn", "Thôi Miên", "Đọc Nguội (Cold Reading)",
      "Quan Hệ Rộng (Thế giới ngầm)", "Khả Năng Diễn Xuất", "Đàm Phán Con Tin", "Luật Sư Hùng Biện", "Thao Túng Truyền Thông",
      "Biết Nhiều Ngôn Ngữ", "Giả Chết", "Thao Túng Tâm Lý", "Gương Mặt Poker", "Kết Bạn Nhanh",
      // Resources
      "Tiền Tiêu Không Hết", "Thẻ Cảnh Sát Quyền Lực", "Vệ Sĩ Trung Thành", "Kho Vũ Khí Bí Mật", "Xe Thể Thao Tốc Độ Cao",
      "Chó Nghiệp Vụ Thông Minh", "Giấy Tờ Giả Hoàn Hảo", "Hộ Chiếu Ngoại Giao", "Căn Cứ Bí Mật", "Mạng Lưới Thông Tin"
    ],
    preset: {
      worldContext: "London thế kỷ 19 giả tưởng (Steampunk). Tội phạm sử dụng công nghệ hơi nước để gây án.",
      plotDirection: "Giải mã vụ án 'Bóng Ma Hơi Nước', vạch trần âm mưu lật đổ hoàng gia.",
      majorFactions: "- Scotland Yard\n- Nghiệp đoàn Thợ Máy\n- Tổ chức M",
      keyNpcs: "- Bác sĩ pháp y lập dị\n- Cậu bé bán báo\n- Nữ tặc"
    }
  },
  [GameGenre.SLICE_OF_LIFE]: {
    rootLabel: "Gia Thế / Xuất Thân",
    talentLabel: "Tài Lẻ / Vận May",
    roots: [
      { name: 'Con Trai Tỷ Phú (Elon Musk)', color: 'text-emerald-400 text-glow', rarity: 'Siêu Cấp', weight: 2 },
      { name: 'Hoàng Gia Lưu Lạc', color: 'text-gold-400', rarity: 'Quý Tộc', weight: 3 },
      { name: 'Trâm Anh Thế Phiệt (Chaebol)', color: 'text-purple-400', rarity: 'Thượng Lưu', weight: 5 },
      { name: 'Tổng Tài Bá Đạo', color: 'text-slate-800', rarity: 'CEO', weight: 5 },
      { name: 'Thiên Tài IQ 200', color: 'text-blue-400', rarity: 'Thiên Tài', weight: 5 },
      { name: 'Idol Nổi Tiếng Toàn Cầu', color: 'text-pink-400', rarity: 'Ngôi Sao', weight: 5 },
      { name: 'Con Nhà Nòi Nghệ Thuật', color: 'text-cyan-400', rarity: 'Ưu Tú', weight: 8 },
      { name: 'Học Bá (Thủ Khoa)', color: 'text-indigo-400', rarity: 'Ưu Tú', weight: 8 },
      { name: 'Vận Động Viên Quốc Gia', color: 'text-orange-500', rarity: 'Thể Thao', weight: 8 },
      { name: 'Hot Boy / Hot Girl Trường Học', color: 'text-rose-400', rarity: 'Nổi Tiếng', weight: 10 },
      { name: 'Trùm Trường (Delinquent)', color: 'text-red-600', rarity: 'Cá Biệt', weight: 8 },
      { name: 'Gia Đình Trung Lưu Hạnh Phúc', color: 'text-jade-400', rarity: 'Êm Ấm', weight: 20 },
      { name: 'Con Nhà Nghèo Vượt Khó', color: 'text-parchment-400', rarity: 'Nghị Lực', weight: 15 },
      { name: 'Trẻ Mồ Côi', color: 'text-zinc-500', rarity: 'Cô Độc', weight: 8 },
      { name: 'Con Nợ Ngập Đầu', color: 'text-crimson-500', rarity: 'Khốn Khó', weight: 5 },
      { name: 'NEET (Hikikomori)', color: 'text-gray-400', rarity: 'Ở Ẩn', weight: 10 },
      { name: 'Otaku Chính Hiệu', color: 'text-purple-300', rarity: 'Đam Mê', weight: 10 },
      { name: 'Streamer Triệu View', color: 'text-fuchsia-400', rarity: 'Nổi Tiếng', weight: 8 },
      { name: 'Chủ Tịch Giả Nghèo', color: 'text-yellow-600', rarity: 'Ẩn Danh', weight: 3 },
      { name: 'Bạn Thuở Nhỏ Của Main', color: 'text-sky-300', rarity: 'Friendzone', weight: 10 },
      { name: 'Hôn Phu Của Ác Nữ', color: 'text-red-400', rarity: 'Nguy Hiểm', weight: 3 },
      { name: 'Nam Phụ Si Tình', color: 'text-blue-300', rarity: 'Đáng Thương', weight: 5 },
      { name: 'Du Học Sinh', color: 'text-teal-400', rarity: 'Mới Mẻ', weight: 8 },
      { name: 'Con Lai (Mixed)', color: 'text-amber-300', rarity: 'Đẹp', weight: 5 },
      { name: 'Tiểu Thư Giả Mạo', color: 'text-pink-600', rarity: 'Drama', weight: 4 },
      { name: 'Nhân Viên Văn Phòng (Salaryman)', color: 'text-slate-500', rarity: 'Bình Thường', weight: 15 },
      { name: 'Giáo Viên Thực Tập', color: 'text-green-500', rarity: 'Bình Thường', weight: 10 },
      { name: 'Chủ Quán Cà Phê', color: 'text-amber-600', rarity: 'Chill', weight: 8 },
      { name: 'Mèo Biến Thành Người', color: 'text-orange-300', rarity: 'Phép Thuật', weight: 2 },
      { name: 'Người Ngoài Hành Tinh (Giả dạng)', color: 'text-lime-400', rarity: 'Bí Ẩn', weight: 2 },
    ],
    talents: [
      // Appearance & Charm
      "Nhan Sắc Cực Phẩm", "Giọng Hát Thiên Phú", "Nụ Cười Tỏa Nắng", "Thần Thái Tổng Tài", "Body 6 Múi",
      "Hack Tuổi (Trẻ mãi)", "Gu Thời Trang Đỉnh Cao", "Sát Thủ Tình Trường", "Vua Cưa Gái/Trai", "Đôi Mắt Biết Cười",
      "Mùi Hương Quyến Rũ", "Gương Mặt Baby", "Tóc Đẹp Bồng Bềnh", "Chiều Cao Người Mẫu", "Ăn Ảnh",
      // Skills & Career
      "Học Bá (Học 1 hiểu 10)", "Nấu Ăn Như MasterChef", "Code Dạo Kiếm Nghìn Đô", "Đầu Tư Chứng Khoán (Thần)", "Bác Sĩ Thần Y",
      "Luật Sư Bất Bại", "Họa Sĩ Thiên Tài", "Bậc Thầy Piano/Guitar", "Viết Văn Lai Láng", "Nhiếp Ảnh Gia Có Tâm",
      "Lái Siêu Xe", "Vận Động Viên Olympic", "Game Thủ Chuyên Nghiệp", "Streamer Triệu View", "Hot Tiktoker",
      "Ngôn Ngữ Học (Biết 10 thứ tiếng)", "Sửa Chữa Mọi Thứ", "Trang Điểm Phù Thủy", "Thiết Kế Thời Trang", "Bartender Điêu Luyện",
      "Chơi Cờ Vua Kiện Tướng", "Võ Thuật Tự Vệ", "Làm Vườn", "Chăm Sóc Thú Cưng", "Pha Chế Cà Phê",
      // Social & Luck
      "Giao Tiếp Tốt (Thảo Mai)", "Kinh Doanh Tài Ba", "Lãnh Đạo Bẩm Sinh", "May Mắn Trúng Số", "Được Mèo Yêu Quý",
      "Bạn Thân Là Tổng Tài", "Hôn Ước Với Hoa Khôi", "Con Ông Cháu Cha", "Thẻ Đen Quyền Lực (Black Card)", "Biệt Thự Ven Biển",
      "Được Crush Thích Lại", "Thoát Ế", "Nhân Duyên Tốt", "Gặp Quý Nhân", "Trúng Giveaway",
      // Personality
      "Mặt Dày Vô Sỉ", "Lạc Quan Tếu", "Tsundere (Ngoài lạnh trong nóng)", "Yandere", "Hài Hước",
      "Siêng Năng Cần Cù", "Tiết Kiệm (Keo kiệt)", "Nấu Ăn Dở Tệ (Sát thủ nhà bếp)", "Mù Đường", "Thánh Ngủ Nướng",
      "Sợ Ma", "Cuồng Mèo", "Nghiện Trà Sữa", "Thánh Hóng Drama", "Hướng Nội Part-time"
    ],
    preset: {
      worldContext: "Tokyo năm 2024, nhịp sống hối hả. Bạn là một nhân viên văn phòng/học sinh bình thường.",
      plotDirection: "Tìm kiếm ý nghĩa cuộc sống, xây dựng các mối quan hệ lãng mạn và sự nghiệp.",
      majorFactions: "- Công Ty Đen (Black Company)\n- Hội Phụ Huynh\n- Câu Lạc Bộ Trường",
      keyNpcs: "- Cô hàng xóm xinh đẹp\n- Sếp khó tính\n- Bạn thân từ nhỏ"
    }
  },
  [GameGenre.HISTORICAL]: {
    rootLabel: "Thân Phận / Tước Vị",
    talentLabel: "Văn Võ Nghệ",
    roots: [
      { name: 'Hoàng Đế (Vi Hành)', color: 'text-gold-500 text-glow', rarity: 'Cửu Ngũ Chí Tôn', weight: 2 },
      { name: 'Thái Tử / Công Chúa', color: 'text-amber-400', rarity: 'Hoàng Tộc', weight: 4 },
      { name: 'Vương Gia / Quận Chúa', color: 'text-orange-400', rarity: 'Hoàng Tộc', weight: 5 },
      { name: 'Đại Tướng Quân', color: 'text-crimson-500', rarity: 'Quyền Lực', weight: 6 },
      { name: 'Thừa Tướng Đương Triều', color: 'text-purple-400', rarity: 'Đại Thần', weight: 6 },
      { name: 'Thái Giám Tổng Quản', color: 'text-indigo-300', rarity: 'Tâm Phúc', weight: 5 },
      { name: 'Cẩm Y Vệ Chỉ Huy Sứ', color: 'text-red-700', rarity: 'Sát Thần', weight: 6 },
      { name: 'Phú Hộ Nhất Vùng', color: 'text-yellow-400', rarity: 'Giàu Có', weight: 8 },
      { name: 'Thương Nhân Con Đường Tơ Lụa', color: 'text-amber-600', rarity: 'Giàu Có', weight: 8 },
      { name: 'Thư Hương Môn Đệ', color: 'text-blue-400', rarity: 'Thanh Cao', weight: 10 },
      { name: 'Trạng Nguyên', color: 'text-cyan-500', rarity: 'Trí Tuệ', weight: 5 },
      { name: 'Thần Y', color: 'text-green-400', rarity: 'Y Thuật', weight: 6 },
      { name: 'Giang Hồ Đệ Nhất Kiếm', color: 'text-cyan-400', rarity: 'Hiệp Khách', weight: 5 },
      { name: 'Minh Chủ Võ Lâm', color: 'text-gold-300', rarity: 'Bá Chủ', weight: 3 },
      { name: 'Giáo Chủ Ma Giáo', color: 'text-purple-600', rarity: 'Tà Phái', weight: 3 },
      { name: 'Thích Khách', color: 'text-zinc-400', rarity: 'Bí Ẩn', weight: 8 },
      { name: 'Kỹ Nữ / Kép Hát Đầu Bảng', color: 'text-pink-400', rarity: 'Nghệ Thuật', weight: 8 },
      { name: 'Thầy Bói (Đạo Sĩ)', color: 'text-slate-400', rarity: 'Huyền Bí', weight: 6 },
      { name: 'Nông Dân Khởi Nghĩa', color: 'text-jade-500', rarity: 'Anh Hùng', weight: 10 },
      { name: 'Sơn Tặc', color: 'text-stone-600', rarity: 'Cướp', weight: 10 },
      { name: 'Hải Tặc', color: 'text-blue-700', rarity: 'Cướp Biển', weight: 8 },
      { name: 'Lính Đánh Thuê', color: 'text-stone-500', rarity: 'Chiến Binh', weight: 10 },
      { name: 'Kẻ Ăn Mày (Cái Bang)', color: 'text-gray-500', rarity: 'Bần Hàn', weight: 8 },
      { name: 'Nô Lệ Đấu Trường', color: 'text-red-800', rarity: 'Khốn Khổ', weight: 8 },
      { name: 'Thợ Rèn', color: 'text-orange-700', rarity: 'Thợ', weight: 10 },
      { name: 'Đao Phủ', color: 'text-red-900', rarity: 'Sát', weight: 5 },
      { name: 'Thái Y', color: 'text-teal-500', rarity: 'Quan', weight: 6 },
      { name: 'Ngự Trù (Đầu Bếp Hoàng Cung)', color: 'text-yellow-500', rarity: 'Nấu Ăn', weight: 6 },
      { name: 'Xuyên Không Giả', color: 'text-sky-400', rarity: 'Hiện Đại', weight: 2 },
      { name: 'Phế Hậu / Phế Thái Tử', color: 'text-gray-400', rarity: 'Thất Thế', weight: 4 },
    ],
    talents: [
      // Military & Combat
      "Binh Pháp Tôn Tử", "Võ Công Cái Thế", "Cung Mã Thành Thạo", "Bách Bộ Xuyên Dương", "Thương Pháp Như Rồng",
      "Sức Mạnh Ngàn Cân", "Thân Pháp Như Yến", "Nội Công Thâm Hậu", "Sử Dụng Ám Khí", "Rèn Binh Khí Thần Binh",
      "Lãnh Đạo Quân Đội", "Dàn Trận Bát Quái", "Đặc Công Hoàng Phi", "Thuật Ẩn Thân", "Giết Người Không Chớp Mắt",
      "Thập Bát Ban Võ Nghệ", "Kim Chung Tráo (Đỡ Đòn)", "Lăng Ba Vi Bộ", "Hấp Tinh Đại Pháp", "Sư Tử Hống",
      // Politics & Wisdom
      "Mưu Lược Thâm Sâu (Gia Cát)", "Tiên Tri (Xem Thiên Tượng)", "Khẩu Tài Hùng Biện", "Thu phục Nhân Tâm", "Trị Quốc Bình Thiên Hạ",
      "Xem Tướng Số", "Thuật Phong Thủy", "Y Thuật Cải Tử Hoàn Sinh", "Chế Tạo Thuốc Súng", "Kiến Thức Nông Nghiệp",
      "Chế Tạo Thủy Tinh/Xà Phòng", "Thuật Đọc Tâm", "Ký Ức Hiện Đại", "Thơ Ca Đạo Văn", "Tính Toán Thần Tốc",
      // Arts & Charm
      "Cầm Kỳ Thi Họa", "Thi Phú Vô Song", "Đánh Đàn Mê Hoặc", "Vũ Điệu Khuynh Thành", "Tuyệt Sắc Giai Nhân/Mỹ Nam",
      "Nấu Rượu Ngon", "Tay Nghề Thêu Thùa", "Thư Pháp Rồng Bay", "Pha Trà Đạo", "Dịch Dung Thuật (Cải trang)",
      "Ngón Nghề Phòng The", "Giọng Hát Oanh Vàng", "Kể Chuyện Hấp Dẫn", "Nấu Ăn Thượng Hạng", "Chế Tạo Trang Sức",
      // Assets & Status
      "Kho Lương Vô Tận", "Đội Quân Trung Thành", "Thanh Kiếm Thượng Phương Bảo Kiếm", "Miễn Tử Kim Bài", "Kết Nghĩa Vườn Đào",
      "Huyết Thống Hoàng Gia", "Gia Tộc Lâu Đời", "Mạng Lưới Tình Báo (Cái Bang)", "Thú Cửi Chiến Mã", "Hậu Cung Ba Ngàn",
      "Bản Đồ Kho Báu", "Hầm Bí Mật", "Gia Sản Kếch Xù", "Thánh Chỉ", "Ngọc Tỷ Truyền Quốc"
    ],
    preset: {
      worldContext: "Đại Việt thời Lê Sơ hoặc Trung Quốc thời Tam Quốc. Chiến tranh loạn lạc, anh hùng xuất thế.",
      plotDirection: "Từ một binh lính vô danh lập công trạng, trở thành đại tướng quân thống nhất giang sơn.",
      majorFactions: "- Triều Đình\n- Phản Quân\n- Ngoại Bang Xâm Lược",
      keyNpcs: "- Vị vua trẻ tuổi\n- Nữ sát thủ giang hồ\n- Quân sư quạt mo"
    }
  },
  [GameGenre.POST_APOCALYPTIC]: {
    rootLabel: "Dị Năng / Đột Biến",
    talentLabel: "Kỹ Năng Sinh Tồn",
    roots: [
      { name: 'Vua Xác Sống (Zombie King)', color: 'text-crimson-600 text-glow', rarity: 'Độc Nhất', weight: 2 },
      { name: 'Người Máy Hủy Diệt (Terminator)', color: 'text-blue-500', rarity: 'Vũ Khí', weight: 4 },
      { name: 'Dị Năng Giả Hệ Không Gian', color: 'text-purple-400', rarity: 'Thần Cấp', weight: 5 },
      { name: 'Dị Năng Giả Hệ Lôi (Sét)', color: 'text-gold-400', rarity: 'S-Class', weight: 6 },
      { name: 'Dị Năng Giả Hệ Hỏa', color: 'text-crimson-400', rarity: 'A-Class', weight: 8 },
      { name: 'Dị Năng Giả Hệ Băng', color: 'text-cyan-300', rarity: 'A-Class', weight: 8 },
      { name: 'Dị Năng Giả Hệ Thủy', color: 'text-blue-300', rarity: 'B-Class', weight: 8 },
      { name: 'Dị Năng Giả Hệ Thổ', color: 'text-amber-600', rarity: 'B-Class', weight: 8 },
      { name: 'Dị Năng Giả Hệ Mộc', color: 'text-green-500', rarity: 'Hỗ Trợ', weight: 8 },
      { name: 'Dị Năng Giả Hệ Phong', color: 'text-emerald-300', rarity: 'Tốc Độ', weight: 8 },
      { name: 'Dị Năng Giả Hệ Kim', color: 'text-slate-400', rarity: 'Chiến Đấu', weight: 8 },
      { name: 'Dị Năng Giả Hệ Tinh Thần', color: 'text-pink-400', rarity: 'Hiếm', weight: 6 },
      { name: 'Dị Năng Giả Chữa Lành', color: 'text-teal-300', rarity: 'Quý Giá', weight: 6 },
      { name: 'Người Đột Biến (Mutant)', color: 'text-lime-500', rarity: 'Biến Dị', weight: 10 },
      { name: 'Cường Hóa Cơ Thể (Hulk)', color: 'text-green-700', rarity: 'Sức Mạnh', weight: 10 },
      { name: 'Tốc Độ Siêu Thanh (Speedster)', color: 'text-yellow-300', rarity: 'Tốc Độ', weight: 8 },
      { name: 'Bác Sĩ Quân Y', color: 'text-emerald-400', rarity: 'Cần Thiết', weight: 15 },
      { name: 'Đặc Nhiệm SEAL', color: 'text-zinc-400', rarity: 'Ưu Tú', weight: 12 },
      { name: 'Kỹ Sư Cơ Khí', color: 'text-orange-500', rarity: 'Kỹ Thuật', weight: 12 },
      { name: 'Nông Dân Hiện Đại', color: 'text-green-400', rarity: 'Cung Cấp', weight: 12 },
      { name: 'Tài Xế Xe Tải', color: 'text-slate-500', rarity: 'Vận Chuyển', weight: 15 },
      { name: 'Người Thường Có Súng', color: 'text-parchment-400', rarity: 'Phổ Thông', weight: 20 },
      { name: 'Kẻ Sống Sót Cô Độc', color: 'text-gray-500', rarity: 'Sinh Tồn', weight: 20 },
      { name: 'Thủ Lĩnh Băng Đảng', color: 'text-red-700', rarity: 'Tàn Bạo', weight: 8 },
      { name: 'Nhà Khoa Học Điên', color: 'text-cyan-600', rarity: 'Nguy Hiểm', weight: 5 },
      { name: 'Nô Lệ Thời Mạt Thế', color: 'text-stone-600', rarity: 'Khốn Khổ', weight: 15 },
      { name: 'Thợ Săn Zombie', color: 'text-crimson-800', rarity: 'Chuyên Gia', weight: 10 },
      { name: 'Người Lai Thú', color: 'text-amber-800', rarity: 'Hoang Dã', weight: 8 },
      { name: 'Kẻ Ăn Thịt Người', color: 'text-red-900', rarity: 'Ác Quỷ', weight: 3 },
      { name: 'Người Mù (Giác Quan Siêu Nhạy)', color: 'text-stone-400', rarity: 'Daredevil', weight: 5 },
      { name: 'Trẻ Em (Sát Thủ Nhí)', color: 'text-blue-200', rarity: 'Bí Ẩn', weight: 5 },
    ],
    talents: [
      // Survival
      "Kho Đồ Không Gian Vô Hạn", "Trồng Trọt Đất Chết", "Lọc Nước Sạch", "Sơ Cứu/Phẫu Thuật", "Ăn Tạp (Dạ dày sắt)",
      "Kỹ Năng Săn Bắn", "Chế Tạo Bẫy", "Sửa Chữa Máy Móc", "Lái Xe Độ (Mad Max)", "Dự Báo Thời Tiết",
      "Giác Quan Thứ 6", "Nhìn Xuyên Bóng Tối", "Leo Trèo Như Khỉ", "Bơi Lặn Giỏi", "Chịu Đựng Đói Khát",
      "Xác Định Phương Hướng", "Đốt Lửa Bằng Tay Không", "Ngủ Cảnh Giác", "Phân Biệt Nấm Độc", "Chế Tạo Lều Trại",
      // Combat & Powers
      "Bắn Tỉa Thần Sầu", "Võ Thuật Sinh Tồn", "Sử Dụng Mọi Loại Súng", "Chế Tạo Vũ Khí Thô Sơ", "Điều Khiển Zombie",
      "Biến Hình Thành Quái Vật", "Bay Lượn", "Tàng Hình", "Tạo Ra Lửa", "Tạo Ra Nước",
      "Điều Khiển Thực Vật", "Cường Hóa Giác Quan", "Da Đồng Mình Sắt", "Hồi Phục Siêu Tốc", "Miễn Nhiễm Virus",
      "Huyết Thanh Siêu Chiến Binh", "Sức Mạnh Kinh Hoàng", "Tốc Độ Ánh Sáng", "Thao Túng Điện", "Đóng Băng Kẻ Thù",
      "Hóa Đá", "Phun Độc", "Tiếng Hét Siêu Thanh", "Móng Vuốt Sắc Nhọn", "Đuôi Bò Cạp",
      // Social & Base Building
      "Lãnh Đạo Bẩm Sinh", "Đàm Phán/Lừa Gạt", "Thuần Hóa Thú Biến Dị", "Kiến Trúc Sư Căn Cứ", "Chế Tạo Thuốc Nổ",
      "Bác Sĩ Điên", "Vua Buôn Lậu", "Hacker Hệ Thống Cũ", "Nấu Ăn Từ Rác", "Tâm Lý Biến Thái",
      "Thuyết Phục Người Khác", "Tra Tấn", "Quản Lý Tài Nguyên", "Bản Đồ Vệ Tinh", "Giao Tiếp Bằng Tín Hiệu",
      // Assets
      "Xe Tăng Riêng", "Hầm Trú Ẩn 5 Sao", "Kho Lương Thực Dự Trữ", "Bộ Đàm Liên Lạc", "Vali Hạt Nhân",
      "Đội Nữ Chiến Binh", "Chó Robot", "Bộ Giáp Power Armor", "Sách Hướng Dẫn Sinh Tồn", "Xe Motor Phân Khối Lớn",
      "Máy Phát Điện Vĩnh Cửu", "Hạt Giống Thần Kỳ", "Thuốc Kháng Sinh", "Rượu Quý", "Thú Cưng Chiến Đấu"
    ],
    preset: {
      worldContext: "Năm 2050, virus Z bùng phát biến 90% nhân loại thành xác sống. Người sống sót co cụm trong các căn cứ.",
      plotDirection: "Xây dựng căn cứ sinh tồn, tìm kiếm thuốc giải, chống lại cả Zombie và lòng dạ con người.",
      majorFactions: "- Quân Đội Chính Phủ\n- Bang Phái Motor\n- Giáo Phái Ngày Tận Thế",
      keyNpcs: "- Tiến sĩ điên\n- Nữ chiến binh lạnh lùng\n- Chó nghiệp vụ thông minh"
    }
  }
};

const DEFAULT_GENRE_DATA = GENRE_DATA[GameGenre.CULTIVATION];

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onConfirm, onBack }) => {
  // --- Basic Info State ---
  const [name, setName] = useState('');
  const [gender, setGender] = useState('Nam');
  const [genre, setGenre] = useState<GameGenre>(GameGenre.CULTIVATION);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // --- Character State ---
  const [currentRoot, setCurrentRoot] = useState(GENRE_DATA[GameGenre.CULTIVATION].roots[0]);
  const [currentTalents, setCurrentTalents] = useState<string[]>([]);
  const [isRolling, setIsRolling] = useState(false);
  
  // NEW: Lock State
  const [lockedStats, setLockedStats] = useState({ root: false, talents: false });

  // --- World State ---
  const [settings, setSettings] = useState<WorldSettings>(GENRE_DATA[GameGenre.CULTIVATION].preset);
  const [quickAssistPrompt, setQuickAssistPrompt] = useState('');
  const [loadingField, setLoadingField] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  // --- Helpers ---
  const getGenreData = (g: GameGenre) => GENRE_DATA[g] || DEFAULT_GENRE_DATA;

  // --- Initialization ---
  useEffect(() => {
    // Reset locks when first mounting or resetting
    setLockedStats({ root: false, talents: false });
    handleRoll(genre, true); 
  }, []); 

  // Handle Genre Switch
  const handleGenreChange = (newGenre: GameGenre) => {
    setGenre(newGenre);
    const data = getGenreData(newGenre);
    setSettings(data.preset);
    // Reset locks on genre change to avoid stuck incompatible stats
    setLockedStats({ root: false, talents: false });
    handleRoll(newGenre, true);
  };

  // --- Avatar Logic ---
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Import/Export Logic ---
  const handleExportTemplate = () => {
     const data = {
         type: "TEMPLATE",
         basicInfo: { name, gender, genre },
         worldSettings: settings,
         characterTraits: { spiritualRoot: currentRoot.name, talents: currentTalents }
     };
     const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = `td_template_${name || 'vô_danh'}.json`;
     a.click();
     URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
     importInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
          try {
             const data = JSON.parse(ev.target?.result as string);
             
             if (data.type === "TEMPLATE") {
                 // Apply Template
                 if(data.basicInfo) {
                     setName(data.basicInfo.name || '');
                     setGender(data.basicInfo.gender || 'Nam');
                     setGenre(data.basicInfo.genre || GameGenre.CULTIVATION);
                 }
                 if(data.worldSettings) setSettings(data.worldSettings);
                 if(data.characterTraits) {
                     setCurrentRoot({ name: data.characterTraits.spiritualRoot, color: 'text-white', rarity: 'Unknown', weight: 0 });
                     setCurrentTalents(data.characterTraits.talents);
                 }
                 alert("Đã nhập mẫu thiết lập thành công!");
             } else {
                 alert("File mẫu không hợp lệ! (Chỉ hỗ trợ file Template)");
             }
          } catch (err) {
              console.error(err);
              alert("Lỗi đọc file!");
          }
      };
      reader.readAsText(file);
      // Reset input
      e.target.value = '';
  };

  // --- Character Logic ---
  const handleRoll = (targetGenre: GameGenre = genre, force: boolean = false) => {
    // If both are locked and not forced, do nothing
    if (!force && lockedStats.root && lockedStats.talents) return;

    setIsRolling(true);
    const data = getGenreData(targetGenre);
    
    if (!data.roots || data.roots.length === 0) {
        setIsRolling(false);
        return;
    }

    let steps = 0;
    const maxSteps = 15;
    
    const getWeightedRoot = () => {
        const total = data.roots.reduce((acc, r) => acc + r.weight, 0);
        let rnd = Math.random() * total;
        for (const r of data.roots) {
            if (rnd < r.weight) return r;
            rnd -= r.weight;
        }
        return data.roots[data.roots.length - 1];
    };
    
    const getRandomTalents = () => {
        if (!data.talents || data.talents.length === 0) return ["Kỹ Năng Cơ Bản"];
        // Improved: Ensure at least one random talent is picked, up to 3
        const count = Math.floor(Math.random() * 3) + 1; // 1 to 3 talents
        return [...data.talents].sort(() => 0.5 - Math.random()).slice(0, count);
    };

    const interval = setInterval(() => {
      // Visual shuffle for unlocked stats
      if (!lockedStats.root || force) {
        const randomRootIndex = Math.floor(Math.random() * data.roots.length);
        setCurrentRoot(data.roots[randomRootIndex]);
      }
      if (!lockedStats.talents || force) {
        setCurrentTalents(getRandomTalents());
      }

      steps++;
      if (steps > maxSteps) {
        clearInterval(interval);
        // Final weighted selection for unlocked stats
        if (!lockedStats.root || force) {
          setCurrentRoot(getWeightedRoot());
        }
        if (!lockedStats.talents || force) {
          setCurrentTalents(getRandomTalents());
        }
        setIsRolling(false);
      }
    }, 80);
  };

  const toggleLock = (type: 'root' | 'talents') => {
      setLockedStats(prev => ({ ...prev, [type]: !prev[type] }));
  };

  // --- World Logic ---
  const handleWorldChange = (field: keyof WorldSettings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const getHeroInfo = () => ({
    name: name,
    gender: gender,
    root: currentRoot.name,
    talents: currentTalents
  });

  const handleQuickAssist = async () => {
    if (!quickAssistPrompt.trim()) return;
    setLoadingField('quick');
    try {
      const result = await geminiService.generateWorldAssist(genre, quickAssistPrompt, getHeroInfo());
      setSettings(result);
    } catch (e) {
      alert("Lỗi kết nối Gemini. Vui lòng thử lại.");
    } finally {
      setLoadingField(null);
    }
  };

  const handleFieldAssist = async (field: keyof WorldSettings, label: string) => {
    setLoadingField(field);
    try {
      const context = JSON.stringify(settings);
      const result = await geminiService.generateSingleWorldField(genre, label, context, getHeroInfo());
      handleWorldChange(field, result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingField(null);
    }
  };

  const handleStart = () => {
    if (!name.trim()) {
      alert("Vui lòng nhập Đạo Hiệu (Tên nhân vật)!");
      return;
    }
    onConfirm(
      { name, gender, genre, avatarUrl: avatarUrl || undefined },
      settings,
      { spiritualRoot: currentRoot.name, talents: currentTalents }
    );
  };

  // --- Render Helpers ---
  const renderWorldField = (field: keyof WorldSettings, label: string, placeholder: string) => (
    <div className="space-y-2 group">
      <div className="flex justify-between items-center">
        <label className="text-[10px] font-bold text-ink-500 uppercase tracking-wider group-focus-within:text-gold-400 transition-colors">{label}</label>
        <button 
          onClick={() => handleFieldAssist(field, label)}
          disabled={!!loadingField}
          className="text-[10px] flex items-center gap-1 text-gold-500 hover:text-gold-300 disabled:opacity-30 transition-colors border border-gold-500/30 px-2 py-0.5 rounded-full hover:bg-gold-500/10"
        >
          {loadingField === field ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-magic"></i>}
          AI Viết
        </button>
      </div>
      <textarea
        className="w-full h-24 bg-ink-950/40 border border-ink-700 rounded-lg p-3 text-sm text-parchment-200 focus:border-gold-500 focus:bg-ink-950/60 outline-none resize-none placeholder-ink-700 transition-all font-serif leading-relaxed shadow-inner"
        value={settings[field]}
        onChange={(e) => handleWorldChange(field, e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );

  const currentData = getGenreData(genre);

  return (
    <div className="min-h-screen bg-transparent text-parchment-100 font-serif flex flex-col selection:bg-gold-500/30 selection:text-gold-200">
      
      {/* HEADER */}
      <header className="border-b border-white/5 bg-ink-950/80 backdrop-blur-md p-4 sticky top-0 z-30 shadow-2xl">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
             <button onClick={onBack} className="text-ink-400 hover:text-white transition-colors">
                <i className="fas fa-arrow-left text-lg"></i>
             </button>
             <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gold-400 to-amber-600 flex items-center justify-center text-ink-950 shadow-[0_0_20px_rgba(234,179,8,0.4)] ring-2 ring-gold-500/20">
                  <i className="fas fa-yin-yang fa-spin-slow text-lg"></i>
                </div>
                <h1 className="text-xl md:text-2xl font-display font-bold text-parchment-100 tracking-wide hidden md:block">
                  Kiến Tạo <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-300 to-amber-500">Nhân Vật</span>
                </h1>
             </div>
          </div>
          <div className="flex gap-3">
             {/* Import/Export Buttons */}
             <div className="flex gap-2">
                 <button 
                    onClick={handleExportTemplate} 
                    className="text-xs text-ink-400 hover:text-gold-400 border border-ink-700 hover:border-gold-500/50 w-9 h-9 md:w-auto md:h-auto md:px-3 md:py-2 rounded-full transition-all flex items-center justify-center" 
                    title="Xuất file mẫu (Template)"
                 >
                    <i className="fas fa-file-export md:mr-1"></i> 
                    <span className="hidden md:inline">Xuất Mẫu</span>
                 </button>
                 <input type="file" ref={importInputRef} onChange={handleImportFile} accept=".json" className="hidden" />
                 <button 
                    onClick={handleImportClick} 
                    className="text-xs text-ink-400 hover:text-spirit-400 border border-ink-700 hover:border-spirit-500/50 w-9 h-9 md:w-auto md:h-auto md:px-3 md:py-2 rounded-full transition-all flex items-center justify-center" 
                    title="Nhập file mẫu (Template)"
                 >
                    <i className="fas fa-file-import md:mr-1"></i> 
                    <span className="hidden md:inline">Nhập Mẫu</span>
                 </button>
             </div>

             <button
                onClick={handleStart}
                className="group bg-gradient-to-r from-gold-600 to-amber-600 hover:from-gold-500 hover:to-amber-500 text-white font-bold py-2 px-6 rounded-full shadow-[0_0_20px_rgba(234,179,8,0.3)] transition-all transform hover:scale-105 flex items-center gap-2 border border-gold-400/50"
             >
                <span className="text-sm tracking-wide">Bắt Đầu</span>
                <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
             </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-8 space-y-8 animate-fade-in pb-20">
        
        {/* SECTION 1: IDENTITY */}
        <section className="glass-panel rounded-2xl p-6 md:p-10 shadow-xl relative overflow-hidden border-t border-white/5">
           {/* Background decor */}
           <div className="absolute top-0 right-0 p-40 bg-gold-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
           
           <h2 className="text-xl font-display font-bold text-parchment-100 mb-8 border-b border-white/5 pb-4 flex items-center gap-3">
              <i className="fas fa-user-astronaut text-gold-400"></i>
              Hồ Sơ Luân Hồi
           </h2>
           
           <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              {/* Left: Avatar Upload */}
              <div className="md:col-span-3 flex flex-col items-center justify-center">
                 <div 
                   className="w-32 h-32 rounded-full border-2 border-dashed border-ink-600 hover:border-gold-400 cursor-pointer overflow-hidden relative group transition-all bg-ink-950/20"
                   onClick={handleAvatarClick}
                 >
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-ink-600">
                         <i className="fas fa-camera text-2xl mb-2 group-hover:text-gold-400 transition-colors"></i>
                         <span className="text-[9px] uppercase tracking-wider font-bold">Tải ảnh</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <i className="fas fa-edit text-white"></i>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                 </div>
                 <div className="mt-4 text-center">
                    <p className="text-lg font-display font-bold text-gold-200 tracking-wide text-glow-gold">{name || "Vô Danh"}</p>
                 </div>
              </div>

              {/* Right: Form */}
              <div className="md:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-ink-500 uppercase tracking-wider">Đạo Hiệu</label>
                    <div className="relative">
                        <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-ink-950/40 border border-ink-700 rounded-lg pl-10 pr-4 py-3 text-parchment-100 focus:border-gold-500 focus:bg-ink-950/60 outline-none transition-all placeholder-ink-600 font-display shadow-inner"
                        placeholder="Nhập tên nhân vật..."
                        />
                        <i className="fas fa-signature absolute left-3 top-3.5 text-ink-500"></i>
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-ink-500 uppercase tracking-wider">Giới Tính</label>
                    <div className="flex bg-ink-950/40 p-1 rounded-lg border border-ink-700 shadow-inner">
                      {['Nam', 'Nữ'].map((g) => (
                        <button
                          key={g}
                          onClick={() => setGender(g)}
                          className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${
                            gender === g 
                              ? 'bg-ink-800 text-gold-400 shadow-sm border border-ink-600' 
                              : 'text-ink-600 hover:text-ink-300'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                 </div>

                 <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-bold text-ink-500 uppercase tracking-wider">Thế Giới Khởi Đầu</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                      {Object.values(GameGenre).map(g => (
                         <button
                           key={g}
                           onClick={() => handleGenreChange(g)}
                           className={`px-3 py-2.5 rounded-lg text-[11px] font-bold border transition-all text-left truncate ${
                             genre === g 
                             ? 'border-gold-500/50 bg-gold-500/10 text-gold-300 shadow-[0_0_15px_rgba(234,179,8,0.1)]' 
                             : 'border-ink-800 bg-ink-950/40 text-ink-500 hover:border-ink-600 hover:text-ink-300'
                           }`}
                         >
                           {g}
                         </button>
                      ))}
                    </div>
                 </div>
              </div>
           </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* SECTION 2: ATTRIBUTES (Left - 4 Cols) */}
            <div className="lg:col-span-4 space-y-6">
               <div className="glass-panel rounded-2xl p-6 shadow-xl sticky top-24 border-t border-white/5">
                  <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
                     <h2 className="text-lg font-display font-bold text-parchment-200">
                        Thiên Phú
                     </h2>
                     <button 
                       onClick={() => handleRoll(genre)}
                       disabled={isRolling || (lockedStats.root && lockedStats.talents)}
                       className="text-[10px] text-gold-400 hover:text-gold-200 disabled:opacity-50 transition-colors uppercase tracking-wider font-bold border border-gold-500/30 px-3 py-1.5 rounded-full hover:bg-gold-500/10"
                     >
                        <i className={`fas fa-dice mr-1 ${isRolling ? 'fa-spin' : ''}`}></i> 
                        {(lockedStats.root && lockedStats.talents) ? 'Đã Khóa' : 'Gieo Quẻ'}
                     </button>
                  </div>

                  <div className="space-y-4">
                     {/* Root Card */}
                     <div className={`
                        p-6 rounded-xl border relative overflow-hidden group transition-all shadow-lg
                        ${lockedStats.root 
                            ? 'bg-ink-900 border-gold-500/60 shadow-[0_0_15px_rgba(234,179,8,0.15)]' 
                            : 'bg-gradient-to-br from-ink-900 to-ink-950 border-ink-800 hover:border-spirit-500/40'}
                     `}>
                        <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                            <i className="fas fa-dna text-6xl text-spirit-500"></i>
                        </div>
                        
                        {/* Lock Button */}
                        <button 
                            onClick={() => toggleLock('root')}
                            className={`absolute top-2 right-2 p-2 z-10 transition-colors ${lockedStats.root ? 'text-gold-500' : 'text-ink-600 hover:text-ink-300'}`}
                            title={lockedStats.root ? "Mở khóa để gieo lại" : "Khóa lại"}
                        >
                            <i className={`fas ${lockedStats.root ? 'fa-lock' : 'fa-lock-open'}`}></i>
                        </button>

                        <div className="text-[9px] text-ink-500 uppercase tracking-widest mb-2 font-bold">{currentData.rootLabel}</div>
                        <div className={`text-xl font-bold font-display ${currentRoot.color} ${isRolling && !lockedStats.root ? 'blur-[2px]' : ''} transition-all drop-shadow-md leading-tight`}>
                           {currentRoot.name}
                        </div>
                        <div className="inline-block mt-3 px-2 py-0.5 bg-ink-950 border border-ink-800 rounded text-[9px] text-ink-400 uppercase tracking-wide">
                           {currentRoot.rarity}
                        </div>
                     </div>

                     {/* Talents Card */}
                     <div className={`
                        p-6 rounded-xl border relative overflow-hidden group transition-all shadow-lg
                        ${lockedStats.talents 
                            ? 'bg-ink-900 border-gold-500/60 shadow-[0_0_15px_rgba(234,179,8,0.15)]' 
                            : 'bg-gradient-to-br from-ink-900 to-ink-950 border-ink-800 hover:border-arcane-500/40'}
                     `}>
                        <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                            <i className="fas fa-star text-6xl text-arcane-500"></i>
                        </div>

                         {/* Lock Button */}
                         <button 
                            onClick={() => toggleLock('talents')}
                            className={`absolute top-2 right-2 p-2 z-10 transition-colors ${lockedStats.talents ? 'text-gold-500' : 'text-ink-600 hover:text-ink-300'}`}
                            title={lockedStats.talents ? "Mở khóa để gieo lại" : "Khóa lại"}
                        >
                            <i className={`fas ${lockedStats.talents ? 'fa-lock' : 'fa-lock-open'}`}></i>
                        </button>

                        <div className="text-[9px] text-ink-500 uppercase tracking-widest mb-4 font-bold">{currentData.talentLabel}</div>
                        <div className="flex flex-wrap gap-2">
                           {currentTalents.map((t, i) => (
                              <span key={i} className={`text-[10px] px-2.5 py-1.5 bg-ink-950 border border-ink-700 rounded text-arcane-300 font-medium ${isRolling && !lockedStats.talents ? 'opacity-50' : ''}`}>
                                 {t}
                              </span>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* SECTION 3: WORLD BUILDING (Right - 8 Cols) */}
            <div className="lg:col-span-8 space-y-6">
               <div className="glass-panel rounded-2xl p-6 shadow-xl border-t border-white/5">
                   <div className="mb-6 pb-4 border-b border-white/5">
                       <h2 className="text-xl font-display font-bold text-parchment-200">
                          <i className="fas fa-globe-asia text-gold-500 mr-3"></i> Kiến Tạo Thế Giới
                       </h2>
                       <p className="text-xs text-ink-500 mt-1 pl-8">Thiết lập bối cảnh cho hành trình của bạn.</p>
                   </div>

                   {/* Quick Assist Box */}
                   <div className="bg-ink-950/40 border border-gold-500/20 rounded-xl p-5 mb-8 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-gold-500/50"></div>
                      <label className="block text-[10px] font-bold text-gold-400 uppercase tracking-wider mb-3">
                         <i className="fas fa-bolt mr-2"></i> Khởi tạo nhanh (AI Assist)
                      </label>
                      <div className="flex gap-2">
                         <input 
                            type="text"
                            value={quickAssistPrompt}
                            onChange={(e) => setQuickAssistPrompt(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleQuickAssist()}
                            placeholder={`Vd: ${currentData.preset.worldContext.substring(0, 45)}...`}
                            className="flex-1 bg-ink-900/80 border border-ink-700 rounded-lg px-4 py-2 text-sm focus:border-gold-500/50 outline-none text-parchment-200 placeholder-ink-600 transition-colors font-serif shadow-inner"
                         />
                         <button 
                            onClick={handleQuickAssist}
                            disabled={loadingField === 'quick'}
                            className="bg-ink-800 hover:bg-gold-900/30 text-parchment-200 px-5 rounded-lg border border-ink-700 font-bold transition-colors disabled:opacity-50"
                         >
                            {loadingField === 'quick' ? <i className="fas fa-spinner fa-spin text-gold-400"></i> : <i className="fas fa-magic text-gold-400"></i>}
                         </button>
                      </div>
                   </div>

                   {/* Detailed Fields */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="col-span-1 md:col-span-2">
                           {renderWorldField('worldContext', 'Bối Cảnh & Địa Lý', 'Mô tả không gian, thời gian, lịch sử...')}
                       </div>
                       
                       {renderWorldField('plotDirection', 'Cốt Truyện Chính', 'Mục tiêu, kẻ thù định mệnh...')}
                       {renderWorldField('majorFactions', 'Các Thế Lực Lớn', 'Tông môn, Triều đình, Tổ chức...')}
                       {renderWorldField('keyNpcs', 'Nhân Vật Quan Trọng', 'Sư phụ, hồng nhan, kẻ thù...')}
                   </div>
               </div>
            </div>
        </div>

      </main>
    </div>
  );
};
