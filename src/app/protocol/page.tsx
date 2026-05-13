"use client";

import Link from "next/link";
import { useState } from "react";
import { HF, HFCard } from "@/components/hf";

interface Section {
  n: string;
  tint: string;
  title: string;
  sub: string;
  pages: number;
  body: () => React.ReactNode;
}

const SECTIONS: Section[] = [
  {
    n: "01",
    tint: HF.green,
    title: "Régime cétogène",
    sub: "Macros · aliments OK / KO · phase 1 & 2",
    pages: 12,
    body: () => (
      <Body>
        <Row label="Phase 1 (S1–S4)" body="Glucides nets &lt; 20 g/j. Protéines 150–160 g/j. Lipides à satiété." />
        <Row
          label="Phase 2 (S5+)"
          body="30–40 g glucides nets/j semaine, 50–60 g jours training. Refeed dimanche midi : 80–120 g (riz basmati, patate froide, fruit). Jamais pâtisseries ni pain."
        />
        <Row label="OK" body="Œufs, saumon, maquereau, sardines, viande, volaille, beurre, huile olive/coco, avocat, fromages affinés, légumes verts 300–500 g/j." />
        <Row label="KO" body="Céréales, sucres, fruits (sauf 50 g framboises/myrtilles si stagnation), légumineuses, racines amidonnées." />
      </Body>
    ),
  },
  {
    n: "02",
    tint: HF.indigo,
    title: "Jeûne 16:8",
    sub: "Fenêtre 6h30 → 14h00 · électrolytes · rompre",
    pages: 8,
    body: () => (
      <Body>
        <Row label="Fenêtre alimentaire" body="06h30 → 14h00 (7h30). Jeûne 14h00 → 06h30 (16h30)." />
        <Row label="Petit-déjeuner 6h30" body="3 œufs brouillés au beurre + 100 g saumon fumé ou 80 g lardons + 1 avocat + café noir." />
        <Row label="Déjeuner 12h00" body="180 g viande/poisson/volaille + 250 g légumes verts (beurre/huile olive) + 40 g fromage affiné + 30 g oléagineux." />
        <Row label="Collation 13h45 si faim" body="2 œufs durs ou 50 g amandes ou 80 g blanc poulet + eau salée." />
        <Row label="Cibles" body="≈ 1500–1700 kcal · 110–140 g prot · 100–130 g lip · &lt; 20 g gluc nets." />
      </Body>
    ),
  },
  {
    n: "03",
    tint: HF.blue,
    title: "Hydratation & sels",
    sub: "3 L/j MIN · sodium · magnésium · potassium",
    pages: 4,
    body: () => (
      <Body>
        <Row label="Eau" body="3 L/j MINIMUM (Eliquis). Cible 3,5 L les jours training." />
        <Row label="Sodium" body="3–5 g sel ajouté/j." />
        <Row label="Magnésium" body="400 mg/j (bisglycinate)." />
        <Row label="Potassium" body="1–2 g/j (légumes verts, avocat, sel de potassium)." />
      </Body>
    ),
  },
  {
    n: "04",
    tint: HF.orange,
    title: "Cétones & mesures",
    sub: "Quand mesurer · interpréter les valeurs",
    pages: 6,
    body: () => (
      <Body>
        <Row label="Quand mesurer" body="Matin à jeun, avant café, après pesée." />
        <Row label="Cétose nutritionnelle" body="≥ 1,5 mmol/L · zone optimale pour perte de gras." />
        <Row label="Cétose légère" body="0,5 – 1,5 mmol/L · acceptable, viser au-dessus." />
        <Row label="Hors cétose" body="&lt; 0,5 mmol/L · vérifier glucides cachés (sauces, oléagineux)." />
        <Row label="Acidocétose (urgence)" body="≥ 5 mmol/L · STOP jeûne, appeler médecin immédiatement." />
      </Body>
    ),
  },
  {
    n: "05",
    tint: HF.red,
    title: "Surveillance Eliquis",
    sub: "TA · saignements · interactions · STOP",
    pages: 10,
    body: () => (
      <Body>
        <Row label="Hydratation 3 L/j" body="Fonction rénale → élimination médicament. Non négociable." />
        <Row label="Surveiller" body="Gencives qui saignent, ecchymoses, hématurie, selles noires." />
        <Row label="Jamais d'arrêt brutal" body="Du médicament. Communiquer toute pause avec cardiologue." />
        <RedCallout>
          <strong>STOP & médecin immédiat si :</strong>
          <br />· Vertiges persistants ou syncope
          <br />· Palpitations
          <br />· Saignement anormal
          <br />· TA &lt; 11/6 ou &gt; 15/9
          <br />· Perte &gt; 2 kg en 7 jours (déshydratation)
        </RedCallout>
        <Row label="Voir aussi" body="" linkTo="/safety" linkLabel="Page Sécurité (paramètres en direct)" />
      </Body>
    ),
  },
  {
    n: "06",
    tint: HF.pink,
    title: "Entraînement",
    sub: "4 séances / sem · Z2 · contre-indications",
    pages: 5,
    body: () => (
      <Body>
        <Row label="Lundi 17h" body="PUSH (pecs/épaules/triceps) — 45 min." />
        <Row label="Mardi journée" body="Tapis 1 h à 4–5 km/h pendant travail." />
        <Row label="Mercredi 17h" body="PULL + JAMBES — 50 min." />
        <Row label="Jeudi journée" body="Tapis 1 h." />
        <Row label="Vendredi 17h" body="HIIT 25 min — 8 rounds 30s/30s." />
        <Row label="Samedi 9h" body="ABDOS + mobilité 40 min + marche 45 min." />
        <Row label="Dimanche" body="Repos actif (messe + marche famille)." />
        <Row
          label="Équipement"
          body="Haltères 10 kg insuffisants au-delà S6 (squat, rowing, SDT). Acheter 2×25 kg ou kettlebell 16–20 kg avant S6."
        />
      </Body>
    ),
  },
  {
    n: "07",
    tint: HF.gray,
    title: "Exceptions & voyages",
    sub: "Repas pro · fêtes · maladie",
    pages: 4,
    body: () => (
      <Body>
        <Row
          label="Voyages pro / repas clients"
          body="Protéine + légumes verts + beurre/huile. Refus pain, pâtes, dessert, alcool (sauf 1 verre vin rouge max). Hôtel : œufs+bacon+avocat au breakfast. Avion/train : sardines+œufs durs+amandes. Jeûne peut glisser ±2 h, jamais le cétogène."
        />
        <Row
          label="Fêtes familiales / paroissiales"
          body="1–2 verres vin max. Refus gâteaux, pain, sucré. Refeed dominical absorbe la souplesse."
        />
        <Row
          label="Maladie"
          body="Pause training OK, cétogène maintenu. Fièvre : bouillon + hydratation + électrolytes renforcés."
        />
        <Row label="Messe dimanche 10h" body="Silence push 9h30 – 12h00." />
      </Body>
    ),
  },
];

