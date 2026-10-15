/**
 * script.js — RimWorld Colony Generator
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │  Architecture (7 sections, top-to-bottom dependency)    │
 * │                                                         │
 * │  1. DATA     — frozen content pools                     │
 * │  2. STATE    — saved roster array + current colonist    │
 * │  3. UTILS    — pure, side-effect-free helpers           │
 * │  4. AVATAR   — procedural SVG portrait generator        │
 * │  5. BUILDERS — DOM-element factory functions            │
 * │  6. RENDERER — generateColonist() + renderRoster()      │
 * │  7. INIT     — wire events, fire first generation       │
 * └─────────────────────────────────────────────────────────┘
 *
 * Dependencies: none (vanilla ES2020+, strict mode)
 */

"use strict";

/* ═══════════════════════════════════════════════════════════
   1. DATA
   All randomisable content lives here as a single frozen
   object. Add or remove pool entries freely — no logic changes.
═══════════════════════════════════════════════════════════ */

const DATA = Object.freeze({

  firstNames: [
    "Anya","Bron","Cael","Devi","Eld","Frix","Gael","Hana","Iver","Jorin",
    "Kael","Lune","Mira","Nox","Ori","Petra","Quinn","Rael","Sova","Tarn",
    "Ulva","Vance","Wren","Xara","Yova","Zael","Asha","Beck","Cors","Dray",
    "Emre","Fael","Glin","Holo","Ines","Jove","Kira","Lark","Moss","Nala",
    "Orin","Pyre","Riven","Sable","Tova","Ursa","Vael","Wix","Xen","Yael",
  ],

  lastNames: [
    "Ashveil","Bronvar","Coldmarch","Darkvane","Embervast","Flintmoor",
    "Graystone","Halcrest","Ironfeld","Joros","Kelvast","Lunara","Morden",
    "Northgate","Orvar","Pyremoor","Quellar","Ravencroft","Stonemark","Tarven",
    "Umbral","Varek","Wolfcrest","Xeran","Yeldra","Zavan","Ashmar","Brell",
    "Crux","Duskfall","Edran","Forgeholt","Grimveil","Hadros","Ironcroft",
  ],

  genders: ["Male", "Female"],

  /** @type {{ name: string, desc: string }[]} */
  childhoods: [
    { name: "Farmhand",     desc: "Raised tending crops on a rim colony." },
    { name: "Street Kid",   desc: "Grew up scraping by in an urban sprawl." },
    { name: "Noble Child",  desc: "Pampered youth in a high-society household." },
    { name: "Tribal Youth", desc: "Raised among a primitive tribal community." },
    { name: "Ship Born",    desc: "Born and raised aboard a deep-space vessel." },
    { name: "Slave Child",  desc: "Forced into labor from a very young age." },
    { name: "Refugee",      desc: "Fled from a collapsing colony as a child." },
    { name: "Soldier Kid",  desc: "Raised in a military outpost environment." },
    { name: "Settler",      desc: "Helped build a new colony from scratch." },
    { name: "Pirate Brat",  desc: "Grew up among raiders and outlaws." },
    { name: "Waster",       desc: "Survived the toxic wastes of a dead world." },
    { name: "Glitterworld", desc: "Lived on a highly advanced civilization." },
  ],

  /** @type {{ name: string, desc: string }[]} */
  adulthoods: [
    { name: "Colonist",      desc: "Tried to build a stable life on the rim." },
    { name: "Combat Marine", desc: "Served in frontline military engagements." },
    { name: "Surgeon",       desc: "Trained in advanced medical procedures." },
    { name: "Pirate",        desc: "Raided settlements across the rim." },
    { name: "Mercenary",     desc: "Sold fighting skills to the highest bidder." },
    { name: "Farmer",        desc: "Dedicated years to sustainable agriculture." },
    { name: "Engineer",      desc: "Designed and maintained complex systems." },
    { name: "Researcher",    desc: "Conducted scientific studies in isolation." },
    { name: "Warden",        desc: "Managed and interrogated prisoners." },
    { name: "Trader",        desc: "Traveled trade routes between colonies." },
    { name: "Slave",         desc: "Forced into servitude before escaping." },
    { name: "Ranger",        desc: "Roamed the wilds, hunting and surviving." },
    { name: "Cultist",       desc: "Devoted to an obscure ideological order." },
    { name: "Smuggler",      desc: "Ran illegal goods through hostile space." },
  ],

  /**
   * Personality traits — type drives the CSS modifier class.
   * @type {{ name: string, type: "good"|"neutral"|"bad" }[]}
   */
  traits: [
    { name: "Iron-willed",          type: "good"    },
    { name: "Tough",                type: "good"    },
    { name: "Quick Sleeper",        type: "good"    },
    { name: "Fast Learner",         type: "good"    },
    { name: "Jogger",               type: "good"    },
    { name: "Nimble",               type: "good"    },
    { name: "Industrious",          type: "good"    },
    { name: "Kind",                 type: "good"    },
    { name: "Beautiful",            type: "good"    },
    { name: "Careful Shooter",      type: "good"    },
    { name: "Neurotic",             type: "neutral" },
    { name: "Volatile",             type: "neutral" },
    { name: "Night Owl",            type: "neutral" },
    { name: "Optimist",             type: "neutral" },
    { name: "Bloodlust",            type: "neutral" },
    { name: "Nudist",               type: "neutral" },
    { name: "Ascetic",              type: "neutral" },
    { name: "Psychically Deaf",     type: "neutral" },
    { name: "Brawler",              type: "neutral" },
    { name: "Pyromaniac",           type: "bad"     },
    { name: "Chemical Fascination", type: "bad"     },
    { name: "Slothful",             type: "bad"     },
    { name: "Depressive",           type: "bad"     },
    { name: "Greedy",               type: "bad"     },
    { name: "Too Smart",            type: "bad"     },
    { name: "Abrasive",             type: "bad"     },
    { name: "Lazy",                 type: "bad"     },
    { name: "Jealous",              type: "bad"     },
  ],

  /**
   * Health conditions — severity drives badge colour.
   * Each entry has a name and a descriptive tooltip.
   * @type {{ name: string, severity: "minor"|"major"|"critical", desc: string }[]}
   */
  healthConditions: [
    // minor
    { name: "Bruised Ribs",       severity: "minor",    desc: "Painful bruising on the torso. Slows movement slightly." },
    { name: "Mild Infection",     severity: "minor",    desc: "A low-grade infection. Will worsen without treatment." },
    { name: "Scratch",            severity: "minor",    desc: "A minor surface wound. Heals quickly on its own." },
    { name: "Food Poisoning",     severity: "minor",    desc: "Nausea and cramping from contaminated food." },
    { name: "Sunburn",            severity: "minor",    desc: "Painful skin inflammation from prolonged sun exposure." },
    { name: "Sprained Ankle",     severity: "minor",    desc: "Partial ligament damage. Reduces movement speed." },
    { name: "Hangover",           severity: "minor",    desc: "After-effects of heavy alcohol consumption." },
    // major
    { name: "Broken Leg",         severity: "major",    desc: "Fractured tibia. Cannot move without support." },
    { name: "Alcohol Addiction",  severity: "major",    desc: "Chronic dependency on alcohol. Causes mood crashes when sober." },
    { name: "Gunshot Wound",      severity: "major",    desc: "Bullet fragment lodged in soft tissue. Requires surgery." },
    { name: "Chemical Addiction", severity: "major",    desc: "Dependency on psychite or luciferium." },
    { name: "Burn (30%)",         severity: "major",    desc: "Significant burn coverage. Extreme pain and disfigurement." },
    { name: "Asthma",             severity: "major",    desc: "Chronic respiratory condition limiting physical exertion." },
    { name: "Flu",                severity: "major",    desc: "Viral infection causing high fever and fatigue." },
    // critical
    { name: "Blindness",          severity: "critical", desc: "Total loss of sight. Cannot aim ranged weapons effectively." },
    { name: "Missing Arm",        severity: "critical", desc: "Lost a limb. Significant work capacity penalty." },
    { name: "Plague",             severity: "critical", desc: "Rapidly progressing disease. Fatal if untreated." },
    { name: "Organ Failure",      severity: "critical", desc: "One or more organs are failing. Requires immediate surgery." },
    { name: "Paralysis",          severity: "critical", desc: "Lower body paralysis. Cannot walk without a prosthetic." },
    { name: "Missing Eye",        severity: "critical", desc: "Reduced field of vision. Shooting accuracy penalty." },
  ],

  /**
   * Incapable-of job pool — each colonist gets 0–3 random picks.
   * name  : displayed label
   * reason: tooltip explaining why
   * @type {{ name: string, reason: string }[]}
   */
  incapableJobs: [
    { name: "Firefighting",  reason: "Will not extinguish fires under any circumstances." },
    { name: "Dumb Labour",   reason: "Refuses menial or manual labour tasks." },
    { name: "Cooking",       reason: "Psychologically incapable of preparing food." },
    { name: "Hunting",       reason: "Cannot bring themselves to hunt animals." },
    { name: "Mining",        reason: "Refuses to perform any underground excavation." },
    { name: "Plant Work",    reason: "Incapable of sowing or harvesting crops." },
    { name: "Constructing",  reason: "Cannot plan or build structures." },
    { name: "Patient",       reason: "Refuses to be treated by a doctor." },
    { name: "Wardening",     reason: "Will not interact with prisoners." },
    { name: "Handling",      reason: "Refuses to tame or handle animals." },
    { name: "Crafting",      reason: "Cannot operate workbenches or craft items." },
    { name: "Art",           reason: "Incapable of creating any artistic work." },
    { name: "Researching",   reason: "Will not conduct any research project." },
    { name: "Hauling",       reason: "Refuses to haul items or resources." },
    { name: "Cleaning",      reason: "Will not clean any area or filth." },
    { name: "Violence",      reason: "Incapable of harming any living being." },
    { name: "Caring",        reason: "Refuses to provide medical treatment." },
    { name: "Social",        reason: "Cannot engage in social interaction or trading." },
  ],

  /** Fixed-order skill definitions — all 12 always shown. */
  skills: [
    { label: "Shooting",     icon: "⊕" },
    { label: "Melee",        icon: "⚔" },
    { label: "Medicine",     icon: "✚" },
    { label: "Construction", icon: "⌂" },
    { label: "Cooking",      icon: "⊗" },
    { label: "Research",     icon: "⊞" },
    { label: "Social",       icon: "◎" },
    { label: "Mining",       icon: "◆" },
    { label: "Plants",       icon: "❧" },
    { label: "Animals",      icon: "◉" },
    { label: "Crafting",     icon: "⚙" },
    { label: "Artistic",     icon: "◈" },
  ],

  /**
   * Maps an incapable job name → the skill label it disables.
   * Only jobs that directly correspond to a learnable skill are listed.
   * Jobs with no skill counterpart (Firefighting, Patient, etc.) are omitted.
   * @type {Record<string, string>}
   */
  incapableToSkill: {
    "Cooking":     "Cooking",
    "Mining":      "Mining",
    "Constructing":"Construction",
    "Handling":    "Animals",
    "Crafting":    "Crafting",
    "Art":         "Artistic",
    "Researching": "Research",
    "Social":      "Social",
    "Caring":      "Medicine",
    "Violence":    "Melee",
    "Plant Work":  "Plants",
  },

  skinTones:  ["#c8a070","#a07850","#d4a870","#8a5c38","#e0c090","#6a4028"],
  hairColors: ["#3a2a1a","#1a1a10","#8a6030","#c0c0b0","#5a3020","#b05020"],
});

