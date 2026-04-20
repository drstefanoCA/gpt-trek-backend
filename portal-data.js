(function () {
  const STORAGE_KEY = "policy-hub-documents-v2";
  const CONTEXT_KEY = "policy-hub-context-v2";

  const roleUsers = {
    Reader: ["Anna Verdi", "Marco Ricci", "Laura De Santis", "Stefano Piras"],
    Author: ["Giulia Rinaldi", "Paolo Vitale", "Andrea Rossi", "Chiara Leone", "Matteo Serra", "Elisa Ferri"],
    Approver: ["Luca Bianchi", "Marta Greco", "Davide Serra", "Silvia Neri"],
    "Portfolio Owner": ["Elena Conti", "Federica Neri", "Giorgio Sala"],
    Compliance: ["Compliance Office", "Normative Governance Office"]
  };

  function makeDataUrl(filename, body) {
    return `data:text/plain;charset=utf-8,${encodeURIComponent(`${filename}\n\n${body}`)}`;
  }

  function fakeAttachment(name, body) {
    return { name, url: makeDataUrl(name, body) };
  }

  function normalizeFileLinks(doc) {
    if (!doc.mainDocumentUrl || String(doc.mainDocumentUrl).startsWith("blob:")) {
      doc.mainDocumentUrl = makeDataUrl(
        doc["Main Document"] || `${doc.Title}.docx`,
        `Copia di test ricostruita per ${doc.Title}. Il file originario caricato in una sessione precedente non era persistente.`
      );
    }

    if (!Array.isArray(doc.attachments)) {
      doc.attachments = [];
    }

    doc.attachments = doc.attachments.map((attachment, index) => {
      if (!attachment.url || String(attachment.url).startsWith("blob:")) {
        return {
          name: attachment.name || `Allegato-${index + 1}.docx`,
          url: makeDataUrl(
            attachment.name || `Allegato-${index + 1}.docx`,
            `Allegato di test ricostruito per ${doc.Title}.`
          )
        };
      }
      return attachment;
    });

    return doc;
  }

  const documentSeeds = [
    ["Policy Antiriciclaggio di Gruppo", "Compliance", "Policy", "Compliance", "AML", "Italia", "Banca Italia S.p.A.", "Published", "2024-04-09", "2026-05-15", 0],
    ["Procedura Segnalazioni Operative", "Operations", "Procedure", "Operational", "Vigilanza", "Italia", "Banca Italia S.p.A.", "Overdue", "2025-03-20", "2026-04-10", 10],
    ["Standard Sicurezza Endpoint", "Cybersecurity", "Standard", "Cyber", "Endpoint Protection", "Global", "Gruppo Bancario", "In Approval", "2026-04-02", "2026-07-30", 0],
    ["Policy Continuita Operativa", "Operations", "Policy", "Operational", "Business Continuity", "Italia", "Banca Italia S.p.A.", "Published", "2024-06-10", "2026-08-30", 0],
    ["Procedura Gestione Reclami", "Customer Care", "Procedure", "Conduct", "Customer Protection", "Italia", "Banca Retail S.p.A.", "Published", "2025-01-15", "2026-09-15", 0],
    ["Standard Access Management", "Cybersecurity", "Standard", "Cyber", "Identity Access", "Global", "Gruppo Bancario", "In Approval", "2025-11-20", "2026-06-10", 0],
    ["Policy ESG Credit Framework", "Risk Management", "Policy", "Credit", "ESG", "EMEA", "Banca Corporate S.p.A.", "Published", "2025-02-11", "2026-10-01", 0],
    ["Procedura KYC Onboarding", "Compliance", "Procedure", "Compliance", "KYC", "Italia", "Banca Italia S.p.A.", "Changes Requested", "2025-05-07", "2026-06-15", 0],
    ["Istruzione Operativa Incident Response", "Cybersecurity", "Instruction", "Cyber", "Incident Response", "Global", "Gruppo Bancario", "Published", "2025-09-03", "2026-12-05", 0],
    ["Policy Data Governance", "Data Office", "Policy", "Operational", "Data Governance", "Global", "Gruppo Bancario", "Published", "2024-10-18", "2026-11-20", 0],
    ["Procedura Appalti ICT", "Procurement", "Procedure", "Operational", "Third Parties", "EMEA", "Servizi Centrali S.p.A.", "In Approval", "2025-12-12", "2026-06-25", 0],
    ["Standard Vulnerability Management", "Cybersecurity", "Standard", "Cyber", "Vulnerability", "Global", "Gruppo Bancario", "Published", "2024-12-04", "2026-07-18", 0],
    ["Policy Product Governance", "Retail Banking", "Policy", "Conduct", "Product Governance", "Italia", "Banca Retail S.p.A.", "Published", "2025-02-28", "2026-09-01", 0],
    ["Procedura Reporting ICAAP", "Risk Management", "Procedure", "Capital", "ICAAP", "Italia", "Banca Italia S.p.A.", "Overdue", "2024-11-30", "2026-04-05", 15],
    ["Standard Secure Development", "IT", "Standard", "Cyber", "Secure SDLC", "Global", "Gruppo Bancario", "In Approval", "2026-01-19", "2026-08-12", 0],
    ["Policy Outsourcing", "Procurement", "Policy", "Operational", "Outsourcing", "EMEA", "Servizi Centrali S.p.A.", "Published", "2024-07-14", "2026-09-30", 0],
    ["Manuale Operativo Filiali", "Network", "Manual", "Operational", "Branch Operations", "Italia", "Banca Italia S.p.A.", "Published", "2025-06-06", "2026-10-22", 0],
    ["Procedura Privacy Data Subject Rights", "Privacy Office", "Procedure", "Compliance", "Privacy", "EMEA", "Gruppo Bancario", "Changes Requested", "2025-08-23", "2026-06-05", 0],
    ["Policy Market Abuse", "Compliance", "Policy", "Compliance", "Market Abuse", "EMEA", "Banca Corporate S.p.A.", "Published", "2024-09-02", "2026-08-14", 0],
    ["Standard Backup e Retention", "IT", "Standard", "Operational", "Backup", "Global", "Gruppo Bancario", "Published", "2025-04-21", "2026-11-28", 0]
  ];

  function buildSeedDocument(seed, index) {
    const [title, producingFunction, documentType, riskType, topic, region, legalEntity, state, issueDate, reviewDate, overdue] = seed;
    const authors = roleUsers.Author;
    const approvers = roleUsers.Approver;
    const gpos = roleUsers["Portfolio Owner"];
    const author = authors[index % authors.length];
    const approver = approvers[index % approvers.length];
    const portfolioOwner = gpos[index % gpos.length];
    const systemVersion = `${1 + (index % 3)}.${index % 4}.${index % 7}`;
    const businessVersion = `${1 + (index % 4)}.0`;
    const description = `Aggiornamento controllato del documento ${title.toLowerCase()}.`;
    const extension = index % 3 === 0 ? "docx" : index % 3 === 1 ? "pdf" : "doc";
    const mainName = `${title.replace(/[^A-Za-z0-9]+/g, "-")}.${extension}`;

    return {
      id: `doc-${index + 1}`,
      Title: title,
      "Policy Producing Function": producingFunction,
      "Parent Document Title(s)": "Framework Normativo di Gruppo",
      "Parent Document URL(s)": "https://intranet/policies/framework",
      "Risk Type": riskType,
      "Document Category": documentType,
      Region: region,
      "Geographic Applicability": region === "Global" ? "Tutte le geografie" : region,
      "Legal Entity": legalEntity,
      Topic: topic,
      "Topic Description": `Regole e istruzioni operative relative a ${topic}.`,
      "Next Review Date": reviewDate,
      "PGG Review Date": reviewDate,
      "Days Overdue": overdue,
      State: state,
      Confidentiality: index % 2 === 0 ? "Internal" : "Restricted",
      "DMA Relevance": index % 2 === 0 ? "High" : "Medium",
      Author: author,
      "Technical Author": author,
      Approver: approver,
      "Portfolio Owner": portfolioOwner,
      "Document Type": documentType,
      Language: "Italian",
      "English Title": `${title} - EN`,
      "Main Document": mainName,
      "Functional Applicability": "Tutti i dipendenti e funzioni rilevanti",
      "Document Contact": `${producingFunction.toLowerCase().replace(/\s+/g, ".")}@banca.it`,
      "Additional Contacts": "policy.office@banca.it",
      "Compliance Category": "Normativa interna",
      Summary: `Documento di riferimento per ${topic}, destinato alla consultazione della popolazione aziendale.`,
      Addressee: "Dipendenti, funzioni di controllo, management",
      "Implementation Date": issueDate,
      "Business Version Number": businessVersion,
      "System Version Number": systemVersion,
      "Material Document Revision": index % 2 === 0 ? "Yes" : "No",
      "First PGG Sign Off Date": issueDate,
      "Last PGG Sign Off Date": state === "Published" ? issueDate : "",
      "Last Sign Off Type": state === "Published" ? "Major" : "",
      "Original Issue Date": issueDate,
      "Last Review Date": issueDate,
      "Last Modified Date": issueDate,
      "Decommissioned Date": "",
      "Change Description": description,
      DRL: `DRL-${String(index + 1).padStart(3, "0")}`,
      URL: `https://intranet/policies/doc-${index + 1}`,
      mainDocumentUrl: makeDataUrl(mainName, `Documento principale di test per ${title}.`),
      attachments: [
        fakeAttachment(`Allegato-${index + 1}-A.docx`, `Allegato di test A per ${title}.`),
        fakeAttachment(`Allegato-${index + 1}-B.pdf`, `Allegato di test B per ${title}.`)
      ],
      audit: [
        { who: author, action: "Creazione documento", when: `${issueDate} 09:00` },
        { who: approver, action: state === "Published" ? "Approvazione" : "Presa in carico", when: `${issueDate} 15:00` },
        { who: "Utente Lettore", action: "Visualizzazione", when: "2026-04-20 08:00" }
      ],
      versionHistory: [
        {
          businessVersion,
          systemVersion,
          date: issueDate,
          author,
          changeDescription: description
        }
      ]
    };
  }

  function seedDocuments() {
    return documentSeeds.map(buildSeedDocument);
  }

  function ensureDocuments() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const docs = JSON.parse(raw).map(normalizeFileLinks);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
      return docs;
    }
    const docs = seedDocuments();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
    return docs;
  }

  function saveDocuments(docs) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  }

  function getDocuments() {
    return ensureDocuments();
  }

  function getContext() {
    const raw = localStorage.getItem(CONTEXT_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
    const initial = { role: "Reader", user: roleUsers.Reader[0] };
    localStorage.setItem(CONTEXT_KEY, JSON.stringify(initial));
    return initial;
  }

  function saveContext(context) {
    localStorage.setItem(CONTEXT_KEY, JSON.stringify(context));
  }

  function setRole(role) {
    const context = getContext();
    context.role = role;
    if (!roleUsers[role].includes(context.user)) {
      context.user = roleUsers[role][0];
    }
    saveContext(context);
    return context;
  }

  function setUser(user) {
    const context = getContext();
    context.user = user;
    saveContext(context);
    return context;
  }

  function getUsersForRole(role) {
    return roleUsers[role] || [];
  }

  function getDocumentById(id) {
    return getDocuments().find((doc) => doc.id === id);
  }

  function getCounts(docs) {
    return {
      total: docs.length,
      published: docs.filter((doc) => doc.State === "Published").length,
      inApproval: docs.filter((doc) => doc.State === "In Approval").length,
      overdue: docs.filter((doc) => doc.State === "Overdue" || doc["Days Overdue"] > 0).length
    };
  }

  function canCreateDocument(context) {
    return !!context && context.role === "Author";
  }

  function canUseMyDocuments(context) {
    return !!context && ["Author", "Approver", "Portfolio Owner"].includes(context.role);
  }

  function canSeeDocumentActions(context) {
    return !!context && ["Author", "Approver", "Portfolio Owner"].includes(context.role);
  }

  function isVisibleToContext(doc, context) {
    if (!doc || !context) {
      return false;
    }
    if (context.role === "Reader") {
      return doc.State === "Published";
    }
    return true;
  }

  function canEditDocument(doc, context) {
    if (!doc) {
      return false;
    }
    if (context.role === "Author") {
      return doc.Author === context.user;
    }
    if (context.role === "Approver") {
      return doc.Approver === context.user;
    }
    return false;
  }

  function canApproveDocument(doc, context) {
    return !!doc && context.role === "Approver" && doc.Approver === context.user && ["In Approval", "Overdue"].includes(doc.State);
  }

  function canEscalateDocument(doc, context) {
    return !!doc && context.role === "Portfolio Owner" && doc["Portfolio Owner"] === context.user && (doc.State === "Overdue" || doc["Days Overdue"] > 0);
  }

  function updateDocument(id, updates, actor, options = {}) {
    const docs = getDocuments();
    const target = docs.find((doc) => doc.id === id);
    if (!target) {
      return null;
    }

    target.versionHistory.push({
      businessVersion: target["Business Version Number"],
      systemVersion: target["System Version Number"],
      date: target["Last Modified Date"] || target["Original Issue Date"],
      author: actor.user,
      changeDescription: target["Change Description"] || "Versione precedente"
    });

    Object.assign(target, updates);

    const currentBusiness = Number.parseFloat(target["Business Version Number"] || "1");
    const businessBase = Number.isNaN(currentBusiness) ? 1 : Math.floor(currentBusiness) + 1;
    target["Business Version Number"] = `${businessBase}.0`;

    const parts = String(target["System Version Number"] || "1.0.0").split(".").map((item) => Number.parseInt(item, 10) || 0);
    while (parts.length < 3) {
      parts.push(0);
    }
    parts[2] += 1;
    target["System Version Number"] = parts.slice(0, 3).join(".");
    target["Last Modified Date"] = updates["Last Modified Date"] || target["Last Modified Date"];
    target.audit.unshift({
      who: actor.user,
      action: options.auditAction || "Aggiornamento documento",
      when: options.when || target["Last Modified Date"] || "2026-04-20"
    });

    saveDocuments(docs);
    return target;
  }

  function addDocument(doc, actor) {
    const docs = getDocuments();
    docs.unshift(doc);
    doc.audit.unshift({
      who: actor.user,
      action: "Creazione bozza",
      when: doc["Last Modified Date"] || doc["Original Issue Date"]
    });
    saveDocuments(docs);
    return doc;
  }

  function changeDocumentState(id, newState, actor, actionLabel) {
    const docs = getDocuments();
    const target = docs.find((doc) => doc.id === id);
    if (!target) {
      return null;
    }
    target.State = newState;
    target.audit.unshift({
      who: actor.user,
      action: actionLabel,
      when: "2026-04-20 12:00"
    });
    if (newState === "Published") {
      target["Days Overdue"] = 0;
      target["Last Review Date"] = "2026-04-20";
      target["Last PGG Sign Off Date"] = "2026-04-20";
      target["Last Sign Off Type"] = "Major";
    }
    saveDocuments(docs);
    return target;
  }

  window.PolicyHubData = {
    roleUsers,
    makeDataUrl,
    fakeAttachment,
    normalizeFileLinks,
    getDocuments,
    saveDocuments,
    getDocumentById,
    getContext,
    saveContext,
    setRole,
    setUser,
    getUsersForRole,
    getCounts,
    canCreateDocument,
    canUseMyDocuments,
    canSeeDocumentActions,
    isVisibleToContext,
    canEditDocument,
    canApproveDocument,
    canEscalateDocument,
    updateDocument,
    addDocument,
    changeDocumentState
  };
})();
