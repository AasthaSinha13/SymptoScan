const express = require("express");
const cors = require("cors");
let fetchFn = global.fetch;
if (!fetchFn) {
  fetchFn = (...args) => import('node-fetch').then(mod => mod.default(...args));
}
const app = express();
app.use(cors());
app.use(express.json());
// ✅ 100-SYMPTOM FALLBACK DATA
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
  burning_sensation: ["Nerve Damage"]
};
// API Endpoint
app.get("/api/symptoms", async (req, res) => {
  const userInput = req.query.q;
  if (!userInput) {
    return res.status(400).json({ error: "No symptoms provided." });
  }
  console.log("➡ User Input:", userInput);
  try {
    const apiURL = `https://wsearch.nlm.nih.gov/ws/query?db=healthTopics&term=${encodeURIComponent(
      userInput
    )}`;
    const response = await fetchFn(apiURL);
    const data = await response.text();
    if (!data) throw new Error("Empty API response");
    const txt = data.trim();
    if (txt.startsWith('<')) {
      // crude but effective extraction of <title>...</title> values
      const matches = [...txt.matchAll(/<title[^>]*>([^<]+)<\/title>/gi)].map(m => m[1].trim()).filter(Boolean);
      // first <title> is usually the feed title — return the remaining as entries
      const entries = matches.slice(1).map(t => ({ title: { _value: t } }));
      return res.json({ feed: { entry: entries } });
    }
    // otherwise try to parse JSON
    try {
      return res.json(JSON.parse(txt));
    } catch (e) {
      // if parsing fails, return raw text wrapped
      return res.send({ raw: txt });
    }
  } catch (err) {
    console.log("❌ API FAILED → Using FALLBACK");
    return res.json({ fallback: getFallbackResults(userInput) });
  }
});
function getFallbackResults(input) {
  const symptomsArray = input
    .split(",")
    .map((s) => s.trim().toLowerCase().replace(/ /g, "_"));
  let results = [];
  symptomsArray.forEach((sym) => {
    if (FALLBACK[sym]) {
      results.push(...FALLBACK[sym]);
    }
  });
  if (results.length === 0) {
    const rawTerms = input
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.toLowerCase());
    Object.values(FALLBACK).forEach((arr) => {
      arr.forEach((val) => {
        const low = String(val).toLowerCase();
        rawTerms.forEach((term) => {
          if (low.includes(term) || term.includes(low)) {
            // merge all values from this array as possible related topics
            results.push(...arr);
          }
        });
      });
    });
  }
  return [...new Set(results)]; // remove duplicates
}
const PORT = process.env.PORT || 5500;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});