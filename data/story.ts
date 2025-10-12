import { StoryNode } from '../types/game';

export const STORY: Record<string, StoryNode> = {
  "1": {
    id: "1",
    text: "Du står ved indgangen til den mørke hule. En kold vind blæser ud fra åbningen, og du kan høre fjerne lyde derinde. Din fakkel kaster dansende skygger på væggene. Hvad gør du?",
    image: "https://oaidalleapiprodscus.blob.core.windows.net/private/org-PewCPHQ0ZybeyMJy1CIeFiq5/user-jWpZi21A06vkntZI2hHSB3sD/img-3c6jxEjriLqmYqpRWTh3QvcM.png?st=2025-10-12T13%3A21%3A15Z&se=2025-10-12T15%3A21%3A15Z&sp=r&sv=2024-08-04&sr=b&rscd=inline&rsct=image/png&skoid=77e5a8ec-6bd1-4477-8afc-16703a64f029&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2025-10-12T06%3A42%3A52Z&ske=2025-10-13T06%3A42%3A52Z&sks=b&skv=2024-08-04&sig=X%2B8tavfilo%2BJZpqTXUeIs5yTodNX6kKnhGl2ddUxets%3D",
    choices: [
      { label: "Gå forsigtigt ind i hulen", goto: "2" },
      { label: "Undersøg området omkring indgangen", goto: "3" },
      { label: "Tænd en ekstra fakkel først", goto: "4" }
    ]
  },
  "2": {
    id: "2",
    text: "Du går forsigtigt ind i hulen. Efter et par meter opdager du at gulvet er dækket af løse sten og skarpe klippestykker. Du må være forsigtig for ikke at snuble.",
    image: "https://oaidalleapiprodscus.blob.core.windows.net/private/org-PewCPHQ0ZybeyMJy1CIeFiq5/user-jWpZi21A06vkntZI2hHSB3sD/img-pZN167C8OAckVHL0T0BeWYut.png?st=2025-10-12T13%3A21%3A32Z&se=2025-10-12T15%3A21%3A32Z&sp=r&sv=2024-08-04&sr=b&rscd=inline&rsct=image/png&skoid=cc612491-d948-4d2e-9821-2683df3719f5&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2025-10-12T05%3A15%3A45Z&ske=2025-10-13T05%3A15%3A45Z&sks=b&skv=2024-08-04&sig=fHHNGoUyUrHGBvElqqmJBmqBixydeT8YFDEuUp2X/Xc%3D",
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
    image: "https://oaidalleapiprodscus.blob.core.windows.net/private/org-PewCPHQ0ZybeyMJy1CIeFiq5/user-jWpZi21A06vkntZI2hHSB3sD/img-C4aSi1QRfdjlYMLbOdBxWmbS.png?st=2025-10-12T13%3A21%3A48Z&se=2025-10-12T15%3A21%3A48Z&sp=r&sv=2024-08-04&sr=b&rscd=inline&rsct=image/png&skoid=f1dafa11-a0c2-4092-91d4-10981fbda051&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2025-10-12T07%3A50%3A32Z&ske=2025-10-13T07%3A50%3A32Z&sks=b&skv=2024-08-04&sig=TOXJDBgBIeIakk9kCr4bLKKdM6lpoZ9/ZI4boGlo3Jg%3D",
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
    image: "https://oaidalleapiprodscus.blob.core.windows.net/private/org-PewCPHQ0ZybeyMJy1CIeFiq5/user-jWpZi21A06vkntZI2hHSB3sD/img-mj9UcyekXLY5i4XoTPqjj4AH.png?st=2025-10-12T13%3A22%3A18Z&se=2025-10-12T15%3A22%3A18Z&sp=r&sv=2024-08-04&sr=b&rscd=inline&rsct=image/png&skoid=b1a0ae1f-618f-4548-84fd-8b16cacd5485&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2025-10-11T17%3A05%3A38Z&ske=2025-10-12T17%3A05%3A38Z&sks=b&skv=2024-08-04&sig=%2BvTenCtDSwKbxSEF3fpXx4ZNh6V9kAbOq6KahWSOerI%3D",
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
    image: "https://oaidalleapiprodscus.blob.core.windows.net/private/org-PewCPHQ0ZybeyMJy1CIeFiq5/user-jWpZi21A06vkntZI2hHSB3sD/img-QHmsQ5rO15AbcFZigmlab97r.png?st=2025-10-12T13%3A22%3A59Z&se=2025-10-12T15%3A22%3A59Z&sp=r&sv=2024-08-04&sr=b&rscd=inline&rsct=image/png&skoid=77e5a8ec-6bd1-4477-8afc-16703a64f029&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2025-10-12T13%3A42%3A10Z&ske=2025-10-13T13%3A42%3A10Z&sks=b&skv=2024-08-04&sig=jB2sXlnuHK%2BW/TH2Y2cPSFnpStxpXVXfDmgy4h/iN%2BM%3D",
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
    image: "https://oaidalleapiprodscus.blob.core.windows.net/private/org-PewCPHQ0ZybeyMJy1CIeFiq5/user-jWpZi21A06vkntZI2hHSB3sD/img-THWbVE9qywU3EBj42AKd4ctw.png?st=2025-10-12T13%3A23%3A53Z&se=2025-10-12T15%3A23%3A53Z&sp=r&sv=2024-08-04&sr=b&rscd=inline&rsct=image/png&skoid=f1dafa11-a0c2-4092-91d4-10981fbda051&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2025-10-12T11%3A58%3A15Z&ske=2025-10-13T11%3A58%3A15Z&sks=b&skv=2024-08-04&sig=r5V3X2hQFClyz07ZaXYIDPOX8xVL3hQG4Nu9d6eM%2BZM%3D",
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
    image: "https://oaidalleapiprodscus.blob.core.windows.net/private/org-PewCPHQ0ZybeyMJy1CIeFiq5/user-jWpZi21A06vkntZI2hHSB3sD/img-08MjAr4kmrHsbKJCj9rPaKEO.png?st=2025-10-12T13%3A24%3A46Z&se=2025-10-12T15%3A24%3A46Z&sp=r&sv=2024-08-04&sr=b&rscd=inline&rsct=image/png&skoid=cc612491-d948-4d2e-9821-2683df3719f5&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2025-10-12T14%3A24%3A46Z&ske=2025-10-13T14%3A24%3A46Z&sks=b&skv=2024-08-04&sig=Tv7VFPJbv8T28PZrarmeNuIdTCsLiqYJAGDpMpJOeAg%3D",
    choices: [
      { label: "Dyk ned efter det glimtende", goto: "18" },
      { label: "Undersøg søen fra kanten", goto: "19" },
      { label: "Gå tilbage til forgreningen", goto: "10" }
    ]
  },
  "16": {
    id: "16",
    text: "Du går til højre og kommer til en stor kammer med en massiv trone i midten. På tronen sidder en skelettet konge med en glimtende krone på hovedet.",
    image: "https://oaidalleapiprodscus.blob.core.windows.net/private/org-PewCPHQ0ZybeyMJy1CIeFiq5/user-jWpZi21A06vkntZI2hHSB3sD/img-lmJ2Rqk6Ij6asCUVCH07TPMg.png?st=2025-10-12T13%3A25%3A02Z&se=2025-10-12T15%3A25%3A02Z&sp=r&sv=2024-08-04&sr=b&rscd=inline&rsct=image/png&skoid=ed3ea2f9-5e38-44be-9a1b-7c1e65e4d54f&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2025-10-12T08%3A56%3A54Z&ske=2025-10-13T08%3A56%3A54Z&sks=b&skv=2024-08-04&sig=4gzJ/Yz0jJa7O7GryyGKo7rb87O7%2BgIxf8hCNfSYGrY%3D",
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
    image: "https://oaidalleapiprodscus.blob.core.windows.net/private/org-PewCPHQ0ZybeyMJy1CIeFiq5/user-jWpZi21A06vkntZI2hHSB3sD/img-LWJFdHGJCek0PDL5h92D7eoA.png?st=2025-10-12T13%3A26%3A05Z&se=2025-10-12T15%3A26%3A05Z&sp=r&sv=2024-08-04&sr=b&rscd=inline&rsct=image/png&skoid=cc612491-d948-4d2e-9821-2683df3719f5&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2025-10-12T09%3A48%3A37Z&ske=2025-10-13T09%3A48%3A37Z&sks=b&skv=2024-08-04&sig=EI/Z38blqMCp04C3QjQYsuoD0btW%2Bn2eb4ogAFgPE84%3D",
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
