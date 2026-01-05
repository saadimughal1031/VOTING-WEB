/* =========================
   Online Voting System - app.js
   Shared JS for all pages
   ========================= */

// API Base URL - Automatically detects environment
const hostname = window.location.hostname;
const protocol = window.location.protocol;
const isLocal = !hostname ||
  hostname === 'localhost' ||
  hostname === '127.0.0.1' ||
  hostname.startsWith('192.168.') ||
  hostname.startsWith('10.') ||
  protocol === 'file:';

// For local development, we hit the backend directly on port 8080
// In production (Vercel), we use the relative /api path
const API_BASE = isLocal
  ? "http://localhost:8080/api"
  : "/api";

function $(sel) { return document.querySelector(sel); }
function $all(sel) { return [...document.querySelectorAll(sel)]; }

function setActiveNav() {
  const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  $all(".nav a").forEach(a => {
    const href = (a.getAttribute("href") || "").toLowerCase();
    if (href === page) a.classList.add("active");
  });
}

function cnicLooksValid(cnic) {
  // Accept: 13 digits (e.g. 1234512345671) OR 5-7-1 format (e.g. 12345-1234567-1)
  return /^(\d{13}|\d{5}-\d{7}-\d{1})$/.test((cnic || "").trim());
}

// Format CNIC from either "1234512345671" or "12345-1234567-1" to standard "12345-1234567-1"
function formatCNIC(cnic) {
  const digits = (cnic || "").replace(/\D/g, "");
  if (digits.length !== 13) return "";
  return digits.substr(0, 5) + "-" + digits.substr(5, 7) + "-" + digits.substr(12, 1);
}

function showMsg(id, msg, ok = true) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = "alert " + (ok ? "ok" : "err");
  el.textContent = msg;
  el.hidden = false;
}

function hideMsg(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.hidden = true;
  el.textContent = "";
}

async function postJSON(url, data) {
  const token = localStorage.getItem("admin_token");
  const headers = {
    "Content-Type": "application/json"
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Request failed");
  return json;
}

/* Page: Voter Login */
function initVoterLogin() {
  const form = $("#voterLoginForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const rawCNIC = $("#loginCNIC").value.trim();
    const cnic = formatCNIC(rawCNIC) || rawCNIC;

    if (!cnicLooksValid(rawCNIC)) {
      showMsg("loginMsg", "CNIC must be 13 digits (with or without hyphens).", false);
      return;
    }

    try {
      // Send CNIC as string
      const res = await postJSON(`${API_BASE}/voter/login`, { cnic });
      localStorage.setItem("voter_cnic", res.cnic || cnic);
      showMsg("loginMsg", "Login successful۔ اب Vote Cast پیج کھولیں۔", true);
      setTimeout(() => location.href = "vote.html", 700);
    } catch (err) {
      showMsg("loginMsg", err.message || "Login failed", false);
    }
  });
}

