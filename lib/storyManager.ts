// storyManager.ts – Enhanced story management for multiple stories
import { StoryNode, StoryMetadata } from '../types/game';

// Story metadata - in a real app, this could come from a database or API
const STORY_METADATA: StoryMetadata[] = [
  {
    id: "cave-adventure",
    title: "The Dark Cave",
    description: "Explore a mysterious cave filled with treasures and dangers. Navigate through dark passages, solve puzzles, and face the challenges that await in the depths.",
    author: "Adventure Master",
    difficulty: "medium",
    estimatedTime: "15-20 minutes"
  },
  {
    id: "forest-quest",
    title: "The Enchanted Forest",
    description: "Journey through magical woods where ancient trees whisper secrets and mystical creatures roam. Discover hidden glades and unlock the forest's mysteries.",
    author: "Nature Sage",
    difficulty: "easy",
    estimatedTime: "10-15 minutes"
  },
  {
    id: "dragon-lair",
    title: "Dragon's Lair",
    description: "Face the ultimate challenge in the dragon's lair. Only the bravest adventurers dare enter this realm of fire and gold.",
    author: "Dragon Slayer",
    difficulty: "hard",
    estimatedTime: "20-30 minutes"
  },
  {
    id: "skonhedenogudyret",
    title: "Skønhed og Udyret",
    description: "En dansk fortælling om skønhed, mod og forvandling. En interaktiv historie med stemmestyring og terningekast.",
    author: "Danish Storyteller",
    difficulty: "medium",
    estimatedTime: "20-30 minutes"
  }
];

// Story data URLs - each story can have its own Google Sheet
const STORY_DATA_URLS: Record<string, string> = {
  "cave-adventure": "", // Temporarily using fallback data
  "forest-quest": "", // Forest story URL  
  "dragon-lair": "", // Dragon story URL
  "skonhedenogudyret": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQj01dDmjG2S4sXBXeLmZJMOzoowcP-Neq7H9BVlX4qt_Hr2T8HDcu21ZYQxJifhOKjKesv8Yl-7F9x/pub?output=csv" // Danish Beauty and the Beast story
};

