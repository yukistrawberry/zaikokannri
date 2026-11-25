"use strict";

    const BASE_INVENTORY_DATA = [{"name":"DAアイテム","items":[{"name":"DAじゃんぼミックス","unit":"Kg"},{"name":"DAお好みソース","unit":"本"},{"name":"DA焼きそばソース","unit":"本"},{"name":"DAマヨネーズ","unit":"本"},{"name":"DA紅生姜みじん切り","unit":"袋"},{"name":"DAかつお","unit":"袋"},{"name":"DA天かす","unit":"Kg"},{"name":"DA輪ゴム","unit":"袋"},{"name":"DAラード","unit":"缶"},{"name":"DA J 炒め油 15kg","unit":"缶"},{"name":"お好みパック","unit":"枚"},{"name":"15パック","unit":"枚"},{"name":"12パック","unit":"枚"},{"name":"9パック","unit":"枚"},{"name":"6パック","unit":"枚"},{"name":"焼そば 大パック","unit":"枚"},{"name":"焼そば 並パック","unit":"枚"},{"name":"惣菜パック","unit":"枚"},{"name":"キャリーバッグ 大","unit":"袋"},{"name":"キャリーバッグ 小","unit":"袋"},{"name":"爪楊枝 6cm","unit":"CS"},{"name":"アウトレットおこのみパック 本体","unit":"枚"},{"name":"アウトレットおこのみパック 蓋","unit":"枚"},{"name":"アウトレット たこ焼きパック","unit":"枚"},{"name":"丸竹箸(じゃんぼ)1袋100入り","unit":"袋"},{"name":"DAラード1kg","unit":"缶"}]},{"name":"野菜","items":[{"name":"キャベツ","unit":"Kg"},{"name":"たまねぎ","unit":"Kg"},{"name":"ネギ(5mm)","unit":"袋"},{"name":"きゅうり","unit":"本"},{"name":"もやし","unit":"袋"},{"name":"長いも","unit":"Kg"},{"name":"トマト","unit":"個"}]},{"name":"冷凍食品","items":[{"name":"イズックス 塩味枝豆","unit":"袋"},{"name":"冷凍アスパラ 500g","unit":"袋"},{"name":"くんちゃまベーコン","unit":"袋"},{"name":"シュレッドチーズ","unit":"Kg"},{"name":"切りイカ耳","unit":"Kg"},{"name":"キムチ 500g×10P","unit":"Pc"},{"name":"鮭フレーク500g","unit":"Pc"},{"name":"冷凍かまぼこ220g","unit":"Pc"},{"name":"ロングウインナー","unit":"本"},{"name":"冷凍ちくわ5本入り","unit":"本"},{"name":"チーズジャガモチ","unit":"個"},{"name":"厳選ぎょうざ","unit":"個"},{"name":"チーズ春巻き","unit":"個"},{"name":"かにクリームコロッケ","unit":"個"},{"name":"ハムカツ 40g 20個入り","unit":"個"},{"name":"唐っと甘エビ1kg","unit":"袋"},{"name":"むきにんにく1kg","unit":"袋"},{"name":"なんこつ唐揚げ 600g (10袋入り)","unit":"袋"},{"name":"ポテトフライ 2kg","unit":"袋"},{"name":"スパイシーパウダー270g","unit":"袋"},{"name":"揚げだし豆腐20個","unit":"個"},{"name":"ごぼうスティック500g","unit":"袋"}]},{"name":"スピード","items":[{"name":"らっきょう","unit":"袋"},{"name":"ミックスナッツ","unit":"缶"},{"name":"たこわさ","unit":"パック"}]},{"name":"生食","items":[{"name":"焼きそば麺 (50)","unit":"袋"},{"name":"冷凍 豚バラスライス 2mm","unit":"Kg"},{"name":"鶏ももカット肉 から揚げ用","unit":"Kg"},{"name":"鶏もも正肉 ステーキ用","unit":"Kg"},{"name":"赤イカ短冊","unit":"Kg"},{"name":"切りタコ 2-3g 12kg入り","unit":"Kg"},{"name":"鶏ハラミ","unit":"Kg"},{"name":"鶏皮","unit":"Kg"}]},{"name":"その他","items":[{"name":"永谷園 お茶漬け海苔","unit":"袋"},{"name":"生みそ汁わかめ 100食","unit":"袋"},{"name":"DAポン酢 ※小さい小袋を数える","unit":"袋"},{"name":"DA青さ","unit":"袋"},{"name":"DA浜御塩焼塩","unit":"袋"},{"name":"DA浅漬けの素500g","unit":"袋"},{"name":"DAピリ辛きゅうりの素500g","unit":"袋"},{"name":"DAから揚げの素2kg","unit":"袋"},{"name":"無洗米1.4kg","unit":"袋"},{"name":"卵 Mサイズ","unit":"CS"},{"name":"わさび小袋2.5g","unit":"袋"},{"name":"無塩バター","unit":"個"},{"name":"ホールコーン 4号缶","unit":"缶"},{"name":"塩こんぶ 500g","unit":"袋"},{"name":"薄力粉1kg","unit":"袋"},{"name":"天ぷら粉 2kg","unit":"袋"},{"name":"ソフトさきいか1kg","unit":"袋"},{"name":"きざみのり100g","unit":"袋"},{"name":"一味唐辛子 300g","unit":"袋"},{"name":"ライスクックチャーハン用500g","unit":"袋"}]},{"name":"調味料","items":[{"name":"塩コショウ","unit":"個"},{"name":"ケチャップ 1kg","unit":"本"},{"name":"ミツカン ユズポン 1.8L","unit":"本"},{"name":"サラダ油 16.5kg","unit":"缶"},{"name":"キャノーラ油8kg","unit":"箱"},{"name":"(JFD) 純正ごま油 1.65kg","unit":"本"},{"name":"ぎょうざたれ 1.8L","unit":"本"},{"name":"ウスターソース","unit":"本"},{"name":"東丸 淡口醤油 ペット","unit":"本"},{"name":"DA濃口醤油 1.8L","unit":"本"},{"name":"DA塩だれ","unit":"本"},{"name":"DAほんだし","unit":"袋"},{"name":"めんつゆ1.8L","unit":"本"},{"name":"みそ 1kgx10(スープジャーでやっている店","unit":"Pc"},{"name":"明太ソース","unit":"本"}]},{"name":"ドリンク","items":[{"name":"アサヒ スーパードライ生樽19L","unit":"本"},{"name":"アサヒスーパードライ生樽≪≪10L≫≫","unit":"本"},{"name":"ガスボンベ 5kg","unit":"本"},{"name":"カルピス L パック","unit":"本"},{"name":"アサヒ グレープフルーツ シロップ","unit":"本"},{"name":"アサヒ レモンシロップ","unit":"本"},{"name":"アサヒ ライムシロップ","unit":"本"},{"name":"アサヒ シークアーサーシロップ","unit":"本"},{"name":"アサヒ 梅シロップ ≪≪600ml≫≫","unit":"本"},{"name":"コーラシロップ","unit":"本"},{"name":"ジンジャーエード","unit":"本"},{"name":"ブラックニッカ 4L","unit":"本"},{"name":"アサヒ 濃醇梅酒 瓶 1.8L","unit":"本"},{"name":"アサヒ 酎五郎","unit":"本"},{"name":"麦焼酎 二階堂","unit":"本"},{"name":"芋焼酎 黒霧島","unit":"本"},{"name":"いいちこ","unit":"本"},{"name":"黄桜 金印","unit":"本"},{"name":"本格芋焼酎 金黒 1.8L瓶","unit":"本"},{"name":"純水みかん","unit":"本"},{"name":"ウーロン茶","unit":"本"},{"name":"コカコーラ 250ml缶","unit":"本"},{"name":"黒生 334ml","unit":"本"},{"name":"サントリー 角 5L","unit":"本"},{"name":"ウィルキンソンジン1.8L","unit":"本"},{"name":"ウーロン茶(パック)","unit":"パック"},{"name":"アサヒゼロ","unit":"本"}]}];
    const STORAGE_KEY = "inventory-management-v1";
    const ACTIVE_TAB_KEY = "inventory-active-tab-v1";
    const CATALOG_KEY = "inventory-catalog-v2";

    const tabsElement = document.getElementById("tabs");
    const itemsElement = document.getElementById("items");
    const categoryTitleElement = document.getElementById("categoryTitle");
    const itemCountElement = document.getElementById("itemCount");
    const gestureHint = document.getElementById("gestureHint");
    const searchInput = document.getElementById("searchInput");
    const saveStatus = document.getElementById("saveStatus");
    const resetSheet = document.getElementById("resetSheet");
    const addSheet = document.getElementById("addSheet");
    const addForm = document.getElementById("addForm");
    const newItemName = document.getElementById("newItemName");
    const newItemUnit = document.getElementById("newItemUnit");
    const addError = document.getElementById("addError");
    const snackbar = document.getElementById("snackbar");
    const snackbarMessage = document.getElementById("snackbarMessage");

    let catalog = loadCatalog();
    let activeCategory = loadActiveCategory();
    let inventory = loadInventory();
    let searchQuery = "";
    let saveTimer = null;
    let inventorySaveTimer = null;
    let snackbarTimer = null;
    let lastDeleted = null;
    let pendingHighlightId = null;
    let cancelActiveDrag = null;

    function deepCloneBaseCatalog() {
      return BASE_INVENTORY_DATA.map((category, categoryIndex) => ({
        name: category.name,
        items: category.items.map((item, itemIndex) => ({
          id: `base-${categoryIndex}-${itemIndex}`,
          name: item.name,
          unit: item.unit
        }))
      }));
    }

    function loadCatalog() {
      try {
        const saved = JSON.parse(localStorage.getItem(CATALOG_KEY) || "null");
        if (!Array.isArray(saved) || saved.length === 0) return deepCloneBaseCatalog();
        const valid = saved.every(category =>
          category && typeof category.name === "string" && Array.isArray(category.items) &&
          category.items.every(item => item && typeof item.id === "string" && typeof item.name === "string" && typeof item.unit === "string")
        );
        return valid ? saved : deepCloneBaseCatalog();
      } catch (error) {
        console.warn("品目データを読み込めませんでした。", error);
        return deepCloneBaseCatalog();
      }
    }

    function loadActiveCategory() {
      const saved = localStorage.getItem(ACTIVE_TAB_KEY);
      return catalog.some(category => category.name === saved) ? saved : catalog[0].name;
    }

    function loadInventory() {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        return saved && typeof saved === "object" ? saved : {};
      } catch (error) {
        console.warn("保存データを読み込めませんでした。", error);
        return {};
      }
    }

    function makeLegacyKey(categoryName, itemName) {
      return `${categoryName}::${itemName}`;
    }

    function getCategory(name = activeCategory) {
      return catalog.find(category => category.name === name) || catalog[0];
    }

    function normalizeNumber(value) {
      const number = Number(value);
      return Number.isFinite(number) && number >= 0 ? number : 0;
    }

    function formatNumber(value) {
      const number = normalizeNumber(value);
      return Number.isInteger(number) ? String(number) : String(Math.round(number * 1000) / 1000);
    }

    function getValues(categoryName, item) {
      let values = inventory[item.id];
      const legacyKey = makeLegacyKey(categoryName, item.name);
      if ((!Array.isArray(values) || values.length !== 3) && Array.isArray(inventory[legacyKey])) {
        values = inventory[legacyKey];
        inventory[item.id] = values;
        delete inventory[legacyKey];
        saveInventory(false);
      }
      if (!Array.isArray(values) || values.length !== 3) return [0, 0, 0];
      return values.map(value => normalizeNumber(value));
    }

    function setSaveStatus(message = "保存済み") {
      saveStatus.textContent = message;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => { saveStatus.textContent = "自動保存"; }, 1400);
    }

    function saveInventory(showStatus = true) {
      clearTimeout(inventorySaveTimer);
      inventorySaveTimer = null;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
      if (showStatus) setSaveStatus();
    }

    function scheduleInventorySave() {
      saveStatus.textContent = "保存中…";
      clearTimeout(inventorySaveTimer);
      inventorySaveTimer = window.setTimeout(() => saveInventory(true), 220);
    }

    function flushInventorySave() {
      if (inventorySaveTimer !== null) saveInventory(false);
    }

    function saveCatalog() {
      localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog));
      setSaveStatus();
    }

    function createId() {
      if (window.crypto && typeof window.crypto.randomUUID === "function") return `custom-${window.crypto.randomUUID()}`;
      return `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    function renderTabs() {
      tabsElement.innerHTML = "";
      catalog.forEach(category => {
        const button = document.createElement("button");
        const selected = category.name === activeCategory;
        button.type = "button";
        button.className = "tab";
        button.role = "tab";
        button.setAttribute("aria-selected", String(selected));
        button.textContent = category.name;
        button.addEventListener("click", () => {
          activeCategory = category.name;
          localStorage.setItem(ACTIVE_TAB_KEY, activeCategory);
          searchQuery = "";
          searchInput.value = "";
          renderTabs();
          renderItems();
          button.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
        tabsElement.appendChild(button);
      });
    }

    function renderItems() {
      if (cancelActiveDrag) cancelActiveDrag(false);
      const category = getCategory();
      const normalizedQuery = searchQuery.trim().toLocaleLowerCase("ja");
      const visibleItems = category.items.filter(item => item.name.toLocaleLowerCase("ja").includes(normalizedQuery));

      categoryTitleElement.textContent = category.name;
      itemCountElement.textContent = normalizedQuery ? `${visibleItems.length} / ${category.items.length} 品目` : `${category.items.length} 品目`;
      gestureHint.textContent = normalizedQuery
        ? "検索中は並べ替えできません／左スワイプで削除"
        : "左スワイプで削除／右上の「⠿」を長押しして並べ替え";
      itemsElement.innerHTML = "";

      const fragment = document.createDocumentFragment();
      if (visibleItems.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty";
        empty.textContent = "該当する品目がありません。";
        fragment.appendChild(empty);
      } else {
        visibleItems.forEach(item => fragment.appendChild(createItemShell(category.name, item, !normalizedQuery)));
      }

      fragment.appendChild(createAddBox());
      itemsElement.appendChild(fragment);

      if (pendingHighlightId) {
        const shell = [...itemsElement.querySelectorAll(".swipe-shell")].find(entry => entry.dataset.itemId === pendingHighlightId);
        if (shell) {
          shell.classList.add("flash-added");
          shell.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        pendingHighlightId = null;
      }
    }

    function createAddBox() {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "add-box";
      button.innerHTML = '<span class="add-plus" aria-hidden="true">＋</span><span class="add-label">品目を追加</span>';
      button.addEventListener("click", openAddSheet);
      return button;
    }

    function createItemShell(categoryName, item, reorderEnabled) {
      const values = getValues(categoryName, item);
      const shell = document.createElement("div");
      shell.className = "swipe-shell";
      shell.dataset.itemId = item.id;

      const deleteBg = document.createElement("div");
      deleteBg.className = "swipe-delete-bg";
      deleteBg.textContent = "削除";

      const card = document.createElement("article");
      card.className = "item-card";

      const heading = document.createElement("div");
      heading.className = "item-heading";

      const name = document.createElement("div");
      name.className = "item-name";
      name.textContent = item.name;

      const tools = document.createElement("div");
      tools.className = "item-tools";

      const unit = document.createElement("span");
      unit.className = "unit-badge";
      unit.textContent = item.unit;

      const handle = document.createElement("button");
      handle.type = "button";
      handle.className = "drag-handle";
      handle.textContent = "⠿";
      handle.disabled = !reorderEnabled;
      handle.setAttribute("aria-label", `${item.name}を長押しして並べ替え`);
      handle.title = reorderEnabled ? "長押しして並べ替え" : "検索中は並べ替えできません";

      tools.append(unit, handle);
      heading.append(name, tools);

      const grid = document.createElement("div");
      grid.className = "stock-grid";

      const inputs = values.map((value, index) => {
        const cell = document.createElement("div");
        cell.className = "stock-cell";
        const label = document.createElement("label");
        label.textContent = `倉庫${["①", "②", "③"][index]}`;
        const input = document.createElement("input");
        input.className = "stock-input";
        input.type = "number";
        input.inputMode = "decimal";
        input.min = "0";
        input.step = item.unit.toLocaleLowerCase("ja") === "kg" ? "0.01" : "1";
        input.value = value === 0 ? "" : formatNumber(value);
        input.placeholder = "0";
        input.setAttribute("aria-label", `${item.name} 倉庫${index + 1}`);
        cell.append(label, input);
        grid.appendChild(cell);
        return input;
      });

      const totalCell = document.createElement("div");
      totalCell.className = "stock-cell";
      const totalLabel = document.createElement("label");
      totalLabel.textContent = "合計";
      const totalBox = document.createElement("div");
      totalBox.className = "total-box";
      totalBox.setAttribute("aria-label", `${item.name} 合計`);
      totalCell.append(totalLabel, totalBox);
      grid.appendChild(totalCell);

      function updateTotalAndSave() {
        const nextValues = inputs.map(input => normalizeNumber(input.value));
        inventory[item.id] = nextValues;
        totalBox.textContent = formatNumber(nextValues.reduce((sum, value) => sum + value, 0));
        scheduleInventorySave();
      }

      inputs.forEach(input => {
        input.addEventListener("input", updateTotalAndSave);
        input.addEventListener("blur", () => {
          const value = normalizeNumber(input.value);
          input.value = value === 0 ? "" : formatNumber(value);
        });
      });

      totalBox.textContent = formatNumber(values.reduce((sum, value) => sum + value, 0));
      card.append(heading, grid);
      shell.append(deleteBg, card);

      attachSwipeGesture(shell, card, categoryName, item);
      if (reorderEnabled) attachLongPressDrag(handle, shell, categoryName);
      return shell;
    }

    function attachSwipeGesture(shell, card, categoryName, item) {
      let pointerId = null;
      let startX = 0;
      let startY = 0;
      let dx = 0;
      let swiping = false;

      card.addEventListener("pointerdown", event => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        if (event.target.closest("input, button")) return;
        pointerId = event.pointerId;
        startX = event.clientX;
        startY = event.clientY;
        dx = 0;
        swiping = false;
        card.setPointerCapture(pointerId);
      });

      card.addEventListener("pointermove", event => {
        if (event.pointerId !== pointerId) return;
        const moveX = event.clientX - startX;
        const moveY = event.clientY - startY;
        if (!swiping) {
          if (Math.abs(moveX) < 10) return;
          if (Math.abs(moveY) > Math.abs(moveX) * 0.85) {
            resetSwipe();
            return;
          }
          if (moveX >= 0) return;
          swiping = true;
          card.classList.add("swiping");
        }
        event.preventDefault();
        dx = Math.max(-132, Math.min(0, moveX));
        card.style.transform = `translate3d(${dx}px, 0, 0)`;
      });

      card.addEventListener("pointerup", event => {
        if (event.pointerId !== pointerId) return;
        const shouldDelete = swiping && dx <= -88;
        if (shouldDelete) {
          card.classList.remove("swiping");
          card.style.transform = "translate3d(-110%, 0, 0)";
          card.style.opacity = "0";
          window.setTimeout(() => deleteItem(categoryName, item.id), 150);
        } else {
          resetSwipe();
        }
        pointerId = null;
      });

      card.addEventListener("pointercancel", resetSwipe);

      function resetSwipe() {
        if (pointerId !== null && card.hasPointerCapture(pointerId)) card.releasePointerCapture(pointerId);
        pointerId = null;
        dx = 0;
        swiping = false;
        card.classList.remove("swiping");
        card.style.transform = "";
        card.style.opacity = "";
      }
    }

    function attachLongPressDrag(handle, shell, categoryName) {
      let pointerId = null;
      let startX = 0;
      let startY = 0;
      let offsetX = 0;
      let offsetY = 0;
      let ghostWidth = 0;
      let holdTimer = null;
      let dragging = false;
      let ghost = null;
      let placeholder = null;
      let frameId = null;
      let latestPoint = null;
      let lastReorderAt = 0;
      let lastTarget = null;
      let lastPlaceAfter = null;

      handle.addEventListener("contextmenu", event => event.preventDefault());
      handle.addEventListener("pointerdown", onPointerDown);

      function onPointerDown(event) {
        if (pointerId !== null) return;
        if (event.pointerType === "mouse" && event.button !== 0) return;
        event.preventDefault();
        pointerId = event.pointerId;
        startX = event.clientX;
        startY = event.clientY;
        latestPoint = { x: startX, y: startY };

        window.addEventListener("pointermove", onPointerMove, { capture: true, passive: false });
        window.addEventListener("pointerup", onPointerUp, true);
        window.addEventListener("pointercancel", onPointerCancel, true);
        window.addEventListener("blur", onWindowBlur, true);
        document.addEventListener("visibilitychange", onVisibilityChange, true);

        holdTimer = window.setTimeout(() => startDrag(startX, startY), 300);
      }

      function onPointerMove(event) {
        if (event.pointerId !== pointerId) return;
        latestPoint = { x: event.clientX, y: event.clientY };
        if (!dragging) {
          if (Math.hypot(event.clientX - startX, event.clientY - startY) > 20) cleanup(false);
          return;
        }
        event.preventDefault();
      }

      function onPointerUp(event) {
        if (event.pointerId !== pointerId) return;
        cleanup(dragging);
      }

      function onPointerCancel(event) {
        if (pointerId !== null && event.pointerId !== pointerId) return;
        cleanup(dragging);
      }

      function onWindowBlur() {
        cleanup(dragging);
      }

      function onVisibilityChange() {
        if (document.hidden) cleanup(dragging);
      }

      function startDrag(clientX, clientY) {
        if (pointerId === null || !shell.isConnected) return;
        dragging = true;
        document.getElementById('monthly-view').classList.add("drag-active");

        const rect = shell.getBoundingClientRect();
        offsetX = Math.max(0, Math.min(rect.width, clientX - rect.left));
        offsetY = Math.max(0, Math.min(rect.height, clientY - rect.top));
        ghostWidth = rect.width;

        placeholder = document.createElement("div");
        placeholder.className = "drag-placeholder";
        placeholder.style.height = `${rect.height}px`;
        shell.parentElement.insertBefore(placeholder, shell);
        shell.style.display = "none";

        ghost = shell.cloneNode(true);
        ghost.classList.add("drag-ghost");
        ghost.removeAttribute("data-item-id");
        ghost.style.display = "block";
        ghost.style.width = `${rect.width}px`;
        ghost.style.height = `${rect.height}px`;
        ghost.setAttribute("aria-hidden", "true");
        ghost.querySelectorAll("input, button").forEach(element => element.tabIndex = -1);
        document.getElementById('monthly-view').appendChild(ghost);
        moveGhost(clientX, clientY);

        cancelActiveDrag = cleanup;
        if (navigator.vibrate) navigator.vibrate(20);
        frameId = requestAnimationFrame(dragLoop);
      }

      function dragLoop(timestamp) {
        if (!dragging || !latestPoint) return;
        moveGhost(latestPoint.x, latestPoint.y);
        autoScroll(latestPoint.y);
        if (timestamp - lastReorderAt >= 45) {
          movePlaceholder(latestPoint.x, latestPoint.y);
          lastReorderAt = timestamp;
        }
        frameId = requestAnimationFrame(dragLoop);
      }

      function moveGhost(clientX, clientY) {
        if (!ghost) return;
        const maxLeft = Math.max(0, window.innerWidth - ghostWidth);
        const left = Math.max(0, Math.min(maxLeft, clientX - offsetX));
        const top = clientY - offsetY;
        ghost.style.transform = `translate3d(${left}px, ${top}px, 0) scale(1.01)`;
      }

      function movePlaceholder(clientX, clientY) {
        if (!placeholder) return;
        const hit = document.elementFromPoint(clientX, clientY);
        const target = hit?.closest?.(".swipe-shell[data-item-id]");
        if (!target || target.parentElement !== itemsElement || target === shell) return;

        const rect = target.getBoundingClientRect();
        const sameRow = clientY >= rect.top && clientY <= rect.bottom;
        const placeAfter = clientY > rect.top + rect.height / 2 || (sameRow && clientX > rect.left + rect.width / 2);
        if (target === lastTarget && placeAfter === lastPlaceAfter) return;

        lastTarget = target;
        lastPlaceAfter = placeAfter;
        const reference = placeAfter ? target.nextSibling : target;
        if (reference !== placeholder) itemsElement.insertBefore(placeholder, reference);
      }

      function autoScroll(clientY) {
        const edge = Math.min(110, window.innerHeight * 0.18);
        const maxSpeed = 13;
        let speed = 0;
        if (clientY < edge) {
          speed = -Math.ceil(maxSpeed * (edge - clientY) / edge);
        } else if (clientY > window.innerHeight - edge) {
          speed = Math.ceil(maxSpeed * (clientY - (window.innerHeight - edge)) / edge);
        }
        if (speed !== 0) window.scrollBy({ top: speed, left: 0, behavior: "auto" });
      }

      function cleanup(shouldPersist = false) {
        clearTimeout(holdTimer);
        holdTimer = null;
        if (frameId !== null) cancelAnimationFrame(frameId);
        frameId = null;
        latestPoint = null;

        window.removeEventListener("pointermove", onPointerMove, true);
        window.removeEventListener("pointerup", onPointerUp, true);
        window.removeEventListener("pointercancel", onPointerCancel, true);
        window.removeEventListener("blur", onWindowBlur, true);
        document.removeEventListener("visibilitychange", onVisibilityChange, true);

        const wasDragging = dragging;
        dragging = false;
        pointerId = null;
        document.getElementById('monthly-view').classList.remove("drag-active");

        if (placeholder?.isConnected) {
          placeholder.parentElement.insertBefore(shell, placeholder);
          placeholder.remove();
        }
        shell.style.display = "";
        ghost?.remove();
        ghost = null;
        placeholder = null;
        lastTarget = null;
        lastPlaceAfter = null;
        if (cancelActiveDrag === cleanup) cancelActiveDrag = null;

        if (shouldPersist && wasDragging) persistDomOrder(categoryName);
      }
    }

    function persistDomOrder(categoryName) {
      const category = getCategory(categoryName);
      const orderedIds = [...itemsElement.querySelectorAll(".swipe-shell[data-item-id]")].map(shell => shell.dataset.itemId);
      if (orderedIds.length !== category.items.length) return;
      const itemMap = new Map(category.items.map(item => [item.id, item]));
      category.items = orderedIds.map(id => itemMap.get(id)).filter(Boolean);
      saveCatalog();
    }

    function deleteItem(categoryName, itemId) {
      const category = getCategory(categoryName);
      const index = category.items.findIndex(item => item.id === itemId);
      if (index < 0) return;
      const [item] = category.items.splice(index, 1);
      const values = inventory[item.id] ?? inventory[makeLegacyKey(categoryName, item.name)] ?? [0, 0, 0];
      delete inventory[item.id];
      delete inventory[makeLegacyKey(categoryName, item.name)];
      lastDeleted = { categoryName, item, index, values };
      saveCatalog();
      saveInventory(false);
      renderItems();
      showSnackbar(`「${item.name}」を削除しました`);
    }

    function showSnackbar(message) {
      clearTimeout(snackbarTimer);
      snackbarMessage.textContent = message;
      if (!document.getElementById('undoDelete')) {
        const undo = document.createElement('button');
        undo.id = 'undoDelete'; undo.className = 'undo-button'; undo.type = 'button';
        undo.textContent = '元に戻す'; undo.addEventListener('click', undoDelete);
        snackbar.appendChild(undo);
      }
      snackbar.hidden = false;
      snackbar.classList.add("show");
      snackbarTimer = window.setTimeout(hideSnackbar, 6000);
    }

    function hideSnackbar() {
      snackbar.classList.remove("show");
      snackbar.hidden = true;
      document.getElementById('undoDelete')?.remove();
      clearTimeout(snackbarTimer);
    }

    function undoDelete() {
      if (!lastDeleted) return;
      const { categoryName, item, index, values } = lastDeleted;
      const category = getCategory(categoryName);
      if (!category.items.some(entry => entry.id === item.id)) {
        category.items.splice(Math.min(index, category.items.length), 0, item);
        inventory[item.id] = Array.isArray(values) ? values : [0, 0, 0];
        saveCatalog();
        saveInventory(false);
      }
      lastDeleted = null;
      hideSnackbar();
      if (activeCategory === categoryName) renderItems();
      setSaveStatus("復元しました");
    }

    function openAddSheet() {
      const category = getCategory();
      document.getElementById("addCategoryText").textContent = `「${category.name}」の一番下に追加します。`;
      newItemName.value = "";
      newItemUnit.value = "";
      addError.textContent = "";
      addSheet.classList.add("open");
      window.setTimeout(() => newItemName.focus(), 100);
    }

    function closeAddSheet() {
      addSheet.classList.remove("open");
      addError.textContent = "";
    }

    addForm.addEventListener("submit", event => {
      event.preventDefault();
      const name = newItemName.value.trim();
      const unit = newItemUnit.value.trim();
      const category = getCategory();
      if (!name || !unit) {
        addError.textContent = "品目名と単位を入力してください。";
        return;
      }
      if (category.items.some(item => item.name.toLocaleLowerCase("ja") === name.toLocaleLowerCase("ja"))) {
        addError.textContent = "同じ品目名がすでにあります。";
        return;
      }
      const item = { id: createId(), name, unit };
      category.items.push(item);
      saveCatalog();
      closeAddSheet();
      searchQuery = "";
      searchInput.value = "";
      pendingHighlightId = item.id;
      renderItems();
    });

    searchInput.addEventListener("input", event => {
      searchQuery = event.target.value;
      renderItems();
    });

    document.getElementById("openReset").addEventListener("click", () => resetSheet.classList.add("open"));
    document.getElementById("cancelReset").addEventListener("click", () => resetSheet.classList.remove("open"));
    document.getElementById("cancelAdd").addEventListener("click", closeAddSheet);


    document.getElementById("confirmReset").addEventListener("click", () => {
      inventory = {};
      localStorage.removeItem(STORAGE_KEY);
      resetSheet.classList.remove("open");
      renderItems();
      setSaveStatus("リセット済み");
    });

    resetSheet.addEventListener("click", event => {
      if (event.target === resetSheet) resetSheet.classList.remove("open");
    });

    addSheet.addEventListener("click", event => {
      if (event.target === addSheet) closeAddSheet();
    });

    window.addEventListener("pagehide", flushInventorySave);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) flushInventorySave();
    });

    renderTabs();
    renderItems();
  