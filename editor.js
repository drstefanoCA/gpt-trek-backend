(function () {
  const {
    roleUsers,
    getContext,
    setRole,
    setUser,
    getUsersForRole,
    getDocumentById,
    canCreateDocument,
    isVisibleToContext,
    canEditDocument,
    makeDataUrl,
    normalizeFileLinks,
    addDocument,
    updateDocument
  } = window.PolicyHubData;

  const params = new URLSearchParams(window.location.search);
  const docId = params.get("id");
  const roleSelect = document.getElementById("roleSelect");
  const userSelect = document.getElementById("userSelect");
  const form = document.getElementById("documentForm");
  const editorTitle = document.getElementById("editorTitle");
  const editorDescription = document.getElementById("editorDescription");
  const cancelLink = document.getElementById("cancelLink");
  const currentMainDocumentInfo = document.getElementById("currentMainDocumentInfo");
  const currentAttachmentsInfo = document.getElementById("currentAttachmentsInfo");
  const replaceAttachmentsToggle = document.getElementById("replaceAttachmentsToggle");

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

  function field(id) {
    return document.getElementById(id);
  }

  function todayIso() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function prefill() {
    const context = getContext();
    const doc = docId ? getDocumentById(docId) : null;
    if (!docId && !canCreateDocument(context)) {
      editorTitle.textContent = "Creazione non consentita";
      editorDescription.textContent = "Solo il ruolo Author puo creare un nuovo documento.";
      cancelLink.href = "index.html";
      [...form.elements].forEach((element) => {
        if (element.tagName !== "A") {
          element.disabled = true;
        }
      });
      return;
    }
    if (doc) {
      editorTitle.textContent = "Modifica documento";
      editorDescription.textContent = "Campi precompilati dalla scheda esistente. Il salvataggio aggiorna versione e stato.";
      cancelLink.href = `document.html?id=${encodeURIComponent(docId)}`;
      if (!isVisibleToContext(doc, context) || !canEditDocument(doc, context)) {
        editorDescription.textContent = "L'utente attivo non ha permessi di modifica su questo documento.";
        [...form.elements].forEach((element) => {
          if (element.tagName !== "A") {
            element.disabled = true;
          }
        });
        return;
      }
      field("formTitle").value = doc.Title;
      field("formFunction").value = doc["Policy Producing Function"];
      field("formRiskType").value = doc["Risk Type"];
      field("formDocumentType").value = doc["Document Type"];
      field("formTopic").value = doc.Topic;
      field("formRegion").value = doc.Region;
      field("formLegalEntity").value = doc["Legal Entity"];
      field("formApprover").value = doc.Approver;
      field("formAuthor").value = doc.Author;
      field("formNextReviewDate").value = doc["Next Review Date"];
      field("formSummary").value = doc.Summary;
      field("formChangeDescription").value = doc["Change Description"];
      currentMainDocumentInfo.textContent = `Documento principale attuale: ${doc["Main Document"]}`;
      currentAttachmentsInfo.textContent = doc.attachments && doc.attachments.length
        ? `Allegati attuali: ${doc.attachments.map((item) => item.name).join(", ")}`
        : "Nessun allegato attuale.";
      return;
    }

    editorTitle.textContent = "Nuovo documento";
    editorDescription.textContent = "Creazione di un nuovo documento con invio diretto al passaggio successivo del workflow.";
    currentMainDocumentInfo.textContent = "Nessun documento principale caricato.";
    currentAttachmentsInfo.textContent = "Nessun allegato caricato.";
    if (context.role === "Author") {
      field("formAuthor").value = context.user;
    }
  }

  function uploadedFileReference(file, fallbackTitle) {
    const safeName = file && file.name ? file.name : `${fallbackTitle}.docx`;
    const body = [
      "File di test persistente per il portale Policy Hub.",
      "",
      `Nome file: ${safeName}`,
      `Tipo MIME: ${file && file.type ? file.type : "n/d"}`,
      `Dimensione originale: ${file && Number.isFinite(file.size) ? file.size : 0} bytes`,
      "Nota: nel prototipo statico il contenuto reale non viene salvato,",
      "ma il riferimento al file resta persistente e scaricabile per test di processo."
    ].join("\n");
    return makeDataUrl(safeName, body);
  }

  async function attachmentsToDataUrls(files, fallbackTitle) {
    const list = [...files];
    if (!list.length) {
      return [];
    }

    const results = [];
    for (const file of list) {
      results.push({
        name: file.name,
        url: uploadedFileReference(file, fallbackTitle)
      });
    }
    return results;
  }

  async function onSubmit(event) {
    event.preventDefault();
    const context = getContext();
    if (!docId && !canCreateDocument(context)) {
      return;
    }
    const operationDate = todayIso();
    const mainFile = field("formMainDocument").files[0];
    const title = field("formTitle").value.trim();
    const uploadedAttachments = await attachmentsToDataUrls(field("formAttachments").files, title);
    const updates = {
      Title: title,
      "Policy Producing Function": field("formFunction").value.trim(),
      "Risk Type": field("formRiskType").value.trim(),
      "Document Type": field("formDocumentType").value.trim(),
      "Document Category": field("formDocumentType").value.trim(),
      Topic: field("formTopic").value.trim(),
      Region: field("formRegion").value.trim(),
      "Legal Entity": field("formLegalEntity").value.trim(),
      Approver: field("formApprover").value.trim(),
      Author: field("formAuthor").value.trim(),
      "Technical Author": field("formAuthor").value.trim(),
      "Next Review Date": field("formNextReviewDate").value,
      "PGG Review Date": field("formNextReviewDate").value,
      Summary: field("formSummary").value.trim(),
      "Change Description": field("formChangeDescription").value.trim(),
      "Last Modified Date": operationDate,
      State: "In Approval"
    };

    if (mainFile) {
      updates["Main Document"] = mainFile.name;
      updates.mainDocumentUrl = uploadedFileReference(mainFile, title);
    }

    if (docId) {
      const existing = getDocumentById(docId);
      if (!existing || !isVisibleToContext(existing, context) || !canEditDocument(existing, context)) {
        return;
      }
      updates.attachments = replaceAttachmentsToggle.checked
        ? (uploadedAttachments.length ? uploadedAttachments : [])
        : [...(existing.attachments || []), ...uploadedAttachments];
      if (!uploadedAttachments.length && !replaceAttachmentsToggle.checked) {
        updates.attachments = existing.attachments || [];
      }
      const saved = normalizeFileLinks(updateDocument(docId, updates, context, {
        auditAction: context.role === "Approver" ? "Correzione approver" : "Aggiornamento autore",
        when: `${operationDate} 09:00`
      }));
      window.location.href = `document.html?id=${encodeURIComponent(saved.id)}`;
      return;
    }

    const id = `doc-${Date.now()}`;
    const newDocument = {
      id,
      "Parent Document Title(s)": "Framework Normativo di Gruppo",
      "Parent Document URL(s)": "https://intranet/policies/framework",
      "Geographic Applicability": updates.Region,
      Confidentiality: "Internal",
      "DMA Relevance": "Medium",
      Language: "Italian",
      "English Title": `${title} - EN`,
      "Functional Applicability": "Tutti i dipendenti",
      "Document Contact": "policy.office@banca.it",
      "Additional Contacts": "",
      "Compliance Category": "Normativa interna",
      Addressee: "Dipendenti",
      "Implementation Date": operationDate,
      "Business Version Number": "1.0",
      "System Version Number": "1.0.0",
      "Material Document Revision": "Yes",
      "First PGG Sign Off Date": "",
      "Last PGG Sign Off Date": "",
      "Last Sign Off Type": "",
      "Original Issue Date": operationDate,
      "Last Review Date": "",
      "Decommissioned Date": "",
      DRL: `DRL-${Date.now()}`,
      URL: "",
      audit: [],
      versionHistory: [{
        businessVersion: "1.0",
        systemVersion: "1.0.0",
        date: operationDate,
        author: updates.Author,
        changeDescription: updates["Change Description"]
      }],
      "Days Overdue": 0,
      ...updates,
      attachments: uploadedAttachments.length ? uploadedAttachments : [{
        name: `Allegato-${title.replace(/[^A-Za-z0-9]+/g, "-")}.docx`,
        url: makeDataUrl(`Allegato-${title}.docx`, `Allegato generato in test per ${title}.`)
      }],
      "Main Document": updates["Main Document"] || `${title.replace(/[^A-Za-z0-9]+/g, "-")}.docx`,
      mainDocumentUrl: updates.mainDocumentUrl || makeDataUrl(`${title}.docx`, `Documento principale creato in test per ${title}.`)
    };
    addDocument(normalizeFileLinks(newDocument), context);
    window.location.href = `document.html?id=${encodeURIComponent(id)}`;
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
  prefill();

  roleSelect.addEventListener("change", () => {
    setRole(roleSelect.value);
    populateUsers();
  });

  userSelect.addEventListener("change", () => {
    setUser(userSelect.value);
  });

  form.addEventListener("submit", onSubmit);
})();