/* ═══════════════════════════════════════════════════════════
   2. STATE
   Mutable application state kept outside the frozen DATA.
═══════════════════════════════════════════════════════════ */

/** Running generation count for the footer counter. */
let generationCount = 0;

/**
 * The colonist object currently displayed on the card.
 * Set by generateColonist() so saveCurrentColonist() can read it.
 * @type {Colonist|null}
 */
let currentColonist = null;

/**
 * Array of saved colonist objects shown in the Saved Roster panel.
 * @type {Colonist[]}
 */
let savedRoster = [];

/**
 * @typedef {Object} Colonist
 * @property {string}   id         — unique ID for DOM keying
 * @property {string}   firstName
 * @property {string}   lastName
 * @property {number}   age
 * @property {string}   gender
 * @property {{name:string,desc:string}} childhood
 * @property {{name:string,desc:string}} adulthood
 * @property {{name:string,type:string}[]} traits
 * @property {{name:string,severity:string,desc:string}[]} conditions
 * @property {{name:string,reason:string}[]} incapable
 * @property {number[]} skillScores
 * @property {number}   health
 */

/* ═══════════════════════════════════════════════════════════
   3. UTILS
   Pure functions — no side effects, no DOM access.
═══════════════════════════════════════════════════════════ */

/** Pick a uniformly random element from an array. */
function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Random integer in the closed interval [min, max]. */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Sample n unique items from arr without replacement. */
function pickUnique(arr, n) {
  const pool   = [...arr];
  const result = [];
  while (result.length < n && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(idx, 1)[0]);
  }
  return result;
}

