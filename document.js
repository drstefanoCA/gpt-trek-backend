(function () {
  const {
    roleUsers,
    getDocumentById,
    getContext,
    setRole,
    setUser,
    getUsersForRole,
    canSeeDocumentActions,
    isVisibleToContext,
    canEditDocument,
    canApproveDocument,
    canEscalateDocument,
    changeDocumentState
  } = window.PolicyHubData;

  const params = new URLSearchParams(window.location.search);
  const docId = params.get("id");
  const roleSelect = document.getElementById("roleSelect");
  const userSelect = document.getElementById("userSelect");
  const documentTitle = document.getElementById("documentTitle");
  const documentSummary = document.getElementById("documentSummary");
  const breadcrumbTitle = document.getElementById("breadcrumbTitle");
  const editLink = document.getElementById("editLink");
  const approveButton = document.getElementById("approveButton");
  const requestChangesButton = document.getElementById("requestChangesButton");
  const escalateButton = document.getElementById("escalateButton");
  const documentActions = document.getElementById("documentActions");
  const overviewGrid = document.getElementById("overviewGrid");
  const filesList = document.getElementById("filesList");
  const workflowBanner = document.getElementById("workflowBanner");
  const actionFeedback = document.getElementById("actionFeedback");
  const workflowCards = document.getElementById("workflowCards");
  const historyList = document.getElementById("historyList");
  const auditList = document.getElementById("auditList");
  const metadataGrid = document.getElementById("metadataGrid");

  function fileLink(url, filename, label) {
    return `<a class="inline-link" href="${url}" download="${filename}">${label}</a>`;
  }

  function populateRoles() {
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

  function renderDoc() {
    const doc = getDocumentById(docId);
    const context = getContext();
    if (!doc) {
      documentTitle.textContent = "Documento non trovato";
      documentSummary.textContent = "Il documento richiesto non e disponibile nel portale.";
      return;
    }

    if (!isVisibleToContext(doc, context)) {
      documentTitle.textContent = "Accesso non consentito";
      breadcrumbTitle.textContent = "Documento riservato";
      documentSummary.textContent = "Il ruolo Reader puo consultare solo documenti pubblicati.";
      overviewGrid.innerHTML = "";
      filesList.innerHTML = "";
      workflowCards.innerHTML = "";
      historyList.innerHTML = "";
      auditList.innerHTML = "";
      metadataGrid.innerHTML = "";
      workflowBanner.textContent = "Documento non visibile per il ruolo attivo.";
      editLink.classList.add("disabled-link");
      editLink.setAttribute("aria-disabled", "true");
      if (documentActions) {
        documentActions.hidden = true;
        documentActions.style.display = "none";
      }
      approveButton.disabled = true;
      requestChangesButton.disabled = true;
      escalateButton.disabled = true;
      return;
    }

    documentTitle.textContent = doc.Title;
    breadcrumbTitle.textContent = doc.Title;
    documentSummary.textContent = doc.Summary;
    editLink.href = `editor.html?id=${encodeURIComponent(doc.id)}`;
    if (documentActions) {
      const allowed = canSeeDocumentActions(context);
      documentActions.hidden = !allowed;
      documentActions.style.display = allowed ? "flex" : "none";
    }

    overviewGrid.innerHTML = "";
    [
      ["Stato", doc.State],
      ["Autore", doc.Author],
      ["Approver", doc.Approver],
      ["Portfolio Owner", doc["Portfolio Owner"]],
      ["Data generazione", doc["Original Issue Date"]],
      ["Scadenza", doc["Next Review Date"]],
      ["Versione business", doc["Business Version Number"]],
      ["Versione sistema", doc["System Version Number"]]
    ].forEach(([label, value]) => {
      const div = document.createElement("article");
      div.className = "summary-card";
      div.innerHTML = `<strong>${label}</strong><span>${value}</span>`;
      overviewGrid.appendChild(div);
    });

    filesList.innerHTML = "";
    const main = document.createElement("article");
    main.className = "document-card";
    main.innerHTML = `
      <strong>Documento principale</strong>
      <span>${doc["Main Document"]}</span>
      ${fileLink(doc.mainDocumentUrl, doc["Main Document"], "Scarica file principale")}
    `;
    filesList.appendChild(main);
    doc.attachments.forEach((attachment) => {
      const item = document.createElement("article");
      item.className = "document-card";
      item.innerHTML = `
        <strong>Allegato</strong>
        <span>${attachment.name}</span>
        ${fileLink(attachment.url, attachment.name, "Scarica allegato")}
      `;
      filesList.appendChild(item);
    });

    const nextActor =
      doc.State === "Draft" ? doc.Author :
      doc.State === "In Approval" ? doc.Approver :
      doc.State === "Changes Requested" ? doc.Author :
      doc.State === "Overdue" ? doc["Portfolio Owner"] :
      doc.State === "Escalated" ? "Compliance / senior management" :
      "Consultazione";
    workflowBanner.textContent = `Ruolo attivo: ${context.role} (${context.user}). Stato corrente: ${doc.State}. Prossimo attore: ${nextActor}.`;
    workflowCards.innerHTML = `
      <article class="document-card">
        <strong>Step 1</strong>
        <span>Autore: redazione o aggiornamento documento</span>
      </article>
      <article class="document-card">
        <strong>Step 2</strong>
        <span>Approver: revisione, eventuale correzione, approvazione o richiesta modifiche</span>
      </article>
      <article class="document-card">
        <strong>Step 3</strong>
        <span>Portfolio Owner / Compliance: gestione casi overdue o escalation</span>
      </article>
    `;

    historyList.innerHTML = "";
    [...doc.versionHistory].reverse().forEach((entry) => {
      const card = document.createElement("article");
      card.className = "document-card";
      card.innerHTML = `
        <strong>Business ${entry.businessVersion} / System ${entry.systemVersion}</strong>
        <span>${entry.date}</span>
        <span>${entry.author}</span>
        <span>${entry.changeDescription}</span>
      `;
      historyList.appendChild(card);
    });

    auditList.innerHTML = "";
    doc.audit.forEach((entry) => {
      const card = document.createElement("article");
      card.className = "document-card";
      card.innerHTML = `
        <strong>${entry.action}</strong>
        <span>${entry.who}</span>
        <span>${entry.when}</span>
      `;
      auditList.appendChild(card);
    });

    metadataGrid.innerHTML = "";
    Object.entries(doc)
      .filter(([key]) => !["attachments", "audit", "versionHistory", "mainDocumentUrl"].includes(key))
      .forEach(([key, value]) => {
        const card = document.createElement("article");
        card.className = "metadata-card";
        card.innerHTML = `<strong>${key}</strong><span>${value || "-"}</span>`;
        metadataGrid.appendChild(card);
      });

    editLink.classList.toggle("disabled-link", !canEditDocument(doc, context));
    editLink.setAttribute("aria-disabled", String(!canEditDocument(doc, context)));
    approveButton.disabled = !canApproveDocument(doc, context);
    requestChangesButton.disabled = !canApproveDocument(doc, context);
    escalateButton.disabled = !canEscalateDocument(doc, context);
  }

  function showFeedback(message, isError = false) {
    actionFeedback.hidden = false;
    actionFeedback.textContent = message;
    actionFeedback.style.background = isError ? "#fff1f1" : "#eef7ef";
    actionFeedback.style.borderColor = isError ? "#efb2b2" : "#cfe0f3";
    actionFeedback.style.color = isError ? "#8a2026" : "#1f5f2e";
  }

  function runStateAction(action) {
    const context = getContext();
    const doc = getDocumentById(docId);
    if (!doc) {
      showFeedback("Documento non trovato.", true);
      return;
    }
    if (!isVisibleToContext(doc, context)) {
      showFeedback("Il documento non e visibile per il ruolo attivo.", true);
      return;
    }

    if (action === "approve") {
      if (!canApproveDocument(doc, context)) {
        showFeedback("L'utente attivo non puo approvare questo documento.", true);
        return;
      }
      changeDocumentState(docId, "Published", context, "Approvazione finale");
      showFeedback("Documento approvato correttamente e pubblicato.");
    }

    if (action === "requestChanges") {
      if (!canApproveDocument(doc, context)) {
        showFeedback("L'utente attivo non puo richiedere modifiche su questo documento.", true);
        return;
      }
      changeDocumentState(docId, "Changes Requested", context, "Richieste modifiche all'autore");
      showFeedback("Richiesta di modifiche registrata correttamente.");
    }

    if (action === "escalate") {
      if (!canEscalateDocument(doc, context)) {
        showFeedback("L'utente attivo non puo eseguire l'escalation su questo documento.", true);
        return;
      }
      changeDocumentState(docId, "Escalated", context, "Escalation verso livello superiore");
      showFeedback("Escalation registrata correttamente.");
    }

    renderDoc();
  }

  populateRoles();
  if (params.get("role")) {
    setRole(params.get("role"));
  }
  if (params.get("user")) {
    setUser(params.get("user"));
  }
  roleSelect.value = getContext().role;
  populateUsers();
  renderDoc();

  roleSelect.addEventListener("change", () => {
    setRole(roleSelect.value);
    populateUsers();
    renderDoc();
  });

  userSelect.addEventListener("change", () => {
    setUser(userSelect.value);
    renderDoc();
  });

  approveButton.addEventListener("click", () => {
    runStateAction("approve");
  });

  requestChangesButton.addEventListener("click", () => {
    runStateAction("requestChanges");
  });

  escalateButton.addEventListener("click", () => {
    runStateAction("escalate");
  });
})();
