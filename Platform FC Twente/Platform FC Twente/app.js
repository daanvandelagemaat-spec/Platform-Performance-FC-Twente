const DB_NAME = "fc-twente-performance-db";
const DB_VERSION = 1;
const SESSION_KEY = "fc-twente-performance-session";

const VIEW_META = {
  dashboard: { eyebrow: "Dashboard", title: "Performance overzicht" },
  articles: { eyebrow: "Bibliotheek", title: "Wetenschappelijke artikelen" },
  knowledge: { eyebrow: "Kennisbank", title: "Interne kennis en protocollen" },
  documents: { eyebrow: "Documentatie", title: "PDF-overzicht en bronbestanden" },
  manage: { eyebrow: "Beheer", title: "Nieuwe informatie toevoegen" },
  admin: { eyebrow: "Admin", title: "Gebruikers en rollen" }
};

const state = {
  db: null,
  currentUser: null,
  users: [],
  articles: [],
  knowledge: [],
  documents: [],
  search: "",
  theme: "all",
  type: "all",
  activeView: "dashboard",
  objectUrls: []
};

const loginView = document.getElementById("loginView");
const appView = document.getElementById("appView");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const logoutButton = document.getElementById("logoutButton");
const welcomeName = document.getElementById("welcomeName");
const welcomeRole = document.getElementById("welcomeRole");
const pageEyebrow = document.getElementById("pageEyebrow");
const pageTitle = document.getElementById("pageTitle");
const pageFilters = document.querySelector(".page-topbar-actions");
const searchInput = document.getElementById("searchInput");
const themeFilter = document.getElementById("themeFilter");
const typeFilter = document.getElementById("typeFilter");
const articleGrid = document.getElementById("articleGrid");
const knowledgeGrid = document.getElementById("knowledgeGrid");
const documentGrid = document.getElementById("documentGrid");
const articleForm = document.getElementById("articleForm");
const knowledgeForm = document.getElementById("knowledgeForm");
const userForm = document.getElementById("userForm");
const userList = document.getElementById("userList");
const editorNotice = document.getElementById("editorNotice");
const articleUploadNotice = document.getElementById("articleUploadNotice");
const articleCount = document.getElementById("articleCount");
const knowledgeCount = document.getElementById("knowledgeCount");
const documentCount = document.getElementById("documentCount");
const themeCount = document.getElementById("themeCount");
const recentArticles = document.getElementById("recentArticles");
const recentKnowledge = document.getElementById("recentKnowledge");
const recentDocuments = document.getElementById("recentDocuments");
const adminNavButton = document.getElementById("adminNavButton");
const emptyStateTemplate = document.getElementById("emptyStateTemplate");
const demoButtons = document.querySelectorAll("[data-demo-email]");
const navButtons = document.querySelectorAll("[data-view]");
const viewPanels = {
  dashboard: document.getElementById("dashboardView"),
  articles: document.getElementById("articlesView"),
  knowledge: document.getElementById("knowledgeView"),
  documents: document.getElementById("documentsView"),
  manage: document.getElementById("manageView"),
  admin: document.getElementById("adminView")
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function createId(prefix) {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains("users")) {
        db.createObjectStore("users", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("articles")) {
        db.createObjectStore("articles", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("knowledge")) {
        db.createObjectStore("knowledge", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("documents")) {
        db.createObjectStore("documents", { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAll(storeName) {
  return new Promise((resolve, reject) => {
    const tx = state.db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function putRecord(storeName, record) {
  return new Promise((resolve, reject) => {
    const tx = state.db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const request = store.put(record);

    request.onsuccess = () => resolve(record);
    request.onerror = () => reject(request.error);
  });
}

function deleteRecord(storeName, id) {
  return new Promise((resolve, reject) => {
    const tx = state.db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function seedStore(storeName, items) {
  const existing = await getAll(storeName);

  if (existing.length) {
    return;
  }

  for (const item of items) {
    await putRecord(storeName, item);
  }
}

async function bootstrapDatabase() {
  state.db = await openDatabase();
  await seedStore("users", window.platformSeed.users);
  await seedStore("articles", window.platformSeed.articles);
  await seedStore("knowledge", window.platformSeed.knowledge);
  await seedStore("documents", window.platformSeed.documents);
  await removeLegacySeedArticles();
  await refreshState();
}

async function removeLegacySeedArticles() {
  const legacyIds = ["article-1", "article-2", "article-3"];

  for (const id of legacyIds) {
    await deleteRecord("articles", id).catch(() => {});
  }
}

async function refreshState() {
  const [users, articles, knowledge, documents] = await Promise.all([
    getAll("users"),
    getAll("articles"),
    getAll("knowledge"),
    getAll("documents")
  ]);

  state.users = users.sort((a, b) => a.name.localeCompare(b.name));
  state.articles = articles.sort((a, b) => Number(b.year || 0) - Number(a.year || 0));
  state.knowledge = knowledge.sort((a, b) => a.title.localeCompare(b.title));
  state.documents = documents.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function getSession() {
  const session = localStorage.getItem(SESSION_KEY);
  return session ? JSON.parse(session) : null;
}

function setSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id }));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function hydrateCurrentUser() {
  const session = getSession();
  state.currentUser = session ? state.users.find((user) => user.id === session.userId) || null : null;
}

function isEditor() {
  return state.currentUser && (state.currentUser.role === "editor" || state.currentUser.role === "admin");
}

function isAdmin() {
  return state.currentUser && state.currentUser.role === "admin";
}

function roleLabel(role) {
  if (role === "admin") {
    return "Admin";
  }

  if (role === "editor") {
    return "Editor";
  }

  return "Viewer";
}

function uniqueThemes() {
  return [...new Set([...state.articles, ...state.knowledge].map((item) => item.theme).filter(Boolean))].sort();
}

function matchesFilters(item) {
  const haystack = [
    item.title,
    item.theme,
    item.summary,
    item.practical,
    item.authors,
    item.owner,
    item.createdBy,
    ...(item.tags || [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const searchMatch = haystack.includes(state.search.toLowerCase());
  const themeMatch = state.theme === "all" || item.theme === state.theme;
  const typeMatch = state.type === "all" || item.type === state.type;
  return searchMatch && themeMatch && typeMatch;
}

function findDocumentByParent(parentId) {
  return state.documents.find((documentRecord) => documentRecord.parentId === parentId) || null;
}

function createDocumentUrl(documentRecord) {
  if (!documentRecord || !documentRecord.blob) {
    return "";
  }

  const objectUrl = URL.createObjectURL(documentRecord.blob);
  state.objectUrls.push(objectUrl);
  return objectUrl;
}

function revokeDocumentUrls() {
  state.objectUrls.forEach((url) => URL.revokeObjectURL(url));
  state.objectUrls = [];
}

function createTagList(tags) {
  return (tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
}

function renderEmptyState(container) {
  container.innerHTML = "";
  container.append(emptyStateTemplate.content.cloneNode(true));
}

function renderThemeFilter() {
  const themes = uniqueThemes();
  const previousValue = state.theme;

  themeFilter.innerHTML = '<option value="all">Alle thema\'s</option>';
  themes.forEach((theme) => {
    const option = document.createElement("option");
    option.value = theme;
    option.textContent = theme;
    themeFilter.append(option);
  });

  themeFilter.value = themes.includes(previousValue) ? previousValue : "all";
  state.theme = themeFilter.value;
}

function renderCounts() {
  articleCount.textContent = String(state.articles.length);
  knowledgeCount.textContent = String(state.knowledge.length);
  documentCount.textContent = String(state.documents.length);
  themeCount.textContent = String(uniqueThemes().length);
}

function createArticleCard(article) {
  const documentRecord = findDocumentByParent(article.id);
  const documentLink = documentRecord ? createDocumentUrl(documentRecord) : "";
  const deleteAction = isEditor()
    ? `<button class="danger-button" type="button" data-remove-article="${escapeHtml(article.id)}">Verwijder</button>`
    : "";

  return `
    <article class="content-card">
      <div class="card-topline">
        <span class="badge">${escapeHtml(article.theme)}</span>
        <span class="tag">${escapeHtml(article.year)}</span>
        <span class="tag">Geplaatst door ${escapeHtml(article.createdBy || "Onbekend")}</span>
      </div>
      <h3 class="card-title">${escapeHtml(article.title)}</h3>
      <p class="card-meta">${escapeHtml(article.authors)}</p>
      <p class="card-summary">${escapeHtml(article.summary)}</p>
      <p class="card-practical"><strong>Praktische vertaalslag:</strong> ${escapeHtml(article.practical)}</p>
      <div class="card-tags">${createTagList(article.tags)}</div>
      <div class="card-actions">
        ${article.link ? `<a class="card-link" href="${escapeHtml(article.link)}" target="_blank" rel="noreferrer">Externe bron</a>` : ""}
        ${documentLink ? `<a class="card-link" href="${documentLink}" target="_blank" rel="noreferrer">Open PDF</a>` : ""}
        ${deleteAction}
      </div>
    </article>
  `;
}

function createKnowledgeCard(item) {
  const documentRecord = findDocumentByParent(item.id);
  const documentLink = documentRecord ? createDocumentUrl(documentRecord) : "";

  return `
    <article class="content-card">
      <div class="card-topline">
        <span class="badge">${escapeHtml(item.theme)}</span>
        <span class="tag">${escapeHtml(item.status)}</span>
        <span class="tag">Geplaatst door ${escapeHtml(item.createdBy || "Onbekend")}</span>
      </div>
      <h3 class="card-title">${escapeHtml(item.title)}</h3>
      <p class="card-meta">Eigenaar: ${escapeHtml(item.owner)}</p>
      <p class="card-summary">${escapeHtml(item.summary)}</p>
      <p class="card-practical"><strong>Toepassing:</strong> ${escapeHtml(item.practical)}</p>
      <div class="card-tags">${createTagList(item.tags)}</div>
      <div class="card-actions">
        ${documentLink ? `<a class="card-link" href="${documentLink}" target="_blank" rel="noreferrer">Open PDF</a>` : ""}
      </div>
    </article>
  `;
}

function createDocumentCard(documentRecord) {
  const parent = [...state.articles, ...state.knowledge].find((item) => item.id === documentRecord.parentId);
  const url = createDocumentUrl(documentRecord);
  const parentLabel = parent ? parent.title : "Niet gekoppeld";

  return `
    <article class="document-card">
      <div class="document-topline">
        <span class="badge">${escapeHtml(documentRecord.parentType === "article" ? "Artikel" : "Kennisitem")}</span>
        <span class="tag">${escapeHtml(documentRecord.fileName)}</span>
      </div>
      <h3 class="card-title">${escapeHtml(documentRecord.title)}</h3>
      <p class="document-copy">Gekoppeld aan: ${escapeHtml(parentLabel)}</p>
      <p class="document-copy">Toegevoegd op ${new Date(documentRecord.createdAt).toLocaleDateString("nl-NL")}</p>
      <a class="card-link" href="${url}" target="_blank" rel="noreferrer">Open PDF-document</a>
    </article>
  `;
}

function createMiniList(items, emptyText, formatter) {
  if (!items.length) {
    return `<article class="mini-item"><p class="mini-item-copy">${escapeHtml(emptyText)}</p></article>`;
  }

  return items.map(formatter).join("");
}

function renderDashboardLists() {
  recentArticles.innerHTML = createMiniList(
    state.articles.slice(0, 3),
    "Nog geen artikelen beschikbaar.",
    (article) => `
      <article class="mini-item">
        <p class="mini-item-title">${escapeHtml(article.title)}</p>
        <p class="mini-item-copy">${escapeHtml(article.theme)} - ${escapeHtml(article.year)}</p>
      </article>
    `
  );

  recentKnowledge.innerHTML = createMiniList(
    state.knowledge.slice(0, 3),
    "Nog geen kennisitems beschikbaar.",
    (item) => `
      <article class="mini-item">
        <p class="mini-item-title">${escapeHtml(item.title)}</p>
        <p class="mini-item-copy">${escapeHtml(item.theme)} - ${escapeHtml(item.status)}</p>
      </article>
    `
  );

  recentDocuments.innerHTML = createMiniList(
    state.documents.slice(0, 3),
    "Nog geen PDF-documenten geupload.",
    (documentRecord) => `
      <article class="mini-item">
        <p class="mini-item-title">${escapeHtml(documentRecord.title)}</p>
        <p class="mini-item-copy">${escapeHtml(documentRecord.fileName)}</p>
      </article>
    `
  );
}

function renderUsers() {
  if (!isAdmin()) {
    userList.innerHTML = "";
    return;
  }

  userList.innerHTML = state.users
    .map((user) => {
      const removeAction = user.id !== state.currentUser.id
        ? `<button class="danger-button" type="button" data-remove-user="${escapeHtml(user.id)}">Verwijder</button>`
        : "";

      return `
        <article class="user-card">
          <div>
            <p><strong>${escapeHtml(user.name)}</strong></p>
            <p>${escapeHtml(user.email)} - ${escapeHtml(roleLabel(user.role))}</p>
          </div>
          ${removeAction}
        </article>
      `;
    })
    .join("");
}

function toggleManagementAccess() {
  const disabled = !isEditor();

  [...articleForm.elements].forEach((element) => {
    element.disabled = disabled;
  });

  [...knowledgeForm.elements].forEach((element) => {
    element.disabled = disabled;
  });

  editorNotice.classList.toggle("hidden", !disabled);
  articleUploadNotice.classList.toggle("hidden", !disabled);
  adminNavButton.classList.toggle("hidden", !isAdmin());

  if (!isAdmin() && state.activeView === "admin") {
    setActiveView("dashboard");
  }
}

function renderSession() {
  if (!state.currentUser) {
    loginView.classList.remove("hidden");
    appView.classList.add("hidden");
    return;
  }

  welcomeName.textContent = state.currentUser.name;
  welcomeRole.textContent = `${roleLabel(state.currentUser.role)} account`;
  loginView.classList.add("hidden");
  appView.classList.remove("hidden");
  toggleManagementAccess();
}

function renderViewState() {
  Object.entries(viewPanels).forEach(([view, element]) => {
    element.classList.toggle("hidden", view !== state.activeView);
  });

  navButtons.forEach((button) => {
    button.classList.toggle("is-active", button.getAttribute("data-view") === state.activeView);
  });

  const meta = VIEW_META[state.activeView];
  pageEyebrow.textContent = meta.eyebrow;
  pageTitle.textContent = meta.title;
  pageFilters.classList.toggle("hidden", state.activeView === "dashboard" || state.activeView === "manage" || state.activeView === "admin");
}

function renderContent() {
  revokeDocumentUrls();
  renderThemeFilter();
  renderCounts();
  renderDashboardLists();
  renderUsers();
  renderViewState();

  const visibleArticles = state.articles.filter(matchesFilters);
  const visibleKnowledge = state.knowledge.filter(matchesFilters);
  const visibleDocuments = state.documents.filter((documentRecord) => {
    const parent = [...state.articles, ...state.knowledge].find((item) => item.id === documentRecord.parentId);
    return parent ? matchesFilters(parent) : true;
  });

  articleGrid.innerHTML = visibleArticles.map(createArticleCard).join("");
  knowledgeGrid.innerHTML = visibleKnowledge.map(createKnowledgeCard).join("");
  documentGrid.innerHTML = visibleDocuments.map(createDocumentCard).join("");

  if (!visibleArticles.length) {
    renderEmptyState(articleGrid);
  }

  if (!visibleKnowledge.length) {
    renderEmptyState(knowledgeGrid);
  }

  if (!visibleDocuments.length) {
    renderEmptyState(documentGrid);
  }
}

function parseTags(rawTags) {
  return rawTags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function readFileAsBlob(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(new Blob([reader.result], { type: file.type || "application/pdf" }));
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

function decodePdfString(rawValue) {
  return rawValue
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\n/g, " ")
    .replace(/\\r/g, " ")
    .replace(/\\t/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanExtractedValue(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s.,:&()/'-]/gu, "")
    .trim();
}

function deriveTitleFromFilename(fileName) {
  return fileName
    .replace(/\.pdf$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractYearCandidates(text) {
  const matches = text.match(/\b(19|20)\d{2}\b/g) || [];
  const currentYear = new Date().getFullYear() + 1;

  return [...new Set(matches.map(Number))].filter((year) => year >= 1950 && year <= currentYear);
}

function pickBestYear(candidates) {
  if (!candidates.length) {
    return new Date().getFullYear();
  }

  return candidates.sort((a, b) => b - a)[0];
}

async function extractArticleMetadataFromPdf(file) {
  const buffer = await readFileAsArrayBuffer(file);
  const bytes = new Uint8Array(buffer);
  const pdfText = new TextDecoder("latin1").decode(bytes);

  const titleMatch = pdfText.match(/\/Title\s*\((.*?)\)/s);
  const authorMatch = pdfText.match(/\/Author\s*\((.*?)\)/s);
  const creationDateMatch = pdfText.match(/\/CreationDate\s*\(D:(\d{4})/);
  const modDateMatch = pdfText.match(/\/ModDate\s*\(D:(\d{4})/);
  const fileNameYears = extractYearCandidates(file.name);
  const pdfYears = extractYearCandidates(pdfText);
  const textAuthorMatch = pdfText.match(/\bby\s+([A-Z][A-Za-z' -]+(?:,\s*[A-Z][A-Za-z' -]+)*)/);

  const rawTitle = titleMatch ? decodePdfString(titleMatch[1]) : deriveTitleFromFilename(file.name);
  const rawAuthors = authorMatch
    ? decodePdfString(authorMatch[1])
    : textAuthorMatch
      ? cleanExtractedValue(textAuthorMatch[1])
      : "Auteur onbekend";
  const prioritizedYears = [
    ...fileNameYears,
    ...(creationDateMatch ? [Number(creationDateMatch[1])] : []),
    ...(modDateMatch ? [Number(modDateMatch[1])] : []),
    ...pdfYears
  ];
  const rawYear = pickBestYear(prioritizedYears);

  return {
    title: cleanExtractedValue(rawTitle) || deriveTitleFromFilename(file.name) || "Onbekende titel",
    authors: cleanExtractedValue(rawAuthors) || "Auteur onbekend",
    year: Number.isFinite(rawYear) ? rawYear : new Date().getFullYear()
  };
}

async function storeDocument({ parentId, parentType, title, file }) {
  if (!file) {
    return;
  }

  const blob = await readFileAsBlob(file);
  const documentRecord = {
    id: createId("document"),
    parentId,
    parentType,
    title,
    fileName: file.name,
    mimeType: file.type || "application/pdf",
    blob,
    createdAt: new Date().toISOString(),
    createdBy: state.currentUser.name
  };

  const existingDocument = findDocumentByParent(parentId);

  if (existingDocument) {
    await deleteRecord("documents", existingDocument.id);
  }

  await putRecord("documents", documentRecord);
}

function setActiveView(view) {
  state.activeView = view;
  renderViewState();
}

async function handleLogin(event) {
  event.preventDefault();
  loginMessage.textContent = "";

  const formData = new FormData(loginForm);
  const email = formData.get("email").toString().trim().toLowerCase();
  const password = formData.get("password").toString();
  const user = state.users.find((entry) => entry.email.toLowerCase() === email && entry.password === password);

  if (!user) {
    loginMessage.textContent = "Combinatie van e-mail en wachtwoord is niet geldig.";
    return;
  }

  state.currentUser = user;
  state.activeView = "dashboard";
  setSession(user);
  renderSession();
  renderContent();
  loginForm.reset();
}

async function handleArticleSubmit(event) {
  event.preventDefault();

  if (!isEditor()) {
    return;
  }

  const formData = new FormData(articleForm);
  const pdf = formData.get("pdf");

  if (!(pdf instanceof File) || !pdf.size) {
    window.alert("Kies een PDF-bestand om een artikel toe te voegen.");
    return;
  }

  const metadata = await extractArticleMetadataFromPdf(pdf);
  const article = {
    id: createId("article"),
    type: "article",
    title: metadata.title,
    authors: metadata.authors,
    theme: "Nog te classificeren",
    year: metadata.year,
    link: "",
    summary: "Automatisch aangemaakt op basis van PDF-upload. Inhoudelijke samenvatting kan later worden toegevoegd.",
    practical: "Praktische vertaalslag nog aan te vullen.",
    createdBy: state.currentUser.name,
    tags: ["pdf-upload"]
  };

  await putRecord("articles", article);

  await storeDocument({
    parentId: article.id,
    parentType: "article",
    title: article.title,
    file: pdf
  });

  articleForm.reset();
  await refreshState();
  state.activeView = "articles";
  renderContent();
}

async function handleKnowledgeSubmit(event) {
  event.preventDefault();

  if (!isEditor()) {
    return;
  }

  const formData = new FormData(knowledgeForm);
  const item = {
    id: createId("knowledge"),
    type: "knowledge",
    title: formData.get("title").toString().trim(),
    owner: formData.get("owner").toString().trim(),
    theme: formData.get("theme").toString().trim(),
    status: formData.get("status").toString(),
    summary: formData.get("summary").toString().trim(),
    practical: formData.get("practical").toString().trim(),
    createdBy: state.currentUser.name,
    tags: parseTags(formData.get("tags").toString())
  };

  await putRecord("knowledge", item);

  const pdf = formData.get("pdf");
  if (pdf instanceof File && pdf.size) {
    await storeDocument({
      parentId: item.id,
      parentType: "knowledge",
      title: item.title,
      file: pdf
    });
  }

  knowledgeForm.reset();
  await refreshState();
  state.activeView = "knowledge";
  renderContent();
}

async function handleUserSubmit(event) {
  event.preventDefault();

  if (!isAdmin()) {
    return;
  }

  const formData = new FormData(userForm);
  const email = formData.get("email").toString().trim().toLowerCase();
  const exists = state.users.some((user) => user.email.toLowerCase() === email);

  if (exists) {
    window.alert("Er bestaat al een gebruiker met dit e-mailadres.");
    return;
  }

  const user = {
    id: createId("user"),
    name: formData.get("name").toString().trim(),
    email,
    role: formData.get("role").toString(),
    password: formData.get("password").toString()
  };

  await putRecord("users", user);
  userForm.reset();
  await refreshState();
  hydrateCurrentUser();
  state.activeView = "admin";
  renderContent();
}

async function handleUserListClick(event) {
  const button = event.target.closest("[data-remove-user]");

  if (!button || !isAdmin()) {
    return;
  }

  const userId = button.getAttribute("data-remove-user");

  if (!userId) {
    return;
  }

  await deleteRecord("users", userId);
  await refreshState();
  hydrateCurrentUser();
  renderContent();
}

async function handleArticleGridClick(event) {
  const button = event.target.closest("[data-remove-article]");

  if (!button || !isEditor()) {
    return;
  }

  const articleId = button.getAttribute("data-remove-article");

  if (!articleId) {
    return;
  }

  const linkedDocument = findDocumentByParent(articleId);

  if (linkedDocument) {
    await deleteRecord("documents", linkedDocument.id);
  }

  await deleteRecord("articles", articleId);
  await refreshState();
  renderContent();
}

function bindEvents() {
  loginForm.addEventListener("submit", handleLogin);

  logoutButton.addEventListener("click", () => {
    state.currentUser = null;
    state.activeView = "dashboard";
    clearSession();
    revokeDocumentUrls();
    renderSession();
  });

  searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderContent();
  });

  themeFilter.addEventListener("change", (event) => {
    state.theme = event.target.value;
    renderContent();
  });

  typeFilter.addEventListener("change", (event) => {
    state.type = event.target.value;
    renderContent();
  });

  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextView = button.getAttribute("data-view");

      if (nextView === "admin" && !isAdmin()) {
        return;
      }

      setActiveView(nextView);
    });
  });

  articleForm.addEventListener("submit", (event) => {
    handleArticleSubmit(event).catch(showError);
  });

  articleGrid.addEventListener("click", (event) => {
    handleArticleGridClick(event).catch(showError);
  });

  knowledgeForm.addEventListener("submit", (event) => {
    handleKnowledgeSubmit(event).catch(showError);
  });

  userForm.addEventListener("submit", (event) => {
    handleUserSubmit(event).catch(showError);
  });

  userList.addEventListener("click", (event) => {
    handleUserListClick(event).catch(showError);
  });

  demoButtons.forEach((button) => {
    button.addEventListener("click", () => {
      emailInput.value = button.getAttribute("data-demo-email") || "";
      passwordInput.value = button.getAttribute("data-demo-password") || "";
    });
  });
}

function showError(error) {
  console.error(error);
  window.alert("Er ging iets mis tijdens het verwerken van deze actie.");
}

async function init() {
  bindEvents();
  await bootstrapDatabase();
  hydrateCurrentUser();
  renderSession();

  if (state.currentUser) {
    renderContent();
  }
}

init().catch(showError);
