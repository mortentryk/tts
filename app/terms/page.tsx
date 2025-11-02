import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Servicevilkår - TTS Historier Platform',
  description: 'Servicevilkår for vores interaktive TTS historier platform',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Servicevilkår</h1>
        
        <div className="space-y-6 text-gray-300">
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">1. Godkendelse af Vilkår</h2>
            <p>
              Ved at tilgå og bruge denne platform accepterer og accepterer du at være bundet af disse servicevilkår. 
              Hvis du ikke accepterer disse vilkår, skal du ikke bruge vores service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">2. Beskrivelse af Service</h2>
            <p>
              Vi leverer en interaktiv historieplatform med tekst-til-tale fortælling, stemmekommandoer og multimedieindhold. 
              Historier er tilgængelige til køb enkeltvis eller gennem en abonnementsplan.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">3. Brugerkonti</h2>
            <p>
              Du kan tilgå vores service som gæst med kun e-mail-autentificering. Du er ansvarlig for at opretholde 
              sikkerheden af din e-mailadresse og for alle aktiviteter, der forekommer under din konto.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">4. Køb og Abonnementer</h2>
            <p>
              <strong>Engangskøb:</strong> Enkelte historier kan købes for et engangsbeløb. Når du har købt, 
              har du livstidsadgang til den historie.
            </p>
            <p>
              <strong>Abonnementer:</strong> Abonnementer giver adgang til alle historier i den aktive abonnementsperiode. 
              Abonnementer faktureres månedligt og kan annulleres når som helst.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">5. Refusioner</h2>
            <p>
              På grund af den digitale karakter af vores indhold gives refusioner generelt ikke. Hvis du oplever 
              tekniske problemer, der forhindrer dig i at få adgang til købt indhold, skal du kontakte vores supportteam.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">6. Intellektuel Ejendomsret</h2>
            <p>
              Alt indhold, herunder historier, billeder og lyd, er beskyttet af ophavsret og andre immaterielle rettighedslove. 
              Du må ikke reproducere, distribuere eller skabe afledte værker uden udtrykkelig tilladelse.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">7. Ansvarsbegrænsning</h2>
            <p>
              Vi stræber efter at levere en pålidelig service, men garanterer ikke uafbrudt adgang. Vi er ikke ansvarlige for nogen 
              skader, der følger af brug eller manglende evne til at bruge vores service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">8. Ændringer i Vilkår</h2>
            <p>
              Vi forbeholder os retten til at ændre disse vilkår når som helst. Fortsat brug af servicen efter ændringer 
              betyder accept af de nye vilkår.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">9. Kontakt</h2>
            <p>
              For spørgsmål om disse vilkår, kontakt venligst os gennem vores supportkanaler.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-700">
          <p className="text-sm text-gray-400">
            Sidst opdateret: {new Date().toLocaleDateString('da-DK')}
          </p>
        </div>
      </div>
    </div>
  );
}

