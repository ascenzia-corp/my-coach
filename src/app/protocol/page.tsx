import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-static";

export default function ProtocolPage() {
  return (
    <div className="space-y-4 p-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Protocole</h1>
        <p className="text-xs text-zinc-500">
          Coach personnel keto / IF / musculation — Laurent. Démarrage J1 reset : mardi 12 mai 2026.
        </p>
      </header>

      <Tabs defaultValue="profil">
        <TabsList>
          <TabsTrigger value="profil">Profil</TabsTrigger>
          <TabsTrigger value="reset">Reset J1</TabsTrigger>
          <TabsTrigger value="p1">Phase 1</TabsTrigger>
          <TabsTrigger value="p2">Phase 2</TabsTrigger>
          <TabsTrigger value="repas">Repas</TabsTrigger>
          <TabsTrigger value="train">Entraînement</TabsTrigger>
          <TabsTrigger value="alertes">Alertes</TabsTrigger>
          <TabsTrigger value="exc">Exceptions</TabsTrigger>
        </TabsList>

        <TabsContent value="profil">
          <Card>
            <CardContent className="prose-sm space-y-2 pt-4 text-sm">
              <ul className="list-disc space-y-1 pl-5">
                <li>Laurent, 52 ans, 181 cm, 97 kg, TT 108 cm, ~30 % MG.</li>
                <li>Cible T+16 semaines : 85 kg, TT ≤ 95 cm, MG ≤ 20 %.</li>
                <li>Rythme cible : 0,7–0,9 kg/semaine.</li>
                <li>Sédentaire bureau, tapis dispo en journée.</li>
                <li>Sommeil 7h30/nuit, qualité médiocre.</li>
                <li>TA habituelle 13/7.</li>
                <li>
                  <strong>Anticoagulant Eliquis (apixaban)</strong> — hydratation 3 L/j obligatoire,
                  surveiller saignements anormaux.
                </li>
                <li>Pas d&apos;alcool sauf 1–2 verres max en fête familiale.</li>
                <li>Messe dimanche 10h — silence push 9h30–12h.</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reset">
          <Card>
            <CardContent className="space-y-2 pt-4 text-sm">
              <p><strong>Mardi 12 mai 2026 (J1)</strong></p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Jeûne 35 h : dernier repas lundi 19h00 → premier repas mercredi 6h30.</li>
                <li>Hydratation : 3,5–4 L eau + 8 g sel + 800 mg magnésium + 2 g potassium.</li>
                <li>1 café noir max le matin, dernier à 11h.</li>
                <li>2 bouillons dégraissés (10h et 16h).</li>
                <li>Pas de training, marche extérieure 30 min possible.</li>
                <li>STOP si vertiges, palpitations, TA &lt; 11/6 → 3 œufs durs + avocat.</li>
                <li>Notifications Dispatch toutes les 2 h pour pilotage hydratation/électrolytes.</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="p1">
          <Card>
            <CardContent className="space-y-2 pt-4 text-sm">
              <p><strong>Phase 1 — Reset (S1–S4)</strong></p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Glucides nets &lt; 20 g/j.</li>
                <li>Protéines 150–160 g/j.</li>
                <li>Lipides à satiété.</li>
                <li>Piliers : œufs, saumon, maquereau, sardines, viande, volaille, beurre, huile olive/coco, avocat, fromages affinés.</li>
                <li>Interdits : céréales, sucres, fruits (sauf 50 g framboises/myrtilles si stagnation), légumineuses, racines amidonnées.</li>
                <li>Légumes verts : 300–500 g/j, libre.</li>
                <li>Hydratation 3 L/j MINIMUM (Eliquis).</li>
                <li>Électrolytes : 3–5 g sel + 400 mg magnésium + 1–2 g potassium.</li>
                <li>Café : 2 tasses max matin (dernière 11h) + 1 max post-déjeuner avant 13h30. 3ᵉ café coupé si sommeil &lt; 6/10 sur 3 jours.</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="p2">
          <Card>
            <CardContent className="space-y-2 pt-4 text-sm">
              <p><strong>Phase 2 — Maintenance cyclée (S5+)</strong></p>
              <ul className="list-disc space-y-1 pl-5">
                <li>30–40 g glucides nets/j en semaine, 50–60 g jours training intense.</li>
                <li>
                  Refeed dimanche midi : 80–120 g glucides nets (riz basmati, patate froide, fruit).
                  Jamais pâtisseries ni pain.
                </li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="repas">
          <Card>
            <CardContent className="space-y-3 pt-4 text-sm">
              <p><strong>Fenêtre 6h30 → 14h00</strong></p>
              <div>
                <p className="font-medium">6h30 — Petit-déjeuner</p>
                <p>3 œufs brouillés au beurre + 100 g saumon fumé ou 80 g lardons + 1 avocat + café noir.</p>
              </div>
              <div>
                <p className="font-medium">12h00 — Déjeuner</p>
                <p>180 g viande/poisson/volaille + 250 g légumes verts (beurre/huile olive) + 40 g fromage affiné + 30 g oléagineux.</p>
              </div>
              <div>
                <p className="font-medium">13h45 — Collation si faim</p>
                <p>2 œufs durs OU 50 g amandes OU 80 g blanc poulet + eau salée.</p>
              </div>
              <p className="text-zinc-500">≈ 1500–1700 kcal, 110–140 g prot, 100–130 g lip, &lt; 20 g gluc nets.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="train">
          <Card>
            <CardContent className="space-y-3 pt-4 text-sm">
              <p><strong>4 séances / semaine</strong></p>
              <ul className="space-y-1">
                <li><strong>Lundi 17h :</strong> PUSH (pecs/épaules/triceps) — 45 min.</li>
                <li><strong>Mardi journée :</strong> Tapis 1 h à 4–5 km/h pendant travail.</li>
                <li><strong>Mercredi 17h :</strong> PULL + JAMBES — 50 min.</li>
                <li><strong>Jeudi journée :</strong> Tapis 1 h.</li>
                <li><strong>Vendredi 17h :</strong> HIIT 25 min — 8 rounds 30s/30s.</li>
                <li><strong>Samedi 9h :</strong> ABDOS + mobilité 40 min + marche 45 min.</li>
                <li><strong>Dimanche :</strong> Repos actif (messe + marche famille).</li>
              </ul>
              <p className="text-zinc-500">
                Plafond équipement : 10 kg insuffisants au-delà S6 (squat, rowing, SDT). Acheter haltères réglables 2×25 kg ou kettlebell 16–20 kg avant S6.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alertes">
          <Card>
            <CardContent className="space-y-2 pt-4 text-sm">
              <p><strong>Eliquis (apixaban) — non négociable</strong></p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Hydratation 3 L/j MINIMUM (fonction rénale → élimination médicament).</li>
                <li>Surveiller : gencives qui saignent, ecchymoses, hématurie, selles noires.</li>
                <li>Jamais d&apos;arrêt brutal du médicament.</li>
              </ul>
              <p className="font-medium text-red-700">STOP & médecin immédiat si</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Vertiges persistants ou syncope.</li>
                <li>Palpitations.</li>
                <li>Saignement anormal.</li>
                <li>TA &lt; 11/6 ou &gt; 15/9.</li>
                <li>Perte &gt; 2 kg en 7 jours (déshydratation, pas gras).</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exc">
          <Card>
            <CardContent className="space-y-3 pt-4 text-sm">
              <div>
                <p className="font-medium">Voyages pro / repas clients</p>
                <p>Protéine + légumes verts + beurre/huile. Refus pain, pâtes, dessert, alcool (sauf 1 verre vin rouge max). Hôtel : œufs+bacon+avocat au breakfast. Avion/train : sardines+œufs durs+amandes. Jeûne peut glisser ±2h, jamais le cétogène.</p>
              </div>
              <div>
                <p className="font-medium">Fêtes familiales / paroissiales</p>
                <p>1–2 verres vin max. Refus gâteaux, pain, sucré. Refeed dominical absorbe la souplesse.</p>
              </div>
              <div>
                <p className="font-medium">Maladie</p>
                <p>Pause training OK, cétogène maintenu. Fièvre : bouillon + hydratation + électrolytes renforcés.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
