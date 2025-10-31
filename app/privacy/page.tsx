import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privatlivspolitik - TTS Historier Platform',
  description: 'Privatlivspolitik for vores interaktive TTS historier platform',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Privatlivspolitik</h1>
        
        <div className="space-y-6 text-gray-300">
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">1. Information Vi Indsamler</h2>
            <p className="mb-2">Vi indsamler følgende information:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>E-mailadresse:</strong> Indsamlet under køb for ordrebekræftelse og kontostyring</li>
              <li><strong>Betalingsinformation:</strong> Behandlet sikkert gennem Stripe - vi gemmer aldrig dine betalingsoplysninger</li>
              <li><strong>Brugsdata:</strong> Historier der tilgås, købshistorik og navigationsmønstre</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">2. Sådan Bruger Vi Din Information</h2>
            <p className="mb-2">Vi bruger din information til:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Behandle dine køb og abonnementer</li>
              <li>Give adgang til købt indhold</li>
              <li>Sende ordrebekræftelser og vigtige opdateringer</li>
              <li>Forbedre vores service baseret på brugsmønstre</li>
              <li>Besvare supportanmodninger</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">3. Tredjepartstjenester</h2>
            <p>
              Vi bruger følgende tredjepartstjenester, der kan indsamle information:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Stripe:</strong> Betalingsbehandling (se Stripes privatlivspolitik)</li>
              <li><strong>Supabase:</strong> Database og autentificering (se Supabases privatlivspolitik)</li>
              <li><strong>Vercel:</strong> Hosting og analyser (se Vercels privatlivspolitik)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">4. Datasikkerhed</h2>
            <p>
              Vi implementerer passende tekniske og organisatoriske foranstaltninger for at beskytte dine personlige oplysninger. 
              Al betalingsinformation krypteres og behandles af Stripe i overensstemmelse med PCI DSS-standarder.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">5. Dine Rettigheder (GDPR)</h2>
            <p className="mb-2">Under GDPR har du ret til:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Tilgå dine personlige data</li>
              <li>Anmode om rettelse af unøjagtige data</li>
              <li>Anmode om sletning af dine data</li>
              <li>Indvende mod behandling af dine data</li>
              <li>Dataportabilitet</li>
              <li>Trække samtykke tilbage når som helst</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">6. Cookies</h2>
            <p>
              Vi bruger cookies til at opretholde din session og huske dine præferencer. Disse er essentielle for 
              at platformen fungerer ordentligt. Du kan deaktivere cookies i din browser, men dette kan påvirke 
              platformens funktionalitet.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">7. Børns Privatliv</h2>
            <p>
              Vores platform kan være egnet til børn, men vi anbefaler forældretilsyn under brug. 
              Vi indsamler ikke bevidst personlige oplysninger fra børn under 13 uden forældres samtykke.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">8. Internationale Dataoverførsler</h2>
            <p>
              Dine data kan overføres til og behandles i USA og andre lande, hvor 
              vores serviceudbydere opererer. Vi sikrer, at passende foranstaltninger er på plads.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">9. Kontakt</h2>
            <p>
              For privatlivsrelaterede henvendelser eller for at udøve dine rettigheder, kontakt venligst os gennem vores 
              supportkanaler med &quot;Privatlivshenvendelse&quot; i emnelinjen.
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