/**
 * Weighted random skill score (0–20).
 * Distribution mirrors RimWorld: most colonists are novice/competent.
 */
function randomSkillScore() {
  const r = Math.random();
  if (r < 0.14) return randInt(0,  2);
  if (r < 0.44) return randInt(3,  6);
  if (r < 0.74) return randInt(7, 11);
  if (r < 0.92) return randInt(12, 16);
  return randInt(17, 20);
}

/** Map a skill score to a CSS tier string. */
function scoreTier(score) {
  if (score >= 12) return "high";
  if (score >= 5)  return "mid";
  return "low";
}

/**
 * Animate a bar fill from 0 → percent after two rAF ticks
 * so the CSS transition fires after DOM insertion.
 */
function animateBar(barEl, valEl, percent) {
  // pick colour class based on health value
  barEl.className = "bar-fill " + (
    percent >= 70 ? "bg-rim-green"  :
    percent >= 40 ? "bg-rim-orange" :
                    "bg-rim-red"
  );
  valEl.className = "stat-val mt-0 " + (
    percent >= 70 ? "text-rim-green"  :
    percent >= 40 ? "text-rim-orange" :
                    "text-rim-redlt"
  );
  barEl.style.width = "0%";
  valEl.textContent = `${percent}%`;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { barEl.style.width = `${percent}%`; });
  });
}

