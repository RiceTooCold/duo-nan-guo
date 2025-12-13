# **Duo-Nan-Guo Question Bank Design Specification**

Version: 2.0.0  
Scope: Defines the mapping between Official Exams, System Difficulty (Rank), Content Strategy, and Topic Domains.  
本文件整合了「檢定標準參考」、「內容策略矩陣」與「常見情境領域」，作為 Factory 生成題庫的 **單一真理來源 (Single Source of Truth)**。

## **1\. 設計核心哲學 (Core Philosophy)**

### **1.1 全目標語沈浸 (T2T Hardcore Mode)**

為了模擬真實檢定考試的壓力與語感，所有生成的題目皆鎖定為 **Target-to-Target (T2T)** 模式。

* **題目 (Stimulus):** 全目標語（日/英/韓/中），無母語翻譯。  
* **選項 (Interaction):** 全目標語。訓練考生透過上下文 (Context) 或文法邏輯解題。
* **解釋 (Explanation):** 使用繁體中文說明正確答案原因。

### **1.2 統一難度量尺 (Unified Rank System)**

將各檢定不同的分級制度映射為系統內部的 **Rank** 1 \- **6**。

| Rank | 定義 | TOEIC | JLPT | TOPIK | HSK 3.0 |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **1** | **Novice (入門)** | 0-215 (橘) | **N5** | **I 1級** | Level 1 |
| **2** | **Basic (初級)** | 220-465 (棕) | **N4** | **I 2級** | Level 2 |
| **3** | **Intermediate (中級)** | 470-725 (綠) | **N3** | **II 3급** | Level 3 |
| **4** | **Advanced (中高級)** | 730-855 (藍) | **N2** | **II 4급** | Level 4 |
| **5** | **Expert (高級)** | 860-990 (金) | **N1** | **II 5급** | Level 5 |
| **6** | **Native (精通)** | \- | \- | **II 6급** | Level 6 |

### **1.3 填空符號標準**

所有題目的填空位置統一使用 `_____` (五個底線)。

---

## **2\. 🇺🇸 英文題庫設計 (Target: TOEIC L&R)**

### **2.1 檢定分析與鎖定**

TOEIC 考試核心在於 **國際商務溝通 (International Business Communication)**。本系統專注於模擬 **Part 5 (Incomplete Sentences)** 的單題填空模式。

### **2.2 內容策略矩陣 (Content Strategy Matrix)**

| 核心考點 (Focus) | 系統題型 (Enum) | 題目邏輯 & 誘答策略 (Distractors) | 建議比例 |
| :---- | :---- | :---- | :---- |
| **Part of Speech** (詞性判斷) | `toeic_part5_pos` | **同字根變化**：The _____ was successful. 選：negotiate (v) / **negotiation (n)** / negotiable (adj)。考驗句子結構分析能力。 | **20%** |
| **Verb Tense** (時態與語態) | `toeic_part5_tense` | **時間副詞對應**：He _____ the report *yesterday*. 選：submits / **submitted** / will submit。混淆主動/被動與完成式。 | **20%** |
| **Vocabulary** (情境單字) | `toeic_part5_vocab` | **情境單字填空**：Please sign the _____. 選：**contract** / contact / contrast。拼寫相似字或意涵相近但不搭配的字。 | **30%** |
| **Prepositions** (介系詞/連接詞) | `toeic_part5_prep` | **固定搭配 (Collocation)**：We look forward _____ seeing you. 選：for / **to** / at。考慣用語與片語動詞。 | **10%** |
| **Pronouns** (代名詞) | `toeic_part5_pronouns` | **代名詞一致**：The client asked to speak to _____ directly. 選：him / his / **himself**。考主格/受格/所有格/反身。 | **10%** |
| **Agreement** (主詞動詞一致) | `toeic_part5_agreement` | **主詞動詞一致**：Everyone in the departments _____ required. 選：**is** / are / were。考不定代名詞與集合名詞。 | **10%** |

### **2.3 題目長度**

- **Stimulus**: 100-150 字元（複雜文法最多 200 字元）
- 符合真實 TOEIC Part 5 題目風格

---

## **3\. 🇯🇵 日文題庫設計 (Target: JLPT)**

### **3.1 檢定分析與鎖定**

JLPT 高度重視「文字語彙」與「文法」。系統模擬官方 **「言語知識（文字・語彙）」** 題型。

### **3.2 內容策略矩陣 (Content Strategy Matrix)**