/* Page: Registration */
function initRegister() {
  const form = $("#registerForm");
  if (!form) return;

  // Hide error message on page load
  hideMsg("regMsg");

  const pic = $("#profilePic");
  const preview = $("#picPreview");

  if (pic && preview) {
    pic.addEventListener("change", () => {
      const f = pic.files?.[0];
      if (!f) { preview.src = ""; preview.hidden = true; return; }
      const url = URL.createObjectURL(f);
      preview.src = url;
      preview.hidden = false;
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideMsg("regMsg");

    const rawCNIC = $("#regCNIC")?.value?.trim() || "";
    const payload = {
      name: $("#fullName")?.value?.trim() || "",
      father_name: $("#fatherName")?.value?.trim() || "",
      cnic: formatCNIC(rawCNIC) || rawCNIC, // send as string (backend handles both string and numeric)
      address: $("#address")?.value?.trim() || "",
      // Note: profile picture upload needs multipart in backend.
      // For now we store only filename (backend can handle multipart later)
      profile_pic_name: (pic?.files?.[0]?.name || "")
    };

    if (!payload.name || !payload.father_name || !payload.address) {
      showMsg("regMsg", "تمام required fields fill کریں۔", false);
      return;
    }
    if (!cnicLooksValid(rawCNIC)) {
      showMsg("regMsg", "CNIC must be 13 digits (with or without hyphens). Example: 1234512345671 or 12345-1234567-1", false);
      return;
    }

    try {
      const res = await postJSON(`${API_BASE}/voter/register`, payload);
      showMsg("regMsg", "Registration successful۔ اب Login کریں۔", true);
      if (res.cnic) localStorage.setItem("voter_cnic_formatted", res.cnic);
      setTimeout(() => location.href = "login.html", 900);
    } catch (err) {
      showMsg("regMsg", err.message || "Registration failed", false);
    }
  });
}

/* Page: Vote */
function initVote() {
  const form = $("#voteForm");
  const electionSelect = $("#election");
  if (!form || !electionSelect) return;

  // Prefill voter CNIC if stored
  const storedCNIC = localStorage.getItem("voter_cnic");
  if (storedCNIC && $("#voteCNIC")) $("#voteCNIC").value = storedCNIC;

  // Load elections (only RUNNING)
  loadElections(electionSelect, "RUNNING");

  let electionDetails = null;

  electionSelect.addEventListener("change", async () => {
    const id = electionSelect.value;
    const pList = $("#partyList");
    const cList = $("#candidateList");
    if (!id) {
      pList.innerHTML = '<div style="font-size:13px; color:#666; padding:10px;">Select an election first</div>';
      cList.innerHTML = '<div style="font-size:13px; color:#666; padding:10px;">Select a party first</div>';
      return;
    }

    // Fetch details
    try {
      const res = await fetch(`${API_BASE}/election/details?election_id=${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to load details");
      electionDetails = data.data; // { parties: [], candidates: [] }

      renderParties(electionDetails.parties);
      cList.innerHTML = '<div style="font-size:13px; color:#666; padding:10px;">Select a party first</div>';

      // Clear hidden inputs
      $("#party").value = "";
      $("#candidate").value = "";

    } catch (err) {
      showMsg("voteMsg", err.message, false);
    }
  });

  function renderParties(parties) {
    const pList = $("#partyList");
    pList.innerHTML = "";
    if (!parties || parties.length === 0) {
      pList.innerHTML = "No parties found.";
      return;
    }
    parties.forEach(p => {
      const div = document.createElement("div");
      div.className = "select-card";
      div.dataset.id = p.party_id;
      div.onclick = () => selectParty(p.party_id);

      let imgHtml = "";
      if (p.symbol_path && p.symbol_path.length > 0) {
        imgHtml = `<img src="${p.symbol_path}" class="select-card-img" alt="${p.party_name}">`;
      } else {
        // Fallback to text initials if no image
        imgHtml = `<div class="select-card-initial">${p.party_name.substring(0, 2).toUpperCase()}</div>`;
      }

      div.innerHTML = `
            ${imgHtml}
            <div class="title">${p.party_name}</div>
          `;
      pList.appendChild(div);
    });
  }

  function selectParty(partyId) {
    $("#party").value = partyId;
    // Highlight selected
    document.querySelectorAll("#partyList .select-card").forEach(el => {
      el.classList.toggle("selected", el.dataset.id === partyId);
    });

    // Filter candidates
    const filtered = electionDetails.candidates.filter(c => c.party === partyId);
    renderCandidates(filtered);
    $("#candidate").value = ""; // clear candidate
  }

  function renderCandidates(candidates) {
    const cList = $("#candidateList");
    cList.innerHTML = "";
    if (!candidates || candidates.length === 0) {
      cList.innerHTML = '<div style="font-size:13px; color:#666; padding:10px;">No candidates for this party</div>';
      return;
    }
    candidates.forEach(c => {
      const div = document.createElement("div");
      div.className = "select-card";
      div.dataset.id = c.id;
      div.onclick = () => selectCandidate(c.id);

      let imgHtml = "";
      if (c.image_path && c.image_path.length > 0) {
        imgHtml = `<img src="${c.image_path}" class="select-card-img" alt="${c.name}">`;
      } else {
        imgHtml = `<div class="select-card-initial">${c.name.substring(0, 2).toUpperCase()}</div>`;
      }

      div.innerHTML = `
            ${imgHtml}
            <div class="title">${c.name}</div>
          `;
      cList.appendChild(div);
    });
  }

  function selectCandidate(candId) {
    $("#candidate").value = candId;
    document.querySelectorAll("#candidateList .select-card").forEach(el => {
      el.classList.toggle("selected", el.dataset.id == candId);
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideMsg("voteMsg");

    const rawCNIC = $("#voteCNIC")?.value?.trim() || "";
    const election_id_str = $("#election")?.value?.trim() || "";
    const party_id = $("#party")?.value?.trim() || "";
    const candidate_id_str = $("#candidate")?.value?.trim() || "";

    // Validate CNIC
    if (!cnicLooksValid(rawCNIC)) {
      showMsg("voteMsg", "CNIC must be 13 digits (with or without hyphens).", false);
      return;
    }

    // Validate election_id
    const election_id = parseInt(election_id_str);
    if (!election_id_str || election_id_str === "" || isNaN(election_id) || election_id <= 0) {
      showMsg("voteMsg", "Please select an election", false);
      return;
    }

    // Validate party_id
    if (!party_id || party_id === "") {
      showMsg("voteMsg", "Please select a party", false);
      return;
    }

    // Validate candidate_id
    const candidate_id = parseInt(candidate_id_str);
    if (!candidate_id_str || candidate_id_str === "" || isNaN(candidate_id) || candidate_id <= 0) {
      showMsg("voteMsg", "Please select a candidate", false);
      return;
    }

    const formattedCNIC = formatCNIC(rawCNIC) || rawCNIC;
    const payload = {
      cnic: formattedCNIC,
      // Backend expects voter_id if parsing cnic fails or explicit bypass, but we send cnic so use voter_id=0
      voter_id: 0,
      election_id: election_id,
      party_id: party_id,
      candidate_id: candidate_id
    };

    // Debug: Log payload (remove in production)
    console.log("Cast Vote payload:", {
      cnic: formattedCNIC,
      voter_id: 0,
      election_id: election_id,
      party_id: party_id,
      candidate_id: candidate_id
    });

    try {
      await postJSON(`${API_BASE}/vote/cast`, payload);
      showMsg("voteMsg", "Vote submitted successfully.", true);
      // Success: Clear selection
      document.querySelectorAll(".select-card.selected").forEach(el => el.classList.remove("selected"));
      $("#party").value = "";
      $("#candidate").value = "";
    } catch (err) {
      console.error("Cast Vote error:", err);
      // Special handling for already voted or not registered
      showMsg("voteMsg", err.message || "Vote failed", false);
    }
  });
}

/* Helper: Load ended elections for results dropdown */
async function loadEndedElections(selectElement) {
  if (!selectElement) return;

  selectElement.innerHTML = '<option value="">Loading ended elections...</option>';
  selectElement.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/elections/ended`);

    if (!res.ok) {
      const errorText = await res.text();
      let errorMsg = "Failed to load ended elections";
      try {
        const errorData = JSON.parse(errorText);
        errorMsg = errorData.message || errorMsg;
      } catch { }
      throw new Error(errorMsg);
    }

    const data = await res.json();
    const elections = data.data || [];

    selectElement.innerHTML = '<option value="">Select Ended Election</option>';
    selectElement.disabled = false;

    if (elections.length === 0) {
      selectElement.innerHTML = '<option value="">No completed elections yet</option>';
      return;
    }

    elections.forEach(election => {
      const option = document.createElement("option");
      option.value = String(election.id);
      const endedDate = election.ended_at ? new Date(election.ended_at).toLocaleDateString() : "";
      option.textContent = `${election.name}${endedDate ? " (Ended: " + endedDate + ")" : ""}`;
      selectElement.appendChild(option);
    });
  } catch (err) {
    selectElement.innerHTML = `<option value="">Error: ${err.message}</option>`;
    selectElement.disabled = false;
    console.error("Error loading ended elections:", err);
  }
}

/* Page: Results */
function initResults() {
  const btn = $("#loadResultsBtn");
  const select = $("#resultElection");
  if (!btn || !select) return;

  // Hide error message on page load
  hideMsg("resultsMsg");

  // Load ended elections dynamically
  loadEndedElections(select);

  btn.addEventListener("click", async () => {
    hideMsg("resultsMsg");
    const election_id = select.value?.trim() || "";

    if (!election_id || election_id === "" || election_id === "0") {
      showMsg("resultsMsg", "Please select an ended election", false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/results?election_id=${encodeURIComponent(election_id)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to load results");

      // Backend returns { success:true, data: { candidates: [ { candidate_id, name, party, vote_count } ] } }
      const candidates = (data && data.data && data.data.candidates) || [];

      const tbody = $("#resultsBody");
      tbody.innerHTML = "";
      candidates.forEach(row => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${row.party || "-"}</td>
            <td>${row.name || "-"}</td>
            <td>${row.vote_count || 0}</td>
          `;
        tbody.appendChild(tr);
      });

      showMsg("resultsMsg", "Results loaded.", true);
    } catch (err) {
      showMsg("resultsMsg", err.message || "Error", false);
    }
  });
}

/* Page: Admin Login */
function initAdminLogin() {
  const form = $("#adminLoginForm");
  if (!form) return;

  // Hide error message on page load
  hideMsg("adminMsg");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideMsg("adminMsg");
    const admin_id = $("#adminId")?.value?.trim() || "";
    const password = $("#adminPass")?.value || "";

    try {
      const res = await postJSON(`${API_BASE}/admin/login`, { admin_id, password });
      if (res.token) {
        localStorage.setItem("admin_token", res.token);
        localStorage.setItem("admin_id", admin_id);
        showMsg("adminMsg", "Admin login successful۔ Dashboard open ہو رہا ہے۔", true);
        setTimeout(() => location.href = "admin_dashboard.html", 800);
      } else {
        showMsg("adminMsg", "Login successful but no token received.", false);
      }
    } catch (err) {
      showMsg("adminMsg", err.message || "Admin login failed", false);
    }
  });
}

/* Helper: Load elections list */
async function loadElections(selectElement, filterStatus = null) {
  if (!selectElement) return;

  // Show loading state
  selectElement.innerHTML = '<option value="">Loading elections...</option>';
  selectElement.disabled = true;

  try {
    // Use public endpoint for voters, admin endpoint for admin pages
    const isAdminPage = window.location.pathname.includes('admin') ||
      window.location.pathname.includes('manage') ||
      window.location.pathname.includes('start') ||
      window.location.pathname.includes('stop') ||
      window.location.pathname.includes('add_party') ||
      window.location.pathname.includes('add_candidate');

    let url = `${API_BASE}/elections`;
    if (isAdminPage) {
      url = `${API_BASE}/admin/elections`;
      if (filterStatus) {
        url += `?status=${filterStatus}`;
      }
    } else if (filterStatus) {
      url += `?status=${filterStatus}`;
    }

    const res = await fetch(url);

    if (!res.ok) {
      const errorText = await res.text();
      let errorMsg = "Failed to load elections";
      try {
        const errorData = JSON.parse(errorText);
        errorMsg = errorData.message || errorMsg;
      } catch { }
      throw new Error(errorMsg);
    }

    const data = await res.json();
    const elections = data.data || [];

    selectElement.innerHTML = '<option value="">Select Election</option>';
    selectElement.disabled = false;

    if (elections.length === 0) {
      selectElement.innerHTML = '<option value="">No elections available</option>';
      return;
    }

    elections.forEach(election => {
      if (!filterStatus || election.status === filterStatus) {
        const option = document.createElement("option");
        const electionId = election.id || election.election_id || "";
        option.value = String(electionId);
        option.textContent = `${election.name} (${election.status})`;
        if (!electionId) {
          console.warn("Election missing ID:", election);
        }
        selectElement.appendChild(option);
      }
    });
  } catch (err) {
    selectElement.innerHTML = `<option value="">Error: ${err.message}</option>`;
    selectElement.disabled = false;
    console.error("Error loading elections:", err);
  }
}

// Helper: Check admin authentication
function checkAdminAuth() {
  const token = localStorage.getItem("admin_token");
  const admin_id = localStorage.getItem("admin_id");
  return token && admin_id;
}

// Helper: Redirect to admin login if not authenticated
function requireAdminAuth() {
  if (!checkAdminAuth()) {
    location.href = "admin_login.html";
    return false;
  }
  return true;
}

/* Page: Admin Dashboard */
function initAdminDashboard() {
  const dash = $("#adminDash");
  if (!dash) return;

  if (!requireAdminAuth()) return;

  const token = localStorage.getItem("admin_token");
  const admin_id = localStorage.getItem("admin_id");

  // Show admin info
  const infoDisplay = $("#adminInfoDisplay");
  if (infoDisplay) {
    infoDisplay.innerHTML = `<strong>Admin:</strong> ${admin_id}`;
  }

  // Logout button
  const logoutBtn = $("#logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_id");
      location.href = "admin_login.html";
    });
  }
}

/* Page: Create Election */
function initCreateElection() {
  if (!requireAdminAuth()) return;

  const form = $("#createElectionForm");
  if (!form) return;

  // Hide error message on page load
  hideMsg("createElectionMsg");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideMsg("createElectionMsg");
    const name = $("#electionName")?.value?.trim() || "";

    if (!name) {
      showMsg("createElectionMsg", "Election name is required", false);
      return;
    }

    try {
      const res = await postJSON(`${API_BASE}/admin/election/create`, { name });
      showMsg("createElectionMsg", "Election created successfully!", true);
      setTimeout(() => location.href = "admin_dashboard.html", 1000);
    } catch (err) {
      showMsg("createElectionMsg", err.message || "Failed to create election", false);
    }
  });
}

/* Page: Start Election */
function initStartElection() {
  if (!requireAdminAuth()) return;

  const form = $("#startElectionForm");
  const select = $("#startElectionSelect");
  if (!form || !select) return;

  // Hide error message on page load
  hideMsg("startElectionMsg");

  // Load elections
  loadElections(select, "CREATED");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideMsg("startElectionMsg");
    const election_id = select.value?.trim() || "";

    if (!election_id) {
      showMsg("startElectionMsg", "Please select an election", false);
      return;
    }

    try {
      const res = await postJSON(`${API_BASE}/admin/election/start`, { election_id: parseInt(election_id) });
      showMsg("startElectionMsg", "Election started successfully!", true);
      setTimeout(() => location.href = "admin_dashboard.html", 1000);
    } catch (err) {
      showMsg("startElectionMsg", err.message || "Failed to start election", false);
    }
  });
}

/* Page: Stop Election */
function initStopElection() {
  if (!requireAdminAuth()) return;

  const form = $("#stopElectionForm");
  const select = $("#stopElectionSelect");
  if (!form || !select) return;

  // Hide error message on page load
  hideMsg("stopElectionMsg");

  // Load elections
  loadElections(select, "RUNNING");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideMsg("stopElectionMsg");
    const election_id = select.value?.trim() || "";

    if (!election_id) {
      showMsg("stopElectionMsg", "Please select an election", false);
      return;
    }

    try {
      const res = await postJSON(`${API_BASE}/admin/election/stop`, { election_id: parseInt(election_id) });
      showMsg("stopElectionMsg", "Election stopped successfully!", true);
      setTimeout(() => location.href = "admin_dashboard.html", 1000);
    } catch (err) {
      showMsg("stopElectionMsg", err.message || "Failed to stop election", false);
    }
  });
}

/* Helper: Create party block HTML */
function createPartyBlock(index) {
  return `
    <div class="party-block" data-index="${index}">
      <div class="block-header">
        <span class="block-title">Party ${index + 1}</span>
        <button type="button" class="remove-block" onclick="removePartyBlock(${index})">Remove</button>
      </div>
      <div class="grid-2">
        <div class="field">
          <label>Party ID</label>
          <input type="text" class="party-id-input" placeholder="e.g., P${index + 1}" required />
        </div>
        <div class="field">
          <label>Party Name</label>
          <input type="text" class="party-name-input" placeholder="e.g., Party ${String.fromCharCode(65 + index)}" required />
        </div>
      </div>
      <div class="field">
        <label>Party Symbol/Icon (Optional)</label>
        <input type="file" class="party-icon-input" accept="image/*" />
        <div class="image-upload-preview">
          <img class="image-preview hidden" alt="Preview" />
        </div>
      </div>
    </div>
  `;
}

let partyBlockCount = 1;

function addPartyBlock() {
  const container = $("#partyBlocks");
  if (!container) return;

  if (partyBlockCount >= 10) {
    showMsg("addPartyMsg", "Maximum 10 parties allowed", false);
    return;
  }

  container.insertAdjacentHTML("beforeend", createPartyBlock(partyBlockCount));
  partyBlockCount++;

  // Attach preview handlers to new block
  const lastBlock = container.lastElementChild;
  const fileInput = lastBlock.querySelector(".party-icon-input");
  const preview = lastBlock.querySelector(".image-preview");

  if (fileInput && preview) {
    fileInput.addEventListener("change", function () {
      const file = this.files?.[0];
      if (file) {
        const url = URL.createObjectURL(file);
        preview.src = url;
        preview.classList.remove("hidden");
      } else {
        preview.src = "";
        preview.classList.add("hidden");
      }
    });
  }
}

function removePartyBlock(index) {
  const block = document.querySelector(`.party-block[data-index="${index}"]`);
  if (block) {
    block.remove();
  }
}

async function postFormData(url, formData) {
  // DO NOT set Content-Type header - browser sets it automatically with boundary for multipart
  const res = await fetch(url, {
    method: "POST",
    body: formData
    // No headers - browser sets Content-Type automatically for FormData
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* ignore */ }
  if (!res.ok) {
    console.error("FormData request failed:", res.status, text);
    throw new Error(json?.message || text || "Request failed");
  }
  return json ?? {};
}

/* Page: Add Party */
function initAddParty() {
  if (!requireAdminAuth()) return;

  const form = $("#addPartyForm");
  const select = $("#partyElectionSelect");
  const container = $("#partyBlocks");
  if (!form || !select || !container) return;

  // Hide error message on load
  hideMsg("addPartyMsg");

  // Load elections
  loadElections(select);

  // Add first party block
  container.innerHTML = createPartyBlock(0);
  partyBlockCount = 1;

  // Attach preview handler to first block
  const firstFileInput = container.querySelector(".party-icon-input");
  const firstPreview = container.querySelector(".image-preview");
  if (firstFileInput && firstPreview) {
    firstFileInput.addEventListener("change", function () {
      const file = this.files?.[0];
      if (file) {
        const url = URL.createObjectURL(file);
        firstPreview.src = url;
        firstPreview.classList.remove("hidden");
      } else {
        firstPreview.src = "";
        firstPreview.classList.add("hidden");
      }
    });
  }

  // Add block button
  const addBtn = $("#addPartyBlockBtn");
  if (addBtn) {
    addBtn.addEventListener("click", addPartyBlock);
  }

  // Make removePartyBlock available globally
  window.removePartyBlock = removePartyBlock;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideMsg("addPartyMsg");

    const election_id = select.value?.trim();

    if (!election_id || election_id === "" || election_id === "0") {
      showMsg("addPartyMsg", "Please select an election", false);
      return;
    }

    const blocks = container.querySelectorAll(".party-block");
    if (blocks.length === 0) {
      showMsg("addPartyMsg", "Please add at least one party", false);
      return;
    }

    const parties = [];
    let hasError = false;

    blocks.forEach((block, idx) => {
      const party_id = block.querySelector(".party-id-input")?.value?.trim() || "";
      const party_name = block.querySelector(".party-name-input")?.value?.trim() || "";
      const iconFile = block.querySelector(".party-icon-input")?.files?.[0];

      if (!party_id || party_id === "" || !party_name || party_name === "") {
        hasError = true;
        return;
      }

      parties.push({
        party_id,
        party_name,
        iconFile
      });
    });

    if (hasError) {
      showMsg("addPartyMsg", "All party fields (ID and Name) are required.", false);
      return;
    }

    // Submit parties one by one
    let successCount = 0;
    let errorMsg = "";

    for (const party of parties) {
      try {
        // Validate before creating FormData
        const trimmedPartyId = party.party_id?.trim() || "";
        const trimmedPartyName = party.party_name?.trim() || "";
        const trimmedElectionId = String(election_id).trim();

        if (!trimmedPartyId || trimmedPartyId === "" || !trimmedPartyName || trimmedPartyName === "" || !trimmedElectionId || trimmedElectionId === "" || trimmedElectionId === "0") {
          errorMsg = "All fields (Party ID, Party Name, Election) are required";
          continue;
        }

        const formData = new FormData();
        // Backend keys: party_id, party_name, election_id, symbol
        formData.append("party_id", trimmedPartyId);
        formData.append("party_name", trimmedPartyName);
        formData.append("election_id", trimmedElectionId);
        if (party.iconFile) {
          formData.append("symbol", party.iconFile);
        }

        // Debug: Log payload (remove in production)
        console.log("Add Party payload:", {
          party_id: trimmedPartyId,
          party_name: trimmedPartyName,
          election_id: trimmedElectionId,
          hasFile: !!party.iconFile
        });

        await postFormData(`${API_BASE}/admin/party/add`, formData);
        successCount++;
      } catch (err) {
        console.error("Add Party error:", err);
        errorMsg = err.message || "Error adding party";
      }
    }

    if (successCount === parties.length) {
      showMsg("addPartyMsg", `All ${successCount} parties added successfully!`, true);
      setTimeout(() => location.href = "admin_dashboard.html", 1500);
    } else if (successCount > 0) {
      showMsg("addPartyMsg", `${successCount} parties added. ${errorMsg}`, false);
    } else {
      showMsg("addPartyMsg", errorMsg || "Failed to add parties", false);
    }
  });
}

/* Helper: Create candidate block HTML */
function createCandidateBlock(index) {
  return `
    <div class="candidate-block" data-index="${index}">
      <div class="block-header">
        <span class="block-title">Candidate ${index + 1}</span>
        <button type="button" class="remove-block" onclick="removeCandidateBlock(${index})">Remove</button>
      </div>
      <div class="grid-2">
        <div class="field">
          <label>Party</label>
          <select class="candidate-party-select" required>
            <option value="">Loading parties...</option>
          </select>
        </div>
        <div class="field">
          <label>Candidate Name</label>
          <input type="text" class="candidate-name-input" placeholder="e.g., John Doe" required />
        </div>
      </div>
      <div class="field">
        <label>Candidate Photo (Optional)</label>
        <input type="file" class="candidate-photo-input" accept="image/*" />
        <div class="image-upload-preview">
          <img class="image-preview hidden" alt="Preview" />
        </div>
      </div>
    </div>
  `;
}

let candidateBlockCount = 1;

function addCandidateBlock() {
  const container = $("#candidateBlocks");
  if (!container) return;

  if (candidateBlockCount >= 10) {
    showMsg("addCandidateMsg", "Maximum 10 candidates allowed", false);
    return;
  }

  container.insertAdjacentHTML("beforeend", createCandidateBlock(candidateBlockCount));
  candidateBlockCount++;

  // Attach preview handlers and load parties for new block
  const lastBlock = container.lastElementChild;
  const fileInput = lastBlock.querySelector(".candidate-photo-input");
  const preview = lastBlock.querySelector(".image-preview");
  const partySelect = lastBlock.querySelector(".candidate-party-select");
  const electionSelect = $("#candidateElectionSelect");

  if (fileInput && preview) {
    fileInput.addEventListener("change", function () {
      const file = this.files?.[0];
      if (file) {
        const url = URL.createObjectURL(file);
        preview.src = url;
        preview.classList.remove("hidden");
      } else {
        preview.src = "";
        preview.classList.add("hidden");
      }
    });
  }

  // Load parties for this block
  if (partySelect && electionSelect && electionSelect.value) {
    loadPartiesForElection(partySelect, parseInt(electionSelect.value));
  }
}

function removeCandidateBlock(index) {
  const block = document.querySelector(`.candidate-block[data-index="${index}"]`);
  if (block) {
    block.remove();
  }
}

// Helper: Load parties for an election into a select element
async function loadPartiesForElection(selectElement, electionId) {
  if (!selectElement || !electionId) return;

  try {
    const res = await fetch(`${API_BASE}/election/details?election_id=${electionId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to load parties");

    const parties = data.data?.parties || [];
    selectElement.innerHTML = '<option value="">Select Party</option>';

    parties.forEach(p => {
      const option = document.createElement("option");
      option.value = p.party_id;
      option.textContent = p.party_name;
      selectElement.appendChild(option);
    });
  } catch (err) {
    selectElement.innerHTML = '<option value="">Error loading parties</option>';
    console.error("Error loading parties:", err);
  }
}

/* Page: Add Candidate */
function initAddCandidate() {
  if (!requireAdminAuth()) return;

  const form = $("#addCandidateForm");
  const select = $("#candidateElectionSelect");
  const container = $("#candidateBlocks");
  if (!form || !select) return;

  // Hide error message on page load
  hideMsg("addCandidateMsg");

  // Load elections
  loadElections(select);

  // Add first candidate block
  if (container) {
    container.innerHTML = createCandidateBlock(0);
    candidateBlockCount = 1;
  }

  // Load parties when election changes
  select.addEventListener("change", () => {
    const electionId = select.value;
    if (!electionId) return;

    // Update all party selects in candidate blocks
    const blocks = container?.querySelectorAll(".candidate-block") || [];
    blocks.forEach(block => {
      const partySelect = block.querySelector(".candidate-party-select");
      if (partySelect) {
        loadPartiesForElection(partySelect, parseInt(electionId));
      }
    });
  });

  // Attach preview handler to first block
  if (container) {
    const firstFileInput = container.querySelector(".candidate-photo-input");
    const firstPreview = container.querySelector(".image-preview");
    if (firstFileInput && firstPreview) {
      firstFileInput.addEventListener("change", function () {
        const file = this.files?.[0];
        if (file) {
          const url = URL.createObjectURL(file);
          firstPreview.src = url;
          firstPreview.classList.remove("hidden");
        } else {
          firstPreview.src = "";
          firstPreview.classList.add("hidden");
        }
      });
    }
  }

  // Add block button
  const addBtn = $("#addCandidateBlockBtn");
  if (addBtn) {
    addBtn.addEventListener("click", addCandidateBlock);
  }

  // Make removeCandidateBlock available globally
  window.removeCandidateBlock = removeCandidateBlock;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideMsg("addCandidateMsg");

    const election_id = select.value?.trim() || "";
    if (!election_id || election_id === "" || election_id === "0") {
      showMsg("addCandidateMsg", "Please select an election", false);
      return;
    }

    const blocks = container?.querySelectorAll(".candidate-block") || [];
    if (blocks.length === 0) {
      showMsg("addCandidateMsg", "Please add at least one candidate", false);
      return;
    }

    const candidates = [];
    let hasError = false;

    blocks.forEach((block, idx) => {
      const party = block.querySelector(".candidate-party-select")?.value?.trim() || "";
      const name = block.querySelector(".candidate-name-input")?.value?.trim() || "";
      const photoFile = block.querySelector(".candidate-photo-input")?.files?.[0];

      if (!party || party === "" || !name || name === "") {
        hasError = true;
        return;
      }

      candidates.push({
        party,
        name,
        photoFile
      });
    });

    if (hasError) {
      showMsg("addCandidateMsg", "All candidate fields (Party and Name) are required.", false);
      return;
    }

    // Submit candidates one by one
    let successCount = 0;
    let errorMsg = "";

    for (const candidate of candidates) {
      try {
        // Validate before creating FormData
        if (!candidate.party || candidate.party === "" || !candidate.name || candidate.name === "" || !election_id || election_id === "") {
          errorMsg = "All fields (Party, Name, Election) are required";
          continue;
        }
        const formData = new FormData();
        // Backend keys: election_id, party, name, photo
        formData.append("election_id", String(election_id).trim());
        formData.append("party", candidate.party.trim());
        formData.append("name", candidate.name.trim());
        if (candidate.photoFile) {
          formData.append("photo", candidate.photoFile);
        }

        await postFormData(`${API_BASE}/admin/candidate/add`, formData);
        successCount++;
      } catch (err) {
        console.error(err);
        errorMsg = err.message || "Error adding candidate";
      }
    }

    if (successCount === candidates.length) {
      showMsg("addCandidateMsg", `All ${successCount} candidates added successfully!`, true);
      setTimeout(() => location.href = "admin_dashboard.html", 1500);
    } else if (successCount > 0) {
      showMsg("addCandidateMsg", `${successCount} candidates added. ${errorMsg}`, false);
    } else {
      showMsg("addCandidateMsg", errorMsg || "Failed to add candidates", false);
    }
  });
}

/* Page: Reset Election */
function initResetElection() {
  if (!requireAdminAuth()) return;

  const form = $("#resetElectionForm");
  const select = $("#resetElectionSelect");
  if (!form || !select) return;

  // Hide error message on page load
  hideMsg("resetElectionMsg");

  // Load elections
  loadElections(select);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideMsg("resetElectionMsg");
    const election_id = select.value?.trim() || "";

    if (!election_id) {
      showMsg("resetElectionMsg", "Please select an election", false);
      return;
    }

    if (!confirm("⚠️ Are you sure? This will delete all votes for this election!")) {
      return;
    }

    try {
      const res = await postJSON(`${API_BASE}/admin/election/reset`, { election_id: parseInt(election_id) });
      showMsg("resetElectionMsg", "Election reset successfully!", true);
      setTimeout(() => location.href = "admin_dashboard.html", 1000);
    } catch (err) {
      showMsg("resetElectionMsg", err.message || "Failed to reset election", false);
    }
  });
}

/* Page: Manage Elections */
function initManageElections() {
  if (!requireAdminAuth()) return;

  hideMsg("manageElectionsMsg");
  loadElectionsTable();

  // Search functionality
  const searchInput = $("#searchElections");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      filterElectionsTable(e.target.value);
    });
  }

  // Edit form submission
  const editForm = $("#editElectionForm");
  if (editForm) {
    editForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideMsg("editElectionMsg");

      const election_id = parseInt($("#editElectionId").value);
      const name = $("#editElectionName").value?.trim() || "";

      if (!name) {
        showMsg("editElectionMsg", "Election name is required", false);
        return;
      }

      try {
        const token = localStorage.getItem("admin_token");
        const res = await fetch(`${API_BASE}/admin/elections/${election_id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ name })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Failed to update election");

        showMsg("editElectionMsg", "Election updated successfully!", true);
        closeEditModal();
        loadElectionsTable();
      } catch (err) {
        showMsg("editElectionMsg", err.message || "Failed to update election", false);
      }
    });
  }
}

let allElectionsData = [];

async function loadElectionsTable() {
  const tbody = $("#electionsTableBody");
  if (!tbody) return;

  // Show loading state
  tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; color: #64748b;">Loading elections...</td></tr>';

  try {
    const token = localStorage.getItem("admin_token");
    const res = await fetch(`${API_BASE}/admin/elections`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (!res.ok) {
      const errorText = await res.text();
      let errorMsg = "Failed to load elections";
      try {
        const errorData = JSON.parse(errorText);
        errorMsg = errorData.message || errorMsg;
      } catch { }
      throw new Error(errorMsg);
    }

    const data = await res.json();
    allElectionsData = data.data || [];
    renderElectionsTable(allElectionsData);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #ef4444;">Error: ${err.message}</td></tr>`;
    console.error("Error loading elections:", err);
    showMsg("manageElectionsMsg", `Failed to load elections: ${err.message}`, false);
  }
}

function renderElectionsTable(elections) {
  const tbody = $("#electionsTableBody");
  if (!tbody) return;

  if (elections.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; color: #64748b;">No elections found</td></tr>';
    return;
  }

  tbody.innerHTML = elections.map(election => {
    const formatDate = (dateStr) => {
      if (!dateStr) return "-";
      try {
        return new Date(dateStr).toLocaleString();
      } catch {
        return dateStr;
      }
    };

    const statusClass = `status-${election.status || "CREATED"}`;
    const canEdit = election.status !== "RUNNING";

    return `
      <tr>
        <td>${election.id}</td>
        <td>${election.name || "-"}</td>
        <td><span class="status-badge ${statusClass}">${election.status || "CREATED"}</span></td>
        <td>${formatDate(election.created_at)}</td>
        <td>${formatDate(election.started_at)}</td>
        <td>${formatDate(election.ended_at)}</td>
        <td>${election.party_count || 0}</td>
        <td>${election.candidate_count || 0}</td>
        <td>${election.vote_count || 0}</td>
        <td>
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <button class="btn btn-primary" style="padding: 4px 8px; font-size: 11px;" 
                    onclick="viewRoster(${election.id}, '${(election.name || "").replace(/'/g, "\\'")}')">
              Details
            </button>
            <button class="btn btn-ghost" style="padding: 4px 8px; font-size: 11px;" 
                    onclick="openEditModal(${election.id}, '${(election.name || "").replace(/'/g, "\\'")}')"
                    ${!canEdit ? "disabled title='Cannot edit RUNNING elections'" : ""}>
              Rename
            </button>
            <button class="btn btn-ghost" style="padding: 4px 8px; font-size: 11px; color: #ef4444; border-color: #ef4444;" 
            <button class="btn btn-ghost" style="padding: 4px 8px; font-size: 11px; color: #ef4444; border-color: #ef4444;" 
                    onclick="deleteElection(${election.id}, '${(election.name || "").replace(/'/g, "\\'")}', ${election.vote_count})">
              Delete
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

async function viewRoster(electionId, electionName) {
  // We'll use a modal to show details
  const modal = $("#rosterModal");
  if (!modal) {
    // If modal doesn't exist, create it dynamically
    const modalHtml = `
      <div id="rosterModal" class="modal" style="display: none;">
        <div class="modal-content" style="max-width: 800px;">
          <div class="modal-header">
            <h3>Roster: <span id="rosterElectionName"></span></h3>
            <button class="modal-close" onclick="closeRosterModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div id="rosterMsg" class="alert" hidden></div>
            <div class="grid-2">
              <div>
                <h4>Parties</h4>
                <div id="rosterParties"></div>
              </div>
              <div>
                <h4>Candidates</h4>
                <div id="rosterCandidates"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", modalHtml);
  }

  $("#rosterElectionName").textContent = electionName;
  $("#rosterModal").style.display = "flex";
  hideMsg("rosterMsg");
  loadRosterData(electionId);
}

window.closeRosterModal = () => {
  $("#rosterModal").style.display = "none";
};

async function loadRosterData(electionId) {
  $("#rosterParties").innerHTML = "Loading...";
  $("#rosterCandidates").innerHTML = "Loading...";

  try {
    const res = await fetch(`${API_BASE}/election/details?election_id=${electionId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to load roster");

    const { parties, candidates } = data.data;

    $("#rosterParties").innerHTML = parties.map(p => `
      <div class="list-item" style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #eee;">
        <span><strong>${p.party_id}:</strong> ${p.party_name}</span>
        <button class="btn btn-ghost" onclick="deleteParty(${p.id || 0}, '${p.party_name}', ${electionId})" 
                style="padding: 2px 6px; font-size: 10px; color: #ef4444; border-color: #ef4444;">Delete</button>
      </div>
    `).join("") || "No parties";

    $("#rosterCandidates").innerHTML = candidates.map(c => `
      <div class="list-item" style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #eee;">
        <span>${c.name} (${c.party})</span>
        <button class="btn btn-ghost" onclick="deleteCandidate(${c.id}, '${c.name}', ${electionId})" 
                style="padding: 2px 6px; font-size: 10px; color: #ef4444; border-color: #ef4444;">Delete</button>
      </div>
    `).join("") || "No candidates";

  } catch (err) {
    showMsg("rosterMsg", err.message, false);
  }
}

async function deleteParty(id, name, electionId) {
  if (!confirm(`Delete party "${name}"?`)) return;
  try {
    const token = localStorage.getItem("admin_token");
    const res = await fetch(`${API_BASE}/admin/party/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to delete party");
    showMsg("rosterMsg", "Party removed", true);
    loadRosterData(electionId);
    loadElectionsTable(); // Update counts in main table
  } catch (err) {
    showMsg("rosterMsg", err.message, false);
  }
}

async function deleteCandidate(id, name, electionId) {
  if (!confirm(`Delete candidate "${name}"?`)) return;
  try {
    const token = localStorage.getItem("admin_token");
    const res = await fetch(`${API_BASE}/admin/candidate/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to delete candidate");
    showMsg("rosterMsg", "Candidate removed", true);
    loadRosterData(electionId);
    loadElectionsTable();
  } catch (err) {
    showMsg("rosterMsg", err.message, false);
  }
}

window.viewRoster = viewRoster;
window.deleteParty = deleteParty;
window.deleteCandidate = deleteCandidate;

function filterElectionsTable(searchTerm) {
  const filtered = allElectionsData.filter(election => {
    const name = (election.name || "").toLowerCase();
    const search = searchTerm.toLowerCase();
    return name.includes(search);
  });
  renderElectionsTable(filtered);
}

function openEditModal(election_id, name) {
  $("#editElectionId").value = election_id;
  $("#editElectionName").value = name;
  $("#editElectionModal").style.display = "flex";
  hideMsg("editElectionMsg");
}

function closeEditModal() {
  $("#editElectionModal").style.display = "none";
  $("#editElectionForm").reset();
  hideMsg("editElectionMsg");
}

async function deleteElection(election_id, election_name, vote_count) {
  if (vote_count > 0) {
    alert(`Cannot delete "${election_name}" because it already has ${vote_count} votes. You must reset the election first if you want to remove it.`);
    return;
  }

  if (!confirm(`⚠️ Are you sure you want to delete "${election_name}"?\n\nThis will permanently delete the election and all associated data.\n\nThis action cannot be undone!`)) {
    return;
  }

  hideMsg("manageElectionsMsg");

  try {
    const token = localStorage.getItem("admin_token");
    const res = await fetch(`${API_BASE}/admin/elections/${election_id}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to delete election");

    showMsg("manageElectionsMsg", "Election deleted successfully!", true);
    loadElectionsTable();
  } catch (err) {
    showMsg("manageElectionsMsg", err.message || "Failed to delete election", false);
    console.error("Error deleting election:", err);
  }
}

// Make functions globally available
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.deleteElection = deleteElection;

/* Page: Change Credentials */
function initChangeCredentials() {
  if (!requireAdminAuth()) return;

  const form = $("#changeCredentialsForm");
  if (!form) return;

  // Hide error message on page load
  hideMsg("changeCredentialsMsg");

  const admin_id = localStorage.getItem("admin_id");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideMsg("changeCredentialsMsg");
    const old_password = $("#oldPassword")?.value || "";
    const new_password = $("#newPassword")?.value || "";
    const confirm_password = $("#confirmPassword")?.value || "";

    if (!old_password || !new_password || !confirm_password) {
      showMsg("changeCredentialsMsg", "All fields are required", false);
      return;
    }

    if (new_password !== confirm_password) {
      showMsg("changeCredentialsMsg", "New passwords do not match", false);
      return;
    }

    try {
      const res = await postJSON(`${API_BASE}/admin/change-credentials`, {
        admin_id,
        old_password,
        new_password
      });
      showMsg("changeCredentialsMsg", "Password changed successfully! Please login again.", true);
      setTimeout(() => {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_id");
        location.href = "admin_login.html";
      }, 1500);
    } catch (err) {
      showMsg("changeCredentialsMsg", err.message || "Failed to change password", false);
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setActiveNav();
  initVoterLogin();
  initRegister();
  initVote();
  initResults();
  initAdminLogin();
  initAdminDashboard();
  initCreateElection();
  initStartElection();
  initStopElection();
  initAddParty();
  initAddCandidate();
  initResetElection();
  initChangeCredentials();
  initManageElections();
});