/** Returns a CSS colour class string appropriate for a health percentage. */
function healthColourClass(percent) {
  if (percent >= 70) return "text-rim-green";
  if (percent >= 40) return "text-rim-orange";
  return "text-rim-redlt";
}

/* ═══════════════════════════════════════════════════════════
   4. AVATAR
   Procedural SVG portrait. Deterministic for a given seed so
   the same name+age always yields the same face.
═══════════════════════════════════════════════════════════ */

function renderAvatar(seed) {
  const skin      = DATA.skinTones[seed % DATA.skinTones.length];
  const hair      = DATA.hairColors[(seed * 3) % DATA.hairColors.length];
  const eyeHue    = (seed * 53) % 360;
  const hasScar   = (seed % 3) > 0;
  const hairStyle = seed % 2;
  const mouthType = seed % 3;

  const MOUTHS = [
    `<path d="M27,48 Q32,52 37,48" fill="none" stroke="#7a4a38" stroke-width="1.4" stroke-linecap="round"/>`,
    `<path d="M27,48 Q32,46 37,48" fill="none" stroke="#7a4a38" stroke-width="1.4" stroke-linecap="round"/>`,
    `<path d="M28,48 Q32,50 36,48" fill="none" stroke="#7a4a38" stroke-width="1.4" stroke-linecap="round"/>`,
  ];

  const hairSVG = hairStyle === 0
    ? `<ellipse cx="36" cy="26" rx="16" ry="8" fill="${hair}"/>`
    : `<path d="M20,32 Q21,14 36,12 Q51,14 52,32 Q49,22 36,20 Q23,22 20,32Z" fill="${hair}"/>`;

  const scarSVG = hasScar
    ? `<path d="M${22 + seed % 5},${34 + seed % 6} l3,6"
              stroke="#7a4030" stroke-width="0.9" opacity=".45"/>`
    : "";

  document.getElementById("avatar-svg").innerHTML = `
    <rect width="72" height="72" fill="#161614"/>
    <ellipse cx="36" cy="68" rx="18" ry="12" fill="hsl(${eyeHue},20%,22%)"/>
    <path d="M24,64 Q36,58 48,64" fill="none"
          stroke="hsl(${eyeHue},28%,32%)" stroke-width="5"/>
    <rect x="31" y="50" width="10" height="9" rx="2" fill="${skin}"/>
    <ellipse cx="36" cy="38" rx="16" ry="18" fill="${skin}"/>
    ${hairSVG}
    <ellipse cx="28" cy="37" rx="3.2" ry="3.2" fill="#0e0e0c"/>
    <ellipse cx="44" cy="37" rx="3.2" ry="3.2" fill="#0e0e0c"/>
    <ellipse cx="28" cy="37" rx="1.8" ry="1.8" fill="hsl(${eyeHue},50%,60%)"/>
    <ellipse cx="44" cy="37" rx="1.8" ry="1.8" fill="hsl(${eyeHue},50%,60%)"/>
    <ellipse cx="28.7" cy="36.3" rx="0.65" ry="0.65" fill="#fff"/>
    <ellipse cx="44.7" cy="36.3" rx="0.65" ry="0.65" fill="#fff"/>
    <path d="M24,33 Q28,31.5 32,33" fill="none" stroke="${hair}"
          stroke-width="1.3" stroke-linecap="round"/>
    <path d="M40,33 Q44,31.5 48,33" fill="none" stroke="${hair}"
          stroke-width="1.3" stroke-linecap="round"/>
    <path d="M34,40 Q36,43.5 38,40" fill="none" stroke="${skin}"
          stroke-width="1.1" opacity=".55"/>
    ${MOUTHS[mouthType]}
    ${scarSVG}
    <rect x="1" y="1" width="70" height="70" fill="none"
          stroke="#3a3a30" stroke-width="1"/>
  `;
}

