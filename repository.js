(function () {
  const {
    roleUsers,
    getDocuments,
    getContext,
    setRole,
    setUser,
    getUsersForRole,
    canCreateDocument,
    canUseMyDocuments,
    isVisibleToContext
  } = window.PolicyHubData;

  const params = new URLSearchParams(window.location.search);
  const roleSelect = document.getElementById("roleSelect");
  const userSelect = document.getElementById("userSelect");
  const myDocumentsButton = document.getElementById("myDocumentsButton");
  const exportButton = document.getElementById("exportButton");
  const clearFiltersButton = document.getElementById("clearFiltersButton");
  const repositoryCards = document.getElementById("repositoryCards");
  const repositorySummary = document.getElementById("repositorySummary");
  const resultCount = document.getElementById("resultCount");
  const newDocumentLink = document.getElementById("newDocumentLink");

  const controls = {
    search: document.getElementById("searchInput"),
    title: document.getElementById("titleFilter"),
    topic: document.getElementById("topicFilter"),
    author: document.getElementById("authorFilter"),
    approver: document.getElementById("approverFilter"),
    legalEntity: document.getElementById("legalEntityFilter"),
    documentType: document.getElementById("documentTypeFilter"),
    state: document.getElementById("stateFilter"),
    risk: document.getElementById("riskFilter"),
    region: document.getElementById("regionFilter"),
    issueFrom: document.getElementById("issueDateFromFilter"),
    issueTo: document.getElementById("issueDateToFilter"),
    reviewTo: document.getElementById("reviewDateToFilter"),
    sort: document.getElementById("sortFilter")
  };

  let myDocumentsMode = params.get("mydocs") === "1";

  function populateRoleSelect() {
    Object.keys(roleUsers).forEach((role) => {
      const option = document.createElement("option");
      option.value = role;
      option.textContent = role;
      roleSelect.appendChild(option);
    });
  }

  function populateUsers() {
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

  function populateFilters() {
    const context = getContext();
    controls.documentType.innerHTML = '<option value="">Tutti i tipi documento</option>';
    controls.state.innerHTML = '<option value="">Tutti gli stati</option>';
    controls.risk.innerHTML = '<option value="">Tutti i rischi</option>';
    controls.region.innerHTML = '<option value="">Tutte le regioni</option>';

    const docs = getDocuments().filter((doc) => isVisibleToContext(doc, context));
    const maps = {
      documentType: [...new Set(docs.map((doc) => doc["Document Type"]))].sort(),
      state: [...new Set(docs.map((doc) => doc.State))].sort(),
      risk: [...new Set(docs.map((doc) => doc["Risk Type"]))].sort(),
      region: [...new Set(docs.map((doc) => doc.Region))].sort()
    };

    Object.entries(maps).forEach(([key, values]) => {
      values.forEach((value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        controls[key].appendChild(option);
      });
    });
  }

  function restoreFiltersFromUrl() {
    Object.entries(controls).forEach(([key, element]) => {
      if (params.get(key)) {
        element.value = params.get(key);
      }
    });
  }

  function parseDate(dateString) {
    return new Date(`${dateString}T00:00:00`);
  }

  function getFilteredDocuments() {
    const docs = getDocuments();
    const context = getContext();
    const filtered = docs.filter((doc) => {
      if (!isVisibleToContext(doc, context)) {
        return false;
      }
      const matchesSearch = !controls.search.value || Object.values(doc).some((value) => String(value).toLowerCase().includes(controls.search.value.toLowerCase()));
      const matchesTitle = !controls.title.value || doc.Title.toLowerCase().includes(controls.title.value.toLowerCase());
      const matchesTopic = !controls.topic.value || doc.Topic.toLowerCase().includes(controls.topic.value.toLowerCase());
      const matchesAuthor = !controls.author.value || doc.Author.toLowerCase().includes(controls.author.value.toLowerCase());
      const matchesApprover = !controls.approver.value || doc.Approver.toLowerCase().includes(controls.approver.value.toLowerCase());
      const matchesLegal = !controls.legalEntity.value || doc["Legal Entity"].toLowerCase().includes(controls.legalEntity.value.toLowerCase());
      const matchesType = !controls.documentType.value || doc["Document Type"] === controls.documentType.value;
      const matchesState = !controls.state.value || doc.State === controls.state.value;
      const matchesRisk = !controls.risk.value || doc["Risk Type"] === controls.risk.value;
      const matchesRegion = !controls.region.value || doc.Region === controls.region.value;
      const matchesIssueFrom = !controls.issueFrom.value || doc["Original Issue Date"] >= controls.issueFrom.value;
      const matchesIssueTo = !controls.issueTo.value || doc["Original Issue Date"] <= controls.issueTo.value;
      const matchesReviewTo = !controls.reviewTo.value || doc["Next Review Date"] <= controls.reviewTo.value;

      let matchesMyDocs = true;
      if (myDocumentsMode) {
        if (context.role === "Author") matchesMyDocs = doc.Author === context.user;
        else if (context.role === "Approver") matchesMyDocs = doc.Approver === context.user;
        else if (context.role === "Portfolio Owner") matchesMyDocs = doc["Portfolio Owner"] === context.user;
      }

      return matchesSearch && matchesTitle && matchesTopic && matchesAuthor && matchesApprover &&
        matchesLegal && matchesType && matchesState && matchesRisk && matchesRegion &&
        matchesIssueFrom && matchesIssueTo && matchesReviewTo && matchesMyDocs;
    });

    filtered.sort((a, b) => {
      const mode = controls.sort.value;
      if (mode === "issue_asc") return parseDate(a["Original Issue Date"]) - parseDate(b["Original Issue Date"]);
      if (mode === "review_asc") return parseDate(a["Next Review Date"]) - parseDate(b["Next Review Date"]);
      if (mode === "review_desc") return parseDate(b["Next Review Date"]) - parseDate(a["Next Review Date"]);
      if (mode === "title_asc") return a.Title.localeCompare(b.Title);
      return parseDate(b["Original Issue Date"]) - parseDate(a["Original Issue Date"]);
    });

    return filtered;
  }

  function renderRepository() {
    const docs = getFilteredDocuments();
    const context = getContext();
    repositoryCards.innerHTML = "";
    resultCount.textContent = `${docs.length} documenti`;
    repositorySummary.textContent = myDocumentsMode
      ? `Vista filtrata sui documenti rilevanti per ${context.user}.`
      : "Vista completa del repository, ordinabile e filtrabile.";

    if (newDocumentLink) {
      const allowed = canCreateDocument(context);
      newDocumentLink.hidden = !allowed;
      newDocumentLink.style.display = allowed ? "inline-flex" : "none";
    }

    const canUseMine = canUseMyDocuments(context);
    myDocumentsButton.hidden = !canUseMine;
    myDocumentsButton.style.display = canUseMine ? "inline-flex" : "none";
    myDocumentsButton.disabled = !canUseMine;
    if (!canUseMine && myDocumentsMode) {
      myDocumentsMode = false;
    }
    myDocumentsButton.textContent = myDocumentsMode ? "Tutti i documenti" : "I miei documenti";

    if (!docs.length) {
      repositoryCards.innerHTML = '<p class="empty-state">Nessun documento trovato con i filtri correnti.</p>';
      return;
    }

    docs.forEach((doc) => {
      const card = document.createElement("article");
      card.className = "repository-card";
      card.innerHTML = `
        <div class="repository-card-head">
          <div>
            <strong>${doc.Title}</strong>
            <p>${doc.Topic} - ${doc["Document Type"]}</p>
          </div>
          <span class="state-pill ${doc.State === "Published" ? "published" : doc.State === "Overdue" ? "overdue" : "pending"}">${doc.State}</span>
        </div>
        <div class="repository-meta">
          <span>Autore: ${doc.Author}</span>
          <span>Approver: ${doc.Approver}</span>
          <span>Data generazione: ${doc["Original Issue Date"]}</span>
          <span>Scadenza: ${doc["Next Review Date"]}</span>
          <span>Rischio: ${doc["Risk Type"]}</span>
          <span>Regione: ${doc.Region}</span>
        </div>
        <div class="card-actions">
          <a class="button-secondary" href="document.html?id=${encodeURIComponent(doc.id)}">Apri scheda documento</a>
        </div>
      `;
      repositoryCards.appendChild(card);
    });
  }

  function exportCsv() {
    const rows = getFilteredDocuments();
    const headers = [
      "Title",
      "Policy Producing Function",
      "Topic",
      "Author",
      "Approver",
      "Original Issue Date",
      "Next Review Date",
      "State",
      "Main Document"
    ];
    const csv = [
      headers.map((header) => `"${header}"`).join(";"),
      ...rows.map((row) => headers.map((header) => `"${String(row[header] ?? "").replace(/"/g, '""')}"`).join(";"))
    ].join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "registro_archivio_documentale.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  populateRoleSelect();
  if (params.get("role")) {
    setRole(params.get("role"));
  }
  if (params.get("user")) {
    setUser(params.get("user"));
  }
  populateFilters();
  roleSelect.value = getContext().role;
  populateUsers();
  restoreFiltersFromUrl();
  renderRepository();
  myDocumentsButton.textContent = myDocumentsMode ? "Tutti i documenti" : "I miei documenti";

  roleSelect.addEventListener("change", () => {
    setRole(roleSelect.value);
    populateUsers();
    populateFilters();
    myDocumentsMode = false;
    renderRepository();
  });

  userSelect.addEventListener("change", () => {
    setUser(userSelect.value);
    renderRepository();
  });

  Object.values(controls).forEach((control) => {
    control.addEventListener("input", renderRepository);
    control.addEventListener("change", renderRepository);
  });

  myDocumentsButton.addEventListener("click", () => {
    if (!canUseMyDocuments(getContext())) {
      myDocumentsMode = false;
      renderRepository();
      return;
    }
    myDocumentsMode = !myDocumentsMode;
    myDocumentsButton.textContent = myDocumentsMode ? "Tutti i documenti" : "I miei documenti";
    renderRepository();
  });

  clearFiltersButton.addEventListener("click", () => {
    Object.values(controls).forEach((control) => {
      if (control.tagName === "SELECT") control.value = "";
      else control.value = "";
    });
    controls.sort.value = "issue_desc";
    myDocumentsMode = false;
    myDocumentsButton.textContent = "I miei documenti";
    renderRepository();
  });

  exportButton.addEventListener("click", exportCsv);
})();
