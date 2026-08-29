document.addEventListener("DOMContentLoaded", () => {
    // Elements
    const tabBtns = document.querySelectorAll(".tab-btn");
    const tabContents = document.querySelectorAll(".tab-content");

    // Shorten Elements
    const shortenForm = document.getElementById("shorten-form");
    const urlInput = document.getElementById("url-input");
    const submitBtn = document.getElementById("submit-btn");
    const resultBox = document.getElementById("result-box");
    const shortenedUrlInput = document.getElementById("shortened-url");
    const copyBtn = document.getElementById("copy-btn");
    const openBtn = document.getElementById("open-btn");
    const resOriginal = document.getElementById("res-original");
    const resCode = document.getElementById("res-code");

    // Stats Elements
    const statsForm = document.getElementById("stats-form");
    const codeInput = document.getElementById("code-input");
    const statsSubmitBtn = document.getElementById("stats-submit-btn");
    const statsResultBox = document.getElementById("stats-result-box");
    const statClicks = document.getElementById("stat-clicks");
    const statCode = document.getElementById("stat-code");
    const statOriginal = document.getElementById("stat-original");
    const statCreated = document.getElementById("stat-created");

    // History & Toast
    const historySection = document.getElementById("history-section");
    const historyList = document.getElementById("history-list");
    const toast = document.getElementById("toast");

    // Base API URL (dynamic origin)
    const API_BASE = window.location.origin;

    // --- Tab Navigation ---
    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            tabBtns.forEach(b => b.classList.remove("active"));
            tabContents.forEach(c => c.classList.remove("active"));

            btn.classList.add("active");
            const targetTab = document.getElementById(btn.dataset.tab);
            if (targetTab) {
                targetTab.classList.add("active");
            }
        });
    });

    // --- Toast Notification ---
    let toastTimeout;
    function showToast(message, isError = false) {
        clearTimeout(toastTimeout);
        toast.textContent = message;
        toast.style.borderColor = isError ? "var(--danger)" : "var(--primary)";
        toast.classList.remove("hidden");

        toastTimeout = setTimeout(() => {
            toast.classList.add("hidden");
        }, 3500);
    }

    // --- Shorten Form Submit ---
    shortenForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const url = urlInput.value.trim();
        if (!url) return;

        setLoading(submitBtn, true);
        resultBox.classList.add("hidden");

        try {
            const response = await fetch(`${API_BASE}/shorten`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ original_url: url })
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMsg = data.detail?.[0]?.msg || data.detail || "Erro ao encurtar a URL.";
                throw new Error(errorMsg);
            }

            const shortUrl = `${API_BASE}/${data.short_code}`;
            shortenedUrlInput.value = shortUrl;
            resOriginal.textContent = data.original_url;
            resOriginal.title = data.original_url;
            resCode.textContent = data.short_code;
            openBtn.href = shortUrl;

            resultBox.classList.remove("hidden");
            showToast("✨ Link encurtado com sucesso!");

            // Save to Local History
            saveToHistory({
                shortUrl,
                shortCode: data.short_code,
                originalUrl: data.original_url,
                createdAt: data.created_at
            });

        } catch (error) {
            console.error("Erro:", error);
            showToast(`❌ ${error.message}`, true);
        } finally {
            setLoading(submitBtn, false);
        }
    });

    // --- Copy Button ---
    copyBtn.addEventListener("click", async () => {
        const textToCopy = shortenedUrlInput.value;
        if (!textToCopy) return;

        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(textToCopy);
            } else {
                shortenedUrlInput.select();
                document.execCommand("copy");
            }
            showToast("📋 Link copiado para a área de transferência!");
            
            const originalText = copyBtn.querySelector(".copy-text").textContent;
            copyBtn.querySelector(".copy-text").textContent = "Copiado!";
            setTimeout(() => {
                copyBtn.querySelector(".copy-text").textContent = originalText;
            }, 2000);
        } catch (err) {
            showToast("Erro ao copiar o link.", true);
        }
    });

    // --- Stats Form Submit ---
    statsForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        let rawInput = codeInput.value.trim();
        if (!rawInput) return;

        // Extract code if user pasted a full URL
        let code = rawInput;
        if (rawInput.includes("/")) {
            const parts = rawInput.split("/").filter(Boolean);
            code = parts[parts.length - 1];
        }

        setLoading(statsSubmitBtn, true);
        statsResultBox.classList.add("hidden");

        try {
            const response = await fetch(`${API_BASE}/stats/${encodeURIComponent(code)}`);
            const data = await response.json();

            if (!response.ok) {
                const errorMsg = data.detail || "URL encurtada não encontrada.";
                throw new Error(errorMsg);
            }

            statClicks.textContent = data.clicks;
            statCode.textContent = data.short_code;
            statOriginal.textContent = data.original_url;
            statOriginal.href = data.original_url;

            const date = new Date(data.created_at);
            statCreated.textContent = date.toLocaleString("pt-BR");

            statsResultBox.classList.remove("hidden");
        } catch (error) {
            console.error("Erro stats:", error);
            showToast(`❌ ${error.message}`, true);
        } finally {
            setLoading(statsSubmitBtn, false);
        }
    });

    // --- Button Loading State Helper ---
    function setLoading(btn, isLoading) {
        const btnText = btn.querySelector(".btn-text");
        const spinner = btn.querySelector(".spinner");

        if (isLoading) {
            btn.disabled = true;
            btnText.classList.add("hidden");
            spinner.classList.remove("hidden");
        } else {
            btn.disabled = false;
            btnText.classList.remove("hidden");
            spinner.classList.add("hidden");
        }
    }

    // --- Local Storage History ---
    function saveToHistory(item) {
        let history = JSON.parse(localStorage.getItem("short_history") || "[]");
        // Remove duplicate if exists
        history = history.filter(h => h.shortCode !== item.shortCode);
        history.unshift(item);
        if (history.length > 5) history.pop();
        localStorage.setItem("short_history", JSON.stringify(history));
        renderHistory();
    }

    function renderHistory() {
        const history = JSON.parse(localStorage.getItem("short_history") || "[]");
        if (history.length === 0) {
            historySection.classList.add("hidden");
            return;
        }

        historyList.innerHTML = "";
        history.forEach(item => {
            const div = document.createElement("div");
            div.className = "history-item";
            div.innerHTML = `
                <div>
                    <a href="${item.shortUrl}" target="_blank" class="short">${item.shortUrl}</a>
                    <div class="orig">${item.originalUrl}</div>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="navigator.clipboard.writeText('${item.shortUrl}'); alert('Link copiado!');">
                    Copiar
                </button>
            `;
            historyList.appendChild(div);
        });
        historySection.classList.remove("hidden");
    }

    // Initial render of history
    renderHistory();
});