/* ═══════════════════════════════════════════════════════════
   5. BUILDERS
   Factory functions that return fully constructed DOM nodes.
═══════════════════════════════════════════════════════════ */

/**
 * Build one <li> personality trait tag.
 * @param {{ name: string, type: string }} trait
 * @param {number} delay  animation stagger ms
 */
function createTraitElement(trait, delay) {
  const li = document.createElement("li");
  li.className            = `trait-tag trait-tag--${trait.type}`;
  li.textContent          = trait.name;
  li.title                = `${trait.type.charAt(0).toUpperCase()}${trait.type.slice(1)} trait`;
  li.style.animationDelay = `${delay}ms`;
  return li;
}

/**
 * Build one <li> health condition badge.
 * @param {{ name: string, severity: string, desc: string }} cond
 * @param {number} delay  animation stagger ms
 */
function createHealthConditionElement(cond, delay) {
  const li = document.createElement("li");
  li.className            = `health-condition health-condition--${cond.severity}`;
  li.textContent          = cond.name;
  li.title                = cond.desc;
  li.style.animationDelay = `${delay}ms`;
  return li;
}

/**
 * Build one <li> incapable-of tag.
 * @param {{ name: string, reason: string }} job
 * @param {number} delay  animation stagger ms
 */
function createIncapableElement(job, delay) {
  const li = document.createElement("li");
  li.className            = "incapable-tag";
  li.textContent          = job.name;
  li.title                = job.reason;
  li.style.animationDelay = `${delay}ms`;
  return li;
}

/**
 * Build one <li> skill row.
 * @param {{ label: string, icon: string }} skillDef
 * @param {number}  score      0–20 (already 0 if disabled)
 * @param {number}  delay      animation stagger ms
 * @param {boolean} disabled   true when the colonist is Incapable of this skill
 */
function createSkillElement(skillDef, score, delay, disabled) {
  // Disabled skills are always score 0, no passion, visually dimmed
  const effectiveScore = disabled ? 0 : score;
  const tier = disabled ? "disabled" : scoreTier(effectiveScore);
  const pct  = disabled ? 0 : ((effectiveScore / 20) * 100).toFixed(1);

  // No passion on disabled skills
  let passion = `<span class="skill-passion" aria-hidden="true"></span>`;
  if (!disabled) {
    const roll = Math.random();
    if (roll < 0.20) {
      passion = `<span class="skill-passion skill-passion--minor" aria-label="Minor passion">★</span>`;
    } else if (roll < 0.28) {
      passion = `<span class="skill-passion skill-passion--major" aria-label="Major passion">★★</span>`;
    }
  }

  const li = document.createElement("li");
  li.className            = disabled ? "skill-row skill-row--disabled" : "skill-row";
  li.style.animationDelay = `${delay}ms`;
  li.title                = disabled ? `Incapable — cannot learn or use ${skillDef.label}` : "";

  li.innerHTML = `
    <span class="skill-icon" aria-hidden="true">${skillDef.icon}</span>
    <span class="skill-label">${skillDef.label}</span>
    <div class="skill-bar-track"
         role="progressbar"
         aria-valuenow="${effectiveScore}" aria-valuemin="0" aria-valuemax="20"
         aria-label="${skillDef.label} skill ${effectiveScore}/20">
      <div class="skill-bar-fill ${disabled ? "skill-bar-fill--disabled" : `skill-bar-fill--${tier}`}"
           style="width:0%" data-target="${pct}"></div>
    </div>
    <span class="skill-score ${disabled ? "skill-score--disabled" : `skill-score--${tier}`}">
      ${disabled ? "—" : effectiveScore}
    </span>
    ${disabled
      ? `<span class="skill-incapable-mark" aria-label="Incapable">✕</span>`
      : passion
    }
  `;
  return li;
}

