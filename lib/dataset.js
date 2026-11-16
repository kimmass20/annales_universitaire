/**
 * [HYPOTHÈSE] Le fichier commun des 5 000 annales n'a pas été fourni.
 * Ce générateur est déterministe (graine 20261116).
 */

class Annale {
  constructor(donnees) {
    this.id = donnees.id;
    this.titre = donnees.titre;
    this.faculte = donnees.faculte;
    this.annee_academique = donnees.annee_academique;
    this.matiere = donnees.matiere;
    this.type = donnees.type;
    this.taille_octets = donnees.taille_octets;
    this.url_fichier = donnees.url_fichier;
    this.est_telecharge = Boolean(donnees.est_telecharge);
    this.est_favori = Boolean(donnees.est_favori);
  }

  static depuisLigne(row) {
    return new Annale(row);
  }

  versJson() {
    return {
      id: this.id,
      titre: this.titre,
      faculte: this.faculte,
      annee_academique: this.annee_academique,
      matiere: this.matiere,
      type: this.type,
      taille_octets: this.taille_octets,
      url_fichier: this.url_fichier,
      est_telecharge: this.est_telecharge,
      est_favori: this.est_favori,
    };
  }
}

class GenerateurAnnales {
  static GRAINE = 20261116;
  static NOMBRE = 5000;
  static FACULTES = ["Informatique", "Sciences", "Droit", "Médecine", "Lettres", "Économie"];
  static MATIERES = ["Maths", "Algorithmique", "Physique", "Bases de données", "Droit civil", "Anatomie", "Comptabilité"];
  static NIVEAUX = ["L1", "L2", "L3", "M1"];
  static ANNEES = ["2019-2020", "2020-2021", "2021-2022", "2022-2023", "2023-2024", "2024-2025"];
  static TYPES = ["examen", "interrogation"];

  static aleatoire(seed) {
    let a = seed >>> 0;
    return function next() {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  static generer() {
    const rand = GenerateurAnnales.aleatoire(GenerateurAnnales.GRAINE);
    const annales = [];
    for (let n = 1; n <= GenerateurAnnales.NOMBRE; n += 1) {
      const id = `ann-${String(n).padStart(6, "0")}`;
      let faculte = GenerateurAnnales.FACULTES[Math.floor(rand() * GenerateurAnnales.FACULTES.length)];
      let matiere = GenerateurAnnales.MATIERES[Math.floor(rand() * GenerateurAnnales.MATIERES.length)];
      let niveau = GenerateurAnnales.NIVEAUX[Math.floor(rand() * GenerateurAnnales.NIVEAUX.length)];
      if (n <= 40) {
        faculte = "Informatique";
        matiere = "Maths";
        niveau = "L1";
      }
      const anneeAcademique = GenerateurAnnales.ANNEES[Math.floor(rand() * GenerateurAnnales.ANNEES.length)];
      const type = GenerateurAnnales.TYPES[Math.floor(rand() * GenerateurAnnales.TYPES.length)];
      annales.push(new Annale({
        id,
        titre: `${matiere} ${niveau} — ${type} ${anneeAcademique}`,
        faculte,
        annee_academique: anneeAcademique,
        matiere,
        type,
        taille_octets: 50000 + ((n * 997) % 450001),
        url_fichier: `/fichiers/${id}.pdf`,
        est_telecharge: false,
        est_favori: false,
      }));
    }
    return annales;
  }

  static contenuFichier(annale) {
    const ligne = `${annale.id} | ${annale.titre} | ${annale.faculte} | ${annale.matiere}`
      .replace(/[()\\]/g, " ");
    const dessin = `BT /F1 12 Tf 72 700 Td (${ligne}) Tj ET\n`;
    const avant = "%PDF-1.4\n1 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n2 0 obj << /Length ";
    const entre = " >> stream\n";
    const apres = "\nendstream endobj\n3 0 obj << /Type /Page /Parent 4 0 R /MediaBox [0 0 612 792] /Contents 2 0 R /Resources << /Font << /F1 1 0 R >> >> >> endobj\n4 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n5 0 obj << /Type /Catalog /Pages 4 0 R >> endobj\ntrailer << /Root 5 0 R >>\n%%EOF\n";
    const taille = annale.taille_octets;
    let longueurFlux = 1;
    for (let essai = 0; essai < 6; essai += 1) {
      const fixe = Buffer.byteLength(avant) + String(longueurFlux).length + Buffer.byteLength(entre) + Buffer.byteLength(apres);
      const prochain = taille - fixe;
      if (prochain === longueurFlux) break;
      longueurFlux = prochain;
    }
    if (longueurFlux < Buffer.byteLength(dessin)) {
      throw new Error(`Taille trop petite pour ${annale.id}`);
    }
    const remplissage = " ".repeat(longueurFlux - Buffer.byteLength(dessin));
    const fichier = Buffer.from(avant + longueurFlux + entre + dessin + remplissage + apres, "utf8");
    if (fichier.length !== taille) {
      throw new Error(`Taille obtenue ${fichier.length} au lieu de ${taille}`);
    }
    return fichier;
  }
}

module.exports = { Annale, GenerateurAnnales };
