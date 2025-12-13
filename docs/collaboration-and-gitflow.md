# Duo-Nan-Guo 協作指南

---

## 👥 團隊分工

| 角色 | 負責路徑 | GitHub ID |
|------|----------|-----------|
| **Factory** | `/lib/factory/`, `/app/admin/` | @RiceTooCold |
| **Game** | `/lib/game/`, `/app/(game)/` | @game-owner |
| **UI** | `/lib/ui/`, `/public/`, CSS | @ui-owner |

**共用區域**（需要多人同意）：
- `/prisma/` — 資料庫 Schema
- `/docs/` — 文件

---

## 🌿 分支規則

### 只有兩種分支

```
main        ← 穩定版，可以部署
  └── develop   ← 開發版，大家都從這裡開分支
        ├── feature/factory-xxx
        ├── feature/game-xxx
        └── feature/ui-xxx
```

### 分支命名

```bash
# 格式：feature/{你的角色}-{功能描述}

feature/factory-batch-generation   # ✅ 好
feature/game-multiplayer           # ✅ 好
feature/ui-dark-mode               # ✅ 好

feature/update-stuff               # ❌ 太模糊
new-feature                        # ❌ 沒有 feature/ 前綴
```

---

## 日常工作流程

### 1️⃣ 開始新功能

```bash
# 確保 develop 是最新的
git checkout develop
git pull origin develop

# 從 develop 開一個新分支
git checkout -b feature/factory-your-feature
```

### 2️⃣ 開發中，經常 commit

```bash
git add .
git commit -m "feat(factory): 加了什麼功能"
```

### 3️⃣ 完成後，推上去發 PR

```bash
git push origin feature/factory-your-feature
```

然後到 GitHub 開 Pull Request：
- **Base**: `develop`
- **Compare**: 你的分支

### 4️⃣ 等人 Review → Merge

PR 被 approve 後，點 **Squash and Merge**。

---

## Commit 訊息格式

```bash
{類型}({範圍}): 描述

# 範例
feat(factory): 新增批次生成功能
fix(game): 修正連線斷掉的問題
style(ui): 調整按鈕顏色
docs(shared): 更新 API 文件
```

**類型說明**：
- `feat` — 新功能
- `fix` — 修 Bug
- `style` — 純樣式調整
- `docs` — 文件
- `refactor` — 重構（沒有新功能也沒修 Bug）

---

## 注意事項

1. **不要直接 push 到 `main` 或 `develop`**  
   一律透過 PR

2. **改 `/prisma/` 時要先講一聲**  
   因為這會影響其他人

3. **PR 盡量小**  
   一個 PR 專注做一件事，不要一次改太多

4. **衝突怎麼辦？**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout feature/your-branch
   git merge develop
   # 解決衝突後
   git add .
   git commit -m "merge develop"
   git push
   ```

---

## Quick Reference

```
開新功能：git checkout -b feature/{角色}-{功能}
提交：    git commit -m "feat(factory): 描述"
推送：    git push origin feature/xxx
合併：    開 PR → 等 review → Squash and Merge
```

就這樣！有問題隨時問 
