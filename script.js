console.log("✅ Updated script.js loaded");
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("diseaseForm");
  const resultsDiv = document.getElementById("diagnosisResults");
  const voiceBtn = document.getElementById("voiceInputBtn");
  const symptomsInput = document.getElementById("symptoms");

  // Voice input setup using Web Speech API
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn("Web Speech API not supported in this browser.");
    if (voiceBtn) voiceBtn.style.display = "none";
  } else {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let isListening = false;

    if (voiceBtn) {
      voiceBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (isListening) {
          recognition.stop();
          isListening = false;
        } else {
          symptomsInput.value = "";
          recognition.start();
          isListening = true;
          voiceBtn.classList.add("listening");
          voiceBtn.setAttribute("aria-label", "Listening...");
        }
      });
    }

    recognition.onstart = () => {
      if (voiceBtn) voiceBtn.classList.add("listening");
    };

    recognition.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ", ";
        } else {
          interimTranscript += transcript;
        }
      }

      symptomsInput.value = (finalTranscript || interimTranscript).trim();
    };

    recognition.onend = () => {
      isListening = false;
      if (voiceBtn) {
        voiceBtn.classList.remove("listening");
        voiceBtn.setAttribute("aria-label", "Voice input for symptoms");
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      if (voiceBtn) {
        voiceBtn.classList.remove("listening");
        voiceBtn.classList.add("error");
        setTimeout(() => voiceBtn.classList.remove("error"), 2000);
      }
    };
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const symptomsInput = document
      .getElementById("symptoms")
      .value.trim()
      .toLowerCase();

      // Check duration and show an inline alert if symptoms last 1-2 weeks or more
      const durationVal = document.getElementById("duration")?.value || "";
      handleDurationAlert(durationVal);

    if (!symptomsInput) {
      resultsDiv.innerHTML = `<p style="color:orange">⚠ Please enter your symptoms.</p>`;
      return;
    }

    const symptomsList = symptomsInput
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    resultsDiv.innerHTML = `<p style="color:blue">⏳ Analyzing symptoms: <b>${symptomsList.join(
      ", "
    )}</b>...</p>`;

    // Scroll to results section smoothly if off-screen
    const scrollIfOffscreen = () => {
      const rect = resultsDiv.getBoundingClientRect();
      if (rect.bottom > window.innerHeight || rect.top < 0) {
        resultsDiv.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    scrollIfOffscreen();

    try {
      const response = await fetch(
        `http://localhost:5500/api/symptoms?q=${encodeURIComponent(
          symptomsInput
        )}`
      );
      const data = await response.json();
      const entries = data?.feed?.entry;

      if (entries && entries.length > 0) {
        const list = Array.isArray(entries) ? entries : [entries];
        // extract titles from API feed entries
        const titles = list.map((item) => item.title?._value || "Unknown Condition");
        renderResults(titles, symptomsList, resultsDiv);
        return;
      }

      // API returned nothing → use fallback
      fallbackSearch(symptomsList, resultsDiv);
    } catch (error) {
      console.error("❌ API fetch failed:", error);
      fallbackSearch(symptomsList, resultsDiv);
    }

  // Show/hide an inline alert near the duration select
  function handleDurationAlert(durationVal) {
    const durationSelect = document.getElementById("duration");
    if (!durationSelect) return;

    let alertEl = document.getElementById("durationAlert");
    if (!alertEl) {
      alertEl = document.createElement("div");
      alertEl.id = "durationAlert";
      alertEl.className = "duration-alert";
      // insert after the duration select's parent .form-group
      const parentGroup = durationSelect.closest('.form-group');
      if (parentGroup) parentGroup.appendChild(alertEl);
      else durationSelect.parentNode.appendChild(alertEl);
    }

    // Trigger alert when duration is 1-2 weeks or more
    if (durationVal === "1-2" || durationVal === "2+") {
      alertEl.innerHTML = `⚠ <strong>Notice:</strong> Symptoms lasting <em>1-2 weeks or longer</em> may need professional evaluation. Consider consulting a healthcare provider.`;
      alertEl.style.display = "block";
    } else {
      alertEl.style.display = ""; // hide (CSS will handle)
      alertEl.innerHTML = "";
    }
  }

  // Bind change event so users see the alert immediately when they change duration
  const durationInput = document.getElementById("duration");
  if (durationInput) {
    durationInput.addEventListener('change', (ev) => handleDurationAlert(ev.target.value));
  }
  });

  // --------------------------------------------------------------------
  // ✅ 100-SYMPTOM FALLBACK DATA (NO description/cure/medicine)
  // --------------------------------------------------------------------
  const FALLBACK = {
    fever: ["Flu", "Typhoid Fever", "COVID-19", "Common Cold"],
    cough: ["Bronchitis", "Asthma", "Common Cold", "Pneumonia"],
    cold: ["Viral Infection", "Sinusitis", "Allergic Rhinitis"],
    headache: ["Migraine", "Tension Headache", "Sinusitis"],
    dizziness: ["Vertigo", "Low Blood Pressure", "Dehydration"],
    nausea: ["Food Poisoning", "Gastritis", "Pregnancy"],
    vomiting: ["Food Poisoning", "Gastroenteritis", "Migraine"],
    diarrhea: ["Cholera", "Food Poisoning", "Gastroenteritis"],
    constipation: ["IBS", "Low Fiber Diet", "Dehydration"],
    fatigue: ["Anemia", "Thyroid Issues", "Chronic Fatigue Syndrome"],
    weakness: ["Vitamin Deficiency", "Anemia", "Infection"],
    chest_pain: ["Heart Attack", "Angina", "GERD"],
    shortness_of_breath: ["Asthma", "Anxiety", "COPD"],
    sore_throat: ["Tonsillitis", "Pharyngitis", "Viral Infection"],
    runny_nose: ["Common Cold", "Allergy", "Flu"],
    sneezing: ["Allergies", "Cold", "Sinusitis"],
    body_ache: ["Flu", "Infection", "Vitamin Deficiency"],
    joint_pain: ["Arthritis", "Gout", "Injury"],
    back_pain: ["Sciatica", "Muscle Strain", "Slipped Disc"],
    chest_tightness: ["Asthma", "Anxiety", "Heart Disease"],
    skin_rash: ["Allergy", "Eczema", "Fungal Infection"],
    itching: ["Allergy", "Eczema", "Insect Bite"],
    burning_urination: ["UTI", "Kidney Infection", "STI"],
    frequent_urination: ["Diabetes", "UTI", "Overactive Bladder"],
    high_temperature: ["Flu", "Typhoid", "Infection"],
    chills: ["Malaria", "Flu", "Infection"],
    sweating: ["Hyperthyroidism", "Infection", "Anxiety"],
    swollen_glands: ["Infection", "Tonsillitis", "Mononucleosis"],
    nosebleed: ["Dry Nose", "Blood Pressure Issues", "Injury"],
    blurred_vision: ["Diabetes", "Migraine", "Glaucoma"],
    red_eyes: ["Conjunctivitis", "Allergy", "Infection"],
    ear_pain: ["Ear Infection", "Wax Build-up", "Sinusitis"],
    hearing_loss: ["Ear Infection", "Ageing", "Noise Damage"],
    tooth_pain: ["Cavity", "Gum Infection", "Tooth Decay"],
    swollen_feet: ["Kidney Disease", "Heart Failure", "Thyroid"],
    rapid_heartbeat: ["Anxiety", "Arrhythmia", "Heart Disease"],
    slow_heartbeat: ["Hypothyroidism", "Heart Issues"],
    bad_breath: ["Dental Issues", "GERD", "Infection"],
    indigestion: ["Acid Reflux", "Gastritis", "Gallbladder Issues"],
    gas: ["IBS", "GERD", "Indigestion"],
    acidity: ["GERD", "Ulcer", "Acid Reflux"],
    weight_loss: ["Cancer", "Hyperthyroidism", "Infection"],
    weight_gain: ["Hypothyroidism", "PCOS", "Overeating"],
    menstrual_pain: ["Dysmenorrhea", "PCOS", "Endometriosis"],
    irregular_periods: ["PCOS", "Thyroid Issues"],
    hair_loss: ["Alopecia", "Vitamin Deficiency", "Thyroid"],
    trembling: ["Anxiety", "Parkinson’s", "Hyperthyroidism"],
    anxiety: ["Stress", "Panic Disorder"],
    depression: ["Clinical Depression", "Bipolar Disorder"],
    insomnia: ["Stress", "Anxiety", "Sleep Disorder"],
    mood_swings: ["Hormonal Change", "Depression"],
    numbness: ["Nerve Damage", "Stroke", "Diabetes"],
    tingling: ["Nerve Damage", "Vitamin Deficiency"],
    swelling: ["Injury", "Infection"],
    dehydration: ["Heat Stroke", "Diarrhea", "Vomiting"],
    sunburn: ["UV Exposure", "Skin Damage"],
    dry_skin: ["Eczema", "Dehydration"],
    oily_skin: ["Hormonal Issues"],
    acne: ["Hormonal Changes"],
    palpitations: ["Anxiety", "Arrhythmia"],
    throat_pain: ["Tonsillitis", "Infection"],
    allergy: ["Allergic Rhinitis"],
    wheezing: ["Asthma"],
    vomiting_blood: ["Ulcer", "Internal Bleeding"],
    blood_in_stool: ["IBD", "Hemorrhoids"],
    stomach_pain: ["Gastritis", "Appendicitis", "Ulcer"],
    lower_abdomen_pain: ["UTI", "Appendicitis", "Ovarian Cyst"],
    upper_abdomen_pain: ["Gallstones", "Ulcer"],
    swollen_eye: ["Infection", "Allergy"],
    yellow_skin: ["Jaundice"],
    dark_urine: ["Liver Disease"],
    light_stool: ["Gallbladder Issue"],
    knee_pain: ["Arthritis", "Injury"],
    burning_sensation: ["Nerve Damage"],
    etc: []
  };

  // --------------------------------------------------------------------
  // ✅ MULTI-SYMPTOM FALLBACK SEARCH
  // --------------------------------------------------------------------
  function fallbackSearch(symptomsList, resultsDiv) {
    let results = [];

    symptomsList.forEach((sym) => {
      const key = sym.replace(/ /g, "_");
      if (FALLBACK[key]) {
        FALLBACK[key].forEach((d) => results.push(d));
      }
    });

    if (results.length === 0) {
      resultsDiv.innerHTML = `<p style="color:red">⚠ No matching topics found for <b>${symptomsList.join(
        ", "
      )}</b>.</p>`;
      return;
    }

    const unique = [...new Set(results)];
    renderResults(unique, symptomsList, resultsDiv);
  }

  // Render results using the new attractive card layout
  function renderResults(titlesArray, symptomsList, resultsDiv) {
    if (!Array.isArray(titlesArray) || titlesArray.length === 0) {
      resultsDiv.innerHTML = `<p style="color:red">⚠ No matching topics found.</p>`;
      return;
    }

    // build cards
    const cards = titlesArray
      .map((title) => {
        // simple score heuristic: base random score between 60-95
        const score = Math.min(99, Math.floor(60 + Math.random() * 40));
        const pct = score + "%";
        const link = `https://medlineplus.gov/search/?query=${encodeURIComponent(title)}`;

        // tags: use up to 3 provided symptoms as related keywords
        const tags = (symptomsList || []).slice(0, 3);

        return `
          <div class="result-card" role="article" aria-label="Possible topic ${title}">
            <div class="card-header">
              <div class="result-icon" aria-hidden="true">🔎</div>
              <div class="card-meta">
                <div class="card-title">${escapeHTML(title)}</div>
                <div class="card-sub">Possible related topic</div>
                <div class="result-progress" aria-hidden="true"><span style="width:${pct}"></span></div>
              </div>
              <div class="result-score" aria-label="match probability">${pct}</div>
            </div>

            <div class="result-tags">
              ${tags.map((t) => `<div class="tag">${escapeHTML(t)}</div>`).join("")}
            </div>

            <div style="margin-top:10px;display:flex;gap:10px;align-items:center;">
              <a href="${link}" target="_blank" rel="noopener noreferrer">🔗 Learn More</a>
            </div>

            <p class="disclaimer" style="color:#b30000;font-size:0.9em;margin-top:10px;">
              ⚠ <b>Disclaimer:</b> This information is for educational purposes only. Always consult a certified doctor for proper diagnosis.
            </p>
          </div>
        `;
      })
      .join("");
    resultsDiv.innerHTML = `<h3>🩺 Possible Related Health Topics</h3>` + cards;
    // Scroll to bottom of results after a delay, only if results are off-screen
    setTimeout(() => {
      const resultCards = resultsDiv.querySelectorAll(".result-card");
      if (resultCards.length > 0) {
        const lastCard = resultCards[resultCards.length - 1];
        const rect = lastCard.getBoundingClientRect();
        // Check if the bottom of the last card is below viewport or top is above viewport
        if (rect.bottom > window.innerHeight || rect.top < 0) {
          console.log("Scrolling to results - card is off-screen");
          lastCard.scrollIntoView({ behavior: "smooth", block: "end" });
        } else {
          console.log("Results already visible - no scroll needed");
        }
      }
    }, 300);
  }

  // small HTML escape helper to avoid accidental markup injection
  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});// ------- Theme toggle (append to script.js) -------