// Fallback stories for each story ID
const FALLBACK_STORIES: Record<string, Record<string, StoryNode>> = {
  "cave-adventure": {
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
        stat: "Evner" as keyof import('../types/game').GameStats,
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
      text: "Du fortsætter dybere ind i hulen og opdager en forgrening. Til venstre hører du mumlende stemmer, til højre ser du et svagt lys.",
      choices: [
        { label: "Gå til venstre mod stemmerne", goto: "8" },
        { label: "Gå til højre mod lyset", goto: "9" }
      ]
    },
    "8": {
      id: "8",
      text: "Du følger stemmerne og finder en gruppe af gamle munke der mediterer. De inviterer dig til at deltage i deres ritual.",
      choices: [
        { label: "Deltag i ritualet", goto: "10" },
        { label: "Tak nej og gå tilbage", goto: "7" }
      ]
    },
    "9": {
      id: "9",
      text: "Du følger lyset og finder en skjult kammer med en guldskat! Men du opdager også at der er en fælde.",
      choices: [
        { label: "Prøv at tage skatten", goto: "11" },
        { label: "Undersøg fælden først", goto: "12" }
      ]
    },
    "10": {
      id: "10",
      text: "Du deltager i ritualet og føler en magisk kraft strømme gennem dig. Munkene giver dig en velsignelse.",
      choices: [
        { label: "Fortsæt din rejse", goto: "7" }
      ]
    },
    "11": {
      id: "11",
      text: "Du tager skatten, men fælden aktiveres! Du må kæmpe for at undslippe.",
      check: {
        stat: "Evner" as keyof import('../types/game').GameStats,
        dc: 10,
        success: "13",
        fail: "14"
      }
    },
    "12": {
      id: "12",
      text: "Du undersøger fælden og finder ud af hvordan du kan deaktivere den. Nu kan du tage skatten sikkert!",
      choices: [
        { label: "Tag skatten", goto: "13" }
      ]
    },
    "13": {
      id: "13",
      text: "Du har fundet en stor skat og undsluppet fælden! Du føler dig som en ægte eventyrer.",
      choices: [
        { label: "Fortsæt din rejse", goto: "7" }
      ]
    },
    "14": {
      id: "14",
      text: "Du bliver fanget af fælden og mister skatten. Du må starte forfra.",
      choices: [
        { label: "Prøv igen", goto: "1" }
      ]
    }
  },
  "forest-quest": {
    "1": {
      id: "1",
      text: "Du står ved indgangen til den fortryllede skov. Gamle træer hvisker mystiske ord, og du kan høre fjerne lyde fra dyrene derinde. Hvad gør du?",
      choices: [
        { label: "Gå forsigtigt ind i skoven", goto: "2" },
        { label: "Lyt til træernes hvisken", goto: "3" },
        { label: "Undersøg området omkring indgangen", goto: "4" }
      ]
    },
    "2": {
      id: "2",
      text: "Du går ind i skoven og føler en magisk aura omkring dig. Træerne ser ud til at bevæge sig, og du kan høre fjerne stemmer.",
      choices: [
        { label: "Følg stemmerne", goto: "5" },
        { label: "Undersøg de bevægende træer", goto: "6" }
      ]
    },
    "3": {
      id: "3",
      text: "Du lytter til træernes hvisken og forstår at de advarer dig om fare længere inde i skoven. Men de tilbyder også deres hjælp.",
      choices: [
        { label: "Tak for advarslen og gå ind", goto: "2" },
        { label: "Spørg om deres hjælp", goto: "7" }
      ]
    },
    "4": {
      id: "4",
      text: "Du undersøger området og finder en gammel runesten med magiske symboler. Den ser ud til at have en besked til dig.",
      choices: [
        { label: "Læs runerne", goto: "8" },
        { label: "Ignorer stenen og gå ind i skoven", goto: "2" }
      ]
    },
    "5": {
      id: "5",
      text: "Du følger stemmerne og finder en skjult glade hvor en gruppe af skovalfer danser. De inviterer dig til at deltage.",
      choices: [
        { label: "Deltag i dansen", goto: "9" },
        { label: "Tak nej og gå videre", goto: "10" }
      ]
    },
    "6": {
      id: "6",
      text: "Du undersøger de bevægende træer og opdager at de er gamle trævogtere. De fortæller dig om skovens hemmeligheder.",
      choices: [
        { label: "Lyt til deres historier", goto: "11" },
        { label: "Spørg om vejledning", goto: "12" }
      ]
    },
    "7": {
      id: "7",
      text: "Træerne tilbyder dig en magisk beskyttelse og en vejledning gennem skoven. Du føler dig mere sikker nu.",
      choices: [
        { label: "Fortsæt ind i skoven", goto: "2" }
      ]
    },
    "8": {
      id: "8",
      text: "Du læser runerne og forstår at de advarer om en farlig skabning dybere inde i skoven. Men de giver også dig en beskyttende formular.",
      choices: [
        { label: "Brug beskyttelsen og gå ind", goto: "2" },
        { label: "Ignorer advarslen", goto: "2" }
      ]
    },
    "9": {
      id: "9",
      text: "Du danser med alferne og føler en magisk kraft strømme gennem dig. De giver dig en velsignelse og en magisk genstand.",
      choices: [
        { label: "Fortsæt din rejse", goto: "10" }
      ]
    },
    "10": {
      id: "10",
      text: "Du fortsætter dybere ind i skoven og opdager en forgrening. Til venstre hører du vand der risler, til højre ser du et svagt lys.",
      choices: [
        { label: "Gå til venstre mod vandet", goto: "13" },
        { label: "Gå til højre mod lyset", goto: "14" }
      ]
    },
    "11": {
      id: "11",
      text: "Trævogterne fortæller dig om skovens historie og giver dig vigtig viden om de farer der venter.",
      choices: [
        { label: "Fortsæt din rejse", goto: "10" }
      ]
    },
    "12": {
      id: "12",
      text: "Trævogterne giver dig en magisk vejledning og en beskyttende amulet. Du føler dig bedre rustet til udfordringerne.",
      choices: [
        { label: "Fortsæt din rejse", goto: "10" }
      ]
    },
    "13": {
      id: "13",
      text: "Du følger vandet og finder en smuk vandfald med krystalklart vand. Der er en skjult indgang bag vandfaldet.",
      choices: [
        { label: "Gå gennem vandfaldet", goto: "15" },
        { label: "Undersøg området først", goto: "16" }
      ]
    },
    "14": {
      id: "14",
      text: "Du følger lyset og finder en skjult glade med en gammel træhytte. Der er lys i vinduerne.",
      choices: [
        { label: "Bank på døren", goto: "17" },
        { label: "Kig ind gennem vinduet", goto: "18" }
      ]
    },
    "15": {
      id: "15",
      text: "Du går gennem vandfaldet og finder en skjult kammer med gamle skatte og magiske genstande!",
      choices: [
        { label: "Undersøg skattene", goto: "19" },
        { label: "Tag en genstand og gå", goto: "20" }
      ]
    },
    "16": {
      id: "16",
      text: "Du undersøger området og opdager at der er en fælde ved vandfaldet. Du kan deaktivere den og gå sikkert igennem.",
      choices: [
        { label: "Gå gennem vandfaldet", goto: "15" }
      ]
    },
    "17": {
      id: "17",
      text: "Du banker på døren og en venlig gammel skovmand åbner. Han inviterer dig ind og fortæller dig om skovens hemmeligheder.",
      choices: [
        { label: "Lyt til hans historier", goto: "21" },
        { label: "Spørg om hjælp", goto: "22" }
      ]
    },
    "18": {
      id: "18",
      text: "Du kigger ind gennem vinduet og ser at der er en gammel skovmand der læser i en bog. Han ser venlig ud.",
      choices: [
        { label: "Bank på døren", goto: "17" },
        { label: "Gå videre", goto: "10" }
      ]
    },
    "19": {
      id: "19",
      text: "Du undersøger skattene og finder magiske genstande, gamle bøger og kostbare ædelstene. Du har fundet en rig skat!",
      choices: [
        { label: "Tag nogle genstande", goto: "20" },
        { label: "Lad alt ligge og gå", goto: "10" }
      ]
    },
    "20": {
      id: "20",
      text: "Du tager en magisk genstand og føler dig stærkere. Du har succesfuldt gennemført din rejse gennem den fortryllede skov!",
      choices: [
        { label: "Fortsæt din rejse", goto: "10" }
      ]
    },
    "21": {
      id: "21",
      text: "Skovmanden fortæller dig om skovens historie og giver dig vigtig viden om de magiske kræfter der bor her.",
      choices: [
        { label: "Fortsæt din rejse", goto: "10" }
      ]
    },
    "22": {
      id: "22",
      text: "Skovmanden giver dig en magisk vejledning og en beskyttende amulet. Du føler dig bedre rustet til udfordringerne.",
      choices: [
        { label: "Fortsæt din rejse", goto: "10" }
      ]
    }
  },
  "dragon-lair": {
    "1": {
      id: "1",
      text: "Du står foran indgangen til dragenes hule. Varmen fra ildene inde kan mærkes på lang afstand, og du kan høre den mægtige dragens åndedræt. Dette er den ultimative udfordring. Hvad gør du?",
      choices: [
        { label: "Gå modigt ind i hulen", goto: "2" },
        { label: "Undersøg området omkring indgangen", goto: "3" },
        { label: "Prøv at kommunikere med dragen", goto: "4" }
      ]
    },
    "2": {
      id: "2",
      text: "Du går ind i hulen og møder øjeblikkelig den mægtige drage. Dens øjne gløder som ild, og dens skæl glimter i lyset. Drage ser dig direkte i øjnene.",
      check: {
        stat: "Evner" as keyof import('../types/game').GameStats,
        dc: 12,
        success: "5",
        fail: "6"
      }
    },
    "3": {
      id: "3",
      text: "Du undersøger området og finder gamle våben og rustninger fra tidligere eventyrere. Du finder også en gammel dragebog med vigtig viden.",
      choices: [
        { label: "Tag våbnene og gå ind", goto: "7" },
        { label: "Læs dragebogen først", goto: "8" }
      ]
    },
    "4": {
      id: "4",
      text: "Du prøver at kommunikere med dragen gennem hulen. Til din overraskelse svarer den med en dyb, rumlende stemme.",
      choices: [
        { label: "Fortsæt samtalen", goto: "9" },
        { label: "Gå ind i hulen", goto: "2" }
      ]
    },
    "5": {
      id: "5",
      text: "Du holder dit mod og stirrer tilbage på dragen. Den respekterer din mod og nikker respektfuldt. Drage tilbyder dig en udfordring i stedet for kamp.",
      choices: [
        { label: "Accepter udfordringen", goto: "10" },
        { label: "Foreslå en anden løsning", goto: "11" }
      ]
    },
    "6": {
      id: "6",
      text: "Du bliver overvældet af dragens mægtige tilstedeværelse og træder tilbage. Drage ser på dig med interesse.",
      choices: [
        { label: "Prøv igen med mere mod", goto: "2" },
        { label: "Flygt fra hulen", goto: "12" }
      ]
    },
    "7": {
      id: "7",
      text: "Du tager de gamle våben og går ind i hulen. Drage ser dig komme med våben og reagerer aggressivt.",
      check: {
        stat: "Evner" as keyof import('../types/game').GameStats,
        dc: 15,
        success: "13",
        fail: "14"
      }
    },
    "8": {
      id: "8",
      text: "Du læser dragebogen og lærer om dragens svagheder og styrker. Du forstår også at dragen respekterer mod og visdom mere end styrke.",
      choices: [
        { label: "Gå ind med din nye viden", goto: "2" },
        { label: "Prøv en anden tilgang", goto: "4" }
      ]
    },
    "9": {
      id: "9",
      text: "Dragen fortæller dig at den har ventet på en værdig udfordrer. Den tilbyder dig en række udfordringer for at bevise din værdighed.",
      choices: [
        { label: "Accepter udfordringerne", goto: "10" },
        { label: "Spørg om alternativer", goto: "11" }
      ]
    },
    "10": {
      id: "10",
      text: "Dragen præsenterer dig for tre udfordringer: en test af mod, en test af visdom, og en test af styrke. Du må gennemføre dem alle for at bevise din værdighed.",
      choices: [
        { label: "Start med mod-testen", goto: "15" },
        { label: "Start med visdom-testen", goto: "16" },
        { label: "Start med styrke-testen", goto: "17" }
      ]
    },
    "11": {
      id: "11",
      text: "Dragen lytter til dine forslag og accepterer at finde en mere passende løsning. Den tilbyder dig en chance for at bevise din værdighed på en anden måde.",
      choices: [
        { label: "Accepter den nye løsning", goto: "18" },
        { label: "Insistér på udfordringerne", goto: "10" }
      ]
    },
    "12": {
      id: "12",
      text: "Du flygter fra hulen og overlever, men du har ikke gennemført din mission. Du må prøve igen senere.",
      choices: [
        { label: "Prøv igen", goto: "1" }
      ]
    },
    "13": {
      id: "13",
      text: "Du kæmper mod dragen med de gamle våben og vinder! Drage anerkender din styrke og tilbyder dig en del af sin skat.",
      choices: [
        { label: "Accepter skatten", goto: "19" },
        { label: "Foreslå en alliance", goto: "20" }
      ]
    },
    "14": {
      id: "14",
      text: "Dragen overvinder dig i kamp, men sparer dit liv. Den tilbyder dig en chance for at bevise din værdighed på en anden måde.",
      choices: [
        { label: "Accepter chancen", goto: "10" },
        { label: "Flygt fra hulen", goto: "12" }
      ]
    },
    "15": {
      id: "15",
      text: "Dragen præsenterer dig for en test af mod: du skal gå gennem en gang fyldt med ild og død. Kun de modigste kan gennemføre denne test.",
      check: {
        stat: "Evner" as keyof import('../types/game').GameStats,
        dc: 10,
        success: "21",
        fail: "22"
      }
    },
    "16": {
      id: "16",
      text: "Dragen præsenterer dig for en test af visdom: du skal løse en gammel gåde og finde den skjulte passage. Kun de klogeste kan gennemføre denne test.",
      check: {
        stat: "Evner" as keyof import('../types/game').GameStats,
        dc: 8,
        success: "23",
        fail: "24"
      }
    },
    "17": {
      id: "17",
      text: "Dragen præsenterer dig for en test af styrke: du skal løfte en mægtig sten og åbne en port. Kun de stærkeste kan gennemføre denne test.",
      check: {
        stat: "Udholdenhed" as keyof import('../types/game').GameStats,
        dc: 12,
        success: "25",
        fail: "26"
      }
    },
    "18": {
      id: "18",
      text: "Dragen accepterer din alternative løsning og præsenterer dig for en test af karakter: du skal bevise at du er værdig til at modtage dragens velsignelse.",
      choices: [
        { label: "Accepter testen", goto: "27" },
        { label: "Foreslå en anden løsning", goto: "11" }
      ]
    },
    "19": {
      id: "19",
      text: "Du accepterer skatten og dragen giver dig en del af sin mægtige samling. Du har succesfuldt gennemført din mission!",
      choices: [
        { label: "Tak dragen og gå", goto: "28" }
      ]
    },
    "20": {
      id: "20",
      text: "Du foreslår en alliance med dragen, og den accepterer! Drage bliver din allierede og giver dig sin velsignelse.",
      choices: [
        { label: "Fortsæt med din nye allierede", goto: "28" }
      ]
    },
    "21": {
      id: "21",
      text: "Du gennemfører mod-testen med succes! Drage er imponeret over din mod og giver dig sin velsignelse.",
      choices: [
        { label: "Fortsæt til næste test", goto: "29" }
      ]
    },
    "22": {
      id: "22",
      text: "Du fejler mod-testen, men dragen giver dig en chance til at prøve igen. Du må være mere modig denne gang.",
      choices: [
        { label: "Prøv igen", goto: "15" },
        { label: "Prøv en anden test", goto: "16" }
      ]
    },
    "23": {
      id: "23",
      text: "Du gennemfører visdom-testen med succes! Drage er imponeret over din klogskab og giver dig sin velsignelse.",
      choices: [
        { label: "Fortsæt til næste test", goto: "29" }
      ]
    },
    "24": {
      id: "24",
      text: "Du fejler visdom-testen, men dragen giver dig en chance til at prøve igen. Du må tænke mere dybt denne gang.",
      choices: [
        { label: "Prøv igen", goto: "16" },
        { label: "Prøv en anden test", goto: "17" }
      ]
    },
    "25": {
      id: "25",
      text: "Du gennemfører styrke-testen med succes! Drage er imponeret over din styrke og giver dig sin velsignelse.",
      choices: [
        { label: "Fortsæt til næste test", goto: "29" }
      ]
    },
    "26": {
      id: "26",
      text: "Du fejler styrke-testen, men dragen giver dig en chance til at prøve igen. Du må være stærkere denne gang.",
      choices: [
        { label: "Prøv igen", goto: "17" },
        { label: "Prøv en anden test", goto: "15" }
      ]
    },
    "27": {
      id: "27",
      text: "Du gennemfører karakter-testen med succes! Drage anerkender din værdighed og giver dig sin velsignelse.",
      choices: [
        { label: "Fortsæt din rejse", goto: "28" }
      ]
    },
    "28": {
      id: "28",
      text: "Du har succesfuldt gennemført din mission i dragenes hule! Drage respekterer dig og giver dig sin velsignelse. Du føler dig som en ægte helt.",
      choices: [
        { label: "Fortsæt din rejse", goto: "1" }
      ]
    },
    "29": {
      id: "29",
      text: "Du har gennemført en af udfordringerne! Drage er imponeret over din præstation. Du har kun to tests tilbage.",
      choices: [
        { label: "Fortsæt til næste test", goto: "30" }
      ]
    },
    "30": {
      id: "30",
      text: "Du har gennemført to af udfordringerne! Drage er meget imponeret over din præstation. Du har kun én test tilbage.",
      choices: [
        { label: "Fortsæt til sidste test", goto: "31" }
      ]
    },
    "31": {
      id: "31",
      text: "Du har gennemført alle tre udfordringer! Drage er ekstremt imponeret over din præstation og giver dig sin højeste velsignelse. Du har bevist din værdighed!",
      choices: [
        { label: "Fortsæt din rejse", goto: "28" }
      ]
    }
  }
};