| 核心考點 (Focus) | 系統題型 (Enum) | 題目邏輯 & 誘答策略 | 級別限制 | 建議比例 |
| :---- | :---- | :---- | :---- | :---- |
| **漢字読み** (Kanji Reading) | `jlpt_kanji_reading` | 漢字→假名：彼は「**学生**」です。選：**がくせい**/かくせい/がっせい。長音、促音、清濁音陷阱。 | 全級別 | **18-25%** |
| **漢字書き** (Kanji Writing) | `jlpt_kanji_writing` | 假名→漢字：きのう「**さんぽ**」しました。選：**散歩**/三歩/産歩。 | N5-N2 (N1無) | **0-22%** |
| **文脈規定** (Context Vocab) | `jlpt_context_vocab` | 選詞填空：この店は_____が安い。選：**値段**/価値/費用。固定搭配。 | 全級別 | **20-30%** |
| **言い換え** (Paraphrase) | `jlpt_paraphrase` | 意義替換：「**しきりに**」連絡する。選：**何度も**/ときどき/たまに。 | 全級別 | **15-20%** |
| **用法** (Usage) | `jlpt_usage` | 正確用法判斷：選出「つもり」使用正確的句子。考主語意志性。 | N4-N1 (N5無) | **0-25%** |
| **複合語** (Compound Words) | `jlpt_compound` | 共通成分：飛び___む/飛び___す/飛び___げる。共通：**込・出・上**。 | N5-N2 (N1無) | **0-17%** |

### **3.3 級別限制說明**

- **N5**: 無「用法」題型
- **N1**: 無「漢字書き」與「複合語」題型

---

## **4\. 🇰🇷 韓文題庫設計 (Target: TOPIK)**

### **4.1 檢定分析與鎖定**

TOPIK 的核心難點在於「語尾變化」與「敬語系統」。系統模擬 **TOPIK I/II 閱讀測驗** 中的填空題型。

### **4.2 內容策略矩陣 (Content Strategy Matrix)**

| 核心考點 (Focus) | 系統題型 (Enum) | 題目邏輯 & 誘答策略 | 級別限制 | 建議比例 |
| :---- | :---- | :---- | :---- | :---- |
| **情境詞彙** (Context Vocab) | `topik_vocab_context` | 選詞：_____에 갑니다. 책을 삽니다. 選：**서점**/은행/식당。 | TOPIK I 為主 | **15-25%** |
| **助詞** (Particles) | `topik_particles` | 助詞選擇：저는 서울 _____ 살아요. 選：**에서**/에/로。考收尾音變化。 | TOPIK I | **0-25%** |
| **文法填空** (Grammar Blank) | `topik_grammar_blank` | 連接語尾：감기약을 _____ 열이 내렸다. 選：**먹으니까**/먹지만。 | TOPIK II 為主 | **15-25%** |
| **近義詞** (Synonyms) | `topik_synonyms` | 意義替換：이 음식은 정말 「맛있어요」。選：**맛이 좋아요**/많아요。 | 全級別 | **15-20%** |
| **文法表現** (Grammar Expression) | `topik_grammar_expression` | 文法替換：-아/어서 = ? 選：**-니까**/-(으)면/-(으)려고。 | TOPIK II | **0-25%** |
| **句子排序** (Sentence Order) | `topik_sentence_order` | 排列 A, B, C 三句成正確順序。考邏輯連接。 | 全級別 | **8-10%** |
| **內容匹配** (Content Match) | `topik_content_match` | 判斷句子是否符合短文內容。 | 全級別 | **7-10%** |

### **4.3 級別配置**

- **TOPIK I (1-2級)**: 情境詞彙、助詞為主
- **TOPIK II (3-6級)**: 文法填空、文法表現為主

---

## **5\. 🇨🇳 中文題庫設計 (Target: HSK 3.0)**

### **5.1 檢定分析與鎖定**

針對非母語學習者，中文的難點在於「量詞」與「獨特語序」。系統採用 **繁體中文** 輸出，但難度標準參照 HSK 3.0。

### **5.2 內容策略矩陣 (Content Strategy Matrix)**

| 核心考點 (Focus) | 系統題型 (Enum) | 題目邏輯 & 誘答策略 | 級別限制 | 建議比例 |
| :---- | :---- | :---- | :---- | :---- |
| **選詞填空** (Vocab Fill-in) | `hsk_vocab_blank` | 情境：我每天早上都_____ 咖啡。選：**喝**/吃/看/買。 | 全級別 | **18-30%** |
| **語法填空** (Grammar Fill-in) | `hsk_grammar_blank` | 把/被字句：我_____ 書放在桌子上了。選：**把**/被/讓/給。 | 全級別 | **15-30%** |
| **近義詞** (Synonyms) | `hsk_synonyms` | 替換：他很「聰明」。選：**智慧**/漂亮/高興。 | 全級別 | **15-25%** |
| **句子排序** (Sentence Order) | `hsk_sentence_order` | 排列 A, B, C 三句。考邏輯順序與連接詞。 | 全級別 | **10-18%** |
| **量詞** (Measure Words) | `hsk_measure_words` | 搭配：桌子上有一_____ 蘋果。選：**個**/本/張/條。 | HSK 1-4 | **0-20%** |
| **語序** (Word Order) | `hsk_word_order` | 判斷正確句子：(A) 我昨天在圖書館看書。**(B)** 正確。 | 全級別 | **8-10%** |

### **5.3 級別配置**

- **HSK 1-2**: 量詞比例高（初學者常見）
- **HSK 3-4**: 平均分布，量詞比例降低
- **HSK 5-6**: 無量詞題型，語法/近義詞比例高