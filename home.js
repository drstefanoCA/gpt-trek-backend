(function () {
  const {
    roleUsers,
    getDocuments,
    getContext,
    setRole,
    setUser,
    getUsersForRole,
    getCounts,
    canCreateDocument,
    canUseMyDocuments,
    isVisibleToContext
  } = window.PolicyHubData;

  const roleSelect = document.getElementById("roleSelect");
  const userSelect = document.getElementById("userSelect");
  const quickTitle = document.getElementById("quickTitle");
  const quickTopic = document.getElementById("quickTopic");
  const quickAuthor = document.getElementById("quickAuthor");
  const quickApprover = document.getElementById("quickApprover");
  const quickState = document.getElementById("quickState");
  const quickType = document.getElementById("quickType");
  const searchRepositoryButton = document.getElementById("searchRepositoryButton");
  const myDocumentsButton = document.getElementById("myDocumentsButton");
  const roleDescription = document.getElementById("roleDescription");
  const roleHighlights = document.getElementById("roleHighlights");
  const relevantDescription = document.getElementById("relevantDescription");
  const relevantDocuments = document.getElementById("relevantDocuments");
  const newDocumentLink = document.getElementById("newDocumentLink");
  const params = new URLSearchParams(window.location.search);

  const roleTexts = {
    Reader: [
      "Consultazione esclusiva dei documenti pubblicati e vigenti del portale.",
      "Ricerca per titolo, argomento, autore, stato, scadenza e metadati.",
      "Accesso alla scheda documento con overview, file principale, allegati e storico."
    ],
    Author: [
      "Ripresa dei propri documenti con campi precompilati.",
      "Aggiornamento documenti e invio al passaggio successivo del workflow.",
      "Consultazione del repository completo e vista filtrata su 'I miei documenti'."
    ],
    Approver: [
      "Visualizzazione dei documenti assegnati all'approvazione.",
      "Possibilita di correggere il documento prima dell'approvazione.",
      "Azioni dedicate di approvazione finale o richiesta modifiche."
    ],
    "Portfolio Owner": [
      "Monitoraggio dei documenti overdue o in escalation.",
      "Intervento sui documenti critici nel portafoglio assegnato.",
      "Visione completa dei metadati e dello storico prima dell'escalation."
    ],
    Compliance: [
      "Vista trasversale di controllo su audit, stato e metadati.",
      "Supporto alla governance della normativa interna.",
      "Monitoraggio della conformita del modello documentale."
    ]
  };

  function populateBase() {
    roleSelect.innerHTML = "";
    quickState.innerHTML = '<option value="">Tutti gli stati</option>';
    quickType.innerHTML = '<option value="">Tutti i tipi documento</option>';

    Object.keys(roleUsers).forEach((role) => {
      const option = document.createElement("option");
      option.value = role;
      option.textContent = role;
      roleSelect.appendChild(option);
    });

    const context = getContext();
    const docs = getDocuments().filter((doc) => isVisibleToContext(doc, context));
    const states = [...new Set(docs.map((doc) => doc.State))].sort();
    const types = [...new Set(docs.map((doc) => doc["Document Type"]))].sort();
    states.forEach((state) => {
      const option = document.createElement("option");
      option.value = state;
      option.textContent = state;
      quickState.appendChild(option);
    });
    types.forEach((type) => {
      const option = document.createElement("option");
      option.value = type;
      option.textContent = type;
      quickType.appendChild(option);
    });
  }

  function syncUsers() {
    const context = getContext();
    userSelect.innerHTML = "";
    getUsersForRole(context.role).forEach((user) => {
      const option = document.createElement("option");
      option.value = user;
      option.textContent = user;
      userSelect.appendChild(option);
    });
    userSelect.value = context.user;
  }

  function renderCounts() {
    const context = getContext();
    const visibleDocs = getDocuments().filter((doc) => isVisibleToContext(doc, context));
    const counts = getCounts(visibleDocs);
    document.getElementById("publishedCount").textContent = counts.published;
    document.getElementById("approvalCount").textContent = context.role === "Reader" ? 0 : counts.inApproval;
    document.getElementById("overdueCount").textContent = context.role === "Reader" ? 0 : counts.overdue;
    document.getElementById("totalCount").textContent = counts.total;
  }

  function relevantDocs(role, user) {
    const docs = getDocuments();
    if (role === "Reader") {
      return docs.filter((doc) => doc.State === "Published").slice(0, 5);
    }
    if (role === "Author") {
      return docs.filter((doc) => doc.Author === user).slice(0, 5);
    }
    if (role === "Approver") {
      return docs.filter((doc) => doc.Approver === user).slice(0, 5);
    }
    if (role === "Portfolio Owner") {
      return docs.filter((doc) => doc["Portfolio Owner"] === user).slice(0, 5);
    }
    return docs.slice(0, 5);
  }

  function renderRoleView() {
    const context = getContext();
    roleDescription.textContent = `Vista iniziale per il ruolo ${context.role}.`;
    roleHighlights.innerHTML = "";
    (roleTexts[context.role] || []).forEach((item) => {
      const div = document.createElement("div");
      div.className = "highlight-item";
      div.textContent = item;
      roleHighlights.appendChild(div);
    });

    relevantDescription.textContent = `Documenti piu rilevanti per ${context.user}.`;
    relevantDocuments.innerHTML = "";
    relevantDocs(context.role, context.user)
      .filter((doc) => isVisibleToContext(doc, context))
      .forEach((doc) => {
        const card = document.createElement("a");
        card.className = "document-card";
        card.href = `document.html?id=${encodeURIComponent(doc.id)}`;
        card.innerHTML = `
        <strong>${doc.Title}</strong>
        <span>${doc.Topic} - ${doc.State}</span>
        <span>${doc.Author} / ${doc.Approver}</span>
      `;
        relevantDocuments.appendChild(card);
      });

    if (newDocumentLink) {
      const allowed = canCreateDocument(context);
      newDocumentLink.hidden = !allowed;
      newDocumentLink.style.display = allowed ? "inline-flex" : "none";
    }

    const canUseMine = canUseMyDocuments(context);
    myDocumentsButton.hidden = !canUseMine;
    myDocumentsButton.style.display = canUseMine ? "inline-flex" : "none";
    myDocumentsButton.disabled = !canUseMine;
    myDocumentsButton.textContent = "Vai ai miei documenti";
  }

  function goToRepository(myDocumentsOnly) {
    const params = new URLSearchParams();
    if (quickTitle.value) params.set("title", quickTitle.value);
    if (quickTopic.value) params.set("topic", quickTopic.value);
    if (quickAuthor.value) params.set("author", quickAuthor.value);
    if (quickApprover.value) params.set("approver", quickApprover.value);
    if (quickState.value) params.set("state", quickState.value);
    if (quickType.value) params.set("documentType", quickType.value);
    if (myDocumentsOnly) params.set("mydocs", "1");
    window.location.href = `repository.html?${params.toString()}`;
  }

  if (params.get("role")) {
    setRole(params.get("role"));
  }
  if (params.get("user")) {
    setUser(params.get("user"));
  }
  populateBase();
  const context = getContext();
  roleSelect.value = context.role;
  syncUsers();
  renderCounts();
  renderRoleView();

  roleSelect.addEventListener("change", () => {
    setRole(roleSelect.value);
    populateBase();
    roleSelect.value = getContext().role;
    syncUsers();
    renderRoleView();
    renderCounts();
  });

  userSelect.addEventListener("change", () => {
    setUser(userSelect.value);
    renderRoleView();
    renderCounts();
  });

  searchRepositoryButton.addEventListener("click", () => goToRepository(false));
  myDocumentsButton.addEventListener("click", () => goToRepository(true));
})();