export default function ProtocolPage() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div style={{ padding: "4px 20px 24px" }}>
      <div style={{ paddingTop: 6 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", color: HF.label2 }}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="6" width="8" height="6" rx="1" />
            <path d="M5 6V4a2 2 0 014 0v2" />
          </svg>
          <span className="hf-footnote" style={{ fontWeight: 500 }}>Disponible hors ligne</span>
        </div>
        <div className="hf-largeTitle" style={{ marginTop: 2 }}>Protocole</div>
        <div className="hf-subhead hf-tnum" style={{ color: HF.label2, marginTop: 2 }}>
          Laurent · keto strict + 16:8 · démarrage 12 mai 2026
        </div>
      </div>

      {/* Search (visual only) */}
      <div
        style={{
          marginTop: 14,
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: HF.fill,
          padding: "10px 12px",
          borderRadius: 12,
          color: HF.label2,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="7" cy="7" r="5" />
          <path d="M11 11l3 3" />
        </svg>
        <span className="hf-subhead">Rechercher dans le protocole</span>
      </div>

      {/* Urgence */}
      <div className="hf-eyebrow" style={{ marginTop: 22, marginLeft: 4, color: HF.red }}>
        EN CAS D&apos;URGENCE
      </div>
      <HFCard padding={0} style={{ marginTop: 8 }}>
        <Link
          href="/safety"
          style={{ display: "flex", padding: "13px 16px", gap: 12, alignItems: "center", color: HF.label }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              flexShrink: 0,
              background: `${HF.red}1F`,
              color: HF.red,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l10 18H2z" />
              <path d="M12 10v5M12 18v.5" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="hf-headline">Surveillance Eliquis & STOP</div>
            <div className="hf-subhead" style={{ color: HF.label2 }}>TA · saignements · perte rapide</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={HF.label3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 3l4 4-4 4" />
          </svg>
        </Link>
        <div style={{ height: 0.5, background: HF.separator, marginLeft: 60 }} />
        <a
          href="tel:15"
          style={{ display: "flex", padding: "13px 16px", gap: 12, alignItems: "center", color: HF.label }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              flexShrink: 0,
              background: `${HF.red}1F`,
              color: HF.red,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 4a2 2 0 012-2h2l1.5 5L9 9c1 2.5 3.5 5 6 6l2-2.5 5 1.5v2a2 2 0 01-2 2 18 18 0 01-14-14z" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="hf-headline">SAMU · 15</div>
            <div className="hf-subhead" style={{ color: HF.label2 }}>numéro d&apos;urgence médicale</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={HF.label3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 3l4 4-4 4" />
          </svg>
        </a>
      </HFCard>

      {/* Sections */}
      <div className="hf-eyebrow" style={{ marginTop: 22, marginLeft: 4, color: HF.label2 }}>
        SECTIONS
      </div>
      <HFCard padding={0} style={{ marginTop: 8 }}>
        {SECTIONS.map((s, i) => (
          <div key={s.n}>
            <button
              type="button"
              onClick={() => setOpen(open === s.n ? null : s.n)}
              style={{
                display: "flex",
                width: "100%",
                padding: "14px 16px",
                gap: 12,
                alignItems: "center",
                background: "transparent",
                border: "none",
                color: HF.label,
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  flexShrink: 0,
                  background: `${s.tint}1F`,
                  color: s.tint,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--hf-font-round)",
                  fontWeight: 700,
                  fontSize: 13,
                  letterSpacing: 0.3,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {s.n}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="hf-headline">{s.title}</div>
                <div className="hf-subhead" style={{ color: HF.label2 }}>{s.sub}</div>
              </div>
              <div className="hf-footnote hf-tnum" style={{ color: HF.label3 }}>{s.pages} p.</div>
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke={HF.label3}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ marginLeft: 4, transform: open === s.n ? "rotate(90deg)" : "rotate(0)", transition: "transform .15s" }}
              >
                <path d="M5 3l4 4-4 4" />
              </svg>
            </button>
            {open === s.n && (
              <div style={{ padding: "0 16px 14px 64px" }}>{s.body()}</div>
            )}
            {i < SECTIONS.length - 1 && <div style={{ height: 0.5, background: HF.separator, marginLeft: 64 }} />}
          </div>
        ))}
      </HFCard>

      <div className="hf-caption hf-tnum" style={{ textAlign: "center", color: HF.label3, marginTop: 22 }}>
        Synchronisé · {SECTIONS.reduce((a, s) => a + s.pages, 0)} pages
      </div>
    </div>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>;
}

function Row({
  label,
  body,
  linkTo,
  linkLabel,
}: {
  label: string;
  body: string;
  linkTo?: string;
  linkLabel?: string;
}) {
  return (
    <div>
      <div className="hf-eyebrow" style={{ color: HF.label2 }}>{label}</div>
      {body && (
        <div className="hf-body" style={{ marginTop: 2, color: HF.label }} dangerouslySetInnerHTML={{ __html: body }} />
      )}
      {linkTo && (
        <Link href={linkTo} className="hf-subhead" style={{ color: HF.blue, fontWeight: 500, marginTop: 2, display: "inline-block" }}>
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}

function RedCallout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: `${HF.red}14`,
        border: `1px solid ${HF.red}33`,
        borderRadius: 12,
        padding: "10px 12px",
        color: HF.label,
      }}
      className="hf-subhead"
    >
      {children}
    </div>
  );
}
