#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Configuration
const CONFIG = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  MODEL: 'dall-e-3',
  SIZE: '1024x1024',
  QUALITY: 'standard',
  STYLE: 'vivid'
};

class ImageGenerator {
  constructor() {
    this.apiKey = CONFIG.OPENAI_API_KEY;
    if (!this.apiKey) {
      throw new Error('OpenAI API key not found. Please set OPENAI_API_KEY in .env.local');
    }
  }

  async generateSceneImage(sceneText, sceneId) {
    try {
      console.log(`🎨 Generating image for scene ${sceneId}...`);
      
      // Create a more detailed prompt for better images
      const prompt = `Create a dramatic, atmospheric illustration for a Danish fantasy adventure game scene: "${sceneText}". The image should be dark, mysterious, and immersive with rich details. Style: digital art, fantasy RPG, high quality, cinematic lighting.`;
      
      const response = await axios.post('https://api.openai.com/v1/images/generations', {
        model: CONFIG.MODEL,
        prompt: prompt,
        size: CONFIG.SIZE,
        quality: CONFIG.QUALITY,
        style: CONFIG.STYLE,
        n: 1
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const imageUrl = response.data.data[0].url;
      console.log(`✅ Generated image for scene ${sceneId}: ${imageUrl}`);
      
      return imageUrl;
    } catch (error) {
      console.error(`❌ Failed to generate image for scene ${sceneId}:`, error.response?.data || error.message);
      return null;
    }
  }
}

// Story data - all scenes that need images
const STORY_SCENES = [
  { id: "1", text: "Du står ved indgangen til den mørke hule. En kold vind blæser ud fra åbningen, og du kan høre fjerne lyde derinde. Din fakkel kaster dansende skygger på væggene. Hvad gør du?" },
  { id: "2", text: "Du går forsigtigt ind i hulen. Efter et par meter opdager du at gulvet er dækket af løse sten og skarpe klippestykker. Du må være forsigtig for ikke at snuble." },
  { id: "3", text: "Du undersøger området omkring indgangen. I skyggerne finder du en gammel rusten dolk og en lille pose med guldmønter. Du samler dem op og føler dig bedre rustet til udfordringerne der venter." },
  { id: "4", text: "Du tænder en ekstra fakkel og holder den i din anden hånd. Nu har du bedre lys og føler dig mere sikker. Du går ind i hulen med begge fakler." },
  { id: "5", text: "Du navigerer elegant gennem stenene og kommer sikkert frem til en åbning dybere inde i hulen. Her opdager du en gammel trækiste med et rustent lås." },
  { id: "6", text: "Du snubler over stenene og falder hårdt. Du mister 2 Udholdenhed point, men kommer dig op igen. Du kan høre fjerne lyde fra dybere inde i hulen." },
  { id: "7", text: "Du finder ikke mere af interesse i området omkring indgangen. Du har nu en dolk og nogle guldmønter, og føler dig klar til at udforske hulen." },
  { id: "8", text: "Du prøver at åbne kisten, men låset er rustet fast. Du må bruge kraft for at få den op." },
  { id: "9", text: "Du undersøger kisten nærmere og opdager at der er runer indgraveret i træet. De ser ud til at være magiske." },
  { id: "10", text: "Du går videre uden at røre kisten og kommer til en forgrening i hulen. Du kan gå til venstre, højre eller ligeud." },
  { id: "11", text: "Du går til venstre og kommer til en lille kammer med en gammel skriftrulle på en stenpiedestal. Rullen glimter svagt i dit fakkellys." },
  { id: "12", text: "Du går ligeud og kommer til en stor åbning med en underjordisk sø. Vandet er krystalklart og du kan se noget glimtende på bunden." },
  { id: "13", text: "Du læser skriftrullen og opdager at den indeholder en besværgelse der kan åbne låste døre. Du føler magisk kraft strømme gennem dig." },
  { id: "14", text: "Du går tilbage til kisten og bruger besværgelsen. Kisten åbner sig med et klik og afslører magiske genstande og guld." },
  { id: "15", text: "Du går til højre og kommer til en stor kammer med en massiv trone i midten. På tronen sidder en skelettet konge med en glimtende krone på hovedet." },
  { id: "16", text: "Du går til højre og kommer til en stor kammer med en massiv trone i midten. På tronen sidder en skelettet konge med en glimtende krone på hovedet." },
  { id: "17", text: "Med dine nye magiske genstande føler du dig stærkere og mere rustet. Du fortsætter dybere ind i hulen, klar til nye udfordringer." },
  { id: "18", text: "Du dykker ned i det kolde vand. Det er dybere end du troede, og du må holde vejret længe." },
  { id: "19", text: "Du undersøger søen fra kanten og opdager at det glimtende på bunden er en guldmønt. Du kan se flere mønter spredt rundt på bunden." },
  { id: "20", text: "Du går hen til tronen. Når du nærmer dig, begynder skelettet at bevæge sig! Kongen rejser sig op og stirrer på dig med tomme øjenhuler." },
  { id: "21", text: "Du undersøger kammeret forsigtigt og opdager at der er flere udgange. Du kan også se at kongens krone glimter magisk." },
  { id: "22", text: "Du dykker ned og samler flere guldmønter op. Når du kommer op igen, har du fundet en værdifuld skat!" },
  { id: "23", text: "Du må op til overfladen for at trække vejret. Du mister 2 Udholdenhed point, men overlever. Du kan se mønterne på bunden, men tør ikke dykke igen." },
  { id: "24", text: "Du holder dit mod og stirrer tilbage på kongen. Pludselig nikker skelettet respektfuldt og sætter sig ned igen. Du kan tage kronen uden problemer!" },
  { id: "25", text: "Du bliver skræmt og træder tilbage. Kongen rejser sig og begynder at gå mod dig. Du må kæmpe eller flygte!" },
  { id: "26", text: "Du undersøger de andre udgange og finder en hemmelig passage der fører til en skjult skattekammer. Her finder du magiske genstande og guld!" },
  { id: "27", text: "Du tager kronen og føler en magisk kraft strømme gennem dig. Du har nu fundet en af hulens største skatte!" },
  { id: "28", text: "Du kæmper mod den døde konge. Det bliver en hård kamp!" },
  { id: "29", text: "Du besejrer kongen og kan nu tage kronen og alle skattene i kammeret. Du har gennemført en episk sejr!" },
  { id: "30", text: "Kongen besejrer dig i kampen. Du mister 3 Udholdenhed point og må flygte tilbage til forgreningen." }
];

async function main() {
  console.log('🚀 Starting AI image generation for all story scenes...\n');
  
  const generator = new ImageGenerator();
  const results = [];
  
  for (const scene of STORY_SCENES) {
    const imageUrl = await generator.generateSceneImage(scene.text, scene.id);
    
    results.push({
      id: scene.id,
      text: scene.text,
      image: imageUrl || ''
    });
    
    // Add delay to avoid rate limits
    console.log('⏳ Waiting 2 seconds to avoid rate limits...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Generate CSV content
  console.log('\n📝 Generating CSV content...');
  const csvHeader = 'id,tekst,image,valg1_label,valg1_goto,valg2_label,valg2_goto,valg3_label,valg3_goto,check_stat,check_dc,check_success,check_fail';
  
  const csvRows = results.map(scene => {
    // For now, just include the basic scene data
    // You can manually add choices and checks in Google Sheets
    return `"${scene.id}","${scene.text}","${scene.image}","","","","","","","","","",""`;
  });
  
  const csvContent = [csvHeader, ...csvRows].join('\n');
  
  // Save to file
  const outputPath = path.join(__dirname, '../generated-story-with-images.csv');
  fs.writeFileSync(outputPath, csvContent, 'utf8');
  
  console.log(`\n✅ Generated ${results.length} images!`);
  console.log(`📄 CSV file saved to: ${outputPath}`);
  console.log('\n🎯 Next steps:');
  console.log('1. Open the generated CSV file');
  console.log('2. Copy the image URLs to your Google Sheet');
  console.log('3. Add choices and checks manually in Google Sheets');
  console.log('\n📊 Summary:');
  results.forEach(scene => {
    if (scene.image) {
      console.log(`✅ Scene ${scene.id}: Image generated`);
    } else {
      console.log(`❌ Scene ${scene.id}: Failed to generate image`);
    }
  });
}

if (require.main === module) {
  main().catch(console.error);
}
