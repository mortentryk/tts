import { StoryNode } from '../types/game';

export const STORY: Record<string, StoryNode> = {
  "1": {
    id: "1",
    text: "Du står ved indgangen til den mørke hule. En kold vind blæser ud fra åbningen, og du kan høre fjerne lyde derinde. Din fakkel kaster dansende skygger på væggene. Hvad gør du?",
    choices: [
      { label: "Gå forsigtigt ind i hulen", goto: "2" },
      { label: "Undersøg området omkring indgangen", goto: "3" },
      { label: "Tænd en ekstra fakkel først", goto: "4" }
    ]
  },
  "2": {
    id: "2",
    text: "Du går forsigtigt ind i hulen. Efter et par meter opdager du at gulvet er dækket af løse sten og skarpe klippestykker. Du må være forsigtig for ikke at snuble.",
    check: {
      stat: "Evner",
      dc: 8,
      success: "5",
      fail: "6"
    }
  },
  "3": {
    id: "3",
    text: "Du undersøger området omkring indgangen. I skyggerne finder du en gammel rusten dolk og en lille pose med guldmønter. Du samler dem op og føler dig bedre rustet til udfordringerne der venter.",
    choices: [
      { label: "Gå ind i hulen med dine nye fund", goto: "2" },
      { label: "Undersøg området videre", goto: "7" }
    ]
  },
  "4": {
    id: "4",
    text: "Du tænder en ekstra fakkel og holder den i din anden hånd. Nu har du bedre lys og føler dig mere sikker. Du går ind i hulen med begge fakler.",
    choices: [
      { label: "Fortsæt ind i hulen", goto: "2" }
    ]
  },
  "5": {
    id: "5",
    text: "Du navigerer elegant gennem stenene og kommer sikkert frem til en åbning dybere inde i hulen. Her opdager du en gammel trækiste med et rustent lås.",
    choices: [
      { label: "Prøv at åbne kisten", goto: "8" },
      { label: "Undersøg kisten nærmere", goto: "9" },
      { label: "Gå videre uden at røre kisten", goto: "10" }
    ]
  },
  "6": {
    id: "6",
    text: "Du snubler over stenene og falder hårdt. Du mister 2 Udholdenhed point, men kommer dig op igen. Du kan høre fjerne lyde fra dybere inde i hulen.",
    choices: [
      { label: "Fortsæt ind i hulen", goto: "5" },
      { label: "Gå tilbage til indgangen", goto: "1" }
    ]
  },
  "7": {
    id: "7",
    text: "Du finder ikke mere af interesse i området omkring indgangen. Du har nu en dolk og nogle guldmønter, og føler dig klar til at udforske hulen.",
    choices: [
      { label: "Gå ind i hulen", goto: "2" }
    ]
  },
  "8": {
    id: "8",
    text: "Du prøver at åbne kisten, men låset er rustet fast. Du må bruge kraft for at få den op.",
    check: {
      stat: "Evner",
      dc: 10,
      success: "11",
      fail: "12"
    }
  },
  "9": {
    id: "9",
    text: "Du undersøger kisten nærmere og opdager at der er runer indgraveret i træet. De ser ud til at være en advarsel på et gammelt sprog.",
    check: {
      stat: "Held",
      dc: 7,
      success: "13",
      fail: "14"
    }
  },
  "10": {
    id: "10",
    text: "Du beslutter dig for at lade kisten være i fred og fortsætter dybere ind i hulen. Efter et stykke tid kommer du til en forgrening.",
    choices: [
      { label: "Gå til venstre", goto: "15" },
      { label: "Gå til højre", goto: "16" },
      { label: "Gå tilbage til kisten", goto: "5" }
    ]
  },
  "11": {
    id: "11",
    text: "Du får med stor kraft åbnet kisten! Inden i finder du en magisk ring, en helbredelsesdrik og en gammel kært. Disse genstande vil være nyttige på din rejse.",
    choices: [
      { label: "Tag genstandene og fortsæt", goto: "17" }
    ]
  },
  "12": {
    id: "12",
    text: "Kisten er for rustet til at åbne. Du prøver igen og igen, men det lykkes ikke. Du beslutter dig for at fortsætte uden at åbne den.",
    choices: [
      { label: "Fortsæt dybere ind i hulen", goto: "10" }
    ]
  },
  "13": {
    id: "13",
    text: "Du kan læse runerne! De advarer om en farlig trold der bor dybere i hulen. Du ved nu hvad der venter dig og kan forberede dig bedre.",
    choices: [
      { label: "Prøv at åbne kisten alligevel", goto: "8" },
      { label: "Fortsæt med forsigtighed", goto: "10" }
    ]
  },
  "14": {
    id: "14",
    text: "Du kan ikke læse runerne, men de ser farlige ud. Du beslutter dig for at være forsigtig og fortsætte.",
    choices: [
      { label: "Fortsæt ind i hulen", goto: "10" }
    ]
  },
  "15": {
    id: "15",
    text: "Du går til venstre og kommer til en lille grotte med en underjordisk sø. Vandet skinner i dit fakkellys, og du kan se noget der glimter på bunden.",
    choices: [
      { label: "Dyk ned efter det glimtende", goto: "18" },
      { label: "Undersøg søen fra kanten", goto: "19" },
      { label: "Gå tilbage til forgreningen", goto: "10" }
    ]
  },
  "16": {
    id: "16",
    text: "Du går til højre og kommer til en stor kammer med en massiv trone i midten. På tronen sidder en skelettet konge med en glimtende krone på hovedet.",
    choices: [
      { label: "Gå hen til tronen", goto: "20" },
      { label: "Undersøg kammeret forsigtigt", goto: "21" },
      { label: "Gå tilbage til forgreningen", goto: "10" }
    ]
  },
  "17": {
    id: "17",
    text: "Med dine nye magiske genstande føler du dig stærkere og mere rustet. Du fortsætter dybere ind i hulen, klar til nye udfordringer.",
    choices: [
      { label: "Fortsæt ind i hulen", goto: "10" }
    ]
  },
  "18": {
    id: "18",
    text: "Du dykker ned i det kolde vand. Det er dybere end du troede, og du må holde vejret længe.",
    check: {
      stat: "Udholdenhed",
      dc: 9,
      success: "22",
      fail: "23"
    }
  },
  "19": {
    id: "19",
    text: "Du undersøger søen fra kanten og opdager at det glimtende på bunden er en guldmønt. Du kan se flere mønter spredt rundt på bunden.",
    choices: [
      { label: "Dyk ned efter mønterne", goto: "18" },
      { label: "Gå tilbage til forgreningen", goto: "10" }
    ]
  },
  "20": {
    id: "20",
    text: "Du går hen til tronen. Når du nærmer dig, begynder skelettet at bevæge sig! Kongen rejser sig op og stirrer på dig med tomme øjenhuler.",
    check: {
      stat: "Held",
      dc: 8,
      success: "24",
      fail: "25"
    }
  },
  "21": {
    id: "21",
    text: "Du undersøger kammeret forsigtigt og opdager at der er flere udgange. Du kan også se at kongens krone glimter magisk.",
    choices: [
      { label: "Gå hen til tronen", goto: "20" },
      { label: "Undersøg de andre udgange", goto: "26" },
      { label: "Gå tilbage til forgreningen", goto: "10" }
    ]
  },
  "22": {
    id: "22",
    text: "Du dykker ned og samler flere guldmønter op. Når du kommer op igen, har du fundet en værdifuld skat!",
    choices: [
      { label: "Fortsæt din rejse", goto: "10" }
    ]
  },
  "23": {
    id: "23",
    text: "Du må op til overfladen for at trække vejret. Du mister 2 Udholdenhed point, men overlever. Du kan se mønterne på bunden, men tør ikke dykke igen.",
    choices: [
      { label: "Gå tilbage til forgreningen", goto: "10" }
    ]
  },
  "24": {
    id: "24",
    text: "Du holder dit mod og stirrer tilbage på kongen. Pludselig nikker skelettet respektfuldt og sætter sig ned igen. Du kan tage kronen uden problemer!",
    choices: [
      { label: "Tag kronen og fortsæt", goto: "27" }
    ]
  },
  "25": {
    id: "25",
    text: "Du bliver skræmt og træder tilbage. Kongen rejser sig og begynder at gå mod dig. Du må kæmpe eller flygte!",
    choices: [
      { label: "Kæmp mod kongen", goto: "28" },
      { label: "Løb tilbage til forgreningen", goto: "10" }
    ]
  },
  "26": {
    id: "26",
    text: "Du undersøger de andre udgange og finder en hemmelig passage der fører til en skjult skattekammer. Her finder du magiske genstande og guld!",
    choices: [
      { label: "Tag skatten og gå tilbage", goto: "10" }
    ]
  },
  "27": {
    id: "27",
    text: "Du tager kronen og føler en magisk kraft strømme gennem dig. Du har nu fundet en af hulens største skatte!",
    choices: [
      { label: "Fortsæt din rejse", goto: "10" }
    ]
  },
  "28": {
    id: "28",
    text: "Du kæmper mod den døde konge. Det bliver en hård kamp!",
    check: {
      stat: "Evner",
      dc: 12,
      success: "29",
      fail: "30"
    }
  },
  "29": {
    id: "29",
    text: "Du besejrer kongen og kan nu tage kronen og alle skattene i kammeret. Du har gennemført en episk sejr!",
    choices: [
      { label: "Saml skattene og gå tilbage", goto: "10" }
    ]
  },
  "30": {
    id: "30",
    text: "Kongen besejrer dig i kampen. Du mister 3 Udholdenhed point og må flygte tilbage til forgreningen.",
    choices: [
      { label: "Flygt tilbage", goto: "10" }
    ]
  }
};
