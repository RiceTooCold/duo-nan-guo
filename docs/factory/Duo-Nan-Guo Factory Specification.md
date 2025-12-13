# **Duo-Nan-Guo Content Factory Specification**

Version: 7.0.0 (High-Level Architecture)  
Type: Product Requirement & Architecture Spec  
Reference Document: docs/question\_bank\_design.md

## **1\. 專案概述 (Project Overview)**

**Duo-Nan-Guo Factory** 是一個整合於主應用程式 (Web App) 中的**智慧內容生成服務**。其目標是建立一條自動化的「題庫生產線」，利用生成式 AI 技術，產出符合 **JLPT / TOEIC / TOPIK / HSK** 檢定標準的高品質語言題目。

### **核心策略 (Core Strategies)**

1. **檢定題型驅動 (Exam-Type Driven):** 生成邏輯不以單字為單位，而是以「檢定考點（如 JLPT 漢字讀音、TOEIC 詞性判斷）」為核心驅動力。  
2. **全目標語沈浸 (T2T Mode):** 為模擬真實檢定，所有生成內容（題目與選項）皆鎖定為 **Target-to-Target** 模式，不提供母語翻譯。  
3. **雙模型博弈 (Generator-Critic Loop):** 採用「低成本模型生成 \-\> 高智商模型審查」的機制，確保量產效率與品質控管。  
4. **自動情境解析 (Auto-Topic Resolution):** 若未指定主題，系統需能根據檢定級別自動選取高頻常考情境。

## **2\. 技術棧選擇 (Technology Stack)**

* **Runtime / Framework:**  
  * **Next.js 15+ (App Router):** Factory 邏輯需封裝為 Server Actions 或 Internal API，供 Admin 後台調用。  
  * **TypeScript:** 強制型別檢查，確保前後端資料結構一致。  
* **Database & ORM:**  
  * **MongoDB Atlas:** 儲存非結構化題目資料 (JSON Documents)。  
  * **Prisma ORM:** 用於定義資料模型 (Schema) 與型別生成，需支援多態結構 (Polymorphic JSON)。  
* **AI Engine (Google Gemini Ecosystem):**  
  * **Generator (生產者):** Gemini 2.5 Flash —— 負責高併發、結構化輸出 (JSON)。  
  * **Critic (審查者):** Gemini 2.5 Pro —— 負責邏輯推理、幻覺檢測與自動修復建議。  
* **Validation:**  
  * **Zod:** 用於 AI 輸出的 Runtime 驗證 (Schema Validation)。

## **3\. 功能需求 (Functional Requirements)**

### **3.1 管理者介面 (Admin Dashboard)**

Coding Agent 需實作一個圖形化介面，提供以下操作：

* **題庫生成:** 允許選擇「目標語言」、「難度分級」與「生成數量」，及依照 Design Spec 比例和情境平均選擇生成該檢定該難度的一組題庫。  
* **詳細參數注入:** 允許選擇「目標語言」、「難度分級」、「檢定題型 (依據 Design Spec)」、「情境控制」與「生成數量」。  
* **即時預覽:** 生成過程中需即時回饋進度，生成後依照 batch 或 request 以卡片形式展示題目與 AI 審查結果
* **題庫瀏覽:** 題庫瀏覽界面需提供題目篩選功能，並檢視題庫的所有題目（採pagination），並開放對題目 CRUD 的功能。

### **3.2 自動化生產流程 (Production Pipeline)**

系統需實作以下標準作業程序 (SOP)：

1. **Prompt Routing:** 根據選擇的「檢定題型 (ExamQuestionType)」，動態載入專屬的 System Prompt (參照 Design Spec)。  
2. **Batch Generation:** 呼叫 Generator 模型產出 JSON 陣列。  
3. **Quality Assurance:** 將產出內容送交 Critic 模型進行評分與邏輯檢查（特別是干擾項的合理性與唯一解）。  
4. **Upsert Logic:** 寫入資料庫時需執行去重檢查，且**嚴格禁止**覆蓋已被人工標記為 is\_human\_touched 的資料。

### **3.3 資料結構需求 (Data Requirements)**

* **統一題型:** 資料庫結構應鎖定為 **「四選一選擇題 (Multiple Choice)」** 格式。  
* **多態內容:** 雖然格式統一，但內容欄位 (interaction) 需能彈性容納不同檢定的需求（例如 TOEIC 的詞性變化、JLPT 的假名選項）。  
* **檢定標籤:** 每道題目必須包含完整的檢定屬性標籤（語言、級別、考點類型），以便前端進行精準篩選。

## **4\. 交付與驗收標準 (Deliverables)**

Coding Agent 需交付以下成果：

1. **Prisma Schema:** 完整的資料模型定義，包含所有 Enum 與索引設定。  
2. **Service Layer:** 封裝良好的 TypeScript 函式庫，處理 AI 呼叫與資料庫寫入。  
3. **Admin UI:** 可操作的 Next.js 頁面。  
4. **Prompt Templates:** 針對四大檢定（JP/EN/KR/CN）實作具體的 Prompt 模板程式碼。