export async function loadStoryList(): Promise<StoryMetadata[]> {
  // In a real app, this could come from a database or API
  return STORY_METADATA;
}

export async function loadStoryById(storyId: string): Promise<Record<string, StoryNode>> {
  try {
    // Try to load from Google Sheets first
    const sheetUrl = STORY_DATA_URLS[storyId];
    console.log(`🔍 Attempting to load story ${storyId} from:`, sheetUrl);
    
    if (sheetUrl) {
      try {
        const res = await fetch(sheetUrl, { 
          cache: "no-store",
          headers: {
            'Accept': 'application/json,text/csv,*/*',
            'User-Agent': 'Mozilla/5.0 (compatible; TTS-Books/1.0)'
          }
        });
        
        console.log(`📡 Fetch response for ${storyId}:`, res.status, res.ok);
        
        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          console.log(`📄 Content-Type: ${contentType}`);
          
          // Try to parse as JSON first (Google Apps Script returns JSON)
          if (contentType.includes('application/json') || contentType.includes('text/html')) {
            try {
              const storyData = await res.json();
              console.log(`Google Apps Script response for ${storyId}:`, storyData);
              if (storyData.nodes && Object.keys(storyData.nodes).length > 0) {
                console.log(`✅ Loaded story from Google Apps Script: ${storyId} with ${Object.keys(storyData.nodes).length} nodes`);
                return storyData.nodes;
              } else {
                console.log(`❌ Story data missing nodes:`, storyData);
              }
            } catch (jsonError) {
              console.log(`❌ Failed to parse as JSON, trying CSV: ${jsonError}`);
            }
          }
          
          // Fallback to CSV parsing
          const csvText = await res.text();
          console.log(`📄 CSV text length: ${csvText.length}`);
          
          if (csvText && csvText.length > 0 && !csvText.includes('<HTML>')) {
            const rows = parseCSV(csvText);
            const story = buildStoryObject(rows);
            
            if (Object.keys(story).length > 0) {
              console.log(`✅ Loaded story from CSV: ${storyId} with ${Object.keys(story).length} nodes`);
              return story;
            }
          }
        } else {
          console.log(`❌ HTTP Error: ${res.status} ${res.statusText}`);
        }
      } catch (fetchError) {
        console.error(`❌ Fetch error for ${storyId}:`, fetchError);
      }
    }
    
    // Fall back to static story data
    const fallbackStory = FALLBACK_STORIES[storyId];
    if (fallbackStory) {
      console.log(`⚠️ Using fallback story for ${storyId} - Google Sheets connection failed`);
      return fallbackStory;
    }
    
    throw new Error(`Story not found: ${storyId}`);
  } catch (err) {
    console.error(`Failed to load story ${storyId}:`, err);
    throw err;
  }
}

function parseCSV(csv: string) {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, "").trim());
  return lines.slice(1).map(line => {
    const cols = line.split(',');
    return headers.reduce((obj, h, i) => {
      obj[h] = (cols[i] || "").replace(/^"|"$/g, "").trim();
      return obj;
    }, {} as any);
  });
}

function buildStoryObject(rows: any[]) {
  const story: Record<string, any> = {};
  for (const row of rows) {
    const id = (row.id || "").trim();
    if (!id) continue;
    const scene: any = { 
      id, 
      text: row.tekst || "", 
      choices: [],
      // Add media fields if present
      ...(row.image && { image: row.image.trim() }),
      ...(row.video && { video: row.video.trim() }),
      ...(row.backgroundImage && { backgroundImage: row.backgroundImage.trim() }),
      ...(row.audio && { audio: row.audio.trim() })
    };
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
        stat: (row.check_stat || "") as keyof import('../types/game').GameStats,
        dc: isNaN(Number(row.check_dc)) ? 0 : Number(row.check_dc),
        success: row.check_success || "",
        fail: row.check_fail || ""
      };
    }
    story[id] = scene;
  }
  return story;
}
