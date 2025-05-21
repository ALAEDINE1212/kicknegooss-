// 1) Imports (Firebase v9+)
import { initializeApp }           from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAnalytics }            from "https://www.gstatic.com/firebasejs/9.22.1/firebase-analytics.js";
import { getDatabase, ref, get, update }
                                  from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";

// 2) Firebase config
const firebaseConfig = {
  apiKey:             "AIzaSyD0vilgJtiLB06OrJq1iv3A6NXbEan6j_Y",
  authDomain:         "kicknegooss.firebaseapp.com",
  databaseURL:        "https://kicknegooss-default-rtdb.firebaseio.com",
  projectId:          "kicknegooss",
  storageBucket:      "kicknegooss.firebasestorage.app",
  messagingSenderId:  "98787276236",
  appId:              "1:98787276236:web:9b1c35170b38ac35eb1969",
  measurementId:      "G-M7PFB14YTV"
};

// 3) Initialize Firebase & DB
const app       = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db        = getDatabase(app);

// 4) App state
let currentUser   = null;
let currentWorkId = null;

// 5) Element refs
const loginScreen        = document.getElementById("login-screen");
const dashboard          = document.getElementById("dashboard");
const workListView       = document.getElementById("work-list-view");
const workListTitle      = document.getElementById("work-list-title");
const worksList          = document.getElementById("works-list");
const sectionListView    = document.getElementById("section-list-view");
const sectionListTitle   = document.getElementById("section-list-title");
const sectionCards       = document.getElementById("section-cards");
const sectionDetailView  = document.getElementById("section-detail-view");
const sectionDetailTitle = document.getElementById("section-detail-title");
const sectionDetailContent = document.getElementById("section-detail-content");
const welcomeEl          = document.getElementById("welcome");
const loginError         = document.getElementById("login-error");

// 6) Auto-login if remembered
(async function() {
  const email = localStorage.getItem("userEmail");
  if (email) {
    const snap = await get(ref(db, `users/${sanitizeKey(email)}`));
    const user = snap.exists() ? snap.val() : null;
    if (user) {
      currentUser = user;
      loginScreen.classList.add("hidden");
      dashboard.classList.remove("hidden");
      welcomeEl.textContent = `Hello, ${user.role === "admin" ? "Administrator" : email}`;
      loadWorkList();
    } else {
      localStorage.removeItem("userEmail");
    }
  }
})();

// 7) Log In
document.getElementById("login-btn").addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const pw    = document.getElementById("password").value.trim();
  loginError.classList.add("hidden");

  const snap = await get(ref(db, `users/${sanitizeKey(email)}`));
  const user = snap.exists() ? snap.val() : null;
  if (!user || user.password !== pw) {
    loginError.textContent = "Invalid credentials";
    return loginError.classList.remove("hidden");
  }

  localStorage.setItem("userEmail", email);
  currentUser = user;
  loginScreen.classList.add("hidden");
  dashboard.classList.remove("hidden");
  welcomeEl.textContent = `Hello, ${user.role === "admin" ? "Administrator" : email}`;
  loadWorkList();
});

// 8) Log Out
document.getElementById("logout-btn").addEventListener("click", () => {
  localStorage.removeItem("userEmail");
  dashboard.classList.add("hidden");
  loginScreen.classList.remove("hidden");
  workListView.classList.add("hidden");
  sectionListView.classList.add("hidden");
  sectionDetailView.classList.add("hidden");
});

// 9) Load Work List
async function loadWorkList() {
  sectionListView.classList.add("hidden");
  sectionDetailView.classList.add("hidden");
  workListView.classList.remove("hidden");
  worksList.innerHTML = "";

  if (currentUser.role === "admin") {
    workListTitle.textContent = "Select a Work";
    const snap = await get(ref(db, "works"));
    if (snap.exists()) {
      Object.keys(snap.val()).forEach(id => worksList.append(cardForWork(id)));
    }
  } else {
    workListTitle.textContent = "Your Work";
    worksList.append(cardForWork(currentUser.assignedWork));
  }

  document.querySelectorAll("[data-work]").forEach(el => {
    el.onclick = () => loadSectionList(el.dataset.work);
  });
}