/**
 * Build one <li> roster row for the Saved Roster panel.
 * @param {Colonist} colonist
 * @param {number}   index     position in savedRoster array (for trash)
 */
function createRosterRowElement(colonist, index) {
  const li = document.createElement("li");
  li.className            = "roster-row";
  li.style.animationDelay = `${index * 40}ms`;

  const topCondition = colonist.conditions.length > 0
    ? colonist.conditions[0].name
    : "Healthy";

  const condColor = colonist.conditions.length === 0
    ? "text-rim-green"
    : colonist.conditions.some(c => c.severity === "critical")
      ? "text-rim-redlt"
      : colonist.conditions.some(c => c.severity === "major")
        ? "text-rim-orange"
        : "text-[#c8b84b]";

  li.innerHTML = `
    <div class="roster-row__info">
      <div class="roster-row__name">${colonist.firstName} ${colonist.lastName}</div>
      <div class="roster-row__meta">
        ${colonist.age} yrs · ${colonist.gender}
        &nbsp;·&nbsp; ${colonist.adulthood.name}
        &nbsp;·&nbsp; <span class="${condColor}">${topCondition}</span>
      </div>
    </div>
    <span class="roster-row__health ${healthColourClass(colonist.health)}">
      ${colonist.health}%
    </span>
    <button
      class="btn-trash"
      aria-label="Remove ${colonist.firstName} ${colonist.lastName} from roster"
      data-index="${index}"
      type="button"
    >✕</button>
  `;

  // Wire trash button — uses data-index to find correct roster entry
  li.querySelector(".btn-trash").addEventListener("click", (e) => {
    const idx = parseInt(e.currentTarget.dataset.index, 10);
    savedRoster.splice(idx, 1);
    renderRoster();
  });

  return li;
}

/* ═══════════════════════════════════════════════════════════
   6. RENDERER
═══════════════════════════════════════════════════════════ */

