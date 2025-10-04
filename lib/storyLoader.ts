// storyLoader.ts – Loader data fra Google Sheets i stedet for statisk objekt

const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQj01dDmjG2S4sXBXeLmZJMOzoowcP-Neq7H9BVlX4qt_Hr2T8HDcu21ZYQxJifhOKjKesv8Yl-7F9x/pub?output=csv"; // Public CSV link fra Google Sheets

// Fallback story in case Google Sheets fails
const FALLBACK_STORY = {
  "1": {
    id: "1",
    text: "Du står ved indgangen til den mørke hule. En kold vind blæser ud fra åbningen, og du kan høre fjerne lyde derinde. Din fakkel kaster dansende skygger på væggene. Hvad gør du?",
    choices: [
      { label: "Gå forsigtigt ind i hulen", goto: "2" },
      { label: "Undersøg området omkring indgangen", goto: "3" }
    ]
  },
  "2": {
    id: "2",
    text: "Du går forsigtigt ind i hulen. Efter et par meter opdager du at gulvet er dækket af løse sten og skarpe klippestykker. Du må være forsigtig for ikke at snuble.",
    check: {
      stat: "Evner",
      dc: 8,
      success: "4",
      fail: "5"
    }
  },
  "3": {
    id: "3",
    text: "Du undersøger området omkring indgangen og finder en gammel rusten dolk. Du samler den op og føler dig bedre rustet til udfordringerne der venter.",
    choices: [
      { label: "Gå ind i hulen med din nye dolk", goto: "2" }
    ]
  },
  "4": {
    id: "4",
    text: "Du navigerer elegant gennem stenene og kommer sikkert frem til en åbning dybere inde i hulen. Her opdager du en gammel trækiste med en skat!",
    choices: [
      { label: "Åbn kisten", goto: "6" },
      { label: "Fortsæt videre", goto: "7" }
    ]
  },
  "5": {
    id: "5",
    text: "Du snubler over stenene og falder hårdt. Du mister 2 Udholdenhed point, men kommer dig op igen.",
    choices: [
      { label: "Fortsæt ind i hulen", goto: "4" },
      { label: "Gå tilbage til indgangen", goto: "1" }
    ]
  },
  "6": {
    id: "6",
    text: "Du åbner kisten og finder en magisk ring og en helbredelsesdrik! Disse genstande vil være nyttige på din rejse.",
    choices: [
      { label: "Fortsæt din rejse", goto: "7" }
    ]
  },
  "7": {
    id: "7",
    text: "Du fortsætter dybere ind i hulen og finder en forgrening. Hvad gør du?",
    choices: [
      { label: "Gå til venstre", goto: "8" },
      { label: "Gå til højre", goto: "9" }
    ]
  },
  "8": {
    id: "8",
    text: "Du går til venstre og finder en lille grotte med en underjordisk sø. I vandet kan du se noget der glimter på bunden.",
    choices: [
      { label: "Dyk ned efter det glimtende", goto: "10" },
      { label: "Gå tilbage til forgreningen", goto: "7" }
    ]
  },
  "9": {
    id: "9",
    text: "Du går til højre og kommer til en stor kammer med en massiv trone i midten. På tronen sidder en skelettet konge med en glimtende krone.",
    choices: [
      { label: "Gå hen til tronen", goto: "11" },
      { label: "Gå tilbage til forgreningen", goto: "7" }
    ]
  },
  "10": {
    id: "10",
    text: "Du dykker ned og finder flere guldmønter! Når du kommer op igen, har du fundet en værdifuld skat.",
    choices: [
      { label: "Fortsæt din rejse", goto: "7" }
    ]
  },
  "11": {
    id: "11",
    text: "Du går hen til tronen. Når du nærmer dig, begynder skelettet at bevæge sig! Kongen rejser sig op og stirrer på dig.",
    check: {
      stat: "Held",
      dc: 8,
      success: "12",
      fail: "13"
    }
  },
  "12": {
    id: "12",
    text: "Du holder dit mod og stirrer tilbage på kongen. Pludselig nikker skelettet respektfuldt og sætter sig ned igen. Du kan tage kronen!",
    choices: [
      { label: "Tag kronen og fortsæt", goto: "14" }
    ]
  },
  "13": {
    id: "13",
    text: "Du bliver skræmt og træder tilbage. Kongen rejser sig og begynder at gå mod dig. Du må flygte!",
    choices: [
      { label: "Løb tilbage til forgreningen", goto: "7" }
    ]
  },
  "14": {
    id: "14",
    text: "Du tager kronen og føler en magisk kraft strømme gennem dig. Du har nu fundet en af hulens største skatte!",
    choices: [
      { label: "Fortsæt din rejse", goto: "7" }
    ]
  }
};

export async function loadStoryFromSheet() {
  try {
    const res = await fetch(SHEET_CSV_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const csvText = await res.text();
    const rows = parseCSV(csvText);
    const story = buildStoryObject(rows);
    
    // If no story was loaded, use fallback
    if (Object.keys(story).length === 0) {
      console.warn("No story data loaded from Sheets, using fallback");
      return FALLBACK_STORY;
    }
    
    return story;
  } catch (err) {
    console.error("Kunne ikke hente historie fra Sheets:", err);
    console.log("Using fallback story");
    return FALLBACK_STORY;
  }
}

function parseCSV(csv: string) {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const headers = lines.shift()?.split(",").map(h => h.trim()) || [];
  return lines.map(line => {
    const cols: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cols.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    cols.push(current);
    return Object.fromEntries(headers.map((h, i) => [h, (cols[i] || "").replace(/^"|"$/g, "").trim()]));
  });
}

function buildStoryObject(rows: any[]) {
  const story: Record<string, any> = {};
  for (const row of rows) {
    const id = (row.id || "").trim();
    if (!id) continue;
    const scene: any = { id, text: row.tekst || "", choices: [] };
    let i = 1;
    while (row["valg" + i + "_label"] || row["valg" + i + "_goto"]) {
      const label = row["valg" + i + "_label"];
      const goto = row["valg" + i + "_goto"];
      if (label && goto) {
        const choice: any = { label: label.trim(), goto: goto.trim() };
        if (row["valg" + i + "_match"]) {
          choice.match = row["valg" + i + "_match"].split(/[|,]/).map((s: string) => s.trim()).filter(Boolean);
        }
        scene.choices.push(choice);
      }
      i++;
    }
    if (row.check_stat || row.check_dc || row.check_type || row.check_success || row.check_fail) {
      scene.check = {
        type: row.check_type || "roll",
        stat: row.check_stat || "",
        dc: isNaN(Number(row.check_dc)) ? 0 : Number(row.check_dc),
        success: row.check_success || "",
        fail: row.check_fail || ""
      };
    }
    story[id] = scene;
  }
  return story;
}