// 10) Work card renderer
function cardForWork(id) {
  const el = document.createElement("div");
  el.dataset.work = id;
  el.className = "card cursor-pointer";
  el.innerHTML = `<h3 class="text-lg font-bold text-blue-800">Work #${id}</h3>`;
  return el;
}

// 11) Load Section List
async function loadSectionList(workId) {
  currentWorkId = workId;
  workListView.classList.add("hidden");
  sectionDetailView.classList.add("hidden");
  sectionListView.classList.remove("hidden");
  sectionCards.innerHTML = "";

  sectionListTitle.textContent = `Sections for Work #${workId}`;
  ["pv","bt","conge"].forEach(sec => {
    const card = document.createElement("div");
    card.dataset.sec = sec;
    card.className = "bg-white border border-gray-200 rounded-lg p-4 shadow hover:shadow-lg transition cursor-pointer";
    card.innerHTML = `<h4 class="font-semibold text-gray-800">${sec.toUpperCase()}</h4>`;
    card.onclick = () => loadSectionDetail(sec);
    sectionCards.append(card);
  });

  document.getElementById("back-to-works").onclick = () => {
    sectionListView.classList.add("hidden");
    loadWorkList();
  };
}

// 12) Load Section Detail (Tasks + delete)
async function loadSectionDetail(secKey) {
  sectionListView.classList.add("hidden");
  sectionDetailView.classList.remove("hidden");

  sectionDetailTitle.textContent = `${secKey.toUpperCase()} • Work #${currentWorkId}`;
  const snap = await get(ref(db, `works/${currentWorkId}`));
  const data = snap.val()[secKey] || {};
  const tasks = data.tasks || [];
  const isAdmin = currentUser.role === "admin";

  sectionDetailContent.innerHTML = `
    <div class="mb-4 ${isAdmin ? "" : "hidden"}">
      <div class="flex">
        <input id="new-task-text" type="text" placeholder="New task" class="input flex-1 mr-2" />
        <button id="add-task-btn" class="btn">Add Task</button>
      </div>
    </div>
    <ul id="tasks-list" class="list-disc pl-5 text-gray-800"></ul>
  `;

  const ul = document.getElementById("tasks-list");
  function renderTasks() {
    ul.innerHTML = "";
    tasks.forEach((t,i) => {
      const li = document.createElement("li");
      li.className = "mb-2 flex items-center";
      li.innerHTML = `
        <input type="checkbox" id="task-${i}" class="mr-2" ${t.done?"checked":""}/>
        <label for="task-${i}" class="${t.done?"line-through text-gray-400":""}">${t.text}</label>
      `;
      li.querySelector("input").onchange = async e => {
        tasks[i].done = e.target.checked;
        await update(ref(db, `works/${currentWorkId}/${secKey}`), { tasks });
        renderTasks();
      };
      if (isAdmin) {
        const btn = document.createElement("button");
        btn.innerHTML = "🗑️";
        btn.className = "ml-3 text-red-600 hover:text-red-800";
        btn.onclick = async () => {
          tasks.splice(i,1);
          await update(ref(db, `works/${currentWorkId}/${secKey}`), { tasks });
          renderTasks();
        };
        li.appendChild(btn);
      }
      ul.appendChild(li);
    });
  }
  renderTasks();

  if (isAdmin) {
    document.getElementById("add-task-btn").onclick = async () => {
      const text = document.getElementById("new-task-text").value.trim();
      if (!text) return;
      tasks.push({ text, done: false });
      await update(ref(db, `works/${currentWorkId}/${secKey}`), { tasks });
      renderTasks();
    };
  }

  document.getElementById("back-to-sections").onclick = () => {
    sectionDetailView.classList.add("hidden");
    loadSectionList(currentWorkId);
  };
}

// 13) Helper to sanitize email for DB key
function sanitizeKey(email) {
  return email.replace(/[@.#$\[\]]/g, "_");
}

// 14) Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js');
  });
}