/* ── 6a. Generate & display a new colonist ── */
function generateColonist() {
  generationCount++;

  // Assemble colonist data
  const firstName    = rand(DATA.firstNames);
  const lastName     = rand(DATA.lastNames);
  const age          = randInt(16, 80);
  const gender       = rand(DATA.genders);
  const childhood    = rand(DATA.childhoods);
  const adulthood    = rand(DATA.adulthoods);
  const traits       = pickUnique(DATA.traits, randInt(1, 5));
  const skillScores  = DATA.skills.map(() => randomSkillScore());
  const health       = randInt(30, 100);

  // Health conditions: 40 % chance of none; otherwise 1–3 conditions
  // weighted so high health → fewer/lighter conditions
  const condCount = health >= 85
    ? (Math.random() < 0.7 ? 0 : 1)
    : health >= 60
      ? randInt(0, 2)
      : randInt(1, 3);
  const conditions = pickUnique(DATA.healthConditions, condCount);

  // Incapable: 50 % chance of none; otherwise 1–3 jobs
  const incapCount = Math.random() < 0.50 ? 0 : randInt(1, 3);
  const incapable  = pickUnique(DATA.incapableJobs, incapCount);

  // Build a Set of skill labels that are disabled by incapable jobs.
  // e.g. incapable "Researching" → disables skill label "Research"
  const disabledSkills = new Set(
    incapable
      .map(job => DATA.incapableToSkill[job.name])
      .filter(Boolean)
  );

  // Zero out scores for disabled skills so they are consistent in saved data
  const finalSkillScores = DATA.skills.map((skillDef, i) =>
    disabledSkills.has(skillDef.label) ? 0 : skillScores[i]
  );

  const avatarSeed = firstName.charCodeAt(0) + lastName.charCodeAt(0) + age;

  // Store as current colonist so Save can access it
  currentColonist = {
    id: `col-${Date.now()}`,
    firstName, lastName, age, gender,
    childhood, adulthood,
    traits, conditions, incapable,
    skillScores: finalSkillScores,
    disabledSkills: [...disabledSkills],
    health,
  };

  // ── DOM updates ──

  renderAvatar(avatarSeed);

  document.getElementById("col-name").textContent      = `${firstName} ${lastName}`;
  document.getElementById("col-age").textContent       = `${age} yrs · ${gender}`;
  document.getElementById("col-childhood").textContent = `${childhood.name} — ${childhood.desc}`;
  document.getElementById("col-adulthood").textContent = `${adulthood.name} — ${adulthood.desc}`;

  animateBar(
    document.getElementById("bar-health"),
    document.getElementById("val-health"),
    health
  );

  // Health conditions
  const condList = document.getElementById("health-condition-list");
  condList.innerHTML = "";
  if (conditions.length === 0) {
    const li = document.createElement("li");
    li.className   = "health-condition health-condition--minor";
    li.textContent = "No active conditions";
    li.style.color = "#58a858";
    li.style.borderColor = "#3a6a3a";
    condList.appendChild(li);
  } else {
    conditions.forEach((cond, i) =>
      condList.appendChild(createHealthConditionElement(cond, i * 50))
    );
  }

  // Traits
  const traitList = document.getElementById("trait-list");
  traitList.innerHTML = "";
  traits.forEach((trait, i) =>
    traitList.appendChild(createTraitElement(trait, i * 50))
  );

  // Skills — pass disabled=true for any skill blocked by an incapable job
  const skillList = document.getElementById("skill-list");
  skillList.innerHTML = "";
  DATA.skills.forEach((skillDef, i) => {
    const isDisabled = disabledSkills.has(skillDef.label);
    skillList.appendChild(
      createSkillElement(skillDef, finalSkillScores[i], i * 28, isDisabled)
    );
  });

  // Trigger skill bar fill transitions
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      skillList.querySelectorAll(".skill-bar-fill[data-target]").forEach((bar) => {
        bar.style.width = `${bar.dataset.target}%`;
      });
    });
  });

  // Incapable
  const incapList = document.getElementById("incapable-list");
  incapList.innerHTML = "";
  if (incapable.length === 0) {
    const li = document.createElement("li");
    li.className   = "incapable-tag";
    li.textContent = "No restrictions";
    li.style.color = "#6a6050";
    li.style.borderColor = "#3a3a2e";
    li.style.setProperty("--before-content", "none");
    incapList.appendChild(li);
  } else {
    incapable.forEach((job, i) =>
      incapList.appendChild(createIncapableElement(job, i * 50))
    );
  }

  document.getElementById("gen-counter").textContent =
    `Generated: ${generationCount}`;

  // Card flash
  const card = document.getElementById("colonist-card");
  card.classList.remove("is-flashing");
  void card.offsetWidth;
  card.classList.add("is-flashing");
}

/* ── 6b. Save current colonist to roster ── */
function saveCurrentColonist() {
  if (!currentColonist) return;

  // Prevent duplicate saves of the exact same generation
  const alreadySaved = savedRoster.some(c => c.id === currentColonist.id);
  if (alreadySaved) return;

  savedRoster.push({ ...currentColonist });
  renderRoster();
}

/* ── 6c. Render the Saved Roster panel ── */
function renderRoster() {
  const section    = document.getElementById("saved-roster");
  const rosterList = document.getElementById("roster-list");

  rosterList.innerHTML = "";

  if (savedRoster.length === 0) {
    section.classList.add("hidden");
    return;
  }

  section.classList.remove("hidden");
  savedRoster.forEach((colonist, i) => {
    rosterList.appendChild(createRosterRowElement(colonist, i));
  });
}

/* ═══════════════════════════════════════════════════════════
   7. INIT
═══════════════════════════════════════════════════════════ */
(function init() {
  document.getElementById("btn-generate")
    .addEventListener("click", generateColonist);

  document.getElementById("btn-save")
    .addEventListener("click", saveCurrentColonist);

  generateColonist();
})();