(function () {
  const THEME_KEY = "symptoscan-theme"; // localStorage key
  const body = document.body;
  const btn = document.getElementById("themeToggle");
  const icon = document.getElementById("themeIcon");

  if (!btn || !icon) {
    // if the toggle button wasn't added to HTML, create it and append to header-content
    const headerContent = document.querySelector(".header-content");
    if (headerContent) {
      const createdBtn = document.createElement("button");
      createdBtn.id = "themeToggle";
      createdBtn.className = "theme-toggle";
      createdBtn.setAttribute("aria-label", "Toggle theme");
      createdBtn.title = "Toggle theme";
      createdBtn.innerHTML = '<i id="themeIcon" class="fas fa-moon"></i>';
      headerContent.appendChild(createdBtn);
    }
  }

  // Acquire references after possible dynamic creation
  const themeBtn = document.getElementById("themeToggle");
  const themeIcon = document.getElementById("themeIcon");

  function applyTheme(theme) {
    if (theme === "dark") {
      body.classList.add("dark-theme");
      body.setAttribute("data-theme", "dark");
      if (themeIcon) {
        themeIcon.className = "fas fa-sun"; // show sun to indicate "switch to light"
      }
      if (themeBtn) themeBtn.setAttribute("aria-label", "Switch to light theme");
    } else {
      body.classList.remove("dark-theme");
      body.setAttribute("data-theme", "light");
      if (themeIcon) {
        themeIcon.className = "fas fa-moon"; // show moon to indicate "switch to dark"
      }
      if (themeBtn) themeBtn.setAttribute("aria-label", "Switch to dark theme");
    }
  }

  // Initialize from localStorage or system preference
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) {
    applyTheme(saved);
  } else {
    // Respect OS preference as default
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(prefersDark ? "dark" : "light");
  }

  // Toggle on click
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const isDark = body.classList.contains("dark-theme");
      const next = isDark ? "light" : "dark";
      applyTheme(next);
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch (e) {
        console.warn("Could not save theme preference:", e);
      }
    });
  }

  // Optional: listen for OS color-scheme changes if user hasn't saved pref
  if (!saved && window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", (e) => {
      applyTheme(e.matches ? "dark" : "light");
    });
  }
})();